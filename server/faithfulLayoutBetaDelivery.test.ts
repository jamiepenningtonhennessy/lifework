import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Faithful layout beta PDF delivery isolation", () => {
  it("keeps the PDF route server-authenticated, admin-only, client-bound and version-bound", () => {
    const source = readFileSync(new URL("./faithfulLayoutBetaDelivery.ts", import.meta.url), "utf8");
    expect(source).toContain("sdk.authenticateRequest(req)");
    expect(source).toContain('user.role !== "admin"');
    expect(source).toContain("beta.clientId !== clientId");
    expect(source).toContain("beta.betaVersion !== FAITHFUL_LAYOUT_BETA_VERSION");
    expect(source).toContain('Cache-Control", "private, no-store"');
  });

  it("registers a separate client-bound private delivery route", () => {
    const source = readFileSync(new URL("./_core/index.ts", import.meta.url), "utf8");
    expect(source).toContain('app.get("/api/report/faithful-layout-beta/:clientId/:betaId", handleFaithfulLayoutBetaPdfDownload)');
  });
});
