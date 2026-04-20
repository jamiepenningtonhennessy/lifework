/**
 * puppeteer-pdf.ts
 *
 * Express route: GET /api/report/pdf/:clientId
 *
 * Uses Puppeteer (headless Chromium) to render the HTML report to a
 * pixel-perfect A4 PDF and stream it back as a download.
 *
 * This produces far sharper output than the browser print dialog because:
 *  - Fonts are fully loaded before rendering
 *  - print-color-adjust: exact is honoured
 *  - No browser chrome / headers / footers
 *  - Consistent pagination regardless of OS / browser version
 */

import { Request, Response } from "express";
import puppeteer from "puppeteer";
import { buildClaudeExportJson } from "./routers/claudeExport.js";
import { renderHtmlReport } from "./html-report.js";
import { sdk } from "./_core/sdk.js";

/**
 * Resolve the Chromium executable path.
 * Priority:
 *  1. PUPPETEER_EXECUTABLE_PATH env var (explicit override)
 *  2. Puppeteer's own bundled Chrome (downloaded via postinstall)
 */
function resolveChromiumPath(): string | undefined {
  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    return process.env.PUPPETEER_EXECUTABLE_PATH;
  }
  return undefined;
}

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

    // ── Build data + render HTML ──────────────────────────────────────────────
    const data = await buildClaudeExportJson(clientId);
    const html = renderHtmlReport(data as Record<string, unknown>);

    // ── Get client name from payload for filename ─────────────────────────────
    const clientData = (data as Record<string, unknown>).CLIENT as Record<string, string> | undefined;
    const clientName = clientData?.NAME ?? `Client-${clientId}`;

    // ── Puppeteer: render to PDF ──────────────────────────────────────────────
    const executablePath = resolveChromiumPath();
    console.log(`[puppeteer-pdf] Launching Chromium${executablePath ? ` at ${executablePath}` : " (auto-detect)"}`);

    const browser = await puppeteer.launch({
      headless: true,
      ...(executablePath ? { executablePath } : {}),
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

      // Set content and wait for fonts + images to load
      await page.setContent(html, { waitUntil: ["networkidle0", "domcontentloaded"] });

      // Wait for Google Fonts to load (they are embedded in the HTML <head>)
      await page.evaluateHandle("document.fonts.ready");

      // Generate PDF
      const pdfBuffer = await page.pdf({
        format: "A4",
        printBackground: true,
        margin: { top: 0, right: 0, bottom: 0, left: 0 },
        preferCSSPageSize: true,
      });

      await browser.close();

      // ── Stream response ───────────────────────────────────────────────────────
      const safeFilename = clientName.replace(/[^a-zA-Z0-9 _-]/g, "").replace(/\s+/g, "-");
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="Lifework-${safeFilename}.pdf"`);
      res.setHeader("Content-Length", pdfBuffer.length);
      res.end(pdfBuffer);
    } catch (err) {
      await browser.close();
      throw err;
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    const errorStack = err instanceof Error ? err.stack : String(err);
    console.error("[puppeteer-pdf] Error:", errorStack);
    res.status(500).json({ error: "Failed to generate PDF", detail: errorMessage });
  }
}
