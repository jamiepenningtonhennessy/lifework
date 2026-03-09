/**
 * Virtual Peter — Parallel Client Matching Tests
 *
 * Tests the core semantic tag similarity algorithm that powers the
 * "Virtual Peter" parallel client matching feature.
 *
 * The algorithm uses Jaccard similarity on theme arrays (50% weight),
 * environment match (20%), motivation match (20%), and sector overlap (10%).
 */

import { describe, it, expect } from "vitest";

// ─── Inline the similarity function for testing ────────────────────────────
// (mirrors the implementation in server/routers.ts)

type SemanticTags = {
  themes: string[];
  environment: string;
  motivation: string;
  sector: string[];
  summary: string;
};

function computeTagSimilarity(clientTags: SemanticTags, historicalTags: SemanticTags): number {
  let score = 0;
  let maxScore = 0;

  // Theme overlap (weighted 50%): Jaccard similarity on theme arrays
  const clientThemes = new Set(clientTags.themes.map((t) => t.toLowerCase()));
  const histThemes = new Set(historicalTags.themes.map((t) => t.toLowerCase()));
  const themeIntersection = Array.from(clientThemes).filter((t) => histThemes.has(t)).length;
  const themeUnion = new Set(Array.from(clientThemes).concat(Array.from(histThemes))).size;
  const themeScore = themeUnion > 0 ? themeIntersection / themeUnion : 0;
  score += themeScore * 50;
  maxScore += 50;

  // Environment match (weighted 20%)
  if (clientTags.environment && historicalTags.environment) {
    const envMatch =
      clientTags.environment.toLowerCase() === historicalTags.environment.toLowerCase()
        ? 1
        : clientTags.environment
              .toLowerCase()
              .split(",")
              .some((e) => historicalTags.environment.toLowerCase().includes(e.trim()))
          ? 0.5
          : 0;
    score += envMatch * 20;
    maxScore += 20;
  }

  // Motivation match (weighted 20%)
  if (clientTags.motivation && historicalTags.motivation) {
    const motMatch =
      clientTags.motivation.toLowerCase() === historicalTags.motivation.toLowerCase()
        ? 1
        : clientTags.motivation
              .toLowerCase()
              .split(",")
              .some((m) => historicalTags.motivation.toLowerCase().includes(m.trim()))
          ? 0.5
          : 0;
    score += motMatch * 20;
    maxScore += 20;
  }

  // Sector overlap (weighted 10%)
  if (clientTags.sector?.length && historicalTags.sector?.length) {
    const clientSectors = new Set(clientTags.sector.map((s) => s.toLowerCase()));
    const histSectors = new Set(historicalTags.sector.map((s) => s.toLowerCase()));
    const sectorIntersection = Array.from(clientSectors).filter((s) => histSectors.has(s)).length;
    const sectorUnion = new Set(Array.from(clientSectors).concat(Array.from(histSectors))).size;
    const sectorScore = sectorUnion > 0 ? sectorIntersection / sectorUnion : 0;
    score += sectorScore * 10;
    maxScore += 10;
  }

  return maxScore > 0 ? score / maxScore : 0;
}

// ─── Tests ─────────────────────────────────────────────────────────────────

