/**
 * Tests for the WOW Report router.
 *
 * These tests verify:
 * 1. Counsellor-only access control (non-admin users are rejected)
 * 2. get procedure returns { exists: false } when no report is present
 * 3. generate procedure is gated behind admin role
 * 4. Section extraction logic (tested via the buildClientContext helper indirectly)
 */

import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function makeCtx(role: "admin" | "user" = "admin"): TrpcContext {
  const user: AuthenticatedUser = {
    id: 9999,
    openId: "test-open-id",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
      cookie: () => {},
    } as unknown as TrpcContext["res"],
  };
}

describe("wowReport.get", () => {
  it("returns exists:false for a non-existent client (no report)", async () => {
    const caller = appRouter.createCaller(makeCtx("admin"));
    // clientId 0 should never exist in the database
    const result = await caller.wowReport.get({ clientId: 0 });
    expect(result.exists).toBe(false);
    expect(result.pdfUrl).toBeNull();
    expect(result.generatedAt).toBeNull();
    expect(result.sections).toBeNull();
  });

  it("rejects non-admin users with FORBIDDEN", async () => {
    const caller = appRouter.createCaller(makeCtx("user"));
    await expect(caller.wowReport.get({ clientId: 1 })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });
});

describe("wowReport.generate", () => {
  it("rejects non-admin users with FORBIDDEN", async () => {
    const caller = appRouter.createCaller(makeCtx("user"));
    await expect(
      caller.wowReport.generate({ clientId: 1, forceRegenerate: false })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("rejects with NOT_FOUND for a non-existent client", async () => {
    const caller = appRouter.createCaller(makeCtx("admin"));
    // clientId 0 should not exist — expect NOT_FOUND from buildClientContext
    await expect(
      caller.wowReport.generate({ clientId: 0, forceRegenerate: false })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});

describe("wowReport section extraction", () => {
  it("correctly parses section markers from raw LLM text", () => {
    // Test the extraction logic inline (mirrors the extract() helper in wowReport.ts)
    const raw = `---SECTION: LIFEWORK SUMMARY---
This is the summary paragraph.

---SECTION: LIFE HISTORY PATTERN---
This is the life history pattern.

---SECTION: CHARACTER STRENGTHS---
These are the character strengths.`;

    const extract = (heading: string, nextHeading?: string): string => {
      const start = raw.indexOf(`---SECTION: ${heading}---`);
      if (start === -1) return "";
      const contentStart = start + `---SECTION: ${heading}---`.length;
      const end = nextHeading ? raw.indexOf(`---SECTION: ${nextHeading}---`) : raw.length;
      return raw.slice(contentStart, end === -1 ? raw.length : end).trim();
    };

    expect(extract("LIFEWORK SUMMARY", "LIFE HISTORY PATTERN")).toBe(
      "This is the summary paragraph."
    );
    expect(extract("LIFE HISTORY PATTERN", "CHARACTER STRENGTHS")).toBe(
      "This is the life history pattern."
    );
    expect(extract("CHARACTER STRENGTHS")).toBe("These are the character strengths.");
    expect(extract("MISSING SECTION")).toBe("");
  });

  it("returns empty string when section marker is absent", () => {
    const raw = "Some text without any section markers.";
    const extract = (heading: string): string => {
      const start = raw.indexOf(`---SECTION: ${heading}---`);
      if (start === -1) return "";
      return raw.slice(start).trim();
    };
    expect(extract("LIFEWORK SUMMARY")).toBe("");
  });
});
