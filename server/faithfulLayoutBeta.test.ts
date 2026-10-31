import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  createFaithfulLayoutBetaSnapshot,
  FAITHFUL_CLIENT_REPORT_SEQUENCE,
  parseFaithfulLayoutBetaSnapshot,
  type FaithfulLayoutBetaSnapshot,
} from "../shared/faithfulLayoutBeta";
import { renderFaithfulLayoutBetaHtmlForTest, renderFaithfulLayoutBetaPdf } from "./reportFaithfulLayoutBetaPdf";
import { preflightReportPdf } from "./reportPdfPreflight";

const source = {
  clientName: "Fictional",
  clientFullName: "Fictional Client",
  generatedAt: "31 October 2026",
  summary: "This is a fictional summary for a layout-only test.",
  lifeHistoryPattern: "This fictional life history pattern is deliberately preserved.",
  fourPillars: "These fictional fulfilment conditions remain in their original place.",
  viaSection: "This fictional VIA interpretation remains unchanged.",
  personalitySection: "This fictional personality interpretation remains unchanged.",
  behaviouralStyle: "This fictional behavioural interpretation remains unchanged.",
  developmentEdge: "This fictional development edge remains unchanged.",
  coachingQuestions: "This fictional conclusion remains unchanged.",
  careerDirections: "This fictional career direction remains unchanged.",
  primaryColour: "Cool Blue",
  secondaryColour: "Earth Green",
  jungianType: "INTJ",
  viaRanked: [
    { name: "Curiosity", score: 23, rank: 1, strengthId: "curiosity" },
    { name: "Judgment", score: 20, rank: 2, strengthId: "judgment" },
  ],
  domainScores: { N: 41, E: 58, O: 78, A: 62, C: 70 },
  facetScores: { N1: 30, E1: 65, O1: 76, A1: 57, C1: 68 },
  reportType: "standard" as const,
};

function snapshot(): FaithfulLayoutBetaSnapshot {
  return createFaithfulLayoutBetaSnapshot({
    report: source,
    family: { upbringingLocation: "A fictional town", familyNarrative: "A fictional family narrative." },
    careers: [{ organisation: "Example Organisation", role: "Example role", yearFrom: "2010", yearTo: "2018" }],
    achievements: [{ decade: "twenties", title: "A fictional achievement", age: 22, description: "A fictional life history entry.", esf: "fulfilling", sortOrder: 1 }],
  });
}

describe("Faithful Layout Beta 1", () => {
  it("freezes every required client-report field and source datum without editorial substitutes", () => {
    const created = snapshot();
    const parsed = parseFaithfulLayoutBetaSnapshot(JSON.stringify(created));
    expect(parsed.source).toMatchObject(source);
    expect(parsed.annex.achievements[0]?.description).toBe("A fictional life history entry.");
    expect(parsed.annex.careers[0]?.organisation).toBe("Example Organisation");
    expect(() => createFaithfulLayoutBetaSnapshot({
      report: { ...source, coachingQuestions: undefined },
      family: {},
      careers: [],
      achievements: [],
    })).toThrow();
  });

  it("retains the established report sequence, including appendix and data annex", () => {
    expect(FAITHFUL_CLIENT_REPORT_SEQUENCE).toEqual([
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
    ]);
  });

  it("renders the existing chapter names, familiar score displays and annex with flowing CSS", async () => {
    const html = await renderFaithfulLayoutBetaHtmlForTest(snapshot());
    const inOrder = [
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
    ];
    let index = -1;
    for (const item of inOrder) {
      const nextIndex = html.indexOf(item, index + 1);
      expect(nextIndex).toBeGreaterThan(index);
      index = nextIndex;
    }
    expect(html).toContain("Strength Rankings");
    expect(html).toContain("Big Five Personality Dimensions");
    expect(html).toContain("Primary Energy");
    expect(html).toContain("break-inside: avoid");
    expect(html).toContain("page-break-inside: avoid");
    expect(html).not.toContain("Report Design Beta");
  }, 60_000);

  it("renders a page-flowing faithful PDF which passes the production release preflight", async () => {
    const pdf = await renderFaithfulLayoutBetaPdf({ snapshot: snapshot() });
    const result = await preflightReportPdf(pdf, {
      documentLabel: "Fictional faithful layout beta",
      minimumPages: 8,
      requiredPhrases: ["Fictional Client", "Lifework", "1. Lifework Summary", "C3 — OCEAN Personality Profile"],
      headerMarkers: ["Lifework Career Analysis"],
      headerRequiredFromPage: 1,
      footerMarkers: ["Lifework", "Confidential"],
    });
    expect(result.pageCount).toBeGreaterThanOrEqual(8);
  }, 90_000);

  it("keeps the router free of model calls and production report writes", () => {
    const router = readFileSync(new URL("./routers/faithfulLayoutBeta.ts", import.meta.url), "utf8");
    expect(router).not.toContain("invokeLLM");
    expect(router).not.toContain("runGenerationJob");
    expect(router).not.toContain("upsertAnalysisReport");
    expect(router).toContain("FAITHFUL_LAYOUT_BETA_VERSION");
    expect(router).toContain("getAchievements");
    expect(router).toContain("getFamilyBackground");
    expect(router).toContain("getCareerHistory");
  });
});
