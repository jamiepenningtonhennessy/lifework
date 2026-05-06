/**
 * Debrief Chat Router
 *
 * Password-protected Alistair debrief-prep page for colleagues.
 * No Manus login required — access is gated by a shared passphrase.
 *
 * Flow:
 *  1. verifyPassword  — checks the shared passphrase
 *  2. extractPdf      — accepts base64 PDF, extracts text via pdftotext (poppler)
 *  3. generateRecall  — Alistair's warm opening recall after reading the report
 *  4. chat            — ephemeral conversation with Alistair, seeded with PDF text
 */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, publicProcedure } from "../_core/trpc";
import { invokeLLM } from "../_core/llm";
import { execFile } from "child_process";
import { promisify } from "util";
import { writeFile, unlink } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { randomBytes } from "crypto";

const execFileAsync = promisify(execFile);

// ─── Password ─────────────────────────────────────────────────────────────────
const DEBRIEF_PASSWORD = process.env.DEBRIEF_PASSWORD ?? "debrief2024";

// ─── PDF text extraction via pdftotext (poppler) ──────────────────────────────
async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  // Write buffer to a temp file
  const tmpFile = join(tmpdir(), `debrief-${randomBytes(8).toString("hex")}.pdf`);
  try {
    await writeFile(tmpFile, buffer);
    // pdftotext -layout preserves column structure; "-" means stdout
    const { stdout } = await execFileAsync("pdftotext", ["-layout", tmpFile, "-"], {
      maxBuffer: 10 * 1024 * 1024, // 10 MB output limit
      timeout: 30000,
    });
    return stdout.trim();
  } finally {
    // Clean up temp file (best-effort)
    unlink(tmpFile).catch(() => {});
  }
}

// ─── System prompt builder ────────────────────────────────────────────────────
function buildSystemPrompt(pdfText: string, colleagueName: string, clientName: string): string {
  return `You are Alistair, a warm, perceptive, and experienced career counsellor at Pennington Hennessy. You have spent decades helping lawyers and professionals understand themselves and make wise career decisions.

You are speaking with ${colleagueName}, a colleague at Pennington Hennessy, who is preparing to meet a client called ${clientName}. You have read the client's full Lifework WOW Report, which is reproduced below.

Your role is to help ${colleagueName} prepare for the debrief session. You know this client's data intimately — their life history, character strengths, personality profile, and career story. Draw on all of it naturally and specifically. Use the client's first name throughout.

Be warm, collegial, and direct. You are not a chatbot — you are a senior colleague who has thought deeply about this client. Offer observations, flag tensions, suggest angles. If ${colleagueName} asks a question you cannot answer from the report, say so honestly.

--- CLIENT REPORT ---
${pdfText.slice(0, 40000)}
--- END REPORT ---`;
}

// ─── Router ───────────────────────────────────────────────────────────────────
export const debriefChatRouter = router({

  /**
   * Verify the shared debrief passphrase.
   */
  verifyPassword: publicProcedure
    .input(z.object({ password: z.string() }))
    .mutation(({ input }) => {
      const valid = input.password.trim() === DEBRIEF_PASSWORD.trim();
      return { valid };
    }),

  /**
   * Accept a base64-encoded PDF, extract its text using pdftotext, and return it.
   * Works with WeasyPrint-generated PDFs that pdf-parse cannot handle.
   */
  extractPdf: publicProcedure
    .input(z.object({
      fileBase64: z.string(),
      fileName: z.string(),
    }))
    .mutation(async ({ input }) => {
      const fileBuffer = Buffer.from(input.fileBase64, "base64");
      if (fileBuffer.length > 20 * 1024 * 1024) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "File too large (max 20 MB)" });
      }

      let extractedText = "";
      try {
        extractedText = await extractTextFromPdf(fileBuffer);
      } catch (err: any) {
        // If pdftotext is not available, fall back to pdf-parse
        try {
          const pdfParseModule = await import("pdf-parse");
          const pdfParse = (pdfParseModule as any).default ?? pdfParseModule;
          const parsed = await pdfParse(fileBuffer);
          extractedText = parsed.text?.trim() ?? "";
        } catch {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Could not read this PDF. Please check it is not password-protected or a scanned image.",
          });
        }
      }

      if (!extractedText || extractedText.length < 100) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No readable text found in this PDF. It may be a scanned image.",
        });
      }

      // Try to detect the client's first name from the PDF text
      // WOW reports typically have "Dear [Name]" near the top
      let detectedClientName: string | null = null;
      const nameMatch = extractedText.match(/(?:Dear|Report for|Prepared for|Client:)\s+([A-Z][a-z]+)/);
      if (nameMatch) {
        detectedClientName = nameMatch[1];
      }

      return {
        charCount: extractedText.length,
        extractedText,
        detectedClientName,
      };
    }),

  /**
   * Send a message to Alistair and receive a reply.
   * Ephemeral — no DB persistence.
   */
  chat: publicProcedure
    .input(z.object({
      pdfText: z.string(),
      colleagueName: z.string().min(1).max(100),
      clientName: z.string().min(1).max(100),
      messages: z.array(z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string(),
      })),
      newMessage: z.string().min(1).max(4000),
    }))
    .mutation(async ({ input }) => {
      const systemPrompt = buildSystemPrompt(input.pdfText, input.colleagueName, input.clientName);
      const llmMessages = [
        { role: "system" as const, content: systemPrompt },
        ...input.messages.map(m => ({ role: m.role as "user" | "assistant", content: m.content })),
        { role: "user" as const, content: input.newMessage },
      ];
      const response = await invokeLLM({
        messages: llmMessages,
        max_tokens: 700,
      });
      const reply = (response.choices[0]?.message?.content as string) ?? "I'm sorry, I wasn't able to generate a response. Please try again.";
      return { reply };
    }),

  /**
   * Generate Alistair's opening "recall" message after the PDF is uploaded.
   */
  generateRecall: publicProcedure
    .input(z.object({
      pdfText: z.string(),
      colleagueName: z.string().min(1).max(100),
      clientName: z.string().min(1).max(100),
    }))
    .mutation(async ({ input }) => {
      const systemPrompt = buildSystemPrompt(input.pdfText, input.colleagueName, input.clientName);
      const firstName = input.clientName.split(" ")[0];
      const response = await invokeLLM({
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `Generate Alistair's opening message after receiving the report. It should:
1. Say "Oh yes, I remember ${firstName}." followed by one specific, memorable detail from their life history or career — something that makes them distinctive as a person (not a generic observation). Be warm and specific.
2. Then say something like "So, ${input.colleagueName} — how can I help you prepare to meet our client?"
Keep it to 2-3 sentences. Warm, collegial, specific. Do not use bullet points.`,
          },
        ] as any,
        max_tokens: 200,
      });
      const recall = (response.choices[0]?.message?.content as string) ?? `Oh yes, I remember ${firstName}. A fascinating client. So, ${input.colleagueName} — how can I help you prepare to meet our client?`;
      return { recall };
    }),
});
