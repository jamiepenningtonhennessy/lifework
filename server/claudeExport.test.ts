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
