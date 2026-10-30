import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Report Design Beta PDF delivery isolation", () => {
  it("keeps the delivery endpoint server-authenticated, admin-only and client-bound", () => {
    const source = readFileSync(new URL("./reportDesignBetaDelivery.ts", import.meta.url), "utf8");
    expect(source).toContain("sdk.authenticateRequest(req)");
    expect(source).toContain('user.role !== "admin"');
    expect(source).toContain("beta.clientId !== clientId");
    expect(source).toContain('Cache-Control", "private, no-store"');
    expect(source).not.toContain("streamAuthorisedFinalReport");
  });

  it("registers only the client-bound internal beta delivery route", () => {
    const source = readFileSync(new URL("./_core/index.ts", import.meta.url), "utf8");
    expect(source).toContain('app.get("/api/report/design-beta/:clientId/:betaId", handleReportDesignBetaPdfDownload)');
  });
});
