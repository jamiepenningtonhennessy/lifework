import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const appSource = readFileSync(resolve(process.cwd(), "client/src/App.tsx"), "utf8");
const sampleSource = readFileSync(resolve(process.cwd(), "client/src/pages/SageFirstEncounterSample.tsx"), "utf8");

describe("public fictional Sage first-encounter sample", () => {
  it("registers an unlisted public route without the counsellor PIN gate", () => {
    expect(appSource).toContain('import SageFirstEncounterSample from "./pages/SageFirstEncounterSample";');
    expect(appSource).toContain('path="/client-preview/sage" component={SageFirstEncounterSample}');
    expect(appSource).not.toContain('<CounsellorPinGate><SageFirstEncounterSample /></CounsellorPinGate>');
  });

  it("contains the same managed Sage film and a clear fictional, non-persistent boundary", () => {
    expect(sampleSource).toContain('const SAGE_STAGE_VIDEO_URL = "/manus-storage/lifework_stage3_sage_conversation_explainer_9ae1669b.mp4";');
    expect(sampleSource).toContain('src={SAGE_STAGE_VIDEO_URL}');
    expect(sampleSource).toContain('title="Meet Sage — a short introduction to your conversation"');
    expect(sampleSource).toContain("Fictional · nothing is saved");
    expect(sampleSource).toContain("does not start or save a conversation");
  });

  it("does not authenticate, query, persist or display real client information", () => {
    expect(sampleSource).not.toContain("trpc.");
    expect(sampleSource).not.toContain("useAuth(");
    expect(sampleSource).not.toContain("DashboardBody");
    expect(sampleSource).not.toContain("ClientProfile");
    expect(sampleSource).toContain("What part of that moment felt most satisfying to you?");
  });
});
