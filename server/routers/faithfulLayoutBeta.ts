import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  createWowReportDesignBetaVersion,
  getAchievements,
  getAnalysisReport,
  getFamilyBackground,
  getCareerHistory,
  getWowReportDesignBetaVersion,
  listWowReportDesignBetaVersions,
} from "../db";
import { storagePut } from "../storage";
import { preflightReportPdf } from "../reportPdfPreflight";
import { renderFaithfulLayoutBetaPdf } from "../reportFaithfulLayoutBetaPdf";
import {
  createFaithfulLayoutBetaSnapshot,
  FAITHFUL_CLIENT_REPORT_SEQUENCE,
  FAITHFUL_LAYOUT_BETA_VERSION,
  parseFaithfulLayoutBetaSnapshot,
} from "../../shared/faithfulLayoutBeta";

const faithfulLayoutBetaProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Faithful report layout beta review is restricted to the master counsellor account.",
    });
  }
  return next({ ctx });
});

function requiredExcerpt(value: string): string {
  return value.replace(/\s+/g, " ").trim().split(" ").slice(0, 4).join(" ");
}

/**
 * A layout-only reprint. It writes an immutable beta record and never updates
 * the production analysis report, prompts a model, or creates a new analysis.
 */
export const faithfulLayoutBetaRouter = router({
  list: faithfulLayoutBetaProcedure
    .input(z.object({ clientId: z.number().int().positive() }))
    .query(async ({ input }) => listWowReportDesignBetaVersions(input.clientId, FAITHFUL_LAYOUT_BETA_VERSION)),

  get: faithfulLayoutBetaProcedure
    .input(z.object({ clientId: z.number().int().positive(), betaId: z.string().uuid() }))
    .query(async ({ input }) => {
      const version = await getWowReportDesignBetaVersion(input.betaId);
      if (
        !version
        || version.clientId !== input.clientId
        || version.betaVersion !== FAITHFUL_LAYOUT_BETA_VERSION
      ) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Faithful report layout beta not found." });
      }
      const snapshot = parseFaithfulLayoutBetaSnapshot(version.designSnapshot);
      return {
        id: version.id,
        clientId: version.clientId,
        betaVersion: version.betaVersion,
        sourceReportGeneratedAt: version.sourceReportGeneratedAt,
        createdAt: version.createdAt,
        source: snapshot.source,
        annexCounts: {
          achievements: snapshot.annex.achievements.length,
          careers: snapshot.annex.careers.length,
        },
      };
    }),

  create: faithfulLayoutBetaProcedure
    .input(z.object({ clientId: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      const report = await getAnalysisReport(input.clientId);
      if (!report?.wowReportJson || report.wowReportStatus !== "done") {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "A completed production WOW Report is needed before a faithful layout beta can be created.",
        });
      }

      // These values are read exactly once here and retained in the immutable
      // snapshot. Reopening the beta later cannot pick up changed client data.
      const [family, careers, achievements] = await Promise.all([
        getFamilyBackground(input.clientId),
        getCareerHistory(input.clientId),
        getAchievements(input.clientId),
      ]);
      const snapshot = createFaithfulLayoutBetaSnapshot({
        report: JSON.parse(report.wowReportJson),
        family: family ? {
          fatherOccupation: family.fatherOccupation,
          motherOccupation: family.motherOccupation,
          siblingPosition: family.siblingPosition,
          upbringingLocation: family.upbringingLocation,
          familyNarrative: family.familyNarrative,
          significantInfluences: family.significantInfluences,
        } : {},
        careers: careers.map((career) => ({
          organisation: career.organisation,
          role: career.role,
          yearFrom: career.yearFrom,
          yearTo: career.yearTo,
          keyResponsibilities: career.keyResponsibilities,
          whyLeft: career.whyLeft,
          highlights: career.highlights,
        })),
        achievements: achievements.map((achievement) => ({
          decade: achievement.decade,
          title: achievement.title,
          age: achievement.age,
          description: achievement.description,
          sageEnrichment: achievement.sageEnrichment,
          esf: achievement.esf,
          sortOrder: achievement.sortOrder,
        })),
      });
      const pdf = await renderFaithfulLayoutBetaPdf({ snapshot });
      const reportExcerpts = [
        snapshot.source.summary,
        snapshot.source.lifeHistoryPattern,
        snapshot.source.fourPillars,
        snapshot.source.viaSection,
        snapshot.source.personalitySection,
        snapshot.source.behaviouralStyle,
        snapshot.source.developmentEdge,
        snapshot.source.coachingQuestions,
        snapshot.source.careerDirections,
      ].map(requiredExcerpt).filter(Boolean);
      await preflightReportPdf(pdf, {
        documentLabel: "Lifework faithful layout beta",
        minimumPages: 8,
        requiredPhrases: [
          snapshot.source.clientFullName,
          "Lifework",
          ...FAITHFUL_CLIENT_REPORT_SEQUENCE.slice(2),
          ...reportExcerpts,
        ],
        headerMarkers: ["Lifework Career Analysis"],
        headerRequiredFromPage: 1,
        footerMarkers: ["Lifework", "Confidential"],
      });

      const { url: pdfUrl } = await storagePut(
        `wow-report-faithful-layout-beta/client-${input.clientId}-${Date.now()}.pdf`,
        pdf,
        "application/pdf",
      );
      const version = await createWowReportDesignBetaVersion({
        clientId: input.clientId,
        betaVersion: FAITHFUL_LAYOUT_BETA_VERSION,
        sourceReportGeneratedAt: report.wowReportGeneratedAt,
        designSnapshot: JSON.stringify(snapshot),
        pdfUrl,
        createdByUserId: ctx.user.id,
      });
      return { betaId: version.id, betaVersion: version.betaVersion };
    }),
});
