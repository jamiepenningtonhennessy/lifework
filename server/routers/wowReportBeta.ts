import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import {
  createWowReportBetaVersion,
  getAnalysisReport,
  getWowReportBetaVersion,
  listWowReportBetaVersions,
} from "../db";
import {
  WOW_REPORT_BETA_1_VERSION,
  parseWowReportBeta1Snapshot,
} from "../../shared/wowReportBeta1";

const betaReviewProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Beta report review is restricted to the master counsellor account.",
    });
  }
  return next({ ctx });
});

/**
 * A deliberately separate report-review path.
 *
 * It snapshots an existing completed production report exactly once, then the
 * Beta 1 viewer reads that stored JSON only. It never invokes the production
 * generator and it never writes analysis_reports.
 */
export const wowReportBetaRouter = router({
  list: betaReviewProcedure
    .input(z.object({ clientId: z.number().int().positive() }))
    .query(async ({ input }) => {
      return listWowReportBetaVersions(input.clientId);
  }),

  get: betaReviewProcedure
    .input(z.object({ betaId: z.string().uuid(), clientId: z.number().int().positive() }))
    .query(async ({ input }) => {
      const version = await getWowReportBetaVersion(input.betaId);
      if (!version || version.clientId !== input.clientId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Beta 1 review copy not found." });
      }

      const sourceSections = parseWowReportBeta1Snapshot(version.sectionsSnapshot);
      return {
        id: version.id,
        clientId: version.clientId,
        betaVersion: version.betaVersion,
        sourceReportGeneratedAt: version.sourceReportGeneratedAt,
        createdAt: version.createdAt,
        sourceSections,
      };
    }),

  /**
   * Creates a fresh, immutable Beta 1 snapshot from the current completed
   * production report. No report content is regenerated or rewritten here.
   */
  createSnapshot: betaReviewProcedure
    .input(z.object({ clientId: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      const report = await getAnalysisReport(input.clientId);
      if (!report?.wowReportJson || report.wowReportStatus !== "done") {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "A completed production WOW Report is needed before Beta 1 can be reviewed.",
        });
      }

      // Validate before persistence. This also guarantees the beta viewer never
      // has to fall back to data from the live production record.
      parseWowReportBeta1Snapshot(report.wowReportJson);
      const version = await createWowReportBetaVersion({
        clientId: input.clientId,
        betaVersion: WOW_REPORT_BETA_1_VERSION,
        sourceReportGeneratedAt: report.wowReportGeneratedAt,
        sectionsSnapshot: report.wowReportJson,
        createdByUserId: ctx.user.id,
      });

      return { betaId: version.id, betaVersion: version.betaVersion };
    }),
});
