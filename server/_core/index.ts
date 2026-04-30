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
      execSync("pip3 install weasyprint --quiet --no-warn-script-location", { stdio: "pipe", timeout: 120_000 });
      console.log("[pdf] WeasyPrint installed successfully");
    } catch {
      console.warn("[pdf] WeasyPrint install failed — PDF generation will fall back to Puppeteer");
    }
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
