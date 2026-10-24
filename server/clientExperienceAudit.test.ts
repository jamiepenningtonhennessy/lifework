import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const appSource = readFileSync(resolve(process.cwd(), "client/src/App.tsx"), "utf8");
const auditSource = readFileSync(resolve(process.cwd(), "client/src/pages/ClientExperienceAudit.tsx"), "utf8");
const dashboardSource = readFileSync(resolve(process.cwd(), "client/src/pages/ClientDashboard.tsx"), "utf8");
const counsellorDashboardSource = readFileSync(resolve(process.cwd(), "client/src/pages/CounselorDashboard.tsx"), "utf8");
const counsellorGateSource = readFileSync(resolve(process.cwd(), "client/src/components/CounsellorPinGate.tsx"), "utf8");

describe("counsellor client-experience audit", () => {
  it("registers the audit journey behind the established counsellor PIN gate", () => {
    expect(appSource).toContain('import ClientExperienceAudit from "./pages/ClientExperienceAudit";');
    expect(appSource).toContain('path="/counselor/client-audit"');
    expect(appSource).toContain('path="/counselor/client-audit/:screen"');
    expect(appSource).toContain("<CounsellorPinGate><ClientExperienceAudit /></CounsellorPinGate>");
    expect(counsellorDashboardSource).toContain('navigate("/counselor/client-audit")');
    expect(counsellorDashboardSource).toContain("Client audit");
  });

  it("uses an explicit fictional first-visit profile and makes no real profile or database calls", () => {
    expect(auditSource).toContain('firstName: "Example"');
    expect(auditSource).toContain('lastName: "Client"');
    expect(auditSource).toContain('interviewStatus: "not_started"');
    expect(auditSource).toContain('backgroundStatus: "not_started"');
    expect(auditSource).toContain('careerExplorerUnlocked: false');
    expect(auditSource).toContain("first-engagement screens, fictional state; nothing is saved or sent to a client.");
    expect(auditSource).not.toContain("trpc.");
    expect(auditSource).not.toContain("useAuth(");
  });

  it("exposes the first engagement of each representative client screen, including Sage and hosted media", () => {
    for (const screen of ["dashboard", "interview", "background", "sage", "via", "ipip", "alistair", "video"]) {
      expect(auditSource).toContain(`"${screen}"`);
    }
    expect(auditSource).toContain('src={HOMEPAGE_FILM}');
    expect(auditSource).toContain('title="Lifework homepage film — counsellor audit"');
    expect(auditSource).toContain("First engagement audit");
    expect(auditSource).toContain("The first question, not a conclusion");
    expect(auditSource).toContain("What part of that moment felt most satisfying to you?");
    expect(auditSource).toContain(
      'const SAGE_STAGE_VIDEO_URL = "/manus-storage/lifework_stage3_sage_conversation_explainer_9ae1669b.mp4";'
    );
    expect(auditSource).toContain('src={SAGE_STAGE_VIDEO_URL}');
    expect(auditSource).toContain('title="Meet Sage — a short introduction to your conversation"');
    expect(auditSource).not.toContain("You have described feeling most alive");
  });

  it("shows the same opening Google Drive videos that a client sees on the four relevant live stages", () => {
    expect(auditSource).toContain('lifeHistory: { fileId: "1vYmcvxcjjK3kPiOib4l9aNlg9XSCIBSL", title: "Lifework introduction" }');
    expect(auditSource).toContain('background: { fileId: "1FQ9fnNAvFIvwPqqmwC_t7ODEOhj0w1ld", title: "Career, education and family" }');
    expect(auditSource).toContain('via: { fileId: "1bJfqf5QNyio-xtNa14AFHYE8L90-1MWr", title: "VIA Character Strengths — Introduction" }');
    expect(auditSource).toContain('ipip: { fileId: "1t1UYw3YRal-UZ0efJrtr3H_IqH08ANsy", title: "IPIP-NEO Personality Survey" }');
    expect(auditSource).toContain("https://drive.google.com/file/d/${video.fileId}/preview");
    expect(auditSource).toContain("StageVideoEmbed video={STAGE_VIDEOS.lifeHistory}");
    expect(auditSource).toContain("StageVideoEmbed video={STAGE_VIDEOS.background}");
    expect(auditSource).toContain("StageVideoEmbed video={isVia ? STAGE_VIDEOS.via : STAGE_VIDEOS.ipip}");
    expect(auditSource).not.toContain("viaexplainer_scottish_male_voiceover");
  });

  it("keeps the real client dashboard and ordinary client previews read-only while audit navigation remains route-local", () => {
    expect(dashboardSource).toContain("allowPreviewNavigation = false");
    expect(dashboardSource).toContain("disabled={isPreview && !allowPreviewNavigation}");
    expect(dashboardSource).toContain("if (isPreview && isAlistair && !allowPreviewNavigation)");
    expect(dashboardSource).toContain("previewContext={isPreview ? (sagePreviewContext");
    expect(auditSource).toContain("const auditPath = (screen: AuditScreen)");
    expect(auditSource).toContain('"/interview": "interview"');
    expect(auditSource).toContain('"/background": "background"');
    expect(auditSource).not.toContain("allowPreviewNavigation");
  });

  it("limits the counsellor gate to approved counsellor and administrator roles", () => {
    expect(counsellorGateSource).toContain('import { canEnterCounsellorWorkspace } from "@shared/counsellorAccess";');
    expect(counsellorGateSource).toContain("if (!canEnterCounsellorWorkspace(user?.role))");
    expect(counsellorGateSource).toContain("Counsellor access only");
  });
});
