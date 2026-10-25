import { z } from "zod";

/**
 * Beta 1 is deliberately a reader-first presentation of an already-completed
 * WOW report. It introduces no new interpretation, LLM calls, or production
 * report writes. Every narrative string comes directly from one frozen source
 * snapshot captured from wowReportJson.
 */
export const WOW_REPORT_BETA_1_VERSION = "beta-1" as const;

const sourceSectionsSchema = z
  .object({
    clientName: z.string().optional().default("Client"),
    clientFullName: z.string().optional().default("Client"),
    generatedAt: z.string().optional().default(""),
    reportType: z.string().optional().default("standard"),
    summary: z.string().optional().default(""),
    lifeHistoryPattern: z.string().optional().default(""),
    fourPillars: z.string().optional().default(""),
    viaSection: z.string().optional().default(""),
    personalitySection: z.string().optional().default(""),
    behaviouralStyle: z.string().optional().default(""),
    developmentEdge: z.string().optional().default(""),
    careerDirections: z.string().optional().default(""),
    coachingQuestions: z.string().optional().default(""),
  })
  .passthrough();

export type WowReportBeta1SourceSections = z.infer<typeof sourceSectionsSchema>;

export type WowReportBeta1Movement = {
  number: string;
  eyebrow: string;
  title: string;
  purpose: string;
  sections: Array<{
    key: keyof Pick<
      WowReportBeta1SourceSections,
      | "summary"
      | "lifeHistoryPattern"
      | "fourPillars"
      | "viaSection"
      | "personalitySection"
      | "behaviouralStyle"
      | "careerDirections"
      | "developmentEdge"
      | "coachingQuestions"
    >;
    source: string;
    title: string;
    supportingText: string;
  }>;
};

/** Parse a stored snapshot without changing its analytical prose. */
export function parseWowReportBeta1Snapshot(snapshot: string): WowReportBeta1SourceSections {
  let parsed: unknown;
  try {
    parsed = JSON.parse(snapshot);
  } catch {
    throw new Error("The frozen Beta 1 source snapshot is not valid JSON.");
  }

  const result = sourceSectionsSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error("The frozen Beta 1 source snapshot does not match the WOW report section contract.");
  }

  return result.data;
}

/**
 * The Beta 1 sequence improves orientation and decision-use without rewriting
 * the analysis. Titles, source labels and signposting are editorial framing;
 * the rendered report prose is always read verbatim from the source snapshot.
 */
export function getWowReportBeta1Movements(): WowReportBeta1Movement[] {
  return [
    {
      number: "01",
      eyebrow: "Begin with recognition",
      title: "The pattern beneath the detail",
      purpose: "Start with the central portrait, then see the life-history evidence that makes it credible.",
      sections: [
        {
          key: "summary",
          source: "Opening synthesis",
          title: "What this report sees first",
          supportingText: "The clearest overall statement of the pattern already present in the source report.",
        },
        {
          key: "lifeHistoryPattern",
          source: "Life-history evidence",
          title: "How the pattern has repeated",
          supportingText: "The evidence across the decades: not isolated achievements, but the recurring conditions in which you come alive.",
        },
      ],
    },
    {
      number: "02",
      eyebrow: "Make the pattern usable",
      title: "The conditions that matter",
      purpose: "Move from insight to the environments, relationships, problems and ways of working that support fulfilment.",
      sections: [
        {
          key: "fourPillars",
          source: "Four conditions of fulfilment",
          title: "What helps you do your best work",
          supportingText: "A practical lens on the conditions worth seeking, protecting or testing in the next chapter.",
        },
        {
          key: "viaSection",
          source: "VIA character strengths",
          title: "The strengths visible in the evidence",
          supportingText: "Survey results read alongside the life-history record, rather than treated as a verdict in their own right.",
        },
        {
          key: "personalitySection",
          source: "Big Five lens",
          title: "What the psychometrics add",
          supportingText: "A second, complementary lens on working style, pressure and preference.",
        },
        {
          key: "behaviouralStyle",
          source: "Behavioural style lens",
          title: "How the pattern tends to show up",
          supportingText: "A practical view of how you may operate with others, at your best and under pressure.",
        },
      ],
    },
    {
      number: "03",
      eyebrow: "Shape what comes next",
      title: "Turn recognition into choice",
      purpose: "Finish with possible directions, the patterns to watch, and the questions to carry into coaching.",
      sections: [
        {
          key: "careerDirections",
          source: "Possible directions",
          title: "Where the evidence might lead",
          supportingText: "Options to explore, not instructions to obey. Their value lies in the fit with the evidence already gathered.",
        },
        {
          key: "developmentEdge",
          source: "Development edge",
          title: "What may get in the way",
          supportingText: "The patterns worth seeing clearly so that greater choice becomes possible.",
        },
        {
          key: "coachingQuestions",
          source: "Closing synthesis",
          title: "The conversation to have next",
          supportingText: "A final integration of past, present and future — designed to open a more purposeful coaching conversation.",
        },
      ],
    },
  ];
}

export function getPresentBeta1Sections(snapshot: WowReportBeta1SourceSections) {
  return getWowReportBeta1Movements().map((movement) => ({
    ...movement,
    sections: movement.sections.filter((section) => snapshot[section.key].trim().length > 0),
  })).filter((movement) => movement.sections.length > 0);
}
