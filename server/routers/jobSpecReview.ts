import { TRPCError } from "@trpc/server";
import { and, count, desc, eq } from "drizzle-orm";
import { randomBytes } from "crypto";
import { z } from "zod";
import { analysisReports, clientCvs, clientProfiles, clientTargetSpec, jobSpecReviews } from "../../drizzle/schema";
import { getDb } from "../db";
import { invokeLLM } from "../_core/llm";
import { protectedProcedure, router } from "../_core/trpc";
import { storagePut } from "../storage";
import {
  JOB_SPEC_ACCEPTED_MIME_TYPES,
  MAX_JOB_SPEC_BYTES,
  MAX_JOB_SPEC_REVIEWS_PER_CLIENT,
  type JobSpecFeedback,
  hasRoomForAnotherJobSpec,
} from "../../shared/jobSpecReview";

type RequestContext = { user: { id: number; role: string } };

async function resolveJobSpecClientId(ctx: RequestContext, input: { clientId?: number }): Promise<number> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

  if (ctx.user.role === "admin" && input.clientId) return input.clientId;

  const [profile] = await db
    .select({ id: clientProfiles.id })
    .from(clientProfiles)
    .where(eq(clientProfiles.userId, ctx.user.id))
    .limit(1);
  if (!profile) throw new TRPCError({ code: "NOT_FOUND", message: "Client profile not found" });
  return profile.id;
}

async function extractDocumentText(fileBuffer: Buffer, mimeType: (typeof JOB_SPEC_ACCEPTED_MIME_TYPES)[number]): Promise<string> {
  if (mimeType === "application/pdf") {
    const pdfParseModule = await import("pdf-parse");
    type PDFParseInstance = { load: () => Promise<void>; getText: () => Promise<{ pages: { text: string }[]; text: string }> };
    type PDFParseModule = { PDFParse: new (opts: { verbosity: number; data: Buffer }) => PDFParseInstance };
    const { PDFParse } = pdfParseModule as unknown as PDFParseModule;
    const parser = new PDFParse({ verbosity: 0, data: fileBuffer });
    await parser.load();
    const result = await parser.getText();
    return result.text ?? result.pages.map((page) => page.text).join("\n");
  }

  const mammoth = await import("mammoth");
  const result = await mammoth.extractRawText({ buffer: fileBuffer });
  return result.value ?? "";
}

const jobSpecFeedbackSchema = {
  type: "object" as const,
  properties: {
    roleTitle: { type: "string" },
    organisation: { type: "string" },
    overallFit: { type: "string", enum: ["strong", "promising", "stretch", "limited-evidence"] },
    fitSummary: { type: "string" },
    evidenceToLeadWith: { type: "array", items: { type: "string" } },
    alignment: {
      type: "array",
      items: {
        type: "object",
        properties: {
          requirement: { type: "string" },
          clientEvidence: { type: "string" },
          assessment: { type: "string", enum: ["strong", "partial", "not-yet-evidenced"] },
        },
        required: ["requirement", "clientEvidence", "assessment"],
        additionalProperties: false,
      },
    },
    questionsToClarify: { type: "array", items: { type: "string" } },
    positioningAdvice: { type: "string" },
    importantCaution: { type: "string" },
  },
  required: [
    "roleTitle", "organisation", "overallFit", "fitSummary", "evidenceToLeadWith",
    "alignment", "questionsToClarify", "positioningAdvice", "importantCaution",
  ],
  additionalProperties: false,
};

