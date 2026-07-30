/**
 * Jobs / Opportunities module — tRPC router
 *
 * All procedures are protectedProcedure (client must be logged in).
 * Counsellors can read any client's data via the clientId input.
 *
 * Procedures:
 *   jobs.getTargetSpec          — fetch the client's current target spec
 *   jobs.getMonitorList         — fetch the client's monitor list (companies to watch)
 *   jobs.getMatches             — fetch scored job matches (Open Roles tab)
 *   jobs.getSignals             — fetch latent signals (Early Signals tab)
 *   jobs.getSaved               — fetch saved jobs
 *   jobs.saveJob                — save a job (from match or signal)
 *   jobs.updateSaved            — update notes / status on a saved job
 *   jobs.deleteSaved            — remove a saved job
 *   jobs.getConstraints         — fetch client constraints
 *   jobs.setConstraints         — upsert client constraints
 *   jobs.triggerPipeline        — counsellor-only: kick off stages 1+2 for a client
 */

import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { eq, and, desc, gte, isNotNull, inArray, sql } from "drizzle-orm";
import {
  clientTargetSpec,
  clientConstraints,
  clientMonitorList,
  companyUniverse,
  jobListings,
  jobMatches,
  latentSignals,
  savedJobs,
  jobPipelineRuns,
  clientCvs,
  tailorApplications,
  clientProfiles as clientProfilesTable,
} from "../../drizzle/schema";
import { runStage1, runStage2, runStage3, runStage4, runStage5 } from "./jobsPipeline";
import { storagePut } from "../storage";
import { invokeLLM } from "../_core/llm";
import { randomBytes } from "crypto";

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Strip markdown code fences and sanitise control characters from LLM JSON responses.
 * Mirrors the same helper in jobsPipeline.ts — kept local to avoid circular imports.
 */
function stripFences(raw: string): string {
  let s = raw.trim();
  s = s.replace(/^\s*```[a-zA-Z]*\r?\n/, "");
  s = s.replace(/\r?\n\s*```\s*$/, "").trim();
  s = s.replace(/^\s*```[a-zA-Z]*\s*/, "").replace(/\s*```\s*$/, "").trim();
  let result = "";
  let inString = false;
  let escaped = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (escaped) { result += ch; escaped = false; continue; }
    if (ch === "\\") { escaped = true; result += ch; continue; }
    if (ch === '"') { inString = !inString; result += ch; continue; }
    if (inString) {
      if (ch === "\n") { result += "\\n"; continue; }
      if (ch === "\r") { result += "\\r"; continue; }
      if (ch === "\t") { result += "\\t"; continue; }
      if (ch.charCodeAt(0) < 0x20) continue;
    }
    result += ch;
  }
  return result;
}

/** Resolve the clientId for a request: clients use their own profile; counsellors pass an explicit clientId. */
async function resolveClientId(
  ctx: { user: { id: number; role: string } },
  input: { clientId?: number }
): Promise<number> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });

  if (ctx.user.role === "admin" && input.clientId) {
    return input.clientId;
  }

  // For regular clients, look up their own client profile
  const { clientProfiles } = await import("../../drizzle/schema");
  const [profile] = await db
    .select()
    .from(clientProfiles)
    .where(eq(clientProfiles.userId, ctx.user.id))
    .limit(1);

  if (!profile) throw new TRPCError({ code: "NOT_FOUND", message: "Client profile not found" });
  return profile.id;
}

// ─── Router ──────────────────────────────────────────────────────────────────

