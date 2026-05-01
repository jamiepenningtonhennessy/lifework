/**
 * puppeteer-pdf.ts
 *
 * Express route: GET /api/report/pdf/:clientId
 *
 * Renders the HTML report to an A4 PDF and streams it back as a download.
 *
 * Strategy (in priority order):
 *  1. WeasyPrint  — pure-Python HTML→PDF, no Chromium required, works in any
 *                   container. Used when `weasyprint` is on PATH.
 *  2. Puppeteer   — headless Chromium fallback for local dev environments that
 *                   have the system libraries available.
 */

import { existsSync, readdirSync, writeFileSync, readFileSync, unlinkSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { execFileSync } from "child_process";
import { Request, Response } from "express";
import { buildClaudeExportJson } from "./routers/claudeExport.js";
import { renderHtmlReport } from "./html-report.js";
import { generatePdfKitReport } from "./pdfkit-report.js";
import { sdk } from "./_core/sdk.js";

// ─── WeasyPrint ───────────────────────────────────────────────────────────────

function isWeasyPrintAvailable(): boolean {
  try {
    execFileSync("weasyprint", ["--version"], { stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}

async function generatePdfWithWeasyPrint(html: string): Promise<Buffer> {
  const id = `wow-report-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const htmlPath = join(tmpdir(), `${id}.html`);
  const pdfPath = join(tmpdir(), `${id}.pdf`);

  try {
    writeFileSync(htmlPath, html, "utf8");

    execFileSync(
      "weasyprint",
      [
        htmlPath,
        pdfPath,
        "--presentational-hints",
        "--optimize-images",
      ],
      {
        stdio: "pipe",
        timeout: 120_000, // 2 minutes max
      }
    );

    const pdfBuffer = readFileSync(pdfPath);
    return pdfBuffer;
  } finally {
    try { unlinkSync(htmlPath); } catch { /* ignore */ }
    try { unlinkSync(pdfPath); } catch { /* ignore */ }
  }
}

// ─── Puppeteer (fallback) ─────────────────────────────────────────────────────

const SYSTEM_CHROME_CANDIDATES = [
  "/usr/bin/chromium-browser",
  "/usr/bin/chromium",
  "/usr/bin/google-chrome",
  "/usr/bin/google-chrome-stable",
  "/usr/local/bin/chromium-browser",
  "/usr/local/bin/chromium",
];

function findProjectCacheChrome(): string | undefined {
  try {
    const cacheDir = join(process.cwd(), ".cache", "puppeteer", "chrome");
    if (!existsSync(cacheDir)) return undefined;
    for (const platformVer of readdirSync(cacheDir)) {
      const platformVerDir = join(cacheDir, platformVer);
      for (const sub of readdirSync(platformVerDir)) {
        const candidate = join(platformVerDir, sub, "chrome");
        if (existsSync(candidate)) return candidate;
      }
    }
  } catch {
    // ignore
  }
  return undefined;
}

function resolveChromiumPath(): string | undefined {
  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    return process.env.PUPPETEER_EXECUTABLE_PATH;
  }
  const projectCache = findProjectCacheChrome();
  if (projectCache) return projectCache;
  for (const candidate of SYSTEM_CHROME_CANDIDATES) {
    if (existsSync(candidate)) return candidate;
  }
  return undefined;
}

async function generatePdfWithPuppeteer(html: string): Promise<Buffer> {
  // Dynamic import so the module load doesn't fail if puppeteer isn't installed
  const puppeteer = (await import("puppeteer")).default;
  const executablePath = resolveChromiumPath();
  console.log(`[pdf] Puppeteer fallback — Chromium${executablePath ? ` at ${executablePath}` : " (auto-detect)"}`);

  const browser = await puppeteer.launch({
    headless: true,
    executablePath,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--single-process",
      "--no-zygote",
      "--font-render-hinting=none",
    ],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: ["networkidle0", "domcontentloaded"] });
    await page.evaluateHandle("document.fonts.ready");
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
      preferCSSPageSize: true,
    });
    await browser.close();
    return Buffer.from(pdfBuffer);
  } catch (err) {
    await browser.close();
    throw err;
  }
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function handlePuppeteerPdfDownload(req: Request, res: Response) {
  try {
    // ── Auth ──────────────────────────────────────────────────────────────────
    const user = await sdk.authenticateRequest(req);
    if (!user) {
      res.status(401).json({ error: "Unauthorised" });
      return;
    }

    const clientId = Number(req.params.clientId);
    if (!clientId || isNaN(clientId)) {
      res.status(400).json({ error: "Invalid clientId" });
      return;
    }

    // ── Build data ────────────────────────────────────────────────────────────
    const data = await buildClaudeExportJson(clientId);

    // ── Get client name for filename ──────────────────────────────────────────
    const clientData = (data as Record<string, unknown>).CLIENT as Record<string, string> | undefined;
    const clientName = clientData?.NAME ?? `Client-${clientId}`;

    // ── Generate PDF ──────────────────────────────────────────────────────────
    let pdfBuffer: Buffer;

    // Strategy:
    //  1. PDFKit — pure Node.js, zero system dependencies, works everywhere
    //  2. WeasyPrint — HTML→PDF, used if available (local dev)
    //  3. Puppeteer — last resort (requires Chromium system libs)
    try {
      console.log("[pdf] Using PDFKit (pure Node.js)");
      pdfBuffer = await generatePdfKitReport(data as Record<string, unknown>);
    } catch (pdfkitErr) {
      console.warn("[pdf] PDFKit failed:", pdfkitErr instanceof Error ? pdfkitErr.message : String(pdfkitErr));
      const html = renderHtmlReport(data as Record<string, unknown>);
      if (isWeasyPrintAvailable()) {
        console.log("[pdf] Falling back to WeasyPrint");
        pdfBuffer = await generatePdfWithWeasyPrint(html);
      } else {
        console.log("[pdf] Falling back to Puppeteer");
        pdfBuffer = await generatePdfWithPuppeteer(html);
      }
    }

    // ── Stream response ───────────────────────────────────────────────────────
    const safeFilename = clientName.replace(/[^a-zA-Z0-9 _-]/g, "").replace(/\s+/g, "-");
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="Lifework-${safeFilename}.pdf"`);
    res.setHeader("Content-Length", pdfBuffer.length);
    res.end(pdfBuffer);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    const errorStack = err instanceof Error ? err.stack : String(err);
    console.error("[pdf] Error:", errorStack);
    res.status(500).json({ error: "Failed to generate PDF", detail: errorMessage });
  }
}
