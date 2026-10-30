import { z } from "zod";
import {
  getWowReportBeta1Movements,
  parseWowReportBeta1Snapshot,
  type WowReportBeta1SourceSections,
} from "./wowReportBeta1";

/**
 * Report Design Beta 1 is an editorial-layout experiment only. Its source prose
 * stays frozen; Claude may choose page rhythm and component treatments, never
 * write, summarise or alter a client conclusion.
 */
export const WOW_REPORT_DESIGN_BETA_1_VERSION = "design-beta-1" as const;

export const REPORT_DESIGN_SECTION_KEYS = [
  "summary",
  "lifeHistoryPattern",
  "fourPillars",
  "viaSection",
  "personalitySection",
  "behaviouralStyle",
  "careerDirections",
  "developmentEdge",
  "coachingQuestions",
] as const;

export type ReportDesignSectionKey = (typeof REPORT_DESIGN_SECTION_KEYS)[number];

const sectionKeySchema = z.enum(REPORT_DESIGN_SECTION_KEYS);
const treatmentSchema = z.enum([
  "opening",
  "narrative",
  "conditions",
  "evidence",
  "lens",
  "direction",
  "reflection",
  "closing",
]);
const emphasisSchema = z.enum(["quiet", "standard", "featured"]);

export const reportDesignLayoutPlanSchema = z
  .object({
    sourceOrder: z.array(sectionKeySchema).min(1).max(REPORT_DESIGN_SECTION_KEYS.length),
    sections: z.array(z.object({
      key: sectionKeySchema,
      treatment: treatmentSchema,
      emphasis: emphasisSchema,
      breakBefore: z.boolean(),
    }).strict()).min(1).max(REPORT_DESIGN_SECTION_KEYS.length),
  })
  .strict();

export type ReportDesignLayoutPlan = z.infer<typeof reportDesignLayoutPlanSchema>;

export type ReportDesignBetaSnapshot = {
  sourceSections: WowReportBeta1SourceSections;
  layoutPlan: ReportDesignLayoutPlan;
  planner?: "claude-sonnet-4-6" | "local-fallback";
};

export type LayoutPlanningMetadata = Array<{
  key: ReportDesignSectionKey;
  lengthBand: "short" | "medium" | "long";
}>;

export function parseReportDesignBetaSnapshot(snapshot: string): ReportDesignBetaSnapshot {
  let parsed: unknown;
  try {
    parsed = JSON.parse(snapshot);
  } catch {
    throw new Error("The frozen report design beta snapshot is not valid JSON.");
  }

  if (!parsed || typeof parsed !== "object") {
    throw new Error("The frozen report design beta snapshot has an invalid shape.");
  }

  const candidate = parsed as { sourceSections?: unknown; layoutPlan?: unknown };
  const sourceSections = parseWowReportBeta1Snapshot(JSON.stringify(candidate.sourceSections));
  const layoutResult = reportDesignLayoutPlanSchema.safeParse(candidate.layoutPlan);
  if (!layoutResult.success) {
    throw new Error("The frozen report design beta layout plan is invalid.");
  }

  validateLayoutPlan(layoutResult.data, presentSectionKeys(sourceSections));
  return { sourceSections, layoutPlan: layoutResult.data };
}

export function presentSectionKeys(sourceSections: WowReportBeta1SourceSections): ReportDesignSectionKey[] {
  return REPORT_DESIGN_SECTION_KEYS.filter((key) => sourceSections[key].trim().length > 0);
}

export function validateLayoutPlan(
  plan: ReportDesignLayoutPlan,
  availableKeys: readonly ReportDesignSectionKey[] = REPORT_DESIGN_SECTION_KEYS,
): ReportDesignLayoutPlan {
  const expected = new Set<ReportDesignSectionKey>(availableKeys);
  const sourceKeys = new Set(plan.sourceOrder);
  const sectionKeys = new Set(plan.sections.map((section) => section.key));

  if (sourceKeys.size !== availableKeys.length || sectionKeys.size !== availableKeys.length) {
    throw new Error("The report design beta layout plan must contain every available source section exactly once.");
  }
  for (const key of Array.from(expected)) {
    if (!sourceKeys.has(key) || !sectionKeys.has(key)) {
      throw new Error("The report design beta layout plan must retain every available source section.");
    }
  }
  return plan;
}

/** A safe local fallback if the layout planner is temporarily unavailable. */
export function createDefaultReportDesignLayoutPlan(
  sourceSections: WowReportBeta1SourceSections,
): ReportDesignLayoutPlan {
  const movementOrder = getWowReportBeta1Movements().flatMap((movement) =>
    movement.sections.map((section) => section.key as ReportDesignSectionKey),
  ).filter((key) => sourceSections[key].trim().length > 0);
  const treatments: Record<ReportDesignSectionKey, ReportDesignLayoutPlan["sections"][number]["treatment"]> = {
    summary: "opening",
    lifeHistoryPattern: "narrative",
    fourPillars: "conditions",
    viaSection: "evidence",
    personalitySection: "lens",
    behaviouralStyle: "lens",
    careerDirections: "direction",
    developmentEdge: "reflection",
    coachingQuestions: "closing",
  };

  return {
    sourceOrder: movementOrder,
    sections: movementOrder.map((key, index) => ({
      key,
      treatment: treatments[key],
      emphasis: index === 0 || key === "careerDirections" ? "featured" : "standard",
      breakBefore: index > 0 && ["fourPillars", "careerDirections"].includes(key),
    })),
  };
}

export function buildLayoutPlanningBrief(sourceSections: WowReportBeta1SourceSections): LayoutPlanningMetadata {
  return REPORT_DESIGN_SECTION_KEYS.map((key) => {
    const text = sourceSections[key] ?? "";
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    if (!words) return null;
    const lengthBand = words < 180 ? "short" : words < 550 ? "medium" : "long";
    return { key, lengthBand };
  }).filter((item): item is { key: ReportDesignSectionKey; lengthBand: "short" | "medium" | "long" } => Boolean(item));
}

export const DESIGN_BETA_SECTION_LABELS: Record<ReportDesignSectionKey, {
  eyebrow: string;
  title: string;
  sourceLabel: string;
}> = {
  summary: { eyebrow: "Begin with recognition", title: "What this report sees first", sourceLabel: "Opening synthesis" },
  lifeHistoryPattern: { eyebrow: "Life-history evidence", title: "How the pattern has repeated", sourceLabel: "Life history" },
  fourPillars: { eyebrow: "Conditions of fulfilment", title: "What helps you do your best work", sourceLabel: "Four conditions" },
  viaSection: { eyebrow: "Character strengths", title: "The strengths visible in the evidence", sourceLabel: "VIA lens" },
  personalitySection: { eyebrow: "Psychometric lens", title: "What the psychometrics add", sourceLabel: "Big Five lens" },
  behaviouralStyle: { eyebrow: "Working style", title: "How the pattern tends to show up", sourceLabel: "Behavioural lens" },
  careerDirections: { eyebrow: "Possible directions", title: "Where the evidence might lead", sourceLabel: "Options to explore" },
  developmentEdge: { eyebrow: "Development edge", title: "What may get in the way", sourceLabel: "Patterns to notice" },
  coachingQuestions: { eyebrow: "Closing synthesis", title: "The conversation to have next", sourceLabel: "Questions for coaching" },
};
