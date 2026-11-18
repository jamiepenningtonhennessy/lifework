import { execFileSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildClaudeExportJson } from "./routers/claudeExport";
import { renderHtmlReport } from "./html-report";
import { generateMasterReportPdf } from "./masterReportPdf";
import { preflightReportPdf } from "./reportPdfPreflight";
import { reportPrintRequiredPhrases, reportPresentation } from "../shared/reportStructure";
import { makeVariantSections, REPORT_TEST_TYPES } from "./testing/reportVariantFixture";

// No client/DB reads or live model calls: exercise the REAL export, template and PDF engine.
vi.mock("./db.js", () => ({
  getClientProfileById: vi.fn(async () => ({ id: 999999, firstName: "Fictional", lastName: "Review Client" })),
  getAchievements: vi.fn(async () => [
    { id: 1, decade: "childhood", age: 10, title: "School project", description: "A fictional woodland project.", esf: "enjoyable" },
    { id: 2, decade: "teens", age: 16, title: "Community workshop", description: "A fictional collaborative workshop.", esf: "fulfilling" },
    { id: 3, decade: "twenties", age: 22, title: "Learning project", description: "A fictional learning project.", esf: "satisfying" },
  ]),
  getFamilyBackground: vi.fn(async () => null),
  getCareerHistory: vi.fn(async () => []),
  getViaResults: vi.fn(async () => ({ rankedStrengths: makeVariantSections().viaRanked })),
  getIpipResults: vi.fn(async () => ({ domainScores: makeVariantSections().domainScores, facetScores: {} })),
  getAnalysisReport: vi.fn(async () => ({ wowReportJson: "{}" })),
}));
vi.mock("./_core/llm.js", () => ({ invokeLLM: vi.fn(async () => ({ choices: [{ message: { content: "Your own evidence remains the starting point for what comes next." } }] })) }));

const outputDirectory = process.env.REPORT_VARIANT_REVIEW_DIR ?? "/tmp/lifework-report-variant-review";
const normalise = (text: string) => text.replace(/\s+/g, " ").trim().toLowerCase();
let standardCss: string | undefined;
beforeEach(() => vi.clearAllMocks());

describe.each(REPORT_TEST_TYPES)("%s shares the approved master layout", (type) => {
  it("exports the same complete chapter contract without trimming longer paragraphs", async () => {
    const source = makeVariantSections(type, true);
    const original = JSON.stringify(source);
    const payload = await buildClaudeExportJson(999999, original) as any;
    expect(JSON.stringify(source)).toBe(original);
    expect(Object.keys(payload)).toEqual(expect.arrayContaining(["CH1", "CH2", "CH2B", "CH3", "CH4", "CH5", "CH6", "CH7", "CH8", "LIFE_HISTORY", "VIA", "OCEAN"]));
    expect(payload.CH2B.HAS_CONTENT).toBe(true);
    expect(payload.CH2B.PILLARS.map((pillar: any) => pillar.HEADING_ALLCAPS)).toEqual(["PLACES", "PEOPLE", "PROBLEMS", "PROCEDURES"]);
    expect(payload.CH6.SECTIONS).toHaveLength(3);
    expect(payload.CH8.DIRECTIONS).toHaveLength(3);
    for (const index of [1, 2, 3, 4, 5, 6]) {
      expect(JSON.stringify(payload.CH6.SECTIONS)).toContain(`End of Development block ${index}.`);
      expect(JSON.stringify(payload.CH8.DIRECTIONS)).toContain(`End of Direction block ${index}.`);
    }
    expect(payload.CH7.FUTURE.join(" ")).not.toContain("I am fundamentally driven by");
    expect(payload.CH7.TMAY_PARAS.join(" ")).toContain("I bring these drivers");
    expect(payload.CH7.ANSWER_CAPTION).toBe(reportPresentation(type).answerCaption);
  });

  it("prints every chapter in the standard order with the same CSS/fonts and safe continuation pages", async () => {
    await mkdir(outputDirectory, { recursive: true });
    const source = makeVariantSections(type, true);
    const payload = await buildClaudeExportJson(999999, JSON.stringify(source));
    const html = renderHtmlReport(payload);
    const css = html.match(/<style>([\s\S]*?)<\/style>/)?.[1];
    if (type === "standard") standardCss = css;
    expect(css).toBe(standardCss);
    expect(html).toContain("Cormorant+Garamond");
    expect(html).toContain("Source+Serif+4");
    expect(html).toContain("Libre+Franklin");
    expect(html.match(/class="tmay"/g)).toHaveLength(1);
    const pdf = await generateMasterReportPdf(html);
    const path = join(outputDirectory, `${type}.pdf`);
    await writeFile(path, pdf);
    const text = execFileSync("pdftotext", ["-layout", path, "-"], { encoding: "utf8" });
    const plain = normalise(text);
    const phrases = reportPrintRequiredPhrases(source);
    await expect(preflightReportPdf(pdf, {
      documentLabel: `Fictional ${type} variant`, minimumPages: 3,
      requiredPhrases: [source.clientFullName, ...phrases],
      footerMarkers: ["Pennington Hennessy", "Lifework", "Confidential", "Prepared for"],
      headerMarkers: ["Lifework"], headerRequiredFromPage: 1,
    })).resolves.toMatchObject({ pageCount: expect.any(Number) });
    const chapterHeadings = ["Chapter 1 · Summary", "Chapter 2 · Life History", "Four Conditions of Fulfilment", "Chapter 3 · Character Strengths", "Chapter 4 · Personality Profile", "Chapter 5 · Behavioural Style", "Chapter 6 · Development Edge", "Chapter 7 · Conclusions", "Chapter 8 · Career Directions"];
    // Poppler may omit widely letter-spaced small-caps headers from Type3
    // fonts. PDF.js preflight above checks every printed heading independently;
    // this check verifies their sequence in the actual master page-band markup.
    const headerText = normalise(Array.from(html.matchAll(/<div class="band">[\s\S]*?<\/div>/g), (match) => match[0].replace(/<[^>]+>/g, " ")).join(" "));
    const positions = chapterHeadings.map((heading) => headerText.indexOf(normalise(heading)));
    expect(positions.every((position) => position >= 0)).toBe(true);
    expect(positions).toEqual([...positions].sort((left, right) => left - right));
    expect(plain).toMatch(/chapter 6 · development edge · continued|chapter 8 · career directions · continued/);
    for (const index of [1, 2, 3, 4, 5, 6]) {
      expect(plain).toContain(normalise(`End of Development block ${index}.`));
      expect(plain).toContain(normalise(`End of Direction block ${index}.`));
    }
    const fonts = execFileSync("pdffonts", [path], { encoding: "utf8" });
    expect(fonts).toMatch(/CormorantGaramond/);
    expect(fonts).toMatch(/SourceSerif/);
    expect(fonts).toMatch(/LibreFranklin/);
    console.log(`[Variant layout] ${type}: actual PDF, complete paragraphs, embedded master fonts and footer preflight verified`);
  }, 120_000);
});
