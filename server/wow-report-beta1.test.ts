import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import {
  getPresentBeta1Sections,
  getWowReportBeta1Movements,
  parseWowReportBeta1Snapshot,
  WOW_REPORT_BETA_1_VERSION,
} from "../shared/wowReportBeta1";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function makeContext(role: "admin" | "user" = "admin"): TrpcContext {
  const user: AuthenticatedUser = {
    id: 9999,
    openId: "beta-test-user",
    email: "beta-test@example.com",
    name: "Beta Test User",
    loginMethod: "manus",
    role,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {}, cookie: () => {} } as unknown as TrpcContext["res"],
  };
}

const frozenSource = JSON.stringify({
  clientName: "Fictional Client",
  clientFullName: "Fictional Client",
  generatedAt: "25 October 2026",
  reportType: "standard",
  summary: "You are at your best when a difficult problem needs calm, careful attention.",
  lifeHistoryPattern: "## The recurring pattern\n\nAcross each decade, you have made order from uncertainty.",
  fourPillars: "## PLACES\n\nLearning: You do your best work where care and clarity both matter.",
  viaSection: "## The Key Findings\n\nYour strengths are most useful when they are visible in the work.",
  personalitySection: "## What the psychometrics show\n\nYou combine reflection with a practical appetite for action.",
  behaviouralStyle: "## At your best\n\nYou bring steadiness to changing situations.",
  developmentEdge: "## Waiting to be asked\n\nYour contribution can be under-seen when you wait for an invitation.",
  careerDirections: "## Purposeful advisory work\n\nThis direction makes use of the pattern already evident in your life history.",
  coachingQuestions: "## Future\n\nThe next question is how to use this recognition deliberately.",
});

describe("WOW Report Beta 1 reader-first contract", () => {
  it("uses the fixed, clearly-labelled beta version", () => {
    expect(WOW_REPORT_BETA_1_VERSION).toBe("beta-1");
  });

  it("preserves the source report prose exactly while changing only its reading sequence", () => {
    const snapshot = parseWowReportBeta1Snapshot(frozenSource);
    const movements = getPresentBeta1Sections(snapshot);

    expect(snapshot.summary).toBe("You are at your best when a difficult problem needs calm, careful attention.");
    expect(movements.map((movement) => movement.title)).toEqual([
      "The pattern beneath the detail",
      "The conditions that matter",
      "Turn recognition into choice",
    ]);
    expect(movements[0]?.sections.map((section) => section.key)).toEqual(["summary", "lifeHistoryPattern"]);
    expect(movements[2]?.sections.map((section) => section.key)).toEqual(["careerDirections", "developmentEdge", "coachingQuestions"]);
  });

  it("does not display absent source sections as invented editorial content", () => {
    const snapshot = parseWowReportBeta1Snapshot(JSON.stringify({ summary: "A real opening insight." }));
    const movements = getPresentBeta1Sections(snapshot);

    expect(movements).toHaveLength(1);
    expect(movements[0]?.sections).toHaveLength(1);
    expect(movements[0]?.sections[0]?.key).toBe("summary");
  });

  it("rejects a corrupted frozen snapshot", () => {
    expect(() => parseWowReportBeta1Snapshot("not JSON")).toThrow("not valid JSON");
  });

  it("keeps an explicit three-movement reader-first structure", () => {
    const movements = getWowReportBeta1Movements();
    expect(movements).toHaveLength(3);
    expect(movements.flatMap((movement) => movement.sections).map((section) => section.key)).toEqual([
      "summary",
      "lifeHistoryPattern",
      "fourPillars",
      "viaSection",
      "personalitySection",
      "behaviouralStyle",
      "careerDirections",
      "developmentEdge",
      "coachingQuestions",
    ]);
  });
});

describe("WOW Report Beta 1 isolation", () => {
  it("rejects non-admin access before a beta record can be read", async () => {
    const caller = appRouter.createCaller(makeContext("user"));
    await expect(caller.wowReportBeta.list({ clientId: 1 })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("contains no production generator, production report write, PDF write or LLM call", () => {
    const routerSource = readFileSync(new URL("./routers/wowReportBeta.ts", import.meta.url), "utf8");
    expect(routerSource).not.toContain("upsertAnalysisReport");
    expect(routerSource).not.toContain("runGenerationJob");
    expect(routerSource).not.toContain("invokeLLM");
    expect(routerSource).not.toContain("storagePut");
    expect(routerSource).not.toContain("renderWowPdf");
  });

  it("mounts the beta preview only behind the counsellor gate", () => {
    const appSource = readFileSync(new URL("../client/src/App.tsx", import.meta.url), "utf8");
    expect(appSource).toContain('<Route path="/counselor/client/:id/wow-beta-1/:betaId">{() => <CounsellorPinGate><WowReportBetaPreview /></CounsellorPinGate>}</Route>');
    expect(appSource).not.toContain('path="/my-report/wow-beta-1');
  });
});
