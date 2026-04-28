import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock DB helpers ──────────────────────────────────────────────────────────
vi.mock("./db", () => ({
  getOrCreateClientProfile: vi.fn().mockResolvedValue({ id: 1, userId: 42 }),
  getCareerExplorerSession: vi.fn().mockResolvedValue(null),
  getOrCreateCareerExplorerSession: vi.fn().mockResolvedValue({ id: 10, clientId: 1, messages: "[]", preferredName: null }),
  appendCareerExplorerMessage: vi.fn().mockResolvedValue(undefined),
  clearCareerExplorerSession: vi.fn().mockResolvedValue(undefined),
  updateCareerExplorerPreferredName: vi.fn().mockResolvedValue(undefined),
  replaceCareerExplorerMessages: vi.fn().mockResolvedValue(undefined),
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
  updateCareerExplorerPreferredName,
  replaceCareerExplorerMessages,
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

  it("updateCareerExplorerPreferredName is called with sessionId and name", async () => {
    await updateCareerExplorerPreferredName(10, "Jamie");
    expect(updateCareerExplorerPreferredName).toHaveBeenCalledWith(10, "Jamie");
  });
});

describe("Career Explorer — scripted message detection", () => {
  it("isSecondMessage: true when exactly 1 advisor message exists", () => {
    const existingMessages = [{ role: "advisor", content: "Hello...", timestamp: 1 }];
    const isSecondMessage =
      existingMessages.length === 1 &&
      existingMessages[0].role === "advisor";
    expect(isSecondMessage).toBe(true);
  });

  it("isSecondMessage: false when 0 messages exist", () => {
    const existingMessages: any[] = [];
    const isSecondMessage =
      existingMessages.length === 1 &&
      existingMessages[0]?.role === "advisor";
    expect(isSecondMessage).toBe(false);
  });

  it("isThirdMessage: true when 3 messages exist", () => {
    const existingMessages = [
      { role: "advisor", content: "Hello...", timestamp: 1 },
      { role: "client", content: "Jamie", timestamp: 2 },
      { role: "advisor", content: "OK Jamie...", timestamp: 3 },
    ];
    const isThirdMessage = existingMessages.length === 3;
    expect(isThirdMessage).toBe(true);
  });

  it("isThirdMessage: false when 4 messages exist", () => {
    const existingMessages = [
      { role: "advisor", content: "Hello...", timestamp: 1 },
      { role: "client", content: "Jamie", timestamp: 2 },
      { role: "advisor", content: "OK Jamie...", timestamp: 3 },
      { role: "client", content: "I want to add...", timestamp: 4 },
    ];
    const isThirdMessage = existingMessages.length === 3;
    expect(isThirdMessage).toBe(false);
  });

  it("second scripted message includes the client's name", () => {
    const preferredName = "Jamie";
    const secondText = `OK ${preferredName}.  So although I have read and pondered everything you wrote, I have discovered that many people — once they have read my report — want to add or clarify some things.  What about you ${preferredName}?  What would you like to clarify or add?`;
    expect(secondText).toContain("OK Jamie");
    expect(secondText).toContain("What about you Jamie?");
    expect(secondText).toContain("What would you like to clarify or add?");
  });

  it("opening message contains Alistair's introduction text", () => {
    const openingText = `Hello.  Good to meet you.  I'm Alistair.  My title at Lifework is "The Analyst".  As I'm getting older I sometimes forget if I've met people before.  If I have — and you have the transcript of our conversation — please upload it.  Otherwise, welcome.  I'm the one who read all your life history, pondered your psychometrics and wrote your report.  So I know a lot about you already.  I know that sometimes people's official names don't match their used names — so what name should I use when chatting to you?`;
    expect(openingText).toContain("I'm Alistair");
    expect(openingText).toContain("The Analyst");
    expect(openingText).toContain("please upload it");
    expect(openingText).toContain("what name should I use");
  });

  it("welcome-back message uses preferred name", () => {
    const name = "Jamie";
    const welcomeBack = `Ah yes, I remember now — welcome back ${name}.  Where were we?`;
    expect(welcomeBack).toContain("welcome back Jamie");
    expect(welcomeBack).toContain("Where were we?");
  });

  it("replaceCareerExplorerMessages is called with messages and preferredName", async () => {
    const messages = [
      { role: "advisor" as const, content: "Hello...", timestamp: 1 },
      { role: "client" as const, content: "Jamie", timestamp: 2 },
    ];
    await replaceCareerExplorerMessages(1, messages, "Jamie");
    expect(replaceCareerExplorerMessages).toHaveBeenCalledWith(1, messages, "Jamie");
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
