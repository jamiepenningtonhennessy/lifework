import { beforeEach, describe, expect, it, vi } from "vitest";
import { REPORT_SCORE_ATTRIBUTION_RULE, withReportScoreAttribution } from "./shared/reportScoreAttribution";
import { CANONICAL_SYSTEM_PROMPT, generateAndStoreCanonicalStage1 } from "./routers/canonicalStage1";
import { buildClaudeExportJson } from "./routers/claudeExport";
import { invokeLLM } from "./_core/llm";
import { makeVariantSections } from "./testing/reportVariantFixture";

// All records are fictional. Never call a real DB, model, renderer or storage API.
vi.mock("./db", () => ({
  getClientProfileById: vi.fn(async () => ({ id: -9999, firstName: "Fictional", lastName: "Review Client" })),
  getAchievements: vi.fn(async () => [{ id: -1, decade: "childhood", age: 10, title: "School project", description: "A fictional learning project.", esf: "enjoyable" }]),
  getInterviewMessages: vi.fn(async () => []),
  getFamilyBackground: vi.fn(async () => null),
  getCareerHistory: vi.fn(async () => []),
  getViaResults: vi.fn(async () => ({ rankedStrengths: makeVariantSections().viaRanked })),
  getIpipResults: vi.fn(async () => ({ domainScores: makeVariantSections().domainScores, facetScores: {} })),
  getAnalysisReport: vi.fn(async () => ({ wowReportJson: "{}" })),
  updateCanonicalStage1: vi.fn(async () => undefined),
}));
vi.mock("./_core/llm", () => ({ invokeLLM: vi.fn() }));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(invokeLLM).mockResolvedValue({
    choices: [{ message: { content: "Your OCEAN Extraversion score of 78 and VIA Curiosity score of 23 offer separate perspectives on this fictional evidence." } }],
  } as any);
});

describe("WOW narrative score-source instructions", () => {
  it("requires a local assessment label even within a single-assessment chapter", () => {
    expect(REPORT_SCORE_ATTRIBUTION_RULE).toContain("each OCEAN domain or facet score as OCEAN");
    expect(REPORT_SCORE_ATTRIBUTION_RULE).toContain("each VIA character-strength score as VIA");
    expect(REPORT_SCORE_ATTRIBUTION_RULE).toContain("beside the individual score");
    expect(REPORT_SCORE_ATTRIBUTION_RULE).toContain("a chapter heading or a label elsewhere is not enough");
    expect(REPORT_SCORE_ATTRIBUTION_RULE).toContain("OCEAN Extraversion score of 78 and your VIA Curiosity score of 23");
  });

  it("does not ask for scale explanations or change the supplied numeric data", () => {
    expect(REPORT_SCORE_ATTRIBUTION_RULE).toContain("do not add denominators or explanations of score ranges");
    expect(REPORT_SCORE_ATTRIBUTION_RULE).toContain("Preserve the supplied values exactly");
    expect(REPORT_SCORE_ATTRIBUTION_RULE).toContain("never copy these numbers unless they are in this client's data");
    expect(REPORT_SCORE_ATTRIBUTION_RULE).toContain("Leave existing structured tables, chart data and their scale labels unchanged");
    expect(REPORT_SCORE_ATTRIBUTION_RULE).toContain("confuse VIA ranks with scores");
  });

  it("appends the same rule without changing the writer's voice instructions", () => {
    const original = "Write short, clear paragraphs with ## headings.";
    expect(withReportScoreAttribution(original)).toBe(`${original}\n\n${REPORT_SCORE_ATTRIBUTION_RULE}`);
  });

  it("is idempotent so requests and their logs show exactly the same rule", () => {
    const once = withReportScoreAttribution("Original voice instructions.");
    expect(withReportScoreAttribution(once)).toBe(once);
    expect(once.split(REPORT_SCORE_ATTRIBUTION_RULE)).toHaveLength(2);
  });

  it("sends the rule in newly authored canonical life-history requests", async () => {
    expect(CANONICAL_SYSTEM_PROMPT).toContain(REPORT_SCORE_ATTRIBUTION_RULE);
    await generateAndStoreCanonicalStage1(-9999);
    expect(invokeLLM).toHaveBeenCalledOnce();
    const request = vi.mocked(invokeLLM).mock.calls[0][0];
    expect(request.messages.find((message) => message.role === "system")?.content).toContain(REPORT_SCORE_ATTRIBUTION_RULE);
  });

  it("sends the rule to the independently authored Conclusions pull quote without changing source scores", async () => {
    const source = makeVariantSections();
    const original = JSON.stringify(source);
    const payload = await buildClaudeExportJson(-9999, original) as any;
    expect(invokeLLM).toHaveBeenCalledOnce();
    const request = vi.mocked(invokeLLM).mock.calls[0][0];
    expect(request.messages.find((message) => message.role === "system")?.content).toContain(REPORT_SCORE_ATTRIBUTION_RULE);
    expect(JSON.stringify(source)).toBe(original);
    expect(payload.VIA.TOP10.map((strength: any) => strength.score)).toEqual(source.viaRanked.map((strength) => strength.score));
    expect(payload.OCEAN.DOMAINS.find((domain: any) => domain.key === "E" || domain.name === "Extraversion")?.pct).toBe(source.domainScores.E);
  });
});
