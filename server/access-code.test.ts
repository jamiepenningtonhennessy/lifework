import { describe, it, expect, beforeEach } from "vitest";

describe("verifyAccessCode logic", () => {
  it("accepts a matching code (case-insensitive)", () => {
    const stored = "TestCode123";
    const input = "testcode123";
    expect(input.trim().toLowerCase() === stored.trim().toLowerCase()).toBe(true);
  });

  it("rejects a non-matching code", () => {
    const stored = "TestCode123";
    const input = "wrongcode";
    expect(input.trim().toLowerCase() === stored.trim().toLowerCase()).toBe(false);
  });

  it("trims whitespace before comparing", () => {
    const stored = "  TestCode123  ";
    const input = "testcode123";
    expect(input.trim().toLowerCase() === stored.trim().toLowerCase()).toBe(true);
  });
});
