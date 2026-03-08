import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import { COOKIE_NAME } from "../shared/const";
import type { TrpcContext } from "./_core/context";
import { scoreVia, VIA_QUESTIONS, VIA_STRENGTHS } from "../shared/via-data";

// ─── Auth helpers ─────────────────────────────────────────────────────────────

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createUserContext(role: "user" | "admin" = "user"): { ctx: TrpcContext; clearedCookies: any[] } {
  const clearedCookies: any[] = [];
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
  const ctx: TrpcContext = {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {
      clearCookie: (name: string, options: Record<string, unknown>) => {
        clearedCookies.push({ name, options });
      },
    } as TrpcContext["res"],
  };
  return { ctx, clearedCookies };
}

// ─── Auth tests ───────────────────────────────────────────────────────────────

describe("auth.logout", () => {
  it("clears the session cookie and reports success", async () => {
    const { ctx, clearedCookies } = createUserContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();
    expect(result).toEqual({ success: true });
    expect(clearedCookies).toHaveLength(1);
    expect(clearedCookies[0]?.name).toBe(COOKIE_NAME);
    expect(clearedCookies[0]?.options).toMatchObject({ maxAge: -1 });
  });

  it("returns the current user when authenticated", async () => {
    const { ctx } = createUserContext();
    const caller = appRouter.createCaller(ctx);
    const user = await caller.auth.me();
    expect(user?.email).toBe("test@example.com");
    expect(user?.role).toBe("user");
  });
});

// ─── VIA data tests ───────────────────────────────────────────────────────────

describe("VIA Character Strengths data", () => {
  it("has exactly 24 strengths", () => {
    expect(VIA_STRENGTHS).toHaveLength(24);
  });

  it("has exactly 120 questions (5 per strength)", () => {
    expect(VIA_QUESTIONS).toHaveLength(120);
  });

  it("each strength has required fields", () => {
    for (const s of VIA_STRENGTHS) {
      expect(s.id).toBeTruthy();
      expect(s.name).toBeTruthy();
      expect(s.virtue).toBeTruthy();
      expect(s.description).toBeTruthy();
    }
  });

  it("each question references a valid strength", () => {
    const strengthIds = new Set(VIA_STRENGTHS.map((s) => s.id));
    for (const q of VIA_QUESTIONS) {
      expect(strengthIds.has(q.strengthId)).toBe(true);
    }
  });

  it("scoreVia returns 24 ranked strengths from complete answers", () => {
    const answers: Record<number, number> = {};
    VIA_QUESTIONS.forEach((q) => { answers[q.id] = 3; });
    const ranked = scoreVia(answers);
    expect(ranked).toHaveLength(24);
    expect(ranked[0]).toHaveProperty("rank", 1);
    expect(ranked[0]).toHaveProperty("score");
    expect(ranked[0]).toHaveProperty("strengthId");
  });

  it("scoreVia correctly ranks higher scores first", () => {
    const answers: Record<number, number> = {};
    VIA_QUESTIONS.forEach((q) => { answers[q.id] = 3; });
    // Give creativity max score
    const creativityQs = VIA_QUESTIONS.filter((q) => q.strengthId === "creativity");
    creativityQs.forEach((q) => { answers[q.id] = 5; });
    const ranked = scoreVia(answers);
    expect(ranked[0].strengthId).toBe("creativity");
    expect(ranked[0].score).toBe(25);
  });

  it("scoreVia handles partial answers gracefully", () => {
    const answers: Record<number, number> = { [VIA_QUESTIONS[0].id]: 4 };
    const ranked = scoreVia(answers);
    expect(ranked).toHaveLength(24);
  });
});

// ─── VIA router tests ─────────────────────────────────────────────────────────

describe("via.getQuestions", () => {
  it("returns questions and strengths without authentication", async () => {
    const ctx: TrpcContext = {
      user: null,
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: {} as TrpcContext["res"],
    };
    const caller = appRouter.createCaller(ctx);
    const result = await caller.via.getQuestions();
    expect(result.questions).toHaveLength(120);
    expect(result.strengths).toHaveLength(24);
  });
});

// ─── Counselor access control ─────────────────────────────────────────────────

describe("counselor.listClients access control", () => {
  it("throws FORBIDDEN for non-admin users", async () => {
    const { ctx } = createUserContext("user");
    const caller = appRouter.createCaller(ctx);
    await expect(caller.counselor.listClients()).rejects.toThrow();
  });
});
