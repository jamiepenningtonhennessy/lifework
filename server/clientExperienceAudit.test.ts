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

  it("uses an explicit fictional profile and makes no real profile or database calls", () => {
    expect(auditSource).toContain('firstName: "Example"');
    expect(auditSource).toContain('lastName: "Client"');
    expect(auditSource).toContain("fictional sample data; nothing is saved or sent to a client.");
    expect(auditSource).not.toContain("trpc.");
    expect(auditSource).not.toContain("useAuth(");
  });

  it("exposes the client dashboard, representative client screens, Alistair view and hosted media", () => {
    for (const screen of ["dashboard", "interview", "background", "via", "ipip", "alistair", "video"]) {
      expect(auditSource).toContain(`"${screen}"`);
    }
    expect(auditSource).toContain('src={HOMEPAGE_FILM}');
    expect(auditSource).toContain('title="Lifework homepage film — counsellor audit"');
    expect(auditSource).toContain("allowPreviewNavigation");
    expect(auditSource).toContain("sagePreviewContext");
  });

  it("permits only the fictional audit dashboard to navigate while keeping ordinary client previews read-only", () => {
    expect(dashboardSource).toContain("allowPreviewNavigation = false");
    expect(dashboardSource).toContain("disabled={isPreview && !allowPreviewNavigation}");
    expect(dashboardSource).toContain("if (isPreview && isAlistair && !allowPreviewNavigation)");
    expect(dashboardSource).toContain("previewContext={isPreview ? (sagePreviewContext");
  });

  it("limits the counsellor gate to approved counsellor and administrator roles", () => {
    expect(counsellorGateSource).toContain('import { canEnterCounsellorWorkspace } from "@shared/counsellorAccess";');
    expect(counsellorGateSource).toContain("if (!canEnterCounsellorWorkspace(user?.role))");
    expect(counsellorGateSource).toContain("Counsellor access only");
  });
});
