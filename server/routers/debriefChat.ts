/**
 * Debrief Chat Router
 *
 * Password-protected Alistair debrief-prep page for colleagues.
 * No Manus login required — access is gated by a shared passphrase.
 *
 * Flow:
 *  1. verifyPassword  — checks the shared passphrase
 *  2. extractPdf      — accepts base64 PDF, extracts text, returns it to client
 *  3. chat            — ephemeral conversation with Alistair, seeded with PDF text
 */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, publicProcedure } from "../_core/trpc";
import { invokeLLM } from "../_core/llm";
import * as pdfParseModule from "pdf-parse";
const pdfParse = (pdfParseModule as any).default ?? pdfParseModule;

// ─── Password ─────────────────────────────────────────────────────────────────
// Defaults to "debrief2024" if the env var is not set.
const DEBRIEF_PASSWORD = process.env.DEBRIEF_PASSWORD ?? "debrief2024";

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
   * Returns { valid: true } on success.
   */
  verifyPassword: publicProcedure
    .input(z.object({ password: z.string() }))
    .mutation(({ input }) => {
      const valid = input.password.trim() === DEBRIEF_PASSWORD.trim();
      return { valid };
    }),

  /**
   * Accept a base64-encoded PDF, extract its text, and return it.
   * The client stores the text in state and passes it with every chat message.
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
        const parsed = await pdfParse(fileBuffer);
        extractedText = parsed.text?.trim() ?? "";
      } catch {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Could not read this PDF. Please check it is not password-protected." });
      }
      if (!extractedText || extractedText.length < 100) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "No readable text found in this PDF. It may be a scanned image." });
      }
      // Try to extract the client's first name from the PDF text
      // The WOW report typically starts with the client's name in the first few lines
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
   * The full conversation history, PDF text, colleague name, and client name
   * are passed in from the client (ephemeral — no DB persistence).
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
   * Returns a warm, specific observation about the client drawn from the report,
   * plus an offer to help prepare.
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
