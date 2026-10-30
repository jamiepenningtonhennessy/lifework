import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { invokeLLM } from "../_core/llm";
import { storagePut } from "../storage";
import { preflightReportPdf } from "../reportPdfPreflight";
import { renderReportDesignBetaPdf } from "../reportDesignBetaPdf";
import {
  createWowReportDesignBetaVersion,
  getAnalysisReport,
  getClientProfileById,
  getWowReportDesignBetaVersion,
  listWowReportDesignBetaVersions,
} from "../db";
import {
  buildLayoutPlanningBrief,
  createDefaultReportDesignLayoutPlan,
  parseReportDesignBetaSnapshot,
  presentSectionKeys,
  reportDesignLayoutPlanSchema,
  validateLayoutPlan,
  WOW_REPORT_DESIGN_BETA_1_VERSION,
  type ReportDesignLayoutPlan,
} from "../../shared/wowReportDesignBeta";
import { parseWowReportBeta1Snapshot } from "../../shared/wowReportBeta1";

const designBetaReviewProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Report design beta review is restricted to the master counsellor account.",
    });
  }
  return next({ ctx });
});

const layoutPlanOutputSchema = {
  type: "object",
  additionalProperties: false,
  required: ["sourceOrder", "sections"],
  properties: {
    sourceOrder: {
      type: "array",
      items: { type: "string", enum: ["summary", "lifeHistoryPattern", "fourPillars", "viaSection", "personalitySection", "behaviouralStyle", "careerDirections", "developmentEdge", "coachingQuestions"] },
    },
    sections: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["key", "treatment", "emphasis", "breakBefore"],
        properties: {
          key: { type: "string", enum: ["summary", "lifeHistoryPattern", "fourPillars", "viaSection", "personalitySection", "behaviouralStyle", "careerDirections", "developmentEdge", "coachingQuestions"] },
          treatment: { type: "string", enum: ["opening", "narrative", "conditions", "evidence", "lens", "direction", "reflection", "closing"] },
          emphasis: { type: "string", enum: ["quiet", "standard", "featured"] },
          breakBefore: { type: "boolean" },
        },
      },
    },
  },
} as const;

function responseText(response: Awaited<ReturnType<typeof invokeLLM>>): string {
  const content = response.choices[0]?.message.content;
  if (typeof content === "string") return content;
  return Array.isArray(content)
    ? content.filter((part) => part.type === "text").map((part) => part.text).join("\n")
    : "";
}

/**
 * Claude receives only existing field keys and local size bands. It never sees
 * the report prose, a client name, a report ID, dates, or any client evidence.
 */
async function makeClaudeLayoutPlan(sourceSections: ReturnType<typeof parseWowReportBeta1Snapshot>): Promise<{
  layoutPlan: ReportDesignLayoutPlan;
  planner: "claude-sonnet-4-6" | "local-fallback";
}> {
  const metadata = buildLayoutPlanningBrief(sourceSections);
  const fallback = createDefaultReportDesignLayoutPlan(sourceSections);
  if (!metadata.length) return { layoutPlan: fallback, planner: "local-fallback" };

  try {
    const response = await invokeLLM({
      model: "claude-sonnet-4-6",
      maxTokens: 700,
      outputSchema: {
        name: "lifework_report_design_layout_plan",
        strict: true,
        schema: layoutPlanOutputSchema,
      },
      messages: [
        {
          role: "system",
          content: [
            "You are a layout planner for a private counsellor-only report review.",
            "Create a presentation-only layout plan using only supplied section keys and length bands.",
            "You are not a report writer or analyst. You do not receive prose and must not infer, add, rewrite, summarise, quote, classify or explain report content.",
            "Return JSON only. Include every supplied key exactly once and no other key.",
            "sourceOrder is the recommended reading sequence. treatment, emphasis and breakBefore control visual hierarchy only.",
            "Do not return headings, labels, explanations, citations, markdown, client information or report text.",
          ].join(" "),
        },
        { role: "user", content: JSON.stringify({ availableSections: metadata }) },
      ],
    });

    const parsed = reportDesignLayoutPlanSchema.safeParse(JSON.parse(responseText(response)));
    if (!parsed.success) throw new Error("Invalid structured layout plan");
    validateLayoutPlan(parsed.data, presentSectionKeys(sourceSections));
    return { layoutPlan: parsed.data, planner: "claude-sonnet-4-6" };
  } catch (error) {
    const category = error instanceof Error ? error.name : "Unknown planner failure";
    console.warn(`[report-design-beta] Layout planner unavailable; standard review layout used (${category}).`);
    return { layoutPlan: fallback, planner: "local-fallback" };
  }
}