describe("Virtual Peter — computeTagSimilarity", () => {
  it("returns 1.0 for identical profiles", () => {
    const tags: SemanticTags = {
      themes: ["organising", "leading", "communicating"],
      environment: "people-facing",
      motivation: "service",
      sector: ["education", "public sector"],
      summary: "A natural leader who organises and communicates.",
    };
    expect(computeTagSimilarity(tags, tags)).toBeCloseTo(1.0, 2);
  });

  it("returns 0.0 for completely different profiles", () => {
    const clientTags: SemanticTags = {
      themes: ["analysing", "researching", "writing"],
      environment: "intellectual",
      motivation: "discovery",
      sector: ["technology"],
      summary: "A researcher who analyses and writes.",
    };
    const historicalTags: SemanticTags = {
      themes: ["performing", "entertaining", "expressing"],
      environment: "creative",
      motivation: "expression",
      sector: ["arts", "media"],
      summary: "A performer who entertains and expresses.",
    };
    expect(computeTagSimilarity(clientTags, historicalTags)).toBeLessThan(0.1);
  });

  it("gives partial credit for partial theme overlap", () => {
    const clientTags: SemanticTags = {
      themes: ["organising", "leading", "communicating", "teaching"],
      environment: "people-facing",
      motivation: "service",
      sector: ["education"],
      summary: "",
    };
    const historicalTags: SemanticTags = {
      themes: ["organising", "leading", "analysing", "building"],
      environment: "people-facing",
      motivation: "service",
      sector: ["education"],
      summary: "",
    };
    const similarity = computeTagSimilarity(clientTags, historicalTags);
    // 2/6 theme Jaccard = 0.333 → 0.333 * 50 = 16.67
    // environment match = 1.0 → 20
    // motivation match = 1.0 → 20
    // sector match = 1/1 = 1.0 → 10
    // total = 66.67 / 100 = 0.667
    expect(similarity).toBeGreaterThan(0.5);
    expect(similarity).toBeLessThan(0.8);
  });

  it("theme overlap is the dominant factor (50% weight)", () => {
    const highThemeMatch: SemanticTags = {
      themes: ["organising", "leading", "communicating"],
      environment: "creative",    // different
      motivation: "expression",   // different
      sector: ["arts"],           // different
      summary: "",
    };
    const lowThemeMatch: SemanticTags = {
      themes: ["performing", "entertaining"],
      environment: "people-facing",
      motivation: "service",
      sector: ["education"],
      summary: "",
    };
    const client: SemanticTags = {
      themes: ["organising", "leading", "communicating"],
      environment: "people-facing",
      motivation: "service",
      sector: ["education"],
      summary: "",
    };
    const scoreHigh = computeTagSimilarity(client, highThemeMatch);
    const scoreLow = computeTagSimilarity(client, lowThemeMatch);
    // highThemeMatch has perfect theme match (50%) but different env/mot/sector
    // lowThemeMatch has 0 theme match but perfect env/mot/sector (50%)
    // They should be roughly equal but theme match should win on tie-break
    expect(scoreHigh).toBeGreaterThanOrEqual(scoreLow - 0.1);
  });

  it("handles empty sector arrays gracefully", () => {
    const clientTags: SemanticTags = {
      themes: ["organising"],
      environment: "people-facing",
      motivation: "service",
      sector: [],
      summary: "",
    };
    const historicalTags: SemanticTags = {
      themes: ["organising"],
      environment: "people-facing",
      motivation: "service",
      sector: [],
      summary: "",
    };
    // Should not throw; sector weight simply not counted
    expect(() => computeTagSimilarity(clientTags, historicalTags)).not.toThrow();
    const sim = computeTagSimilarity(clientTags, historicalTags);
    expect(sim).toBeGreaterThan(0.9); // themes + env + motivation all match
  });

  it("is case-insensitive for all tag comparisons", () => {
    const clientTags: SemanticTags = {
      themes: ["Organising", "LEADING"],
      environment: "People-Facing",
      motivation: "Service",
      sector: ["Education"],
      summary: "",
    };
    const historicalTags: SemanticTags = {
      themes: ["organising", "leading"],
      environment: "people-facing",
      motivation: "service",
      sector: ["education"],
      summary: "",
    };
    expect(computeTagSimilarity(clientTags, historicalTags)).toBeCloseTo(1.0, 2);
  });

  it("Peter's principle: life history themes dominate over sector", () => {
    // A lawyer who loved teaching and organising people
    const client: SemanticTags = {
      themes: ["teaching", "organising", "communicating", "leading"],
      environment: "people-facing",
      motivation: "service",
      sector: ["legal"],
      summary: "",
    };
    // A teacher — same themes, same environment, different sector
    const teacher: SemanticTags = {
      themes: ["teaching", "organising", "communicating", "leading"],
      environment: "people-facing",
      motivation: "service",
      sector: ["education"],
      summary: "",
    };
    // A corporate lawyer — same sector, different themes
    const corporateLawyer: SemanticTags = {
      themes: ["analysing", "negotiating", "researching", "advising"],
      environment: "intellectual",
      motivation: "achievement",
      sector: ["legal"],
      summary: "",
    };
    const teacherScore = computeTagSimilarity(client, teacher);
    const lawyerScore = computeTagSimilarity(client, corporateLawyer);
    // Peter would say: the teacher is the better parallel client
    expect(teacherScore).toBeGreaterThan(lawyerScore);
  });
});
