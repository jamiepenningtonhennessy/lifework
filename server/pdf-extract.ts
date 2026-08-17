/**
 * PDF Text Extraction Endpoint
 *
 * POST /api/extract-pdf
 * Accepts a multipart PDF or DOCX upload and extracts usable document text,
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

export const ALISTAIR_DOCUMENT_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
] as const;

export function isSupportedAlistairDocument(mimeType: string): boolean {
  return (ALISTAIR_DOCUMENT_MIME_TYPES as readonly string[]).includes(mimeType);
}

export async function extractAlistairDocumentText(
  buffer: Buffer,
  mimeType: string,
): Promise<{ text: string; pages?: number }> {
  if (mimeType === "application/pdf") {
    const pdfParseModule = await import("pdf-parse");
    type PDFParseInstance = { load: () => Promise<void>; getText: () => Promise<{ pages: { text: string }[]; text: string }> };
    type PDFParseModule = { PDFParse: new (opts: { verbosity: number; data: Buffer }) => PDFParseInstance };
    const { PDFParse } = pdfParseModule as unknown as PDFParseModule;
    const parser = new PDFParse({ verbosity: 0, data: buffer });
    await parser.load();
    const result = await parser.getText();
    const text = result.text ?? result.pages.map((page) => page.text).join("\n");
    return { text, pages: result.pages.length };
  }

  if (mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ buffer });
    return { text: result.value ?? "" };
  }

  throw new Error("Unsupported document type");
}

export const pdfExtractRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    if (isSupportedAlistairDocument(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only PDF and DOCX files are accepted"));
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

      const data = await extractAlistairDocumentText(req.file.buffer, req.file.mimetype);
      const text = data.text;

      if (!text.trim()) {
        res.status(422).json({ error: "No readable text was found. If this is a scanned PDF, please use a text-based PDF or DOCX version instead." });
        return;
      }

      // Truncate to ~12,000 characters (~3,000 tokens) to stay within context limits
      const truncated = text.length > 12000
        ? text.slice(0, 12000) + "\n\n[Document truncated — please use shorter documents for best results]"
        : text;

      res.json({ text: truncated, pages: data.pages, chars: text.length });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      res.status(422).json({ error: `We could not read this document: ${message}` });
    }
  }
);
