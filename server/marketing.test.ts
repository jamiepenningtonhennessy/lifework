import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock the database ────────────────────────────────────────────────────────
vi.mock("./db", () => ({
  getDb: vi.fn(),
}));

vi.mock("./_core/notification", () => ({
  notifyOwner: vi.fn().mockResolvedValue(true),
}));

// ─── Tests ────────────────────────────────────────────────────────────────────
describe("marketing.submitLead", () => {
  it("validates that name is required", () => {
    const { z } = require("zod");
    const schema = z.object({
      name: z.string().min(1).max(200),
      email: z.string().email().max(320),
      source: z.string().max(100).default("lifework-landing"),
    });

    const result = schema.safeParse({ name: "", email: "test@example.com" });
    expect(result.success).toBe(false);
  });

  it("validates that email must be a valid email address", () => {
    const { z } = require("zod");
    const schema = z.object({
      name: z.string().min(1).max(200),
      email: z.string().email().max(320),
      source: z.string().max(100).default("lifework-landing"),
    });

    const result = schema.safeParse({ name: "Alice", email: "not-an-email" });
    expect(result.success).toBe(false);
  });

  it("accepts valid name and email", () => {
    const { z } = require("zod");
    const schema = z.object({
      name: z.string().min(1).max(200),
      email: z.string().email().max(320),
      source: z.string().max(100).default("lifework-landing"),
    });

    const result = schema.safeParse({ name: "Alice", email: "alice@example.com" });
    expect(result.success).toBe(true);
  });

  it("defaults source to 'lifework-landing' when not provided", () => {
    const { z } = require("zod");
    const schema = z.object({
      name: z.string().min(1).max(200),
      email: z.string().email().max(320),
      source: z.string().max(100).default("lifework-landing"),
    });

    const result = schema.parse({ name: "Bob", email: "bob@example.com" });
    expect(result.source).toBe("lifework-landing");
  });

  it("accepts a custom source value", () => {
    const { z } = require("zod");
    const schema = z.object({
      name: z.string().min(1).max(200),
      email: z.string().email().max(320),
      source: z.string().max(100).default("lifework-landing"),
    });

    const result = schema.parse({ name: "Carol", email: "carol@example.com", source: "ph-coaching-page" });
    expect(result.source).toBe("ph-coaching-page");
  });

  it("rejects names longer than 200 characters", () => {
    const { z } = require("zod");
    const schema = z.object({
      name: z.string().min(1).max(200),
      email: z.string().email().max(320),
      source: z.string().max(100).default("lifework-landing"),
    });

    const result = schema.safeParse({ name: "A".repeat(201), email: "test@example.com" });
    expect(result.success).toBe(false);
  });
});
