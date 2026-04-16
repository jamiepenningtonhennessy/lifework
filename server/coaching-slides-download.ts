import { Router, Request, Response } from "express";
import { sdk } from "./_core/sdk";
import { getAnalysisReport } from "./db";
import { generateCoachingSlides } from "./routers/coachingSlides";

export const coachingSlidesDownloadRouter = Router();

/**
 * POST /api/download/coaching-slides
 * Body: { clientId: number }
 *
 * Authenticates the counsellor session, generates the PPTX buffer server-side,
 * and streams it directly as a file download — avoiding the cross-origin S3 URL
 * redirect that browsers refuse to download.
 */
coachingSlidesDownloadRouter.post(
  "/api/download/coaching-slides",
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

      const report = await getAnalysisReport(clientId);
      if (!report || !report.wowReportJson) {
        res.status(404).json({
          error: "No WOW report found for this client. Generate the WOW Report first.",
        });
        return;
      }

      let sections: any;
      try {
        sections = JSON.parse(report.wowReportJson);
      } catch {
        res.status(500).json({ error: "Stored report sections are corrupted." });
        return;
      }

      const pptxBuffer = await generateCoachingSlides(sections, clientId);

      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.presentationml.presentation"
      );
      res.setHeader(
        "Content-Disposition",
        'attachment; filename="Lifework-Coaching-Slides.pptx"'
      );
      res.setHeader("Content-Length", pptxBuffer.length);
      res.setHeader("Cache-Control", "no-store");
      res.end(pptxBuffer);
    } catch (err) {
      console.error("[CoachingSlides] Error generating PPTX:", err);
      res.status(500).json({ error: "Could not generate slides. Please try again." });
    }
  }
);
