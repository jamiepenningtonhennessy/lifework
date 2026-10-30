import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { preflightReportPdf } from "./reportPdfPreflight";
import {
  createDefaultReportDesignLayoutPlan,
  parseReportDesignBetaSnapshot,
  validateLayoutPlan,
  type ReportDesignBetaSnapshot,
} from "../shared/wowReportDesignBeta";
import type { WowReportBeta1SourceSections } from "../shared/wowReportBeta1";
import { renderReportDesignBetaHtmlForTest, renderReportDesignBetaPdf } from "./reportDesignBetaPdf";

const sourceSections: WowReportBeta1SourceSections = {
  clientName: "Fictional Client",
  clientFullName: "Fictional Client",
  generatedAt: "30 October 2026",
  reportType: "standard",
  summary: "A long enough fictional opening shows that the report begins with recognition and can move through several complete sentences without using a fixed-height panel.",
  lifeHistoryPattern: "## Recurring pattern\n\nThis fictional passage is intentionally extended. ".repeat(55),
  fourPillars: "## Places\n\nThe fictional conditions section is kept as source prose.",
  viaSection: "## Character strengths\n\nA fictional lens is placed alongside the narrative.",
  personalitySection: "## Personality lens\n\nThe fictional text is evidence, not a verdict.",
  behaviouralStyle: "## Working style\n\nThe fictional behavioural section remains intact.",
  careerDirections: "## Direction\n\nA fictional option to explore follows the evidence.",
  developmentEdge: "## What to notice\n\nFictional reflection prose remains unchanged.",
  coachingQuestions: "## Next questions\n\nA fictional closing conversation completes the report.",
};

function snapshot(): ReportDesignBetaSnapshot {
  return {
    sourceSections,
    layoutPlan: createDefaultReportDesignLayoutPlan(sourceSections),
    planner: "local-fallback",
  };
}

describe("Report Design Beta 1", () => {
  it("keeps every source section exactly once in the immutable layout plan", () => {
    const source = snapshot();
    const parsed = parseReportDesignBetaSnapshot(JSON.stringify(source));
    expect(parsed.layoutPlan.sourceOrder).toHaveLength(9);
    expect(new Set(parsed.layoutPlan.sourceOrder).size).toBe(9);
    expect(parsed.sourceSections.lifeHistoryPattern).toBe(sourceSections.lifeHistoryPattern);
  });

  it("rejects a design plan that duplicates or drops frozen source sections", () => {
    const broken = snapshot().layoutPlan;
    broken.sourceOrder = broken.sourceOrder.slice(1);
    expect(() => validateLayoutPlan(broken, ["summary", "lifeHistoryPattern", "fourPillars", "viaSection", "personalitySection", "behaviouralStyle", "careerDirections", "developmentEdge", "coachingQuestions"])).toThrow("every available source section");
  });

  it("escapes source markup and uses flowing content rather than fixed-height pages", () => {
    const dangerous = snapshot();
    dangerous.sourceSections.summary = "<script>window.alert('no')</script> A fictional opening.";
    const html = renderReportDesignBetaHtmlForTest(dangerous);
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain("overflow: hidden");
    expect(html).toContain("break-inside: auto");
    expect(html).toContain("Report Design Beta 1");
  });

  it("renders a multi-page flowing PDF that passes the production preflight", async () => {
    const pdf = await renderReportDesignBetaPdf({ snapshot: snapshot(), clientName: "Fictional Client" });
    const result = await preflightReportPdf(pdf, {
      documentLabel: "Lifework Report Design Beta",
      minimumPages: 2,
      requiredPhrases: ["Fictional Client", "Lifework", "This fictional passage is intentionally extended"],
      headerMarkers: ["Report Design Beta 1"],
      footerMarkers: ["Lifework", "Internal", "Confidential"],
      headerRequiredFromPage: 1,
    });
    expect(result.pageCount).toBeGreaterThan(1);
  }, 60_000);

  it("keeps production report writes and source prose out of the Claude layout-planning prompt", () => {
    const source = readFileSync(new URL("./routers/reportDesignBeta.ts", import.meta.url), "utf8");
    expect(source).not.toContain("upsertAnalysisReport");
    expect(source).not.toContain("runGenerationJob");
    expect(source).not.toContain("JSON.stringify(sourceSections)");
    expect(source).toContain("availableSections: metadata");
  });
});
