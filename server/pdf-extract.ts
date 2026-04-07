/**
 * PDF Text Extraction Endpoint
 *
 * POST /api/extract-pdf
 * Accepts a multipart PDF upload, extracts the text using pdf-parse,
 * and returns it as JSON. Used by the counsellor Sage panel to load
 * documents as thinking-partner context.
 *
 * Authentication: must be logged in as admin (counsellor).
 * File size limit: 10 MB.
 * Recommended: 1–3 page documents for best results within LLM context.
 */

import { Router, Request, Response } from "express";
import multer from "multer";
import { sdk } from "./_core/sdk";
import * as pdfParseModule from "pdf-parse";
const pdfParse = (pdfParseModule as any).default ?? pdfParseModule;

export const pdfExtractRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are accepted"));
    }
  },
});

pdfExtractRouter.post(
  "/api/extract-pdf",
  upload.single("file"),
  async (req: Request, res: Response) => {
    try {
      // Verify the request comes from a logged-in counsellor
      let user: { role?: string } | null = null;
      try {
        user = await sdk.authenticateRequest(req);
      } catch {
        user = null;
      }
      if (!user || user.role !== "admin") {
        res.status(403).json({ error: "Counsellor access required" });
        return;
      }

      if (!req.file) {
        res.status(400).json({ error: "No file uploaded" });
        return;
      }

      const data = await pdfParse(req.file.buffer);
      const text: string = data.text ?? "";

      if (!text.trim()) {
        res.status(422).json({ error: "Could not extract text from this PDF. It may be image-based or protected." });
        return;
      }

      // Truncate to ~12,000 characters (~3,000 tokens) to stay within context limits
      const truncated = text.length > 12000
        ? text.slice(0, 12000) + "\n\n[Document truncated — please use shorter documents for best results]"
        : text;

      res.json({ text: truncated, pages: data.numpages, chars: text.length });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      res.status(500).json({ error: `Extraction failed: ${message}` });
    }
  }
);
