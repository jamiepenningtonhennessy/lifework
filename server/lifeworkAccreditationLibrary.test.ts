import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const librarySource = readFileSync(
  resolve(process.cwd(), "client/src/pages/LifeworkAccreditationLibrary.tsx"),
  "utf8",
);
const appSource = readFileSync(resolve(process.cwd(), "client/src/App.tsx"), "utf8");

describe("Lifework client video library", () => {
  it("presents the five client films in their actual journey order", () => {
    expect(librarySource).toContain('number: "01"');
    expect(librarySource).toContain('stage: "Life History"');
    expect(librarySource).toContain('number: "02"');
    expect(librarySource).toContain('stage: "Background & Career"');
    expect(librarySource).toContain('number: "03"');
    expect(librarySource).toContain('stage: "Sage Conversation"');
    expect(librarySource).toContain('number: "04"');
    expect(librarySource).toContain('stage: "Psychometrics"');
    expect(librarySource).toContain('number: "05"');
    expect(librarySource).toContain('stage: "Report & Coaching"');
  });

  it("uses the approved managed videos rather than client data or third-party embeds", () => {
    expect(librarySource).toContain('/manus-storage/lifework_step1_life_history_explainer_eeeee55c.mp4');
    expect(librarySource).toContain('/manus-storage/lifework_step2_background_career_explainer_839de757.mp4');
    expect(librarySource).toContain('/manus-storage/lifework_stage3_sage_conversation_explainer_9ae1669b.mp4');
    expect(librarySource).toContain('/manus-storage/lifework_stage4_psychometrics_explainer_dce111a1.mp4');
    expect(librarySource).toContain('/manus-storage/lifework_final_alistair_report_and_coaching_explainer_81089006.mp4');
    expect(librarySource).toContain('controls playsInline preload="metadata"');
    expect(librarySource).not.toContain("trpc.");
    expect(librarySource).not.toContain("iframe");
  });

  it("uses a compact responsive grid and is available at the public videos route", () => {
    expect(librarySource).toContain('grid-template-columns: repeat(3, minmax(0, 1fr))');
    expect(librarySource).toContain('@media (max-width: 980px)');
    expect(librarySource).toContain('grid-template-columns: repeat(2, minmax(0, 1fr))');
    expect(librarySource).toContain('@media (max-width: 680px)');
    expect(appSource).toContain('path="/videos" component={LifeworkClientVideoLibrary}');
  });

  it("uses client-facing framing rather than coach-accreditation copy", () => {
    expect(librarySource).toContain("Client experience");
    expect(librarySource).toContain("The Lifework client journey");
    expect(librarySource).toContain("About these films");
    expect(librarySource).not.toContain("Coach accreditation");
  });
});
