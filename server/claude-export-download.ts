import { Router, Request, Response } from "express";
import { sdk } from "./_core/sdk";
import { buildClaudeExportJson } from "./routers/claudeExport";
import { getClientProfileById } from "./db";

export const claudeExportDownloadRouter = Router();

/**
 * POST /api/download/claude-export
 * Body: { clientId: number }
 *
 * Authenticates the counsellor session, builds the Claude handoff JSON payload,
 * and streams it as a downloadable .json file.
 */
claudeExportDownloadRouter.post(
  "/api/download/claude-export",
  async (req: Request, res: Response) => {
    try {
      // Auth check — must be a logged-in admin
      let user: any = null;
      try {
        user = await sdk.authenticateRequest(req);
      } catch {
        res.status(401).json({ error: "Not authenticated." });
        return;
      }
      if (!user || user.role !== "admin") {
        res.status(403).json({ error: "Counsellor access required." });
        return;
      }

      const clientId = Number((req.body as any)?.clientId);
      if (!clientId || isNaN(clientId)) {
        res.status(400).json({ error: "clientId is required." });
        return;
      }

      const payload = await buildClaudeExportJson(clientId);

      // Build a safe filename from the client's name
      const profile = await getClientProfileById(clientId);
      const clientName = [profile?.firstName, profile?.lastName]
        .filter(Boolean)
        .join("_")
        .replace(/[^a-zA-Z0-9_-]/g, "")
        || `client-${clientId}`;
      const filename = `Lifework-${clientName}-Claude.json`;

      const json = JSON.stringify(payload, null, 2);
      const buf = Buffer.from(json, "utf-8");

      res.setHeader("Content-Type", "application/json");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.setHeader("Content-Length", buf.length);
      res.setHeader("Cache-Control", "no-store");
      res.end(buf);
    } catch (err: any) {
      console.error("[ClaudeExport] Error building JSON:", err);
      const msg = err?.message ?? "Could not build Claude export. Please try again.";
      res.status(500).json({ error: msg });
    }
  }
);
