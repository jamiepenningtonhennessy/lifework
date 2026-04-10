import { Router, Request, Response } from "express";
import { getDb } from "./db";
import { leadMagnetDownloads } from "../drizzle/schema";
import { generateLifeworkPdf } from "./routers/lifeworkPdf";
import { notifyOwner } from "./_core/notification";

export const lifeworkPdfRouter = Router();

/**
 * POST /api/download/lifework-overview
 * Body: { name: string, email: string }
 *
 * Stores the lead, then streams the branded PDF directly as a file download.
 * This avoids tRPC's base64 serialisation which can fail for large binary payloads.
 */
lifeworkPdfRouter.post("/api/download/lifework-overview", async (req: Request, res: Response) => {
  try {
    const { name, email } = req.body as { name?: string; email?: string };

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      res.status(400).json({ error: "Name is required." });
      return;
    }
    if (!email || typeof email !== "string" || !email.includes("@")) {
      res.status(400).json({ error: "A valid email address is required." });
      return;
    }

    const cleanName = name.trim().slice(0, 200);
    const cleanEmail = email.trim().toLowerCase().slice(0, 320);

    // Store the lead
    try {
      const db = await getDb();
      if (db) {
        await db.insert(leadMagnetDownloads).values({
          name: cleanName,
          email: cleanEmail,
          document: "lifework_overview",
        });
      }
    } catch (dbErr) {
      console.warn("[LifeworkPDF] DB insert failed:", dbErr);
      // Non-fatal — still serve the PDF
    }

    // Notify owner (non-fatal)
    try {
      await notifyOwner({
        title: "New Lifework PDF Download",
        content: `${cleanName} (${cleanEmail}) downloaded the Lifework overview PDF`,
      });
    } catch (_) {
      // ignore
    }

    // Generate PDF
    const pdfBuffer = generateLifeworkPdf(cleanName);

    // Stream as a file download
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="What-Lifework-Reveals.pdf"'
    );
    res.setHeader("Content-Length", pdfBuffer.length);
    res.setHeader("Cache-Control", "no-store");
    res.end(pdfBuffer);
  } catch (err) {
    console.error("[LifeworkPDF] Error generating PDF:", err);
    res.status(500).json({ error: "Could not generate PDF. Please try again." });
  }
});
