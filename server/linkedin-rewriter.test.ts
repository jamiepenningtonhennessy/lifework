/**
 * linkedin-rewriter.test.ts
 *
 * Unit tests for the LinkedIn Rewriter tRPC router.
 * Tests the procedure structure, auth gating, and input validation
 * without making real LLM calls.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";
import { linkedInRewriterRouter } from "./routers/linkedInRewriter";

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("./db", () => ({
  getClientProfileById: vi.fn().mockResolvedValue({
    id: 1,
    firstName: "Gabriella",
    lastName: "Rossi",
    currentRole: "Senior Associate",
    currentOrg: "Clifford Chance",
  }),
  getAchievements: vi.fn().mockResolvedValue([
    {
      id: 1,
      clientId: 1,
      title: "Led the pro bono housing project",
      decade: "twenties",
      age: 26,
      description: "Coordinated a team of 8 lawyers to provide free legal advice to 200+ families.",
      esf: "F",
    },
  ]),
  getViaResults: vi.fn().mockResolvedValue({
    rankedStrengths: JSON.stringify([
      { name: "Fairness", score: 4.8, rank: 1 },
      { name: "Honesty", score: 4.7, rank: 2 },
      { name: "Perseverance", score: 4.6, rank: 3 },
      { name: "Leadership", score: 4.5, rank: 4 },
      { name: "Curiosity", score: 4.4, rank: 5 },
    ]),
  }),
  getIpipResults: vi.fn().mockResolvedValue({
    domainScores: JSON.stringify({ N: 35, E: 62, O: 71, A: 68, C: 75 }),
  }),
  getAnalysisReport: vi.fn().mockResolvedValue({
    canonicalStage1: "Gabriella's pattern is one of principled advocacy...",
    wowReportJson: JSON.stringify({
      summary: "Gabriella is a lawyer who has always been drawn to the cases others find too difficult.",
      lifeHistoryPattern: "The pattern begins early...",
      careerDirections: "Three directions emerge...",
      conclusions: "The interview answer...",
    }),
  }),
  getCareerHistory: vi.fn().mockResolvedValue([
    {
      id: 1,
      clientId: 1,
      organisation: "Clifford Chance",
      role: "Senior Associate",
      yearFrom: "2020",
      yearTo: null,
      keyResponsibilities: "Complex litigation and arbitration.",
      highlights: "Won landmark case on housing rights.",
      sortOrder: 0,
    },
    {
      id: 2,
      clientId: 1,
      organisation: "Allen & Overy",
      role: "Associate",
      yearFrom: "2016",
      yearTo: "2020",
      keyResponsibilities: "Corporate finance and M&A.",
      highlights: null,
      sortOrder: 1,
    },
  ]),
}));

// Mock fetch for LLM calls
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeCaller(role: "admin" | "user") {
  return linkedInRewriterRouter.createCaller({
    user: { id: 1, role, openId: "test-open-id", name: "Test User" },
    req: {} as any,
    res: {} as any,
  });
}

function mockLLMSuccess(payload: { headline: string; aboutSection: string; experienceGuide: string }) {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({
      choices: [{ message: { content: JSON.stringify(payload) } }],
    }),
  });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("linkedInRewriter.generate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects non-admin users with FORBIDDEN", async () => {
    const caller = makeCaller("user");
    await expect(caller.generate({ clientId: 1 })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("returns headline, aboutSection, and experienceGuide for admin users", async () => {
    mockLLMSuccess({
      headline: "Senior Litigator | Housing Rights & Complex Disputes | Principled Advocacy",
      aboutSection:
        "I have always been drawn to the cases others find too difficult.\n\nMy strengths are fairness and perseverance in combination.\n\nI am now looking for a role where I can lead a practice.",
      experienceGuide:
        "## Senior Associate at Clifford Chance\n**Framing note:** Lead with the housing rights case.\n**Lead bullets:**\n- Won landmark housing rights case\n**Avoid leading with:** Generic M&A experience.",
    });

    const caller = makeCaller("admin");
    const result = await caller.generate({ clientId: 1 });

    expect(result.headline).toBeTruthy();
    expect(result.headline.length).toBeLessThanOrEqual(220);
    expect(result.aboutSection).toBeTruthy();
    expect(result.experienceGuide).toBeTruthy();
  });

  it("accepts an optional existingProfile for a polish pass", async () => {
    mockLLMSuccess({
      headline: "Litigator | Housing Rights",
      aboutSection: "I am a lawyer.",
      experienceGuide: "## Senior Associate\n**Framing note:** Lead with housing.",
    });

    const caller = makeCaller("admin");
    const result = await caller.generate({
      clientId: 1,
      existingProfile: "Senior Associate at Clifford Chance. Experienced litigator.",
    });

    expect(result.headline).toBeTruthy();

    // Verify the existing profile was sent to the LLM
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    const userContent = body.messages[1].content as string;
    expect(userContent).toContain("EXISTING LINKEDIN PROFILE");
    expect(userContent).toContain("Senior Associate at Clifford Chance");
  });

  it("throws INTERNAL_SERVER_ERROR when LLM returns non-JSON", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: "Not valid JSON at all" } }],
      }),
    });

    const caller = makeCaller("admin");
    await expect(caller.generate({ clientId: 1 })).rejects.toMatchObject({
      code: "INTERNAL_SERVER_ERROR",
    });
  });

  it("throws INTERNAL_SERVER_ERROR when LLM HTTP request fails", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 503,
      text: async () => "Service unavailable",
    });

    const caller = makeCaller("admin");
    await expect(caller.generate({ clientId: 1 })).rejects.toMatchObject({
      code: "INTERNAL_SERVER_ERROR",
    });
  });

  it("throws NOT_FOUND when client does not exist", async () => {
    const { getClientProfileById } = await import("./db");
    vi.mocked(getClientProfileById).mockResolvedValueOnce(null);

    const caller = makeCaller("admin");
    await expect(caller.generate({ clientId: 999 })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("rejects clientId of 0 (invalid input)", async () => {
    const caller = makeCaller("admin");
    await expect(caller.generate({ clientId: 0 })).rejects.toBeInstanceOf(TRPCError);
  });

  it("sends career history to the LLM context", async () => {
    mockLLMSuccess({
      headline: "Litigator | Housing Rights",
      aboutSection: "I am a lawyer.",
      experienceGuide: "## Senior Associate\n**Framing note:** Lead with housing.",
    });

    const caller = makeCaller("admin");
    await caller.generate({ clientId: 1 });

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    const userContent = body.messages[1].content as string;
    expect(userContent).toContain("CAREER HISTORY");
    expect(userContent).toContain("Clifford Chance");
  });

  it("includes WOW report summary when available", async () => {
    mockLLMSuccess({
      headline: "Litigator | Housing Rights",
      aboutSection: "I am a lawyer.",
      experienceGuide: "## Senior Associate\n**Framing note:** Lead with housing.",
    });

    const caller = makeCaller("admin");
    await caller.generate({ clientId: 1 });

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    const userContent = body.messages[1].content as string;
    expect(userContent).toContain("LIFEWORK SUMMARY");
    expect(userContent).toContain("too difficult");
  });
});