export const jobSpecReviewRouter = router({
  list: protectedProcedure
    .input(z.object({ clientId: z.number().optional() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const clientId = await resolveJobSpecClientId(ctx, input);
      const rows = await db
        .select({
          id: jobSpecReviews.id,
          originalName: jobSpecReviews.originalName,
          feedbackJson: jobSpecReviews.feedbackJson,
          status: jobSpecReviews.status,
          errorMessage: jobSpecReviews.errorMessage,
          createdAt: jobSpecReviews.createdAt,
          analysedAt: jobSpecReviews.analysedAt,
        })
        .from(jobSpecReviews)
        .where(eq(jobSpecReviews.clientId, clientId))
        .orderBy(desc(jobSpecReviews.createdAt));
      return rows;
    }),

  uploadAndAnalyse: protectedProcedure
    .input(z.object({
      clientId: z.number().optional(),
      fileBase64: z.string().min(1),
      fileName: z.string().min(1).max(256),
      mimeType: z.enum(JOB_SPEC_ACCEPTED_MIME_TYPES),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const clientId = await resolveJobSpecClientId(ctx, input);
      const fileBuffer = Buffer.from(input.fileBase64, "base64");
      if (fileBuffer.length === 0 || fileBuffer.length > MAX_JOB_SPEC_BYTES) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Job specification files must be PDF or DOCX and no larger than 10 MB." });
      }

      const [{ reviewCount }] = await db
        .select({ reviewCount: count() })
        .from(jobSpecReviews)
        .where(eq(jobSpecReviews.clientId, clientId));
      if (!hasRoomForAnotherJobSpec(Number(reviewCount))) {
        throw new TRPCError({ code: "BAD_REQUEST", message: `You can keep up to ${MAX_JOB_SPEC_REVIEWS_PER_CLIENT} job specifications. Delete an earlier review before uploading another.` });
      }

      let extractedText = "";
      try {
        extractedText = await extractDocumentText(fileBuffer, input.mimeType);
      } catch {
        throw new TRPCError({ code: "BAD_REQUEST", message: "We could not read text from that document. Please upload a text-based PDF or DOCX file." });
      }
      if (extractedText.trim().length < 80) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "This document does not contain enough readable text for Alistair to assess." });
      }

      const suffix = randomBytes(10).toString("hex");
      const ext = input.mimeType === "application/pdf" ? "pdf" : "docx";
      const { key: fileKey, url: fileUrl } = await storagePut(
        `job-specifications/${clientId}-${suffix}.${ext}`,
        fileBuffer,
        input.mimeType,
      );
      const [inserted] = await db.insert(jobSpecReviews).values({
        clientId,
        uploadedByUserId: ctx.user.id,
        fileKey,
        fileUrl,
        originalName: input.fileName,
        extractedText: extractedText.slice(0, 60000),
      }).$returningId();
      const reviewId = inserted.id;

      try {
        const [[profile], [cv], [targetSpec], [report]] = await Promise.all([
          db.select({ firstName: clientProfiles.firstName, lastName: clientProfiles.lastName }).from(clientProfiles).where(eq(clientProfiles.id, clientId)).limit(1),
          db.select({ extractedText: clientCvs.extractedText }).from(clientCvs).where(eq(clientCvs.clientId, clientId)).orderBy(desc(clientCvs.uploadedAt)).limit(1),
          db.select({ spec: clientTargetSpec.spec }).from(clientTargetSpec).where(eq(clientTargetSpec.clientId, clientId)).limit(1),
          db.select({ wowReportJson: analysisReports.wowReportJson }).from(analysisReports).where(eq(analysisReports.clientId, clientId)).limit(1),
        ]);
        const clientName = [profile?.firstName, profile?.lastName].filter(Boolean).join(" ") || "the client";
        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content: `You are Alistair, a thoughtful Lifework career adviser. Compare a job specification with the client's documented evidence. Be strengths-led, candid and practical. Never invent experience, qualifications or achievements. Do not predict whether the employer will hire the client. “Overall fit” describes evidence alignment only, not suitability as an absolute judgement. Mark any unsupported requirement as not-yet-evidenced and frame it as a point to clarify or develop.`,
            },
            {
              role: "user",
              content: `CLIENT: ${clientName}

JOB SPECIFICATION:
${extractedText.slice(0, 18000)}

CLIENT ROLE SPECIFICATION:
${JSON.stringify(targetSpec?.spec ?? {}, null, 2).slice(0, 6000)}

CLIENT CV:
${(cv?.extractedText ?? "No CV has been uploaded.").slice(0, 10000)}

LIFEWORK REPORT EVIDENCE:
${(report?.wowReportJson ?? "No completed WOW report is available.").slice(0, 8000)}

Return a concise evidence-led review in the requested schema. Use 3–6 alignment rows and 3–5 questions to clarify.`,
            },
          ],
          response_format: {
            type: "json_schema",
            json_schema: { name: "job_spec_feedback", strict: true, schema: jobSpecFeedbackSchema },
          },
        });
        const content = response.choices?.[0]?.message?.content;
        if (typeof content !== "string") throw new Error("No structured feedback returned");
        const feedback = JSON.parse(content) as JobSpecFeedback;
        await db.update(jobSpecReviews).set({
          feedbackJson: JSON.stringify(feedback),
          status: "complete",
          analysedAt: new Date(),
        }).where(eq(jobSpecReviews.id, reviewId));
        return { id: reviewId, feedback };
      } catch (error) {
        const message = error instanceof Error ? error.message : "Alistair could not complete the review.";
        await db.update(jobSpecReviews).set({ status: "error", errorMessage: message.slice(0, 512), analysedAt: new Date() }).where(eq(jobSpecReviews.id, reviewId));
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "The job specification was saved, but Alistair could not complete the review. Please try again." });
      }
    }),

  remove: protectedProcedure
    .input(z.object({ id: z.number(), clientId: z.number().optional() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const clientId = await resolveJobSpecClientId(ctx, input);
      const [review] = await db.select().from(jobSpecReviews).where(and(eq(jobSpecReviews.id, input.id), eq(jobSpecReviews.clientId, clientId))).limit(1);
      if (!review) throw new TRPCError({ code: "NOT_FOUND", message: "Job specification review not found" });
      // Overwrite the opaque storage key before removing the database reference.
      await storagePut(review.fileKey, Buffer.alloc(0), "application/octet-stream").catch(() => undefined);
      await db.delete(jobSpecReviews).where(eq(jobSpecReviews.id, review.id));
      return { ok: true };
    }),
});
