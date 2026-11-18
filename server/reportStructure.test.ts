import { describe, expect, it } from "vitest";
import { assertReportStructure, reportPrintRequiredPhrases, reportPresentation, reportStructureIssues, validateFourConditionsPayload } from "../shared/reportStructure";
import { fourConditionsJson, makeVariantSections, REPORT_TEST_TYPES } from "./testing/reportVariantFixture";

describe.each(REPORT_TEST_TYPES)("%s common report structure", (type) => {
  it("requires the same nine chapters including Four Conditions and complete Conclusions", () => {
    const source = makeVariantSections(type);
    expect(reportStructureIssues(source)).toEqual([]);
    expect(() => assertReportStructure(source)).not.toThrow();
    expect(reportPrintRequiredPhrases(source)).toContain("Four Conditions of Fulfilment");
    expect(reportPrintRequiredPhrases(source)).toContain("Chapter 8 · Career Directions");
  });
  it("rejects a missing chapter instead of saving an old-shaped new report", () => {
    expect(() => assertReportStructure({ ...makeVariantSections(type), fourPillars: "" })).toThrow("Four Conditions of Fulfilment");
  });
  it("rejects an incomplete answer or lost conclusion section", () => {
    expect(reportStructureIssues({ ...makeVariantSections(type), coachingQuestions: "## Past\n\nOnly one section." })).toContain("Conclusions: future");
  });
  it("rejects duplicate or reordered Conditions", () => {
    const source = makeVariantSections(type);
    expect(() => assertReportStructure({ ...source, fourPillars: source.fourPillars.replace("## PEOPLE", "## PLACES") })).toThrow("Four Conditions must include");
  });
});

describe("non-rewriting audience presentation", () => {
  it("retains the standard question and retirement's own question in the same panel", () => {
    expect(reportPresentation().answerCaption).toBe("Tell me about yourself · a suggested answer");
    expect(reportPresentation("student").answerCaption).toBe(reportPresentation().answerCaption);
    expect(reportPresentation("job_returner").answerCaption).toBe(reportPresentation().answerCaption);
    expect(reportPresentation("retirement").answerCaption).toBe("What are you doing now? · a suggested answer");
    expect(reportPresentation("retirement").coverConclusionsNote).not.toContain("interview question");
  });
  it("validates the actual structured Conditions content, not just JSON keys", () => {
    expect(validateFourConditionsPayload(fourConditionsJson())).toHaveProperty("combination.synthesis");
    const value = fourConditionsJson();
    value.places.example2 = "  ";
    expect(() => validateFourConditionsPayload(value)).toThrow("incomplete");
    expect(() => validateFourConditionsPayload({})).toThrow("incomplete");
  });
});
