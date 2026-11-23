import { execFileSync } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it, vi } from "vitest";
import { renderHtmlReport, renderTemplate } from "./html-report";
import { buildClaudeExportJson } from "./routers/claudeExport";
import { generateMasterReportPdf } from "./masterReportPdf";
import { preflightReportPdf } from "./reportPdfPreflight";
import { makeVariantSections, REPORT_TEST_TYPES } from "./testing/reportVariantFixture";

const fictionalFamily = vi.hoisted(() => ({
  fatherOccupation: "Fictional guardian one teaches music.",
  motherOccupation: "Fictional guardian two repairs clocks.",
  siblingPosition: "Fictional middle child of three.",
  upbringingLocation: "Fictional coastal village.",
  familyNarrative: "Fictional household rules: be kind, be curious, and finish what you start. Our motto was to learn together.",
  significantInfluences: "Fictional early influence: the community library encouraged independent learning.",
}));
// Exercise production code with fictional evidence only. No live data or model calls.
vi.mock("./db.js", () => ({
  getClientProfileById: vi.fn(async () => ({ id: 999999, firstName: "Fictional", lastName: "Review Client" })),
  getAchievements: vi.fn(async () => []),
  getFamilyBackground: vi.fn(async () => fictionalFamily),
  getCareerHistory: vi.fn(async () => []),
  getViaResults: vi.fn(async () => ({ rankedStrengths: makeVariantSections().viaRanked })),
  getIpipResults: vi.fn(async () => ({ domainScores: makeVariantSections().domainScores, facetScores: {} })),
  getAnalysisReport: vi.fn(async () => ({ wowReportJson: "{}" })),
}));
vi.mock("./_core/llm.js", () => ({ invokeLLM: vi.fn(async () => ({ choices: [{ message: { content: "Fictional report quote." } }] })) }));

function annexBody(html: string): string {
  return html.split("<!-- ════════ ANNEX B")[1]?.split("<!-- ════════ ANNEX C")[0] ?? "";
}

describe("saved family background is visible in reports", () => {
  it("resolves nested relative fields and conditionals in the production template renderer", () => {
    const data = { PAGES: [{ family: { HAS_DATA: true, narrative: "Visible family narrative" } }] };
    expect(renderTemplate("{{#EACH PAGES}}{{#IF .family.HAS_DATA}}{{#IF .family.narrative}}<p>{{.family.narrative}}</p>{{/IF}}{{/IF}}{{/EACH}}", data))
      .toBe("<p>Visible family narrative</p>");
    expect(renderTemplate("{{.family.narrative}}", { family: { narrative: "Root-relative narrative" } }))
      .toBe("Root-relative narrative");
  });

  it("does not invent missing fields or bypass a false family-data flag", () => {
    expect(renderTemplate("{{#EACH PAGES}}{{#IF .family.HAS_DATA}}{{.family.narrative}}{{/IF}}{{/EACH}}", {
      PAGES: [{ family: { HAS_DATA: false, narrative: "Hidden" } }, { family: null }, {}],
    })).toBe("");
    expect(renderTemplate("{{#EACH PAGES}}[{{.family.unknown}}]{{/EACH}}", { PAGES: [{ family: {} }] })).toBe("[]");
  });

  it("retains primitive loops, ordinary fields, nested loops, and CSS-class tokens", () => {
    const template = "{{#EACH PAGES}}<b>{{.name}}</b>{{#EACH .family.rules}}<i>{{.}}</i>{{/EACH}}<span class=\"{{.cssClass}}\">{{.family.narrative}}</span>{{/EACH}}";
    expect(renderTemplate(template, { PAGES: [{ name: "Page", cssClass: "top_5", family: { rules: ["Kind", "Curious"], narrative: "Together" } }] }))
      .toBe('<b>Page</b><i>Kind</i><i>Curious</i><span class="top_5">Together</span>');
  });

  it.each(REPORT_TEST_TYPES)("prints all six saved family answers in the %s export HTML", async (type) => {
    const source = JSON.stringify(makeVariantSections(type));
    const payload = await buildClaudeExportJson(999999, source);
    const html = renderHtmlReport(payload);
    const annex = annexBody(html);
    expect(annex).not.toBe("");
    for (const value of Object.values(fictionalFamily)) expect(annex).toContain(value);
    expect(annex).not.toContain("{{");
    expect(JSON.stringify(makeVariantSections(type))).toBe(source);
  });

  it("includes all six family answers in a real Chromium PDF and passes the release preflight", async () => {
    const folder = await mkdtemp(join(tmpdir(), "lifework-family-report-"));
    try {
      const source = JSON.stringify(makeVariantSections("standard"));
      const payload = await buildClaudeExportJson(999999, source);
      const pdf = await generateMasterReportPdf(renderHtmlReport(payload));
      const path = join(folder, "fictional-family-report.pdf");
      await writeFile(path, pdf);
      // Raw painting order keeps each two-column family value together;
      // visual reading order can interleave the adjacent label/value cells.
      const text = execFileSync("pdftotext", ["-raw", path, "-"], { encoding: "utf8" }).replace(/\s+/g, " ");
      for (const value of Object.values(fictionalFamily)) expect(text).toContain(value);
      await expect(preflightReportPdf(pdf, {
        documentLabel: "Fictional family annex regression",
        minimumPages: 3,
        requiredPhrases: Object.values(fictionalFamily),
        footerMarkers: ["Pennington Hennessy", "Confidential", "Lifework", "Prepared for"],
        headerMarkers: ["Lifework"],
        headerRequiredFromPage: 1,
      })).resolves.toMatchObject({ pageCount: expect.any(Number) });
    } finally {
      await rm(folder, { recursive: true, force: true });
    }
  }, 120_000);
});