function proseExcerpt(text: string): string {
  return text
    .replace(/^#{1,3}\s+/gm, "")
    .replace(/[\*`_]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .slice(0, 4)
    .join(" ");
}

/**
 * Creates a fully separate immutable design beta: it reads a completed report,
 * writes only append-only beta storage, and never updates analysis_reports.
 */
export const reportDesignBetaRouter = router({
  list: designBetaReviewProcedure
    .input(z.object({ clientId: z.number().int().positive() }))
    .query(async ({ input }) => listWowReportDesignBetaVersions(input.clientId)),

  get: designBetaReviewProcedure
    .input(z.object({ clientId: z.number().int().positive(), betaId: z.string().uuid() }))
    .query(async ({ input }) => {
      const version = await getWowReportDesignBetaVersion(input.betaId);
      if (!version || version.clientId !== input.clientId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Report design beta review copy not found." });
      }
      const snapshot = parseReportDesignBetaSnapshot(version.designSnapshot);
      return {
        id: version.id,
        clientId: version.clientId,
        betaVersion: version.betaVersion,
        sourceReportGeneratedAt: version.sourceReportGeneratedAt,
        createdAt: version.createdAt,
        planner: snapshot.planner ?? "local-fallback",
        sourceSections: snapshot.sourceSections,
        layoutPlan: snapshot.layoutPlan,
      };
    }),

  create: designBetaReviewProcedure
    .input(z.object({ clientId: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      const [report, profile] = await Promise.all([
        getAnalysisReport(input.clientId),
        getClientProfileById(input.clientId),
      ]);
      if (!report?.wowReportJson || report.wowReportStatus !== "done" || !profile) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "A completed production WOW Report is needed before a report design beta can be created.",
        });
      }

      const sourceSections = parseWowReportBeta1Snapshot(report.wowReportJson);
      const { layoutPlan, planner } = await makeClaudeLayoutPlan(sourceSections);
      const snapshot = { sourceSections, layoutPlan, planner };
      const clientName = [profile.firstName, profile.lastName].filter(Boolean).join(" ") || "Client";
      const pdf = await renderReportDesignBetaPdf({ snapshot, clientName });

      const requiredPhrases = presentSectionKeys(sourceSections)
        .map((key) => proseExcerpt(sourceSections[key]))
        .filter((excerpt) => excerpt.length > 0);
      await preflightReportPdf(pdf, {
        documentLabel: "Lifework Report Design Beta",
        minimumPages: 2,
        requiredPhrases: [clientName, "Lifework", ...requiredPhrases],
        footerMarkers: ["Lifework", "Internal", "Confidential"],
        headerMarkers: ["Report Design Beta 1"],
        headerRequiredFromPage: 1,
      });

      const { url: pdfUrl } = await storagePut(
        `wow-report-design-beta/client-${input.clientId}-${Date.now()}.pdf`,
        pdf,
        "application/pdf",
      );
      const version = await createWowReportDesignBetaVersion({
        clientId: input.clientId,
        betaVersion: WOW_REPORT_DESIGN_BETA_1_VERSION,
        sourceReportGeneratedAt: report.wowReportGeneratedAt,
        designSnapshot: JSON.stringify(snapshot),
        pdfUrl,
        createdByUserId: ctx.user.id,
      });

      return { betaId: version.id, betaVersion: version.betaVersion, planner };
    }),
});
