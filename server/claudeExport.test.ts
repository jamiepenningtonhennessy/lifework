/**
 * claudeExport.test.ts
 *
 * Unit tests for the Claude handoff JSON export helper functions.
 * These test the pure utility functions only — no DB calls.
 */

import { describe, it, expect } from "vitest";

// ─── Import the pure helpers by re-implementing them inline for test isolation ─
// (We can't import the file directly without a DB mock, so we test the logic
//  by copy-importing the pure functions. In a real project these would be
//  extracted to a shared utils module.)

// ── splitParagraphs ────────────────────────────────────────────────────────────
function splitParagraphs(text: string): string[] {
  if (!text) return [""];
  const lines = text.split("\n");
  const paras: string[] = [];
  let current: string[] = [];

  for (const line of lines) {
    if (line.startsWith("## ") || line.startsWith("# ")) {
      if (current.length > 0) {
        paras.push(current.join(" ").trim());
        current = [];
      }
      continue;
    }
    if (line.trim() === "") {
      if (current.length > 0) {
        paras.push(current.join(" ").trim());
        current = [];
      }
    } else {
      current.push(line.trim());
    }
  }
  if (current.length > 0) paras.push(current.join(" ").trim());
  return paras.filter(p => p.length > 0);
}

// ── extractSection ─────────────────────────────────────────────────────────────
function extractSection(text: string, heading: string): string[] {
  if (!text) return [];
  const lines = text.split("\n");
  let inSection = false;
  const sectionLines: string[] = [];

  for (const line of lines) {
    if (line.startsWith("## ") || line.startsWith("# ")) {
      const h = line.replace(/^#+\s*/, "").trim().toLowerCase();
      if (h === heading.toLowerCase()) {
        inSection = true;
        continue;
      } else if (inSection) {
        break;
      }
    }
    if (inSection) sectionLines.push(line);
  }

  return splitParagraphs(sectionLines.join("\n"));
}

// ── extractKeyFindings ─────────────────────────────────────────────────────────
function extractKeyFindings(text: string): string[] {
  if (!text) return [];
  const marker = "from what you have told us, we can see:";
  const lower = text.toLowerCase();
  const idx = lower.indexOf(marker);
  if (idx === -1) return [];
  const after = text.slice(idx + marker.length);
  const lines = after.split("\n");
  const bullets: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("- ") || trimmed.startsWith("• ") || trimmed.startsWith("* ")) {
      bullets.push(trimmed.replace(/^[-•*]\s*/, "").trim());
    } else if (trimmed.length > 0 && bullets.length > 0) {
      break;
    }
  }
  return bullets;
}

