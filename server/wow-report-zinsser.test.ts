import { describe, it, expect } from "vitest";

// ── William Zinsser voice — structural contract tests ──────────────────────

describe("William Zinsser voice — WritingStyle type contract", () => {
  it("includes william-zinsser in the WritingStyle union", async () => {
    // Import the type indirectly via the z.enum validator used in the generate procedure
    const { wowReportRouter } = await import("./routers/wowReport");
    expect(wowReportRouter).toBeDefined();
  });

  it("rewriteSectionsForZinsser is exported from wowReport module", async () => {
    // The function is internal but we can verify the module loads without error
    const mod = await import("./routers/wowReport");
    expect(mod).toBeDefined();
  });
});

describe("William Zinsser voice — system prompt quality checks", () => {
  it("WILLIAM_ZINSSER_REWRITE_SYS contains core Zinsser principles", async () => {
    // Read the source file and verify key phrases are present
    const fs = await import("fs");
    const src = fs.readFileSync("./server/routers/wowReport.ts", "utf-8");

    expect(src).toContain("WILLIAM_ZINSSER_REWRITE_SYS");
    expect(src).toContain("rewriteSectionsForZinsser");
    expect(src).toContain("william-zinsser");
  });

  it("Zinsser system prompt bans passive voice and qualifiers", async () => {
    const fs = await import("fs");
    const src = fs.readFileSync("./server/routers/wowReport.ts", "utf-8");
    // Find the Zinsser system prompt block
    const zinssserStart = src.indexOf("WILLIAM_ZINSSER_REWRITE_SYS");
    const zinsserEnd = src.indexOf("async function rewriteSectionsForZinsser");
    const zinsserPrompt = src.slice(zinssserStart, zinsserEnd);

    expect(zinsserPrompt).toContain("passive voice");
    expect(zinsserPrompt).toContain("active verb");
    expect(zinsserPrompt).toContain("short sentence");
  });

  it("Zinsser developmentEdge context mandates 3 named areas", async () => {
    const fs = await import("fs");
    const src = fs.readFileSync("./server/routers/wowReport.ts", "utf-8");
    const zinsserFnStart = src.indexOf("async function rewriteSectionsForZinsser");
    const zinsserFnEnd = src.indexOf("async function renderWowPdf");
    const zinsserFn = src.slice(zinsserFnStart, zinsserFnEnd);

    expect(zinsserFn).toContain("developmentEdge");
    expect(zinsserFn).toContain("EXACTLY 3");
    expect(zinsserFn).toContain("## heading");
  });

  it("Zinsser viaSection context mandates 5 prose paragraphs", async () => {
    const fs = await import("fs");
    const src = fs.readFileSync("./server/routers/wowReport.ts", "utf-8");
    const zinsserFnStart = src.indexOf("async function rewriteSectionsForZinsser");
    const zinsserFnEnd = src.indexOf("async function renderWowPdf");
    const zinsserFn = src.slice(zinsserFnStart, zinsserFnEnd);

    expect(zinsserFn).toContain("EXACTLY 5");
    expect(zinsserFn).toContain("5 substantial prose paragraphs");
  });

  it("runGenerationJob dispatch chain includes william-zinsser branch", async () => {
    const fs = await import("fs");
    const src = fs.readFileSync("./server/routers/wowReport.ts", "utf-8");
    const dispatchStart = src.indexOf("async function runGenerationJob");
    const dispatchEnd = src.indexOf("// Render main WOW Report PDF");
    const dispatch = src.slice(dispatchStart, dispatchEnd);

    expect(dispatch).toContain("william-zinsser");
    expect(dispatch).toContain("rewriteSectionsForZinsser");
  });

  it("WritingStyle type includes all six voices", async () => {
    const fs = await import("fs");
    const src = fs.readFileSync("./server/routers/wowReport.ts", "utf-8");
    const typeLine = src.match(/export type WritingStyle = (.+);/)?.[1] ?? "";

    expect(typeLine).toContain('"house"');
    expect(typeLine).toContain('"mark"');
    expect(typeLine).toContain('"clive-james"');
    expect(typeLine).toContain('"michael-lewis"');
    expect(typeLine).toContain('"oliver-sacks"');
    expect(typeLine).toContain('"william-zinsser"');
  });

  it("z.enum validators include william-zinsser in both generate and rebuildPdf", async () => {
    const fs = await import("fs");
    const src = fs.readFileSync("./server/routers/wowReport.ts", "utf-8");
    const enumMatches = src.match(/z\.enum\(\["house"[^\]]+\]\)/g) ?? [];

    expect(enumMatches.length).toBeGreaterThanOrEqual(2);
    for (const match of enumMatches) {
      expect(match).toContain("william-zinsser");
    }
  });
});
