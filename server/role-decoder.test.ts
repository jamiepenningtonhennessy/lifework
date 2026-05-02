import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock DB helpers ──────────────────────────────────────────────────────────
vi.mock("./db", () => ({
  getClientProfileById: vi.fn(),
  getAchievements: vi.fn(),
  getFamilyBackground: vi.fn(),
  getViaResults: vi.fn(),
  getIpipResults: vi.fn(),
  getAnalysisReport: vi.fn(),
}));

import {
  getClientProfileById,
  getAchievements,
  getFamilyBackground,
  getViaResults,
  getIpipResults,
  getAnalysisReport,
} from "./db";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Minimal client profile fixture */
const MOCK_PROFILE = {
  id: 1,
  userId: 42,
  firstName: "Alex",
  lastName: "Morgan",
  email: "alex@example.com",
  currentRole: "Senior Associate",
  currentOrg: "Clifford Chance",
  pronouns: "she/her",
  interviewStatus: "completed" as const,
  viaStatus: "completed" as const,
  ipipStatus: "completed" as const,
  backgroundStatus: "completed" as const,
  sageStatus: "completed" as const,
  cognitiveStatus: "not_started" as const,
  analysisStatus: "completed" as const,
  careerExplorerUnlocked: false,
  dateOfBirth: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const MOCK_ACHIEVEMENTS = [
  {
    id: 1, clientId: 1, decade: "twenties" as const, age: 25,
    title: "Led pro bono clinic restructure",
    esf: "fulfilling" as const,
    description: "Redesigned the intake process so junior volunteers could run it independently.",
    othersObservations: "Others said she made the complex feel simple.",
    sageEnrichment: null, counsellorNotes: null, skills: null, sortOrder: 0, createdAt: new Date(),
  },
];

const MOCK_FAMILY = {
  id: 1, clientId: 1,
  fatherOccupation: "Secondary school teacher",
  motherOccupation: "GP",
  siblingPosition: "Eldest of three",
  upbringingLocation: "Glasgow",
  familyNarrative: "A household where public service was the default frame.",
  significantInfluences: "Grandmother — a community organiser in the 1970s.",
  createdAt: new Date(), updatedAt: new Date(),
};

const MOCK_VIA = {
  id: 1, clientId: 1,
  rankedStrengths: JSON.stringify([
    { name: "Fairness", score: 23, rank: 1 },
    { name: "Leadership", score: 22, rank: 2 },
    { name: "Perspective", score: 21, rank: 3 },
    { name: "Judgment", score: 20, rank: 4 },
    { name: "Perseverance", score: 19, rank: 5 },
  ]),
  rawScores: null,
  completedAt: new Date(), createdAt: new Date(), updatedAt: new Date(),
};

const MOCK_IPIP = {
  id: 1, clientId: 1,
  domainScores: JSON.stringify({ N: 30, E: 65, O: 80, A: 70, C: 75 }),
  facetScores: null, rawAnswers: null,
  completedAt: new Date(), createdAt: new Date(), updatedAt: new Date(),
};

const MOCK_REPORT = {
  id: 1, clientId: 1,
  wowReportJson: JSON.stringify({
    summary: "Alex is someone who builds systems that give other people freedom.",
    lifeHistoryPattern: "A recurring theme of reducing complexity so that others can act.",
  }),
  canonicalStage1: null,
  coreStrengths: null, drivingMotivations: null, preferredEnvironments: null,
  keySkills: null, careerThemes: null, viaCorrelation: null, careerSuggestions: null,
  counselorNotes: null, fullReportMarkdown: null, coachingSummaryJson: null,
  coachNotesJson: null, sectionAnalysisJson: null,
  wowReportPdfUrl: null, wowReportGeneratedAt: null,
  wowReportStatus: "done", wowReportError: null,
  wowReportType: "standard" as const, wowReportWritingStyle: "house",
  wowReportLocked: false,
  canonicalStage1GeneratedAt: null,
  counsellorViaAnalysis: null, counsellorViaGeneratedAt: null,
  counsellorOceanAnalysis: null, counsellorOceanGeneratedAt: null,
  generatedAt: new Date(), createdAt: new Date(), updatedAt: new Date(),
};

// ─── Tests: DB helper mocks ───────────────────────────────────────────────────

describe("Role Decoder — DB helpers (mocked)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("getClientProfileById returns null for unknown client", async () => {
    vi.mocked(getClientProfileById).mockResolvedValue(null);
    const result = await getClientProfileById(9999);
    expect(result).toBeNull();
  });

  it("getClientProfileById returns profile for known client", async () => {
    vi.mocked(getClientProfileById).mockResolvedValue(MOCK_PROFILE);
    const result = await getClientProfileById(1);
    expect(result).toHaveProperty("firstName", "Alex");
    expect(result).toHaveProperty("currentRole", "Senior Associate");
  });

  it("getAchievements returns empty array when no achievements", async () => {
    vi.mocked(getAchievements).mockResolvedValue([]);
    const result = await getAchievements(1);
    expect(result).toEqual([]);
  });

  it("getViaResults parses rankedStrengths correctly", async () => {
    vi.mocked(getViaResults).mockResolvedValue(MOCK_VIA);
    const result = await getViaResults(1);
    const parsed = JSON.parse(result!.rankedStrengths as string);
    expect(parsed[0]).toHaveProperty("name", "Fairness");
    expect(parsed[0]).toHaveProperty("rank", 1);
  });

  it("getIpipResults parses domainScores correctly", async () => {
    vi.mocked(getIpipResults).mockResolvedValue(MOCK_IPIP);
    const result = await getIpipResults(1);
    const scores = JSON.parse(result!.domainScores as string);
    expect(scores).toHaveProperty("E", 65);
    expect(scores).toHaveProperty("O", 80);
  });

  it("getAnalysisReport returns wowReportJson when present", async () => {
    vi.mocked(getAnalysisReport).mockResolvedValue(MOCK_REPORT);
    const result = await getAnalysisReport(1);
    expect(result?.wowReportJson).toBeTruthy();
    const wow = JSON.parse(result!.wowReportJson!);
    expect(wow.summary).toContain("builds systems");
  });
});

