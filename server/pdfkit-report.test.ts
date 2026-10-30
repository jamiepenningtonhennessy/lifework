import { execFileSync } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { generatePdfKitReport } from "./pdfkit-report";

const longBullet = (label: string) =>
  Array.from(
    { length: 3 },
    () => `${label}. This deliberately detailed coaching reflection provides enough material to test a page transition without splitting the thought, losing a sentence, or dropping the chapter furniture at the top of a new page. It keeps the reader’s context intact while setting out the practical implication in full.`,
  ).join(" ");

function makeLongCoachingQuestionsReport() {
  return {
    CLIENT: { NAME: "Test Client" },
    COVERING_LETTER: { PARAGRAPHS: ["Thank you for taking part."], SIGN_OFF: "Warmly,", AUTHOR_NAME: "Jamie", AUTHOR_EMAIL: "jamie@example.com" },
    CH1: { HERO: "A concise opening portrait.", PARAGRAPHS: ["Supporting text."] },
    CH2: { LEDE: "Lede.", PAGE1_PARAGRAPHS: [], PAGE1_SECTION_H: "", PAGE1_SECTION_PARAS: [], PAGE2_SECTION_H: "", PAGE2_PARAGRAPHS: [], KEYFIND: { PARAGRAPHS: [], ESF_PARA: "" } },
    CH3: { LEDE: "Lede.", KEY_FINDINGS: [] },
    VIA: { TOP10: [], EVIDENCE: [], VIRTUES_NOTE: "" },
    CH4: { LEDE: "Lede.", PSYCHOMETRICS_PARAS: [], SYNTHESIS_PARAS: [], KEYFIND: { TITLE: "", BODY: "" } },
    OCEAN: { DOMAINS: [], FACET_NOTE: "" },
    CH5: { LEDE: "Lede.", PRIMARY: { name: "", traits: "" }, SECONDARY: { name: "", traits: "" }, JUNGIAN: { code: "", spelt: "" }, STRENGTHS: [], WATCHOUTS: [], FIT: "" },
    CH6: { SECTIONS: [], PULLQUOTE: "" },
    CH7: {
      PAST: [longBullet("Past item one"), longBullet("Past item two"), longBullet("Past item three")],
      PRESENT: [longBullet("Present item one"), longBullet("Present item two")],
      PRESENT_PULLQUOTE: "The reader should never lose the thread simply because a page ends.",
      FUTURE: [longBullet("Future item one"), longBullet("Future item two"), "Final future item — this confirms that the complete final coaching point is retained after the continuation page starts."],
    },
    CH8: { DIRECTIONS: [], OVERFLOW_DIRECTIONS: [] },
    APPENDIX: { ACHIEVEMENTS: [] },
  } as Record<string, unknown>;
}

describe("PDFKit WOW report pagination", () => {
  it("moves long coaching content to a branded continuation page without dropping the final item", async () => {
    const directory = await mkdtemp(join(tmpdir(), "lifework-pdfkit-"));
    const pdfPath = join(directory, "report.pdf");

    try {
      const pdf = await generatePdfKitReport(makeLongCoachingQuestionsReport());
      await writeFile(pdfPath, pdf);
      const text = execFileSync("pdftotext", ["-layout", pdfPath, "-"], { encoding: "utf8" });

      expect(text).toContain("Coaching Questions (continued)");
      expect(text).toContain("Final future item");
      expect(text).toMatch(/Coaching Questions \(continued\)[\s\S]*Final future item/);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
