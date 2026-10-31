import { z } from "zod";

/**
 * This beta is a layout-only reprint of the established client report.
 * It deliberately preserves the production document's existing sequence,
 * headings, report prose, charts/data and annex content. It never calls a
 * model, changes conclusions or writes to the live analysis report.
 */
export const FAITHFUL_LAYOUT_BETA_VERSION = "faithful-layout-beta-1" as const;

const scoreRecordSchema = z.record(z.string(), z.number());

const reportSourceSchema = z.object({
  clientName: z.string(),
  clientFullName: z.string(),
  generatedAt: z.string(),
  summary: z.string(),
  lifeHistoryPattern: z.string(),
  viaSection: z.string(),
  personalitySection: z.string(),
  behaviouralStyle: z.string(),
  primaryColour: z.string(),
  secondaryColour: z.string(),
  jungianType: z.string(),
  careerDirections: z.string(),
  developmentEdge: z.string(),
  coachingQuestions: z.string(),
  fourPillars: z.string(),
  viaRanked: z.array(z.object({
    name: z.string(),
    score: z.number(),
    rank: z.number(),
    strengthId: z.string().optional(),
  })),
  domainScores: scoreRecordSchema,
  facetScores: scoreRecordSchema,
  reportType: z.enum(["standard", "student", "career_changer", "job_returner", "retirement"]),
}).passthrough();

const familySchema = z.object({
  fatherOccupation: z.string().nullable().optional(),
  motherOccupation: z.string().nullable().optional(),
  siblingPosition: z.string().nullable().optional(),
  upbringingLocation: z.string().nullable().optional(),
  familyNarrative: z.string().nullable().optional(),
  significantInfluences: z.string().nullable().optional(),
}).default({});

const careerSchema = z.object({
  organisation: z.string(),
  role: z.string().nullable().optional(),
  yearFrom: z.string().nullable().optional(),
  yearTo: z.string().nullable().optional(),
  keyResponsibilities: z.string().nullable().optional(),
  whyLeft: z.string().nullable().optional(),
  highlights: z.string().nullable().optional(),
}).strict();

const achievementSchema = z.object({
  decade: z.string().nullable().optional(),
  title: z.string().nullable().optional(),
  age: z.number().nullable().optional(),
  description: z.string().nullable().optional(),
  sageEnrichment: z.string().nullable().optional(),
  esf: z.string().nullable().optional(),
  sortOrder: z.number().nullable().optional(),
}).strict();

export const faithfulLayoutBetaSnapshotSchema = z.object({
  source: reportSourceSchema,
  annex: z.object({
    family: familySchema,
    careers: z.array(careerSchema).default([]),
    achievements: z.array(achievementSchema).default([]),
  }),
}).strict();

export type FaithfulLayoutBetaSnapshot = z.infer<typeof faithfulLayoutBetaSnapshotSchema>;
export type FaithfulLayoutReportSource = z.infer<typeof reportSourceSchema>;

export function parseFaithfulLayoutBetaSnapshot(value: string): FaithfulLayoutBetaSnapshot {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new Error("The faithful layout beta snapshot is not valid JSON.");
  }

  const result = faithfulLayoutBetaSnapshotSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error("The faithful layout beta snapshot does not match the client-report contract.");
  }
  return result.data;
}

/** The original published report sequence. This must not be reordered. */
export const FAITHFUL_CLIENT_REPORT_SEQUENCE = [
  "Covering letter",
  "Cover page",
  "1. Lifework Summary",
  "2. Life History Pattern",
  "2b. 4 Pillars of Fulfilment",
  "3. Character Strengths",
  "4. Personality Profile",
  "5. Behavioural Style",
  "6. Development Edge",
  "7. Conclusions",
  "8. Career Directions",
  "Appendix: The Four Report Variants",
  "Your Data — WOW Report Annex",
  "Annex B — Biographical Data",
  "C1 — Life History",
  "C2 — VIA Character Strengths",
  "C3 — OCEAN Personality Profile",
] as const;

export function createFaithfulLayoutBetaSnapshot(input: {
  report: unknown;
  family: unknown;
  careers: unknown;
  achievements: unknown;
}): FaithfulLayoutBetaSnapshot {
  const source = reportSourceSchema.parse(input.report);
  const annex = {
    family: familySchema.parse(input.family ?? {}),
    careers: z.array(careerSchema).parse(input.careers ?? []),
    achievements: z.array(achievementSchema).parse(input.achievements ?? []),
  };
  return { source, annex };
}
