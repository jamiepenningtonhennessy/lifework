import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  getPsychometricsGate,
  PSYCHOMETRICS_MIN_ACHIEVEMENTS,
} from "../shared/lifeworkProgress";

const routerSource = readFileSync(resolve(process.cwd(), "server/routers.ts"), "utf8");
const sageChatSource = readFileSync(resolve(process.cwd(), "client/src/components/ChatToPeter.tsx"), "utf8");
const dashboardSource = readFileSync(resolve(process.cwd(), "client/src/pages/ClientDashboard.tsx"), "utf8");
const viaSource = readFileSync(resolve(process.cwd(), "client/src/pages/VIASurvey.tsx"), "utf8");
const ipipSource = readFileSync(resolve(process.cwd(), "client/src/pages/IpipSurvey.tsx"), "utf8");

describe("psychometrics progression gate", () => {
  it("unlocks completed Sage conversations with the required written life-history evidence", () => {
    const mariaGate = getPsychometricsGate(23, "completed");

    expect(PSYCHOMETRICS_MIN_ACHIEVEMENTS).toBe(20);
    expect(mariaGate.unlocked).toBe(true);
    expect(mariaGate.hasMinimumEvents).toBe(true);
    expect(mariaGate.sageConversationCompleted).toBe(true);
    expect(mariaGate.remainingEvents).toBe(0);
  });

  it("does not confuse optional Sage enrichment with client completion", () => {
    expect(getPsychometricsGate(23, "in_progress")).toMatchObject({
      unlocked: false,
      blocker: "sage_conversation",
    });
    expect(getPsychometricsGate(17, "completed")).toMatchObject({
      unlocked: false,
      remainingEvents: 3,
      blocker: "events",
    });
  });

  it("uses the same gate for client status, counsellor preview, and both surveys", () => {
    expect(routerSource).toContain('import { getPsychometricsGate } from "../shared/lifeworkProgress";');
    expect(routerSource).toContain('const gate = getPsychometricsGate(total, profile.sageStatus);');
    expect(routerSource).toContain('const viaGate = getPsychometricsGate(viaTotal, profile.sageStatus);');
    expect(routerSource).toContain('const ipipGate = getPsychometricsGate(ipipTotal, profile.sageStatus);');
    expect(routerSource).toContain('const gate = getPsychometricsGate(total, profile.sageStatus);');
    expect(routerSource).not.toContain('viaEnriched < viaRequired');
    expect(routerSource).not.toContain('ipipEnriched < ipipRequired');
  });

  it("allows the client to save a meaningful Sage conversation without a transcript-enrichment lock", () => {
    expect(sageChatSource).not.toContain('getEnrichmentStatus.useQuery');
    expect(sageChatSource).not.toContain('more events needed before you can save');
    expect(sageChatSource).toContain('Save &amp; finish');
  });

  it("describes the actual completion rule consistently in client screens", () => {
    expect(dashboardSource).toContain('Record at least 20 life-history events, then save your Sage conversation');
    expect(dashboardSource).toContain('Sage enrichment adds useful supporting detail');
    expect(viaSource).toContain('enrichmentStatus.blocker === "events"');
    expect(ipipSource).toContain('enrichmentStatus.blocker === "events"');
    expect(viaSource).toContain('complete and save your conversation with Sage');
    expect(ipipSource).toContain('complete and save your conversation with Sage');
  });
});
