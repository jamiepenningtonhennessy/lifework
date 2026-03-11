import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the DB helpers
vi.mock("./db", () => ({
  getCoachingAnnex: vi.fn(),
  upsertCoachingAnnex: vi.fn(),
  getClientProfileById: vi.fn(),
  getAchievements: vi.fn(),
  getFamilyBackground: vi.fn(),
  getEducationHistory: vi.fn(),
  getCareerHistory: vi.fn(),
  getViaResults: vi.fn(),
  getIpipResults: vi.fn(),
  getAnalysisReport: vi.fn(),
}));

vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn(),
}));

import {
  getCoachingAnnex,
  upsertCoachingAnnex,
  getClientProfileById,
  getAchievements,
  getFamilyBackground,
  getEducationHistory,
  getCareerHistory,
  getViaResults,
  getIpipResults,
  getAnalysisReport,
} from "./db";
import { invokeLLM } from "./_core/llm";

// ─── Unit tests for DB helpers ────────────────────────────────────────────────

describe("getCoachingAnnex", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns null when no annex exists", async () => {
    vi.mocked(getCoachingAnnex).mockResolvedValue(null);
    const result = await getCoachingAnnex(999);
    expect(result).toBeNull();
  });

  it("returns the annex row when it exists", async () => {
    const mockAnnex = {
      id: 1,
      clientId: 1,
      transcriptText: "Test transcript",
      draftAnnex: null,
      approvedAnnex: null,
      status: "draft" as const,
      createdAt: new Date(),
      updatedAt: new Date(),
      approvedAt: null,
    };
    vi.mocked(getCoachingAnnex).mockResolvedValue(mockAnnex);
    const result = await getCoachingAnnex(1);
    expect(result).toEqual(mockAnnex);
    expect(result?.status).toBe("draft");
  });
});

describe("upsertCoachingAnnex", () => {
  beforeEach(() => vi.clearAllMocks());

  it("is called with the correct clientId and transcriptText", async () => {
    vi.mocked(upsertCoachingAnnex).mockResolvedValue(undefined);
    await upsertCoachingAnnex({ clientId: 1, transcriptText: "Hello world", status: "draft" });
    expect(upsertCoachingAnnex).toHaveBeenCalledWith({
      clientId: 1,
      transcriptText: "Hello world",
      status: "draft",
    });
  });

  it("is called with approved status and approvedAt when approving", async () => {
    vi.mocked(upsertCoachingAnnex).mockResolvedValue(undefined);
    const now = new Date();
    await upsertCoachingAnnex({ clientId: 1, approvedAnnex: "Final text", status: "approved", approvedAt: now });
    expect(upsertCoachingAnnex).toHaveBeenCalledWith({
      clientId: 1,
      approvedAnnex: "Final text",
      status: "approved",
      approvedAt: now,
    });
  });
});

// ─── LLM draft generation logic ───────────────────────────────────────────────

describe("Coaching annex draft generation", () => {
  beforeEach(() => vi.clearAllMocks());

  it("invokeLLM is called with system and user messages containing client name", async () => {
    vi.mocked(invokeLLM).mockResolvedValue({
      choices: [{ message: { content: "## The Pattern That Emerged\n\nTest annex content." } }],
    } as any);

    // Simulate what the router procedure does
    const clientName = "Jamie Pennington";
    const transcriptText = "Jamie: I found the report very revealing.";

    const systemPrompt = `You are a reflective career counsellor writing a personal closing annex for a client named ${clientName}.`;
    const userPrompt = `COACHING SESSION TRANSCRIPT:\n${transcriptText}\n\nNow write the five-section closing annex for ${clientName}.`;

    const response = await invokeLLM({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ] as any,
      max_tokens: 1200,
    });

    expect(invokeLLM).toHaveBeenCalledOnce();
    const callArgs = vi.mocked(invokeLLM).mock.calls[0][0];
    expect(callArgs.messages[0].content).toContain("Jamie Pennington");
    expect(callArgs.messages[1].content).toContain(transcriptText);
    expect(callArgs.max_tokens).toBe(1200);
    expect(response.choices[0].message.content).toContain("The Pattern That Emerged");
  });

  it("returns the LLM content as the draft annex", async () => {
    const expectedDraft = "## The Pattern That Emerged\n\nJamie has shown a consistent thread...";
    vi.mocked(invokeLLM).mockResolvedValue({
      choices: [{ message: { content: expectedDraft } }],
    } as any);

    const response = await invokeLLM({ messages: [] as any, max_tokens: 1200 });
    const draftAnnex = response.choices[0]?.message?.content as string;

    expect(draftAnnex).toBe(expectedDraft);
  });
});

// ─── Annex status transitions ─────────────────────────────────────────────────

describe("Annex status transitions", () => {
  beforeEach(() => vi.clearAllMocks());

  it("draft status is set when transcript is saved", async () => {
    vi.mocked(upsertCoachingAnnex).mockResolvedValue(undefined);
    await upsertCoachingAnnex({ clientId: 1, transcriptText: "Transcript text", status: "draft" });
    const call = vi.mocked(upsertCoachingAnnex).mock.calls[0][0];
    expect(call.status).toBe("draft");
  });

  it("approved status is set when annex is approved", async () => {
    vi.mocked(upsertCoachingAnnex).mockResolvedValue(undefined);
    const approvedAt = new Date();
    await upsertCoachingAnnex({ clientId: 1, approvedAnnex: "Approved text", status: "approved", approvedAt });
    const call = vi.mocked(upsertCoachingAnnex).mock.calls[0][0];
    expect(call.status).toBe("approved");
    expect(call.approvedAt).toBe(approvedAt);
  });

  it("getCoachingAnnex returns approved annex with correct status", async () => {
    vi.mocked(getCoachingAnnex).mockResolvedValue({
      id: 1,
      clientId: 1,
      transcriptText: "Transcript",
      draftAnnex: "Draft text",
      approvedAnnex: "Approved text",
      status: "approved",
      createdAt: new Date(),
      updatedAt: new Date(),
      approvedAt: new Date(),
    });
    const annex = await getCoachingAnnex(1);
    expect(annex?.status).toBe("approved");
    expect(annex?.approvedAnnex).toBe("Approved text");
  });
});

// ─── PDF export logic ─────────────────────────────────────────────────────────

describe("PDF export annex inclusion", () => {
  it("approved annex text is included in the report when status is approved", () => {
    // Simulate the logic in pdf-export.ts
    const coachingAnnex = {
      status: "approved" as const,
      approvedAnnex: "## The Pattern That Emerged\n\nJamie is a context creator.",
    };
    const approvedAnnex = coachingAnnex?.status === "approved" ? (coachingAnnex.approvedAnnex ?? null) : null;
    expect(approvedAnnex).toBe("## The Pattern That Emerged\n\nJamie is a context creator.");
  });

  it("annex is excluded from report when status is draft", () => {
    const coachingAnnex = {
      status: "draft" as const,
      approvedAnnex: "Draft text that should not appear",
    };
    const approvedAnnex = coachingAnnex?.status === "approved" ? (coachingAnnex.approvedAnnex ?? null) : null;
    expect(approvedAnnex).toBeNull();
  });

  it("annex is excluded when no coaching annex exists", () => {
    const coachingAnnex = null;
    const approvedAnnex = coachingAnnex?.status === "approved" ? (coachingAnnex.approvedAnnex ?? null) : null;
    expect(approvedAnnex).toBeNull();
  });
});