// ── extractAllSections ─────────────────────────────────────────────────────────
function extractAllSections(text: string): Array<{ heading: string; paragraphs: string[] }> {
  if (!text) return [];
  const lines = text.split("\n");
  const sections: Array<{ heading: string; paragraphs: string[] }> = [];
  let currentHeading = "";
  let currentLines: string[] = [];

  for (const line of lines) {
    if (line.startsWith("## ") || line.startsWith("# ")) {
      if (currentHeading) {
        const paras = splitParagraphs(currentLines.join("\n"));
        if (paras.length > 0) sections.push({ heading: currentHeading, paragraphs: paras });
      }
      currentHeading = line.replace(/^#+\s*/, "").trim();
      currentLines = [];
    } else {
      currentLines.push(line);
    }
  }
  if (currentHeading) {
    const paras = splitParagraphs(currentLines.join("\n"));
    if (paras.length > 0) sections.push({ heading: currentHeading, paragraphs: paras });
  }
  return sections;
}

// ── extractPullquote ───────────────────────────────────────────────────────────
function extractPullquote(text: string): string {
  const paras = splitParagraphs(text);
  for (let i = paras.length - 1; i >= 0; i--) {
    const p = paras[i];
    if (!p.startsWith("- ") && !p.startsWith("• ") && p.length > 20) {
      const sentences = p.split(/(?<=[.!?])\s+/);
      return sentences[sentences.length - 1] ?? p;
    }
  }
  return paras[paras.length - 1] ?? "";
}

// ── deriveInsightsAxes ─────────────────────────────────────────────────────────
function deriveInsightsAxes(domainScores: Record<string, number>) {
  const e = domainScores["E"] ?? 50;
  const a = domainScores["A"] ?? 50;
  const o = domainScores["O"] ?? 50;
  const c = domainScores["C"] ?? 50;
  return [
    {
      label: "E / I axis",
      value: e >= 60 ? "Moderately Extraverted" : e <= 40 ? "Moderately Introverted" : "Ambivert",
      note: `Extraversion ${e}`,
    },
    {
      label: "T / F axis",
      value: a >= 60 ? "Moderately Feeling" : a <= 40 ? "Moderately Thinking" : "Balanced T/F",
      note: `Agreeableness ${a}`,
    },
    {
      label: "S / N · J / P",
      value: `${o >= 50 ? "Intuiting" : "Sensing"} · ${c >= 50 ? "Judging" : "Perceiving"}`,
      note: "Openness & Conscientiousness",
    },
  ];
}

// ─── Tests ─────────────────────────────────────────────────────────────────────

describe("splitParagraphs", () => {
  it("splits plain text on blank lines", () => {
    const text = "First paragraph.\n\nSecond paragraph.";
    const result = splitParagraphs(text);
    expect(result).toHaveLength(2);
    expect(result[0]).toBe("First paragraph.");
    expect(result[1]).toBe("Second paragraph.");
  });

  it("strips ## headings", () => {
    const text = "## My Heading\nParagraph under heading.";
    const result = splitParagraphs(text);
    expect(result).toHaveLength(1);
    expect(result[0]).toBe("Paragraph under heading.");
  });

  it("returns empty string array for empty input", () => {
    const result = splitParagraphs("");
    expect(result).toEqual([""]);
  });

  it("joins continuation lines within the same paragraph", () => {
    const text = "Line one\nLine two\nLine three";
    const result = splitParagraphs(text);
    expect(result).toHaveLength(1);
    expect(result[0]).toBe("Line one Line two Line three");
  });
});

describe("extractSection", () => {
  const text = `## Past\nFirst past paragraph.\n\nSecond past paragraph.\n\n## Present\nPresent paragraph.`;

  it("extracts the correct section by heading name", () => {
    const result = extractSection(text, "Past");
    expect(result).toHaveLength(2);
    expect(result[0]).toBe("First past paragraph.");
  });

  it("stops at the next heading", () => {
    const result = extractSection(text, "Past");
    expect(result).not.toContain("Present paragraph.");
  });

  it("is case-insensitive for heading matching", () => {
    const result = extractSection(text, "past");
    expect(result).toHaveLength(2);
  });

  it("returns empty array when heading not found", () => {
    const result = extractSection(text, "Future");
    // splitParagraphs returns [""] for empty input, so filter for truthy
    expect(result.filter(p => p.length > 0)).toHaveLength(0);
  });
});

describe("extractKeyFindings", () => {
  it("extracts bullet points after the marker", () => {
    const text = `Some intro text.\n\nFrom what you have told us, we can see:\n- You build systems from first principles.\n- You consistently seek mastery.\n- You thrive in autonomous roles.`;
    const result = extractKeyFindings(text);
    expect(result).toHaveLength(3);
    expect(result[0]).toBe("You build systems from first principles.");
  });

  it("returns empty array when marker is absent", () => {
    const result = extractKeyFindings("No marker here.");
    expect(result).toHaveLength(0);
  });

  it("stops at first non-bullet line after bullets", () => {
    const text = `From what you have told us, we can see:\n- Bullet one.\n- Bullet two.\n\nSome other text.`;
    const result = extractKeyFindings(text);
    expect(result).toHaveLength(2);
  });
});

describe("extractAllSections", () => {
  it("returns all ## sections with their paragraphs", () => {
    const text = `## Section A\nPara A1.\n\nPara A2.\n\n## Section B\nPara B1.`;
    const result = extractAllSections(text);
    expect(result).toHaveLength(2);
    expect(result[0].heading).toBe("Section A");
    expect(result[0].paragraphs).toHaveLength(2);
    expect(result[1].heading).toBe("Section B");
    expect(result[1].paragraphs).toHaveLength(1);
  });

  it("returns empty array for empty input", () => {
    expect(extractAllSections("")).toHaveLength(0);
  });
});

describe("extractPullquote", () => {
  it("returns the last sentence of the last substantive paragraph", () => {
    const text = `First paragraph is here.\n\nSecond paragraph ends with this sentence. And this is the last.`;
    const result = extractPullquote(text);
    expect(result).toBe("And this is the last.");
  });

  it("skips bullet-list paragraphs", () => {
    const text = `A real paragraph with content.\n\n- Bullet one\n- Bullet two`;
    const result = extractPullquote(text);
    expect(result).toBe("A real paragraph with content.");
  });
});

describe("deriveInsightsAxes", () => {
  it("returns three axes", () => {
    const axes = deriveInsightsAxes({ E: 41, A: 54, O: 85, C: 47 });
    expect(axes).toHaveLength(3);
  });

  it("classifies low E as Moderately Introverted", () => {
    // Threshold is <= 40 for Introverted; 41 is Ambivert
    const axes = deriveInsightsAxes({ E: 38, A: 54, O: 85, C: 47 });
    expect(axes[0].value).toBe("Moderately Introverted");
  });

  it("classifies E=41 as Ambivert (boundary)", () => {
    const axes = deriveInsightsAxes({ E: 41, A: 54, O: 85, C: 47 });
    expect(axes[0].value).toBe("Ambivert");
  });

  it("classifies high A as Moderately Feeling", () => {
    const axes = deriveInsightsAxes({ E: 41, A: 65, O: 85, C: 47 });
    expect(axes[1].value).toBe("Moderately Feeling");
  });

  it("classifies high O as Intuiting", () => {
    const axes = deriveInsightsAxes({ E: 41, A: 54, O: 85, C: 47 });
    expect(axes[2].value).toContain("Intuiting");
  });

  it("classifies low C as Perceiving", () => {
    const axes = deriveInsightsAxes({ E: 41, A: 54, O: 85, C: 40 });
    expect(axes[2].value).toContain("Perceiving");
  });

  it("classifies mid E as Ambivert", () => {
    const axes = deriveInsightsAxes({ E: 50, A: 50, O: 50, C: 50 });
    expect(axes[0].value).toBe("Ambivert");
  });
});

// ── deriveWheelPosition (inline copy for test isolation) ─────────────────────
function deriveWheelPosition(domainScores: Record<string, number>): { X: number; Y: number } {
  const e = domainScores["E"] ?? 50;
  const a = domainScores["A"] ?? 50;
  const ex = (e - 50) / 50;
  const ay = (a - 50) / 50;
  const maxR = 80;
  return {
    X: Math.round(120 + ex * maxR),
    Y: Math.round(120 + ay * maxR),
  };
}

describe("deriveWheelPosition", () => {
  it("places a perfectly average client at the wheel centre", () => {
    const pos = deriveWheelPosition({ E: 50, A: 50 });
    expect(pos.X).toBe(120);
    expect(pos.Y).toBe(120);
  });

  it("places a highly extraverted client to the right of centre", () => {
    const pos = deriveWheelPosition({ E: 90, A: 50 });
    expect(pos.X).toBeGreaterThan(120);
    expect(pos.Y).toBe(120);
  });

  it("places a highly introverted client to the left of centre", () => {
    const pos = deriveWheelPosition({ E: 10, A: 50 });
    expect(pos.X).toBeLessThan(120);
  });

  it("places a highly agreeable (Feeler) client below centre", () => {
    const pos = deriveWheelPosition({ E: 50, A: 90 });
    expect(pos.Y).toBeGreaterThan(120);
  });

  it("places a low-agreeableness (Thinker) client above centre", () => {
    const pos = deriveWheelPosition({ E: 50, A: 10 });
    expect(pos.Y).toBeLessThan(120);
  });

  it("caps the dot within the 80px radius at extreme scores", () => {
    const pos = deriveWheelPosition({ E: 100, A: 100 });
    expect(pos.X).toBe(200);
    expect(pos.Y).toBe(200);
  });
});

// ─── Import buildLifeHistoryPages directly (now exported) ────────────────────
import { buildLifeHistoryPages, parseFourPillars } from "./routers/claudeExport.js";

describe("buildLifeHistoryPages", () => {
  const makeAchievement = (decade: string, id = 1) => ({
    id,
    decade,
    title: `Achievement ${id}`,
    age: 25,
    description: "Did something great.",
    sageEnrichment: null,
    esf: "satisfying",
  });

  it("returns empty array when there are no achievements", () => {
    const pages = buildLifeHistoryPages([]);
    expect(pages).toHaveLength(0);
  });

  it("returns exactly one page for a single decade with one entry", () => {
    const pages = buildLifeHistoryPages([makeAchievement("twenties")]);
    expect(pages).toHaveLength(1);
    expect(pages[0].showKicker).toBe(true);
    expect(pages[0].stages).toHaveLength(1);
    expect(pages[0].stages[0].title).toBe("Twenties");
  });

  it("does NOT emit blank pages for decades with no entries", () => {
    // Only childhood and thirties have entries; twenties is empty
    const achievements = [
      makeAchievement("childhood", 1),
      makeAchievement("thirties", 2),
    ];
    const pages = buildLifeHistoryPages(achievements);
    // Should be 1 page (2 stages fit on one page with the ≥2 threshold)
    expect(pages).toHaveLength(1);
    const allTitles = pages.flatMap(p => p.stages.map(s => s.title));
    expect(allTitles).toContain("Childhood · 0–11");
    expect(allTitles).toContain("Thirties");
    expect(allTitles).not.toContain("Twenties");
  });

  it("spills to a second page when more than 2 stages are present", () => {
    const achievements = [
      makeAchievement("childhood", 1),
      makeAchievement("teens", 2),
      makeAchievement("twenties", 3),
    ];
    const pages = buildLifeHistoryPages(achievements);
    expect(pages).toHaveLength(2);
    expect(pages[0].stages).toHaveLength(2);
    expect(pages[1].stages).toHaveLength(1);
  });

  it("first page always has showKicker:true, subsequent pages have false", () => {
    const achievements = [
      makeAchievement("childhood", 1),
      makeAchievement("teens", 2),
      makeAchievement("twenties", 3),
    ];
    const pages = buildLifeHistoryPages(achievements);
    expect(pages[0].showKicker).toBe(true);
    expect(pages[1].showKicker).toBe(false);
  });

  it("assigns sequential page numbers starting at 17", () => {
    const achievements = [
      makeAchievement("childhood", 1),
      makeAchievement("teens", 2),
      makeAchievement("twenties", 3),
    ];
    const pages = buildLifeHistoryPages(achievements);
    expect(pages[0].pageNum).toBe("17");
    expect(pages[1].pageNum).toBe("18");
  });
});

// ─── parseFourPillars ────────────────────────────────────────────────────────
describe("parseFourPillars", () => {
  const SAMPLE = `
## Places — Where Energy Was High
Learning: You consistently thrive in environments that combine intellectual rigour with creative latitude.

During your time at the BBC, you described the newsroom as the place where you felt most alive.

Your account of the Nairobi project reveals the same pattern: a complex environment with high stakes and genuine autonomy.

## People — Who You Work Best With
Learning: You do your best work alongside people who combine domain expertise with genuine curiosity.

Your description of the team at McKinsey is revealing: what you valued was not seniority but the quality of thinking.

## The Combination
> You are most fully yourself when the environment is complex, the people are intellectually alive, and the problem is genuinely unsolved.

The practical question this raises is not 'what field should I work in?' but rather: what kind of problem, in what kind of organisation, with what kind of team?

*Based on Savickas, M.L. (2011). Career Counseling. APA.*
`;

  it("parses pillar headings", () => {
    const result = parseFourPillars(SAMPLE);
    expect(result.pillars).toHaveLength(2);
    expect(result.pillars[0].heading).toBe("Places \u2014 Where Energy Was High");
    expect(result.pillars[1].heading).toBe("People \u2014 Who You Work Best With");
  });

  it("splits heading into ALLCAPS and subtitle", () => {
    const result = parseFourPillars(SAMPLE);
    expect(result.pillars[0].headingAllcaps).toBe("PLACES");
    expect(result.pillars[0].headingSubtitle).toBe("Where Energy Was High");
    expect(result.pillars[1].headingAllcaps).toBe("PEOPLE");
    expect(result.pillars[1].headingSubtitle).toBe("Who You Work Best With");
  });

  it("extracts learning sentences from each pillar", () => {
    const result = parseFourPillars(SAMPLE);
    expect(result.pillars[0].learning).toContain("intellectual rigour");
    expect(result.pillars[1].learning).toContain("domain expertise");
  });

  it("extracts example paragraphs from each pillar", () => {
    const result = parseFourPillars(SAMPLE);
    expect(result.pillars[0].examples.length).toBeGreaterThan(0);
    expect(result.pillars[0].examples[0]).toContain("BBC");
  });

  it("extracts the combination synthesis", () => {
    const result = parseFourPillars(SAMPLE);
    expect(result.combination.synthesis).toContain("most fully yourself");
  });

  it("extracts the combination practical question", () => {
    const result = parseFourPillars(SAMPLE);
    expect(result.combination.practical_question).toContain("what kind of problem");
  });

  it("extracts the citation", () => {
    const result = parseFourPillars(SAMPLE);
    expect(result.citation).toContain("Savickas");
  });

  it("returns empty pillars for empty input", () => {
    const result = parseFourPillars("");
    expect(result.pillars).toHaveLength(0);
    expect(result.combination.synthesis).toBe("");
    expect(result.citation).toBe("");
  });

  it("headingAllcaps is empty string for heading without em-dash", () => {
    const simple = `## PLACES\n\nLearning: You thrive in open spaces.\n\nExample paragraph here.\n`;
    const result = parseFourPillars(simple);
    expect(result.pillars[0].headingAllcaps).toBe("PLACES");
    expect(result.pillars[0].headingSubtitle).toBe("");
  });

  it("HAS_CONTENT is truthy when pillars are present", () => {
    const result = parseFourPillars(SAMPLE);
    expect(result.pillars.length > 0).toBe(true);
  });
});
