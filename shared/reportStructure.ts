import { z } from "zod";

/** Common contract for every current Lifework report; audience changes do not remove chapters. */
export const REPORT_CHAPTERS = [
  { field: "summary", label: "Summary", printHeading: "Chapter 1 · Summary" },
  { field: "lifeHistoryPattern", label: "Life History", printHeading: "Chapter 2 · Life History" },
  { field: "fourPillars", label: "Four Conditions of Fulfilment", printHeading: "Four Conditions of Fulfilment" },
  { field: "viaSection", label: "Character Strengths", printHeading: "Chapter 3 · Character Strengths" },
  { field: "personalitySection", label: "Personality Profile", printHeading: "Chapter 4 · Personality Profile" },
  { field: "behaviouralStyle", label: "Behavioural Style", printHeading: "Chapter 5 · Behavioural Style" },
  { field: "developmentEdge", label: "Development Edge", printHeading: "Chapter 6 · Development Edge" },
  { field: "coachingQuestions", label: "Conclusions", printHeading: "Chapter 7 · Conclusions" },
  { field: "careerDirections", label: "Career Directions", printHeading: "Chapter 8 · Career Directions" },
] as const;

const EDITIONS: Record<string, string> = {
  standard: "Career Analysis · Standard Edition",
  career_changer: "Career Analysis · Career Change Edition",
  student: "Career Analysis · First Career Edition",
  job_returner: "Career Analysis · Return to Work Edition",
  retirement: "Career Analysis · Retirement & Legacy Edition",
};

export function reportPresentation(reportType: string = "standard") {
  const retirement = reportType === "retirement";
  return {
    editionLabel: EDITIONS[reportType] ?? EDITIONS.standard,
    answerCaption: retirement
      ? "What are you doing now? · a suggested answer"
      : "Tell me about yourself · a suggested answer",
    coverConclusionsNote: retirement
      ? "If you’re naturally impatient, it’s OK to start with <strong>Chapter 7 — Conclusions</strong>. It’s here we summarise what we believe to be true, and give you a suggested reply to the question “What are you doing now?” as you shape your next chapter."
      : "If you’re naturally impatient, it’s OK to start with <strong>Chapter 7 — Conclusions</strong>. It’s here we summarise what we believe to be true, and give you a suggested reply to that dreaded interview question “So, tell me about yourself”.",
  };
}

function sectionsByHeading(markdown: string): Array<{ heading: string; body: string }> {
  return Array.from(markdown.matchAll(/^#{1,3}\s+([^\n]+)\n([\s\S]*?)(?=^#{1,3}\s+|$(?![\s\S]))/gm), (match) => ({
    heading: match[1].replace(/\*|_/g, "").trim().toLowerCase(),
    body: match[2].trim(),
  }));
}

/** Runs after audience prompts and any voice rewrite, before saving replacement prose. */
export function reportStructureIssues(source: Record<string, unknown>): string[] {
  const issues: string[] = [];
  for (const chapter of REPORT_CHAPTERS) {
    const value = source[chapter.field];
    if (typeof value !== "string" || !value.trim()) issues.push(chapter.label);
  }
  if (typeof source.fourPillars === "string" && source.fourPillars.trim()) {
    const sections = sectionsByHeading(source.fourPillars);
    const expected = ["places", "people", "problems", "procedures", "the combination"];
    const found = sections.map((section) => expected.find((name) => section.heading.startsWith(name))).filter(Boolean);
    if (found.join("|") !== expected.join("|") || sections.some((section) => !section.body || /\bundefined\b/.test(section.body))) {
      issues.push("Four Conditions must include Places, People, Problems, Procedures and The Combination, in order, with content");
    }
  }
  if (typeof source.coachingQuestions === "string" && source.coachingQuestions.trim()) {
    const sections = sectionsByHeading(source.coachingQuestions);
    for (const heading of ["past", "present", "future", "tell me about yourself"]) {
      if (!sections.some((section) => section.heading === heading && section.body)) {
        issues.push(`Conclusions: ${heading}`);
      }
    }
  }
  return issues;
}

export function assertReportStructure(source: Record<string, unknown>): void {
  const issues = reportStructureIssues(source);
  if (issues.length) {
    throw new Error(`Report structure check failed: ${issues.join("; ")}. Please regenerate the report; incomplete replacement prose has not been saved.`);
  }
}

/** Printed chapter checks supplement (never replace) the existing page-boundary preflight. */
export function reportPrintRequiredPhrases(source: { fourPillars?: string; reportType?: string }): string[] {
  const chapterPhrases = REPORT_CHAPTERS.filter((chapter) => chapter.field !== "fourPillars").map((chapter) => chapter.printHeading);
  return [
    ...chapterPhrases,
    ...(source.fourPillars?.trim()
      ? ["Four Conditions of Fulfilment", "Places", "People", "Problems", "Procedures", "The Combination"]
      : []),
    reportPresentation(source.reportType).answerCaption,
  ];
}

const nonBlank = z.string().trim().min(1);
const conditionSchema = z.object({ heading: nonBlank, learning: nonBlank, example1: nonBlank, example2: nonBlank });
const fourConditionsSchema = z.object({
  places: conditionSchema,
  people: conditionSchema,
  problems: conditionSchema,
  procedures: conditionSchema,
  combination: z.object({ synthesis: nonBlank, practical_question: nonBlank }),
});

export function validateFourConditionsPayload(value: unknown) {
  const result = fourConditionsSchema.safeParse(value);
  if (!result.success) throw new Error("Four Conditions output is incomplete. Please regenerate the report; no incomplete replacement prose has been saved.");
  return result.data;
}
