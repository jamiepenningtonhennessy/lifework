/**
 * Debrief Chat Router
 *
 * Password-protected Alistair debrief-prep page for colleagues.
 * No Manus login required — access is gated by a shared passphrase.
 *
 * PDF handling strategy:
 *   The uploaded PDF is stored temporarily in S3 and its URL is passed
 *   directly to the LLM as a file_url (application/pdf). This avoids
 *   all text-extraction issues with WeasyPrint-generated PDFs.
 *
 * Flow:
 *  1. verifyPassword  — checks the shared passphrase
 *  2. uploadPdf       — stores PDF in S3, returns a public URL
 *  3. generateRecall  — Alistair's warm opening recall using the PDF URL
 *  4. chat            — ephemeral conversation with Alistair, seeded with PDF URL
 */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, publicProcedure } from "../_core/trpc";
import { invokeLLM } from "../_core/llm";
import { storagePut } from "../storage";
import { randomBytes } from "crypto";

// ─── Password ─────────────────────────────────────────────────────────────────
const DEBRIEF_PASSWORD = process.env.DEBRIEF_PASSWORD ?? "debrief2024";

// ─── System prompt builder ────────────────────────────────────────────────────
function buildSystemPrompt(colleagueName: string, clientName: string): string {
  return `You are Alistair, a warm, perceptive, and experienced career counsellor at Pennington Hennessy. You have spent decades helping lawyers and professionals understand themselves and make wise career decisions.

You are speaking with ${colleagueName}, a colleague at Pennington Hennessy, who is preparing to meet a client called ${clientName}. You have read the client's full Lifework WOW Report (provided as a PDF attachment in this conversation).

Your role is to help ${colleagueName} prepare for the debrief session. You know this client's data intimately — their life history, character strengths, personality profile, and career story. Draw on all of it naturally and specifically. Use the client's first name throughout.

Be warm, collegial, and direct. You are not a chatbot — you are a senior colleague who has thought deeply about this client. Offer observations, flag tensions, suggest angles. If ${colleagueName} asks a question you cannot answer from the report, say so honestly.`;
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
   * Accept a base64-encoded PDF, upload it to S3, and return the public URL.
   * The URL is passed to the LLM directly — no text extraction needed.
   */
  uploadPdf: publicProcedure
    .input(z.object({
      fileBase64: z.string(),
      fileName: z.string(),
    }))
    .mutation(async ({ input }) => {
      const fileBuffer = Buffer.from(input.fileBase64, "base64");
      if (fileBuffer.length > 20 * 1024 * 1024) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "File too large (max 20 MB)" });
      }
      if (fileBuffer.length < 1000) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "File appears to be empty or corrupt." });
      }

      // Upload to S3 with a random key so it is not enumerable
      const suffix = randomBytes(12).toString("hex");
      const key = `debrief-uploads/${suffix}.pdf`;
      const { url } = await storagePut(key, fileBuffer, "application/pdf");

      return { pdfUrl: url };
    }),

  /**
   * Generate Alistair's opening "recall" message after the PDF is uploaded.
   * Passes the PDF URL directly to the LLM as a file_url.
   */
  generateRecall: publicProcedure
    .input(z.object({
      pdfUrl: z.string().url(),
      colleagueName: z.string().min(1).max(100),
      clientName: z.string().min(1).max(100),
    }))
    .mutation(async ({ input }) => {
      const systemPrompt = buildSystemPrompt(input.colleagueName, input.clientName);
      const firstName = input.clientName.split(" ")[0];

      const response = await invokeLLM({
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              {
                type: "file_url",
                file_url: {
                  url: input.pdfUrl,
                  mime_type: "application/pdf",
                },
              },
              {
                type: "text",
                text: `Generate Alistair's opening message after receiving the report. It should:
1. Say "Oh yes, I remember ${firstName}." followed by one specific, memorable detail from their life history or career — something that makes them distinctive as a person (not a generic observation). Be warm and specific.
2. Then say something like "So, ${input.colleagueName} — how can I help you prepare to meet our client?"
Keep it to 2-3 sentences. Warm, collegial, specific. Do not use bullet points.`,
              },
            ],
          },
        ] as any,
        max_tokens: 250,
      });

      const recall = (response.choices[0]?.message?.content as string)
        ?? `Oh yes, I remember ${firstName}. A fascinating client. So, ${input.colleagueName} — how can I help you prepare to meet our client?`;
      return { recall };
    }),

  /**
   * Send a message to Alistair and receive a reply.
   * The PDF URL is passed as a file_url on the first user turn so the LLM
   * always has access to the full report. Subsequent turns reference it
   * through the conversation history.
   * Ephemeral — no DB persistence.
   */
  chat: publicProcedure
    .input(z.object({
      pdfUrl: z.string().url(),
      colleagueName: z.string().min(1).max(100),
      clientName: z.string().min(1).max(100),
      messages: z.array(z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string(),
      })),
      newMessage: z.string().min(1).max(4000),
    }))
    .mutation(async ({ input }) => {
      const systemPrompt = buildSystemPrompt(input.colleagueName, input.clientName);

      // Build message history — inject PDF as file_url on the first user turn
      const historyMessages = input.messages.map((m, i) => {
        if (m.role === "user" && i === 0) {
          // First user turn: attach the PDF so the LLM has the full context
          return {
            role: "user" as const,
            content: [
              {
                type: "file_url" as const,
                file_url: {
                  url: input.pdfUrl,
                  mime_type: "application/pdf" as const,
                },
              },
              { type: "text" as const, text: m.content },
            ],
          };
        }
        return { role: m.role as "user" | "assistant", content: m.content };
      });

      // If there are no previous messages, attach PDF to the new message
      const newUserContent = input.messages.length === 0
        ? [
            {
              type: "file_url" as const,
              file_url: {
                url: input.pdfUrl,
                mime_type: "application/pdf" as const,
              },
            },
            { type: "text" as const, text: input.newMessage },
          ]
        : input.newMessage;

      const llmMessages = [
        { role: "system" as const, content: systemPrompt },
        ...historyMessages,
        { role: "user" as const, content: newUserContent },
      ];

      const response = await invokeLLM({
        messages: llmMessages as any,
        max_tokens: 700,
      });

      const reply = (response.choices[0]?.message?.content as string)
        ?? "I'm sorry, I wasn't able to generate a response. Please try again.";
      return { reply };
    }),
});
