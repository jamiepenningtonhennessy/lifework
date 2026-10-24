import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const appSource = readFileSync(resolve(process.cwd(), "client/src/App.tsx"), "utf8");
const viaSource = readFileSync(resolve(process.cwd(), "client/src/pages/VIASurvey.tsx"), "utf8");
const dashboardSource = readFileSync(resolve(process.cwd(), "client/src/pages/ClientDashboard.tsx"), "utf8");
const finalStageSource = readFileSync(resolve(process.cwd(), "client/src/pages/FinalCoachingStage.tsx"), "utf8");

describe("psychometrics and final coaching stage", () => {
  it("uses the approved managed Stage 4 film on the first psychometric page", () => {
    expect(viaSource).toContain(
      'const PSYCHOMETRICS_STAGE_VIDEO_URL = "/manus-storage/lifework_stage4_psychometrics_explainer_dce111a1.mp4";'
    );
    expect(viaSource).toContain('src={PSYCHOMETRICS_STAGE_VIDEO_URL}');
    expect(viaSource).toContain('title="Psychometrics in Lifework — a short introduction"');
    expect(viaSource).not.toContain("1bJfqf5QNyio-xtNa14AFHYE8L90-1MWr");
  });

  it("registers a protected final report-and-coaching page for both Lifework route families", () => {
    expect(appSource).toContain('import FinalCoachingStage from "./pages/FinalCoachingStage";');
    expect(appSource).toContain('path="/coaching/lifework/lifework-coaching"');
    expect(appSource).toContain('path="/lifework-coaching"');
    expect(appSource).toContain("<LifeworkLayout><FinalCoachingStage /></LifeworkLayout>");
  });

  it("requires both psychometric result records before releasing the final coaching-stage page", () => {
    expect(finalStageSource).toContain("trpc.via.getMyResults.useQuery");
    expect(finalStageSource).toContain("trpc.ipip.getMyResults.useQuery");
    expect(finalStageSource).toContain("const bothPsychometricsComplete = Boolean(viaResults && ipipResults);");
    expect(finalStageSource).toContain("if (!bothPsychometricsComplete)");
  });

  it("presents the approved final film and a direct coaching email without exposing the former PH email", () => {
    expect(finalStageSource).toContain(
      'const FINAL_STAGE_VIDEO_URL = "/manus-storage/lifework_final_alistair_report_and_coaching_explainer_81089006.mp4";'
    );
    expect(finalStageSource).toContain('src={FINAL_STAGE_VIDEO_URL}');
    expect(finalStageSource).toContain("mailto:coach@lifeworkpath.com");
    expect(finalStageSource).toContain("coach@lifeworkpath.com");
    expect(finalStageSource).not.toContain("penningtonhennessy.com");
  });

  it("takes the fifth dashboard stage to the final page only once both psychometric lenses are complete", () => {
    expect(dashboardSource).toContain('title: "5. Your WoW Report & Coaching"');
    expect(dashboardSource).toContain('path: "/lifework-coaching"');
    expect(dashboardSource).toContain('const isCoaching = step.id === "lifework_coaching";');
    expect(dashboardSource).toContain('isLocked = getStatus("viaStatus", "psychometrics") !== "completed";');
    expect(dashboardSource).not.toContain("jamie@penningtonhennessy.com");
  });
});
