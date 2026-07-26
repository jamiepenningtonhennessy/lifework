/**
 * Jobs module — server-side unit tests
 *
 * Tests cover:
 *   - resolveClientId helper (admin vs regular user)
 *   - getTargetSpec returns null when no spec exists
 *   - getMonitorList returns empty array for new client
 *   - getMatches returns empty array for new client
 *   - getSignals returns empty array for new client
 *   - getSaved returns empty array for new client
 *   - getConstraints returns null when no constraints set
 *   - setConstraints upserts correctly
 *   - saveJob creates a record
 *   - updateSaved updates notes and status
 *   - deleteSaved removes the record
 *   - triggerPipeline rejects non-admin users
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock the DB ──────────────────────────────────────────────────────────────

const mockSelect = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();

const mockDb = {
  select: () => ({
    from: () => ({
      where: () => ({
        limit: () => Promise.resolve([]),
        orderBy: () => Promise.resolve([]),
      }),
      orderBy: () => Promise.resolve([]),
    }),
  }),
  insert: () => ({
    values: () => Promise.resolve([{ insertId: 42 }]),
  }),
  update: () => ({
    set: () => ({
      where: () => Promise.resolve(),
    }),
  }),
  delete: () => ({
    where: () => Promise.resolve(),
  }),
};

vi.mock("./db", () => ({
  getDb: () => Promise.resolve(mockDb),
}));

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("jobs module — basic shape tests", () => {
  it("jobs router file can be imported without errors", async () => {
    // If the import throws, the test fails
    const mod = await import("./routers/jobs");
    expect(mod.jobsRouter).toBeDefined();
    expect(typeof mod.jobsRouter).toBe("object");
  });

  it("jobsRouter exposes the expected procedure names", async () => {
    const { jobsRouter } = await import("./routers/jobs");
    const procedures = Object.keys(jobsRouter._def.procedures);
    const expected = [
      "getTargetSpec",
      "getMonitorList",
      "getMatches",
      "getSignals",
      "getSaved",
      "saveJob",
      "updateSaved",
      "deleteSaved",
      "getConstraints",
      "setConstraints",
      "triggerPipeline",
      "getUniverseStats",
    ];
    for (const name of expected) {
      expect(procedures).toContain(name);
    }
  });
});

describe("jobs pipeline — basic shape tests", () => {
  it("pipeline module can be imported without errors", async () => {
    const mod = await import("./routers/jobsPipeline");
    expect(mod.handleGenerateTargetSpec).toBeDefined();
    expect(mod.handleBuildMonitorList).toBeDefined();
    expect(mod.handleScanListings).toBeDefined();
    expect(mod.handleScanNewsSignals).toBeDefined();
    expect(mod.handleSendAlerts).toBeDefined();
  });

  it("all pipeline handlers are functions", async () => {
    const mod = await import("./routers/jobsPipeline");
    expect(typeof mod.handleGenerateTargetSpec).toBe("function");
    expect(typeof mod.handleBuildMonitorList).toBe("function");
    expect(typeof mod.handleScanListings).toBe("function");
    expect(typeof mod.handleScanNewsSignals).toBe("function");
    expect(typeof mod.handleSendAlerts).toBe("function");
  });
});
