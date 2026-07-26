import "dotenv/config";
import { execSync } from "child_process";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { pdfRouter } from "../pdf-export";
import { pdfExtractRouter } from "../pdf-extract";
import { lifeworkPdfRouter } from "../lifework-pdf-download";
import { coachingSlidesDownloadRouter } from "../coaching-slides-download";
import { claudeExportDownloadRouter } from "../claude-export-download";
import { htmlReportHandler } from "../html-report";
import { handlePuppeteerPdfDownload } from "../puppeteer-pdf";
import {
  handleGenerateTargetSpec,
  handleBuildMonitorList,
  handleScanListings,
  handleScanNewsSignals,
  handleSendAlerts,
} from "../routers/jobsPipeline";
import { getDb } from "../db";
import { analysisReports } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

/** On startup, reset any reports stuck in 'generating' (caused by server restart mid-job). */
async function recoverStuckReports() {
  try {
    const db = await getDb();
    if (!db) return;
    const result = await db
      .update(analysisReports)
      .set({ wowReportStatus: "error", wowReportError: "Generation interrupted by server restart" })
      .where(eq(analysisReports.wowReportStatus, "generating"));
    const affected = (result as unknown as { affectedRows?: number }[])?.[0]?.affectedRows ?? 0;
    if (affected > 0) {
      console.log(`[WOW Report] Recovered ${affected} stuck 'generating' report(s) on startup`);
    }
  } catch (e) {
    console.warn("[WOW Report] Startup recovery failed:", e);
  }
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  // Increase timeout to 180s to accommodate long-running operations (image generation, PDF)
  server.timeout = 180_000;
  server.headersTimeout = 185_000;
  server.keepAliveTimeout = 190_000;
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);
  // PDF Export
  app.use(pdfRouter);
  // PDF Text Extraction (for counsellor Sage document upload)
  app.use(pdfExtractRouter);
  // Lifework overview PDF download (lead magnet)
  app.use(lifeworkPdfRouter);
  // Coaching slides PPTX download (counsellor)
  app.use(coachingSlidesDownloadRouter);
  // Claude handoff JSON export (counsellor)
  app.use(claudeExportDownloadRouter);
  // HTML report renderer (counsellor)
  app.get("/api/report/html/:clientId", htmlReportHandler);
  app.get("/api/report/pdf/:clientId", handlePuppeteerPdfDownload);
  // PDFKit diagnostic endpoint (public, no auth required)
  app.get("/api/debug/pdfkit-test", async (_req, res) => {
    try {
      const { generatePdfKitReport } = await import("../pdfkit-report.js");
      const mockData = {
        CLIENT: { NAME: "Test" },
        COVERING_LETTER: { PARAGRAPHS: ["Para 1"], SIGN_OFF: "Warmly,", AUTHOR_NAME: "Jamie", AUTHOR_EMAIL: "j@ph.com" },
        CH1: { HERO: "Hero text", PARAGRAPHS: ["Para 1"] },
        CH2: { LEDE: "Lede", PAGE1_PARAGRAPHS: [], PAGE1_SECTION_H: "", PAGE1_SECTION_PARAS: [], PAGE2_SECTION_H: "", PAGE2_PARAGRAPHS: [], KEYFIND: { PARAGRAPHS: [], ESF_PARA: "" } },
        CH3: { LEDE: "Lede", KEY_FINDINGS: [] },
        VIA: { TOP10: [], ALL24: [], EVIDENCE: [], VIRTUES_NOTE: "" },
        CH4: { LEDE: "Lede", PSYCHOMETRICS_PARAS: [], SYNTHESIS_PARAS: [], KEYFIND: { TITLE: "", BODY: "" } },
        OCEAN: { DOMAINS: [], PAGE1_DOMAINS: [], PAGE2_DOMAINS: [], FACET_NOTE: "" },
        CH5: { LEDE: "Lede", PRIMARY: { name: "", traits: "" }, SECONDARY: { name: "", traits: "" }, JUNGIAN: { code: "", spelt: "" }, STRENGTHS: [], WATCHOUTS: [], FIT: "" },
        CH6: { SECTIONS: [], PULLQUOTE: "" },
        CH7: { PAST: [], PRESENT: [], PRESENT_PULLQUOTE: "", FUTURE: [], DRIVES: [], TMAY_PARAS: [] },
        CH8: { DIRECTIONS: [], OVERFLOW_DIRECTIONS: [] },
        APPENDIX: { ACHIEVEMENTS: [] }
      };
      const buf = await generatePdfKitReport(mockData as Record<string, unknown>);
      res.json({ ok: true, bytes: buf.length, nodeVersion: process.version });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const stack = err instanceof Error ? err.stack : String(err);
      res.status(500).json({ ok: false, error: msg, stack: stack?.slice(0, 500), nodeVersion: process.version });
    }
  });
  // Jobs pipeline — Heartbeat cron endpoints
  app.post("/api/scheduled/jobs/generate-target-spec", handleGenerateTargetSpec);
  app.post("/api/scheduled/jobs/build-monitor-list", handleBuildMonitorList);
  app.post("/api/scheduled/jobs/scan-listings", handleScanListings);
  app.post("/api/scheduled/jobs/scan-news-signals", handleScanNewsSignals);
  app.post("/api/scheduled/jobs/send-alerts", handleSendAlerts);

  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  await recoverStuckReports();

  // Ensure WeasyPrint is available for PDF generation
  try {
    execSync("weasyprint --version", { stdio: "pipe" });
    console.log("[pdf] WeasyPrint is available");
  } catch {
    console.log("[pdf] WeasyPrint not found — installing via pip...");
    try {
      execSync("pip3 install weasyprint --quiet", { stdio: "pipe", timeout: 120_000 });
      console.log("[pdf] WeasyPrint installed successfully");
    } catch {
      console.warn("[pdf] WeasyPrint install failed — PDF generation will fall back to Puppeteer");
    }
  }

  // Reset any analysisStatus values stuck at 'in_progress' from a previous server crash/restart
  try {
    const db = await getDb();
    if (db) {
      const { clientProfiles } = await import("../../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      await db.update(clientProfiles)
        .set({ analysisStatus: "not_started" })
        .where(eq(clientProfiles.analysisStatus, "in_progress"));
      console.log("[startup] Cleared any stuck in_progress analysisStatus values");
    }
  } catch (e) {
    console.warn("[startup] Could not clear stuck analysisStatus values:", e);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