export const jobsRouter = router({
  /** Fetch the client's current target spec (if generated). */
  getTargetSpec: protectedProcedure
    .input(z.object({ clientId: z.number().optional() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const clientId = await resolveClientId(ctx, input);

      const [spec] = await db
        .select()
        .from(clientTargetSpec)
        .where(eq(clientTargetSpec.clientId, clientId))
        .limit(1);

      return spec ?? null;
    }),

  /** Save (overwrite) the client's target spec — used by counsellor edit mode. */
  saveTargetSpec: protectedProcedure
    .input(z.object({
      clientId: z.number().optional(),
      spec: z.record(z.string(), z.unknown()),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const clientId = await resolveClientId(ctx, input);
      const [existing] = await db
        .select({ id: clientTargetSpec.id })
        .from(clientTargetSpec)
        .where(eq(clientTargetSpec.clientId, clientId))
        .limit(1);
      const specJson = JSON.stringify(input.spec);
      if (existing) {
        await db
          .update(clientTargetSpec)
          .set({ spec: specJson, generatedAt: new Date() })
          .where(eq(clientTargetSpec.clientId, clientId));
      } else {
        await db.insert(clientTargetSpec).values({
          clientId,
          spec: specJson,
          generatedAt: new Date(),
        });
      }
      return { ok: true };
    }),

  /** Fetch the monitor list (companies to watch) with company details. */
  getMonitorList: protectedProcedure
    .input(z.object({ clientId: z.number().optional() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const clientId = await resolveClientId(ctx, input);

      const rows = await db
        .select({
          id: clientMonitorList.id,
          score: clientMonitorList.score,
          bucketWeight: clientMonitorList.bucketWeight,
          reason: clientMonitorList.reason,
          generatedAt: clientMonitorList.generatedAt,
          company: {
            id: companyUniverse.id,
            name: companyUniverse.name,
            domain: companyUniverse.domain,
            tier: companyUniverse.tier,
            sector: companyUniverse.sector,
            careersUrl: companyUniverse.careersUrl,
            atsProvider: companyUniverse.atsProvider,
          },
        })
        .from(clientMonitorList)
        .innerJoin(companyUniverse, eq(clientMonitorList.companyId, companyUniverse.id))
        .where(eq(clientMonitorList.clientId, clientId))
        .orderBy(desc(clientMonitorList.score));

      return rows;
    }),

  /** Fetch scored job matches (Open Roles tab). Optionally filter by score threshold. */
  getMatches: protectedProcedure
    .input(
      z.object({
        clientId: z.number().optional(),
        minScore: z.number().min(1).max(10).default(7),
        includeFiltered: z.boolean().default(false),
        limit: z.number().min(1).max(100).default(25),
        offset: z.number().min(0).default(0),
        companyIds: z.array(z.number()).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const clientId = await resolveClientId(ctx, input);

      const { count } = await import("drizzle-orm");

      const baseWhere = and(
        eq(jobMatches.clientId, clientId),
        input.includeFiltered ? undefined : eq(jobMatches.constraintStatus, "ok"),
        gte(jobMatches.score, input.minScore),
        input.companyIds && input.companyIds.length > 0
          ? inArray(companyUniverse.id, input.companyIds)
          : undefined
      );

      // Total count for pagination metadata
      const [{ total }] = await db
        .select({ total: count() })
        .from(jobMatches)
        .innerJoin(jobListings, eq(jobMatches.listingId, jobListings.id))
        .innerJoin(companyUniverse, eq(jobListings.companyId, companyUniverse.id))
        .where(baseWhere);

      const rows = await db
        .select({
          id: jobMatches.id,
          score: jobMatches.score,
          rationale: jobMatches.rationale,
          constraintStatus: jobMatches.constraintStatus,
          createdAt: jobMatches.createdAt,
          listing: {
            id: jobListings.id,
            title: jobListings.title,
            location: jobListings.location,
            url: jobListings.url,
            fetchedAt: jobListings.fetchedAt,
            expiresAt: jobListings.expiresAt,
          },
          company: {
            id: companyUniverse.id,
            name: companyUniverse.name,
            domain: companyUniverse.domain,
            sector: companyUniverse.sector,
            tier: companyUniverse.tier,
          },
        })
        .from(jobMatches)
        .innerJoin(jobListings, eq(jobMatches.listingId, jobListings.id))
        .innerJoin(companyUniverse, eq(jobListings.companyId, companyUniverse.id))
        .where(baseWhere)
        .orderBy(desc(jobMatches.score), desc(jobMatches.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      return { rows, total: Number(total), limit: input.limit, offset: input.offset };
    }),

  /** Return distinct companies that have matches for this client at the given score threshold, with counts. */
  getMatchCompanies: protectedProcedure
    .input(
      z.object({
        clientId: z.number().optional(),
        minScore: z.number().min(1).max(10).default(7),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const clientId = await resolveClientId(ctx, input);

      const rows = await db
        .select({
          companyId: companyUniverse.id,
          companyName: companyUniverse.name,
          sector: companyUniverse.sector,
          tier: companyUniverse.tier,
          matchCount: sql<number>`cast(count(${jobMatches.id}) as unsigned)`,
        })
        .from(jobMatches)
        .innerJoin(jobListings, eq(jobMatches.listingId, jobListings.id))
        .innerJoin(companyUniverse, eq(jobListings.companyId, companyUniverse.id))
        .where(
          and(
            eq(jobMatches.clientId, clientId),
            eq(jobMatches.constraintStatus, "ok"),
            gte(jobMatches.score, input.minScore)
          )
        )
        .groupBy(companyUniverse.id, companyUniverse.name, companyUniverse.sector, companyUniverse.tier)
        .orderBy(desc(sql`count(${jobMatches.id})`), companyUniverse.name);

      return rows;
    }),

  /** Fetch latent signals (Early Signals tab). */
  getSignals: protectedProcedure
    .input(
      z.object({
        clientId: z.number().optional(),
        minRelevance: z.number().min(0).max(3).default(1),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const clientId = await resolveClientId(ctx, input);

      const rows = await db
        .select()
        .from(latentSignals)
        .where(
          and(
            eq(latentSignals.clientId, clientId),
            gte(latentSignals.relevance, input.minRelevance)
          )
        )
        .orderBy(desc(latentSignals.createdAt));

      return rows;
    }),

  /** Fetch saved jobs. */
  getSaved: protectedProcedure
    .input(z.object({ clientId: z.number().optional() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const clientId = await resolveClientId(ctx, input);

      const rows = await db
        .select()
        .from(savedJobs)
        .where(eq(savedJobs.clientId, clientId))
        .orderBy(desc(savedJobs.updatedAt));

      return rows;
    }),

  /** Save a job (from a match or a signal). */
  saveJob: protectedProcedure
    .input(
      z.object({
        clientId: z.number().optional(),
        listingId: z.number().optional(),
        signalId: z.number().optional(),
        title: z.string().min(1),
        organisation: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const clientId = await resolveClientId(ctx, input);

      const inserted = await db.insert(savedJobs).values({
        clientId,
        listingId: input.listingId ?? null,
        signalId: input.signalId ?? null,
        title: input.title,
        organisation: input.organisation ?? null,
        notes: input.notes ?? null,
        status: "exploring",
      });

      return { id: (inserted as unknown as { insertId: number }[])[0]?.insertId };
    }),

  /** Update notes / status on a saved job. */
  updateSaved: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        notes: z.string().optional(),
        status: z.enum(["exploring", "applied", "not_for_me"]).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // Verify ownership
      const [row] = await db
        .select()
        .from(savedJobs)
        .where(eq(savedJobs.id, input.id))
        .limit(1);

      if (!row) throw new TRPCError({ code: "NOT_FOUND" });

      const clientId = await resolveClientId(ctx, {});
      if (row.clientId !== clientId && ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const updates: Partial<typeof savedJobs.$inferInsert> = {};
      if (input.notes !== undefined) updates.notes = input.notes;
      if (input.status !== undefined) updates.status = input.status;

      await db.update(savedJobs).set(updates).where(eq(savedJobs.id, input.id));
      return { ok: true };
    }),

  /** Remove a saved job. */
  deleteSaved: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [row] = await db
        .select()
        .from(savedJobs)
        .where(eq(savedJobs.id, input.id))
        .limit(1);

      if (!row) throw new TRPCError({ code: "NOT_FOUND" });

      const clientId = await resolveClientId(ctx, {});
      if (row.clientId !== clientId && ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      await db.delete(savedJobs).where(eq(savedJobs.id, input.id));
      return { ok: true };
    }),

  /** Fetch client constraints. */
  getConstraints: protectedProcedure
    .input(z.object({ clientId: z.number().optional() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const clientId = await resolveClientId(ctx, input);

      const [row] = await db
        .select()
        .from(clientConstraints)
        .where(eq(clientConstraints.clientId, clientId))
        .limit(1);

      return row ?? null;
    }),

  /** Upsert client constraints. */
  setConstraints: protectedProcedure
    .input(
      z.object({
        clientId: z.number().optional(),
        excludeCurrentEmployers: z.array(z.string()).optional(),
        excludeCompanies: z.array(z.string()).optional(),
        excludeSectors: z.array(z.string()).optional(),
        minTotalGbp: z.number().min(0).optional(),
        permanentOnly: z.boolean().optional(),
        hardExcludeLocations: z.array(z.string()).optional(),
        roleIntent: z.string().max(500).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const clientId = await resolveClientId(ctx, input);

      const [existing] = await db
        .select()
        .from(clientConstraints)
        .where(eq(clientConstraints.clientId, clientId))
        .limit(1);

      const values = {
        clientId,
        excludeCurrentEmployers: input.excludeCurrentEmployers ?? null,
        excludeCompanies: input.excludeCompanies ?? null,
        excludeSectors: input.excludeSectors ?? null,
        minTotalGbp: input.minTotalGbp ?? 0,
        permanentOnly: input.permanentOnly ?? false,
        hardExcludeLocations: input.hardExcludeLocations ?? null,
        roleIntent: input.roleIntent ?? null,
      };

      if (existing) {
        await db
          .update(clientConstraints)
          .set(values)
          .where(eq(clientConstraints.clientId, clientId));
      } else {
        await db.insert(clientConstraints).values(values);
      }

      return { ok: true };
    }),

  /**
   * Counsellor-only: trigger the pipeline for a specific client.
   * Returns immediately with a runId — use getPipelineStatus to poll for progress.
   * fullPipeline=false: stages 1+2 only. fullPipeline=true: all 5 stages.
   */
  triggerPipeline: protectedProcedure
    .input(z.object({ clientId: z.number(), fullPipeline: z.boolean().optional().default(false) }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Counsellors only" });
      }
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const totalStages = input.fullPipeline ? 5 : 2;

      // Create a run record immediately so the UI can poll
      const [inserted] = await db.insert(jobPipelineRuns).values({
        clientId: input.clientId,
        fullPipeline: input.fullPipeline,
        status: "pending",
        currentStage: 0,
        totalStages,
      }).$returningId();
      const runId = inserted.id;

      // Run the pipeline in the background — do NOT await
      // Stages are called directly in-process (no HTTP) to avoid timeout issues
      const stageFns = [
        () => runStage1(input.clientId),
        () => runStage2(input.clientId),
        ...(input.fullPipeline
          ? [
              () => runStage3(input.clientId),
              () => runStage4(input.clientId),
              () => runStage5(input.clientId),
            ]
          : []),
      ];

      // Fire and forget
      (async () => {
        try {
          await db
            .update(jobPipelineRuns)
            .set({ status: "running" })
            .where(eq(jobPipelineRuns.id, runId));

          for (let i = 0; i < stageFns.length; i++) {
            await db
              .update(jobPipelineRuns)
              .set({ currentStage: i + 1 })
              .where(eq(jobPipelineRuns.id, runId));

            await stageFns[i]();
          }

          await db
            .update(jobPipelineRuns)
            .set({ status: "done", currentStage: stageFns.length, completedAt: new Date() })
            .where(eq(jobPipelineRuns.id, runId));
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          await db
            .update(jobPipelineRuns)
            .set({ status: "error", errorMessage: msg.slice(0, 500), completedAt: new Date() })
            .where(eq(jobPipelineRuns.id, runId));
        }
      })();

      return { ok: true, runId, fullPipeline: input.fullPipeline };
    }),

  /** Poll the status of a pipeline run. */
  getPipelineStatus: protectedProcedure
    .input(z.object({ runId: z.number() }))
    .query(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [run] = await db
        .select()
        .from(jobPipelineRuns)
        .where(eq(jobPipelineRuns.id, input.runId))
        .limit(1);
      return run ?? null;
    }),

  /** Get the most recent completed pipeline run for the logged-in client (client-facing). */
  getLastPipelineRun: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return null;
    // Resolve the client profile ID (not the user ID) so the lookup works for non-admin users
    let clientId: number;
    try {
      clientId = await resolveClientId(ctx, {});
    } catch {
      return null;
    }
    const [run] = await db
      .select({ completedAt: jobPipelineRuns.completedAt, status: jobPipelineRuns.status })
      .from(jobPipelineRuns)
      .where(
        and(
          eq(jobPipelineRuns.clientId, clientId),
          eq(jobPipelineRuns.status, "done")
        )
      )
      .orderBy(desc(jobPipelineRuns.completedAt))
      .limit(1);
    return run ?? null;
  }),

  /** Get company universe stats (counsellor admin view). */
  getUniverseStats: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

    const all = await db.select().from(companyUniverse).where(eq(companyUniverse.active, true));
    const byTier = all.reduce(
      (acc, c) => {
        const k = c.tier ?? "unknown";
        acc[k] = (acc[k] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );
    const byAts = all.reduce(
      (acc, c) => {
        const k = c.atsProvider ?? "none";
        acc[k] = (acc[k] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    return { total: all.length, byTier, byAts };
  }),

  // ─── CV Upload ────────────────────────────────────────────────────────────

  /** Upload a CV (base64-encoded PDF or DOCX), extract text, store in S3 + DB. */
  uploadCv: protectedProcedure
    .input(z.object({
      clientId: z.number().optional(),
      fileBase64: z.string(),
      fileName: z.string(),
      mimeType: z.enum(["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const clientId = await resolveClientId(ctx, input);

      const fileBuffer = Buffer.from(input.fileBase64, "base64");
      if (fileBuffer.length > 10 * 1024 * 1024) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "CV file too large (max 10 MB)" });
      }

      // Extract text from PDF or DOCX
      let extractedText = "";
      try {
        if (input.mimeType === "application/pdf") {
          const pdfParseModule = await import("pdf-parse");
          // pdf-parse v2: pass data in constructor options, then call load() with no args
          type PDFParseInstance = { load: () => Promise<void>; getText: () => Promise<{ pages: { text: string }[]; text: string }> };
          type PDFParseModule = { PDFParse: new (opts: { verbosity: number; data: Buffer }) => PDFParseInstance };
          const { PDFParse } = pdfParseModule as unknown as PDFParseModule;
          const parser = new PDFParse({ verbosity: 0, data: fileBuffer }) as PDFParseInstance;
          await parser.load();
          const result = await parser.getText();
          extractedText = result.text ?? result.pages.map((p: { text: string }) => p.text).join("\n") ?? "";
        } else {
          const mammoth = await import("mammoth");
          const result = await mammoth.extractRawText({ buffer: fileBuffer });
          extractedText = result.value ?? "";
        }
      } catch (e) {
        console.error("[uploadCv] text extraction failed:", e);
      }

      // Upload to S3
      const suffix = randomBytes(10).toString("hex");
      const ext = input.mimeType === "application/pdf" ? "pdf" : "docx";
      const fileKey = `client-cvs/${clientId}-${suffix}.${ext}`;
      const { url: fileUrl } = await storagePut(fileKey, fileBuffer, input.mimeType);

      // Upsert: replace any previous CV for this client
      await db.delete(clientCvs).where(eq(clientCvs.clientId, clientId));
      const inserted = await db.insert(clientCvs).values({
        clientId,
        fileKey,
        fileUrl,
        originalName: input.fileName,
        extractedText: extractedText.slice(0, 60000), // cap at 60k chars
      });
      const cvId = (inserted as unknown as { insertId: number }[])[0]?.insertId ?? 0;
      return { cvId, fileUrl };
    }),

  /** Get the most recent CV for the logged-in client (or a specific client for counsellors). */
  getClientCv: protectedProcedure
    .input(z.object({ clientId: z.number().optional() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const clientId = await resolveClientId(ctx, input);

      const [cv] = await db
        .select()
        .from(clientCvs)
        .where(eq(clientCvs.clientId, clientId))
        .orderBy(desc(clientCvs.uploadedAt))
        .limit(1);

      return cv ?? null;
    }),

  // ─── Tailor Application ───────────────────────────────────────────────────

  /** Upload a sample covering letter (PDF or DOCX) to use as a style reference for future applications. */
  uploadCoverLetter: protectedProcedure
    .input(z.object({
      clientId: z.number().optional(),
      fileBase64: z.string(),
      fileName: z.string(),
      mimeType: z.enum(["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const clientId = await resolveClientId(ctx, input);

      const fileBuffer = Buffer.from(input.fileBase64, "base64");
      if (fileBuffer.length > 10 * 1024 * 1024) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "File too large (max 10 MB)" });
      }

      // Extract text from PDF or DOCX
      let extractedText = "";
      try {
        if (input.mimeType === "application/pdf") {
          const pdfParseModule = await import("pdf-parse");
          type PDFParseInstance = { load: () => Promise<void>; getText: () => Promise<{ pages: { text: string }[]; text: string }> };
          type PDFParseModule = { PDFParse: new (opts: { verbosity: number; data: Buffer }) => PDFParseInstance };
          const { PDFParse } = pdfParseModule as unknown as PDFParseModule;
          const parser = new PDFParse({ verbosity: 0, data: fileBuffer }) as PDFParseInstance;
          await parser.load();
          const result = await parser.getText();
          extractedText = result.text ?? result.pages.map((p: { text: string }) => p.text).join("\n") ?? "";
        } else {
          const mammoth = await import("mammoth");
          const result = await mammoth.extractRawText({ buffer: fileBuffer });
          extractedText = result.value ?? "";
        }
      } catch (e) {
        console.error("[uploadCoverLetter] text extraction failed:", e);
      }

      // Update the existing CV row — covering letter sample lives alongside the CV
      const [existing] = await db
        .select({ id: clientCvs.id })
        .from(clientCvs)
        .where(eq(clientCvs.clientId, clientId))
        .orderBy(desc(clientCvs.uploadedAt))
        .limit(1);

      if (!existing) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Please upload your CV first before adding a covering letter sample." });
      }

      await db
        .update(clientCvs)
        .set({
          coveringLetterText: extractedText.slice(0, 20000),
          coveringLetterName: input.fileName,
        })
        .where(eq(clientCvs.id, existing.id));

      return { ok: true };
    }),

  /** Generate a tailored CV rewrite and covering email for a specific job listing. */
  tailorApplication: protectedProcedure
    .input(z.object({
      clientId: z.number().optional(),
      listingId: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const clientId = await resolveClientId(ctx, input);

      // 1. Fetch the client's CV
      const [cv] = await db
        .select()
        .from(clientCvs)
        .where(eq(clientCvs.clientId, clientId))
        .orderBy(desc(clientCvs.uploadedAt))
        .limit(1);
      if (!cv) throw new TRPCError({ code: "BAD_REQUEST", message: "No CV uploaded yet. Please upload your CV first." });

      // 2. Fetch the listing + company info
      const [listingRow] = await db
        .select({
          title: jobListings.title,
          url: jobListings.url,
          location: jobListings.location,
          companyName: companyUniverse.name,
          companyTier: companyUniverse.tier,
          companySector: companyUniverse.sector,
          companyQualities: companyUniverse.qualities,
        })
        .from(jobListings)
        .innerJoin(companyUniverse, eq(jobListings.companyId, companyUniverse.id))
        .where(eq(jobListings.id, input.listingId))
        .limit(1);
      if (!listingRow) throw new TRPCError({ code: "NOT_FOUND", message: "Listing not found" });

      // 3. Fetch the client's target spec (WOW report narrative)
      const [specRow] = await db
        .select({ spec: clientTargetSpec.spec })
        .from(clientTargetSpec)
        .where(eq(clientTargetSpec.clientId, clientId))
        .limit(1);
      const targetSpec = specRow?.spec ?? {};

      // 4. Fetch the client's name from their profile
      const [profile] = await db
        .select({ firstName: clientProfilesTable.firstName, lastName: clientProfilesTable.lastName })
        .from(clientProfilesTable)
        .where(eq(clientProfilesTable.id, clientId))
        .limit(1);
      const clientName = [profile?.firstName, profile?.lastName].filter(Boolean).join(" ") || "the client";

      // 5. Build the LLM prompt
      const qualities: string[] = Array.isArray(listingRow.companyQualities)
        ? (listingRow.companyQualities as string[])
        : [];
      const qualityLabels: Record<string, string> = {
        autonomy: "Autonomy & independence",
        structured_learning: "Structured learning & development",
        social_impact: "Social impact & purpose",
        commercial_intensity: "Commercial intensity",
        collaboration: "Collaboration & teamwork",
        innovation: "Innovation & creativity",
        prestige: "Prestige & brand",
        scale_and_stability: "Scale & stability",
      };
      const qualityDescriptions = qualities.map((q) => qualityLabels[q] ?? q).join(", ");

      const systemPrompt = `You are an expert career coach and professional writer. 
Your task is to help a client tailor their CV and write a covering email for a specific job application.

IMPORTANT RULES:
- Do NOT fabricate any experience, skills, or qualifications not present in the original CV.
- Do NOT change dates, job titles, or employer names.
- You may reorder sections, adjust emphasis, rephrase descriptions, and foreground relevant experience.
- The covering email must open with 2-3 sentences of genuine personal truth drawn from the client's profile narrative — not generic statements.${cv.coveringLetterText ? `
- STYLE MATCHING: A sample covering letter written by the client is provided. Match their natural voice, sentence rhythm, vocabulary level, and structural preferences as closely as possible. Do not copy content — only mirror the style.` : ""}
- Write in a professional, confident, and warm tone consistent with the Pennington Hennessy brand.`;

      const userPrompt = `CLIENT: ${clientName}

ROLE APPLIED FOR: ${listingRow.title} at ${listingRow.companyName}
LOCATION: ${listingRow.location ?? "Not specified"}
COMPANY TYPE: ${listingRow.companyTier ?? ""} — ${listingRow.companySector ?? ""}
COMPANY CULTURE QUALITIES: ${qualityDescriptions || "Not specified"}

CLIENT PROFILE NARRATIVE (from WOW report):
${JSON.stringify(targetSpec, null, 2).slice(0, 3000)}

CLIENT'S CURRENT CV:
${(cv.extractedText ?? "").slice(0, 8000)}
${cv.coveringLetterText ? `
CLIENT'S COVERING LETTER STYLE SAMPLE (use this to match their natural writing voice — do NOT copy the content):
${cv.coveringLetterText.slice(0, 3000)}
` : ""}
Please produce TWO outputs:

1. TAILORED CV — Rewrite the CV to emphasise the experience and language most relevant to this role and firm. Keep all factual content accurate. Restructure, reorder, and reframe as needed. Format as clean plain text with section headings in CAPS.

2. COVERING EMAIL — Write a covering email (max 350 words) that:
   - Opens with 2-3 sentences of genuine personal truth from the client's profile (their differentiators, what drives them, what they are looking for)
   - Connects those truths to what this specific role and firm offers
   - Closes with a confident, professional call to action
   - Is addressed to "Dear Hiring Manager" unless a name is available

Return your response as JSON with this exact structure:
{
  "rewrittenCv": "...",
  "coveringEmail": "..."
}`;

      // 6. Call the LLM
      const llmResponse = await invokeLLM({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "tailor_application",
            strict: true,
            schema: {
              type: "object",
              properties: {
                rewrittenCv: { type: "string" },
                coveringEmail: { type: "string" },
              },
              required: ["rewrittenCv", "coveringEmail"],
              additionalProperties: false,
            },
          },
        },
      });

      const rawContent = llmResponse?.choices?.[0]?.message?.content;
      const rawStr = typeof rawContent === "string" ? rawContent : "{}";
      // Apply fence stripping and control-char sanitisation (Claude sometimes wraps in ```json)
      const content = stripFences(rawStr);
      let parsed: { rewrittenCv: string; coveringEmail: string } | null = null;
      try {
        parsed = JSON.parse(content);
      } catch {
        // Fallback: try to extract the first {...} block in case of preamble text
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try { parsed = JSON.parse(jsonMatch[0]); } catch { /* fall through */ }
        }
      }
      if (!parsed?.rewrittenCv || !parsed?.coveringEmail) {
        console.error("[tailorApplication] LLM raw content (first 500 chars):", rawStr.slice(0, 500));
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "LLM returned invalid JSON" });
      }

      // 7. Store the result
      await db.insert(tailorApplications).values({
        clientId,
        listingId: input.listingId,
        cvId: cv.id,
        rewrittenCv: parsed.rewrittenCv,
        coveringEmail: parsed.coveringEmail,
        status: "done",
      });

      return { rewrittenCv: parsed.rewrittenCv, coveringEmail: parsed.coveringEmail };
    }),
});
