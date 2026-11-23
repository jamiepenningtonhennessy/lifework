import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  getPsychometricsGate,
  PSYCHOMETRICS_MIN_ACHIEVEMENTS,
} from "../shared/lifeworkProgress";
import { FAMILY_REQUIRED_FIELDS, type FamilyBackgroundData } from "../shared/familyBackground";

const routerSource = readFileSync(resolve(process.cwd(), "server/routers.ts"), "utf8");
const sageChatSource = readFileSync(resolve(process.cwd(), "client/src/components/ChatToPeter.tsx"), "utf8");
const fullFamily: FamilyBackgroundData = Object.fromEntries(
  FAMILY_REQUIRED_FIELDS.map(field => [field, "Not known"]),
);

describe("psychometrics progression gate", () => {
  it("unlocks only with enough events, a saved Sage conversation and complete family", () => {
    const gate = getPsychometricsGate(23, "completed", fullFamily);
    expect(PSYCHOMETRICS_MIN_ACHIEVEMENTS).toBe(20);
    expect(gate).toMatchObject({
      unlocked: true,
      hasMinimumEvents: true,
      sageConversationCompleted: true,
      familyBackgroundCompleted: true,
      remainingEvents: 0,
      blocker: null,
    });
  });

  it("does not confuse optional Sage enrichment with client completion", () => {
    expect(getPsychometricsGate(23, "in_progress", fullFamily)).toMatchObject({
      unlocked: false,
      blocker: "sage_conversation",
    });
    expect(getPsychometricsGate(17, "completed", fullFamily)).toMatchObject({
      unlocked: false,
      remainingEvents: 3,
      blocker: "events",
    });
  });

  it.each([undefined, null, {}, { fatherOccupation: "Not known" }])(
    "blocks new progress when family is missing or partial: %j",
    family => {
      expect(getPsychometricsGate(23, "completed", family)).toMatchObject({
        unlocked: false,
        familyBackgroundCompleted: false,
        blocker: "family_background",
      });
    },
  );

  it("defaults an omitted third argument to blocked, with events then Sage taking precedence", () => {
    expect(getPsychometricsGate(23, "completed").blocker).toBe("family_background");
    expect(getPsychometricsGate(0, "not_started").blocker).toBe("events");
    expect(getPsychometricsGate(20, "not_started").blocker).toBe("sage_conversation");
  });

  it("a profile backgroundStatus flag alone is not proof of family completion", () => {
    const family = { backgroundStatus: "completed" };
    expect(getPsychometricsGate(20, "completed", family as FamilyBackgroundData).unlocked).toBe(false);
  });

  it.each(FAMILY_REQUIRED_FIELDS)("requires a nonblank %s", field => {
    expect(getPsychometricsGate(20, "completed", { ...fullFamily, [field]: " \n\t " })).toMatchObject({
      unlocked: false,
      blocker: "family_background",
    });
  });

  it("uses the shared family-aware gate in client/counsellor status and both submissions", () => {
    // Structural guard complements mocked router behavior tests; avoid pinning UI prose.
    expect(routerSource.match(/getPsychometricsGate\([^;]+profile\.sageStatus, family\)/g)).toHaveLength(4);
    expect(routerSource).not.toContain("viaEnriched < viaRequired");
    expect(routerSource).not.toContain("ipipEnriched < ipipRequired");
  });

  it("still allows meaningful Sage completion without transcript-enrichment locks", () => {
    expect(sageChatSource).not.toContain("getEnrichmentStatus.useQuery");
    expect(sageChatSource).not.toContain("more events needed before you can save");
    expect(sageChatSource).toContain("Save &amp; finish");
  });
});
