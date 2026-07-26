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
import { eq, and, desc, gte, isNotNull } from "drizzle-orm";
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
} from "../../drizzle/schema";
import { runStage1, runStage2, runStage3, runStage4, runStage5 } from "./jobsPipeline";

// ─── Helpers ─────────────────────────────────────────────────────────────────

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
        minScore: z.number().min(1).max(10).default(5),
        includeFiltered: z.boolean().default(false),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const clientId = await resolveClientId(ctx, input);

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
        .where(
          and(
            eq(jobMatches.clientId, clientId),
            input.includeFiltered ? undefined : eq(jobMatches.constraintStatus, "ok"),
            gte(jobMatches.score, input.minScore)
          )
        )
        .orderBy(desc(jobMatches.score), desc(jobMatches.createdAt));

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
});
