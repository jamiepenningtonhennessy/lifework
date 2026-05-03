/**
 * Tests for the under-30 age-band minimum slot logic.
 * These are pure unit tests — no DB or tRPC required.
 */
import { describe, it, expect } from "vitest";

// ── Replicate the phaseSlotCount logic from Interview.tsx ─────────────────
const PHASES = [
  { id: "early_childhood",  minSlotsUnder30: 5, defaultSlots: 4 },
  { id: "mid_childhood",    minSlotsUnder30: 6, defaultSlots: 4 },
  { id: "late_childhood",   minSlotsUnder30: 6, defaultSlots: 4 },
  { id: "twenties",         minSlotsUnder30: 4, defaultSlots: 4 },
  { id: "thirties",         minSlotsUnder30: 4, defaultSlots: 4 },
  { id: "forties",          minSlotsUnder30: 4, defaultSlots: 4 },
  { id: "fifties",          minSlotsUnder30: 4, defaultSlots: 4 },
  { id: "sixties_plus",     minSlotsUnder30: 4, defaultSlots: 4 },
];

function phaseSlotCount(phaseId: string, age: number | null): number {
  const p = PHASES.find((x) => x.id === phaseId);
  if (!p) return 4;
  return age !== null && age < 30 ? p.minSlotsUnder30 : p.defaultSlots;
}

// ── Tests ─────────────────────────────────────────────────────────────────

describe("phaseSlotCount — under-30 age bands", () => {
  it("returns 5 slots for early_childhood when age is 25", () => {
    expect(phaseSlotCount("early_childhood", 25)).toBe(5);
  });

  it("returns 6 slots for mid_childhood when age is 22", () => {
    expect(phaseSlotCount("mid_childhood", 22)).toBe(6);
  });

  it("returns 6 slots for late_childhood when age is 28", () => {
    expect(phaseSlotCount("late_childhood", 28)).toBe(6);
  });

  it("returns 4 slots for twenties when age is 24", () => {
    expect(phaseSlotCount("twenties", 24)).toBe(4);
  });

  it("returns 4 slots for early_childhood when age is 30 (boundary)", () => {
    expect(phaseSlotCount("early_childhood", 30)).toBe(4);
  });

  it("returns 4 slots for early_childhood when age is 45", () => {
    expect(phaseSlotCount("early_childhood", 45)).toBe(4);
  });

  it("returns 4 slots when age is null (unknown)", () => {
    expect(phaseSlotCount("mid_childhood", null)).toBe(4);
  });

  it("returns 4 for an unknown phase id", () => {
    expect(phaseSlotCount("unknown_phase", 22)).toBe(4);
  });
});

describe("total minimum events for under-30 client", () => {
  it("sums to at least 21 data points across the four under-30 phases", () => {
    const under30Phases = ["early_childhood", "mid_childhood", "late_childhood", "twenties"];
    const total = under30Phases.reduce((sum, id) => sum + phaseSlotCount(id, 25), 0);
    // 5 + 6 + 6 + 4 = 21
    expect(total).toBe(21);
    expect(total).toBeGreaterThanOrEqual(21);
  });
});

describe("meetsMinimum logic", () => {
  const isUnder30 = (age: number | null) => age !== null && age < 30;

  it("meets minimum when filledCount equals minRequired for under-30", () => {
    const age = 25;
    const filledCount = 5;
    const minRequired = phaseSlotCount("early_childhood", age);
    const meetsMinimum = !isUnder30(age) || filledCount >= minRequired;
    expect(meetsMinimum).toBe(true);
  });

  it("does not meet minimum when filledCount is below minRequired for under-30", () => {
    const age = 25;
    const filledCount = 3;
    const minRequired = phaseSlotCount("early_childhood", age);
    const meetsMinimum = !isUnder30(age) || filledCount >= minRequired;
    expect(meetsMinimum).toBe(false);
  });

  it("always meets minimum for 30+ clients regardless of filled count", () => {
    const age = 40;
    const filledCount = 0;
    const minRequired = phaseSlotCount("early_childhood", age);
    const meetsMinimum = !isUnder30(age) || filledCount >= minRequired;
    expect(meetsMinimum).toBe(true);
  });

  it("always meets minimum when age is null", () => {
    const age = null;
    const filledCount = 0;
    const minRequired = phaseSlotCount("early_childhood", age);
    const meetsMinimum = !isUnder30(age) || filledCount >= minRequired;
    expect(meetsMinimum).toBe(true);
  });
});
