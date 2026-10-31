import { execFileSync } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { renderHtmlReport } from "./html-report";
import { generateMasterReportPdf } from "./masterReportPdf";
import { preflightReportPdf } from "./reportPdfPreflight";

function makeLongParagraph(index: number): string {
  return `Synthetic Chapter 1 block ${index} terminal marker. This intentionally complete paragraph is repeated only to exercise the visual-master continuation guard. It must remain intact, retain its order, and move to the matching branded continuation page before it could meet the footer rule. `.repeat(5);
}

function createVisualMasterFixture(): Record<string, unknown> {
  return {
    BRAND: { COMPANY: "Pennington Hennessy" },
    CLIENT: { NAME: "Synthetic Client", FIRST_NAME: "Synthetic" },
    REPORT: {
      EDITION_LABEL: "Career Analysis · Standard Edition",
      DATE: "31 October 2026",
      ANALYST: "Jamie Pennington",
      COVER_TITLE_LINE1: "A portrait of",
      COVER_TITLE_LINE2: "who you are.",
    },
    COVER_LETTER: {
      PARAGRAPHS: ["A synthetic cover letter used solely for report-layout testing."],
      SIGN_OFF: "With warmth,",
      AUTHOR_NAME: "Jamie Pennington",
      AUTHOR_EMAIL: "jamie@lifeworkpath.com",
    },
    CH1: {
      HERO: "A synthetic summary that preserves the master report’s opening treatment.",
      PARAGRAPHS: Array.from({ length: 7 }, (_value, index) => makeLongParagraph(index + 1)),
    },
    CH2: { LEDE: "", PAGE1_PARAGRAPHS: [], PAGE1_SECTION_PARAS: [] },
    CH2B: { HAS_CONTENT: false },
    CH3: { LEDE: "", KEY_FINDINGS: [] },
    VIA: { TOP10: [], EVIDENCE: [], ALL24: [] },
    CH4: { LEDE: "", PSYCHOMETRICS_PARAS: [], SYNTHESIS_PARAS: [], KEYFIND: {} },
    OCEAN: { DOMAINS: [], FACETS: [] },
    CH5: { LEDE: "", CARDS: [] },
    CH6: { SECTIONS: [], OVERFLOW_SECTIONS: [], HAS_OVERFLOW: false },
    CH7: { PAST: [], PRESENT: [], FUTURE: [] },
    CH8: { SECTIONS: [], OVERFLOW_SECTIONS: [], HAS_OVERFLOW: false },
    LIFE_HISTORY: { PAGES: [] },
    BIOGRAPHICAL: { PAGES: [] },
  };
}

describe("Quiet Authority visual-master PDF", () => {
  it("retains the master design and creates only branded continuation pages for a long chapter", async () => {
    const directory = await mkdtemp(join(tmpdir(), "lifework-master-report-"));
    const pdfPath = join(directory, "master-report.pdf");

    try {
      const html = renderHtmlReport(createVisualMasterFixture());
      expect(html).toContain("A personal note");
      expect(html).toContain('class="rail"');
      expect(html).toContain("Cormorant+Garamond");

      const pdf = await generateMasterReportPdf(html);
      await writeFile(pdfPath, pdf);
      const text = execFileSync("pdftotext", ["-layout", pdfPath, "-"], { encoding: "utf8" });

      expect(text).toContain("Synthetic Chapter 1 block 1 terminal marker.");
      expect(text).toContain("Synthetic Chapter 1 block 7 terminal marker.");
      expect(text.toUpperCase()).toContain("CHAPTER 1 · SUMMARY · CONTINUED");
      expect(text).toContain("Continued");
      expect(text).toContain("PENNINGTON HENNESSY");

      await expect(preflightReportPdf(pdf, {
        documentLabel: "Quiet Authority visual-master fixture",
        minimumPages: 4,
        requiredPhrases: ["Synthetic Client", "Synthetic Chapter 1 block 7 terminal marker", "Lifework"],
        footerMarkers: ["Pennington Hennessy", "Confidential", "Lifework", "Prepared for"],
        headerMarkers: ["Lifework"],
        headerRequiredFromPage: 1,
      })).resolves.toMatchObject({ pageCount: expect.any(Number) });
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  }, 120_000);
});
