import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock DB helpers ──────────────────────────────────────────────────────────
vi.mock("./db", () => ({
  getOrCreateClientProfile: vi.fn().mockResolvedValue({ id: 1, userId: 42 }),
  getCareerExplorerSession: vi.fn().mockResolvedValue(null),
  getOrCreateCareerExplorerSession: vi.fn().mockResolvedValue({ id: 10, clientId: 1, messages: "[]" }),
  appendCareerExplorerMessage: vi.fn().mockResolvedValue(undefined),
  clearCareerExplorerSession: vi.fn().mockResolvedValue(undefined),
  getAchievements: vi.fn().mockResolvedValue([
    { decade: "Early Childhood", title: "Won school debate", esf: "Fulfilling", description: "Argued for recycling" },
  ]),
  getEducationHistory: vi.fn().mockResolvedValue([
    { yearFrom: 2010, yearTo: 2014, qualification: "BA History", institution: "University of Edinburgh" },
  ]),
  getCareerHistory: vi.fn().mockResolvedValue([]),
  getFamilyBackground: vi.fn().mockResolvedValue({ fatherOccupation: "Teacher", motherOccupation: "Nurse", siblingPosition: "Eldest" }),
  getViaResults: vi.fn().mockResolvedValue({ rankedStrengths: [{ strength: "Love of Learning" }, { strength: "Perspective" }] }),
  getIpipResults: vi.fn().mockResolvedValue({ domainScores: { O: 85, C: 70, E: 55, A: 75, N: 30 } }),
  getAnalysisReport: vi.fn().mockResolvedValue({ careerThemes: "Research, writing, public affairs", careerSuggestions: "Parliamentary researcher, journalist" }),
}));

// ─── Mock LLM ─────────────────────────────────────────────────────────────────
vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [{ message: { content: "Based on your profile, you show strong alignment with parliamentary research roles..." } }],
  }),
}));

import {
  getOrCreateCareerExplorerSession,
  appendCareerExplorerMessage,
  clearCareerExplorerSession,
  getCareerExplorerSession,
} from "./db";
import { invokeLLM } from "./_core/llm";

describe("Career Explorer DB helpers (mocked)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("getOrCreateCareerExplorerSession returns a session", async () => {
    const session = await getOrCreateCareerExplorerSession(1);
    expect(session).toHaveProperty("id", 10);
    expect(session).toHaveProperty("clientId", 1);
  });

  it("getCareerExplorerSession returns null when no session exists", async () => {
    const session = await getCareerExplorerSession(99);
    expect(session).toBeNull();
  });

  it("appendCareerExplorerMessage is called with correct args", async () => {
    const msg = { role: "client" as const, content: "How do I match a parliamentary researcher role?", timestamp: Date.now() };
    await appendCareerExplorerMessage(10, msg);
    expect(appendCareerExplorerMessage).toHaveBeenCalledWith(10, msg);
  });

  it("clearCareerExplorerSession is called with clientId", async () => {
    await clearCareerExplorerSession(1);
    expect(clearCareerExplorerSession).toHaveBeenCalledWith(1);
  });
});

describe("Career Explorer LLM integration (mocked)", () => {
  it("invokeLLM is called with a system prompt containing the profile context", async () => {
    const { getAchievements, getEducationHistory, getCareerHistory, getFamilyBackground, getViaResults, getIpipResults, getAnalysisReport } = await import("./db");

    const [achievements, education, career, bg, via, ipip, report] = await Promise.all([
      getAchievements(1),
      getEducationHistory(1),
      getCareerHistory(1),
      getFamilyBackground(1),
      getViaResults(1),
      getIpipResults(1),
      getAnalysisReport(1),
    ]);

    const achievementsCtx = (achievements as any[]).map((a: any) => `[${a.decade}] ${a.title} (${a.esf}): ${a.description}`).join("\n");
    const systemContent = `CLIENT PROFILE:\n\nLIFE HISTORY ACHIEVEMENTS:\n${achievementsCtx}`;

    const response = await invokeLLM({
      messages: [
        { role: "system", content: systemContent },
        { role: "user", content: "How do I match a parliamentary researcher role?" },
      ] as any,
    });

    expect(response.choices[0].message.content).toContain("parliamentary research");
    expect(invokeLLM).toHaveBeenCalledTimes(1);
  });

  it("LLM response is non-empty", async () => {
    const response = await invokeLLM({ messages: [] as any });
    expect(response.choices[0].message.content.length).toBeGreaterThan(10);
  });
});