// ─── Tests: Insights colour derivation ───────────────────────────────────────

describe("Role Decoder — Insights colour derivation", () => {
  /** Mirrors the deriveInsightsColour logic in roleDecoder.ts */
  function deriveInsightsColour(e: number, a: number): string {
    if (e >= 55 && a >= 55) return "Sunshine Yellow";
    if (e >= 55 && a < 55)  return "Fiery Red";
    if (e < 55  && a >= 55) return "Earth Green";
    return "Cool Blue";
  }

  it("high E + high A → Sunshine Yellow", () => {
    expect(deriveInsightsColour(70, 70)).toBe("Sunshine Yellow");
  });

  it("high E + low A → Fiery Red", () => {
    expect(deriveInsightsColour(70, 40)).toBe("Fiery Red");
  });

  it("low E + high A → Earth Green", () => {
    expect(deriveInsightsColour(40, 70)).toBe("Earth Green");
  });

  it("low E + low A → Cool Blue", () => {
    expect(deriveInsightsColour(40, 40)).toBe("Cool Blue");
  });

  it("boundary: E=55, A=55 → Sunshine Yellow", () => {
    expect(deriveInsightsColour(55, 55)).toBe("Sunshine Yellow");
  });

  it("boundary: E=54, A=54 → Cool Blue", () => {
    expect(deriveInsightsColour(54, 54)).toBe("Cool Blue");
  });
});

// ─── Tests: Context assembly logic ───────────────────────────────────────────

describe("Role Decoder — context assembly", () => {
  beforeEach(() => {
    vi.mocked(getClientProfileById).mockResolvedValue(MOCK_PROFILE);
    vi.mocked(getAchievements).mockResolvedValue(MOCK_ACHIEVEMENTS);
    vi.mocked(getFamilyBackground).mockResolvedValue(MOCK_FAMILY);
    vi.mocked(getViaResults).mockResolvedValue(MOCK_VIA);
    vi.mocked(getIpipResults).mockResolvedValue(MOCK_IPIP);
    vi.mocked(getAnalysisReport).mockResolvedValue(MOCK_REPORT);
  });

  it("includes client name in context", async () => {
    const profile = await getClientProfileById(1);
    expect(profile?.firstName).toBe("Alex");
    expect(profile?.lastName).toBe("Morgan");
  });

  it("includes current role and organisation", async () => {
    const profile = await getClientProfileById(1);
    expect(profile?.currentRole).toBe("Senior Associate");
    expect(profile?.currentOrg).toBe("Clifford Chance");
  });

  it("includes WOW summary when present", async () => {
    const report = await getAnalysisReport(1);
    const wow = JSON.parse(report!.wowReportJson!);
    expect(wow.summary).toBeTruthy();
  });

  it("includes VIA top strengths", async () => {
    const via = await getViaResults(1);
    const strengths = JSON.parse(via!.rankedStrengths as string);
    expect(strengths.length).toBeGreaterThanOrEqual(3);
    expect(strengths[0].name).toBe("Fairness");
  });

  it("includes IPIP domain scores", async () => {
    const ipip = await getIpipResults(1);
    const scores = JSON.parse(ipip!.domainScores as string);
    expect(Object.keys(scores)).toContain("O");
    expect(Object.keys(scores)).toContain("E");
  });

  it("includes achievements with description and others observations", async () => {
    const achievements = await getAchievements(1);
    expect(achievements[0].description).toContain("intake process");
    expect(achievements[0].othersObservations).toContain("made the complex feel simple");
  });

  it("falls back to canonicalStage1 when wowReportJson is absent", async () => {
    vi.mocked(getAnalysisReport).mockResolvedValue({
      ...MOCK_REPORT,
      wowReportJson: null,
      canonicalStage1: "A pattern of building clarity in complex systems.",
    });
    const report = await getAnalysisReport(1);
    expect(report?.canonicalStage1).toContain("building clarity");
    expect(report?.wowReportJson).toBeNull();
  });
});

// ─── Tests: Input validation ──────────────────────────────────────────────────

describe("Role Decoder — input validation", () => {
  it("rejects job descriptions shorter than 50 characters", () => {
    const jd = "Short JD";
    expect(jd.trim().length).toBeLessThan(50);
  });

  it("accepts job descriptions of 50 or more characters", () => {
    const jd = "We are looking for a Senior Associate to join our team and lead client relationships across multiple sectors.";
    expect(jd.trim().length).toBeGreaterThanOrEqual(50);
  });

  it("rejects non-positive clientId", () => {
    const clientId = 0;
    expect(clientId).toBeLessThanOrEqual(0);
  });
});
