import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const dashboardSource = readFileSync(
  resolve(process.cwd(), "client/src/pages/ClientDashboard.tsx"),
  "utf8"
);

describe("client dashboard Alistair journey", () => {
  it("places Explore with Alistair at Step 6 before Role Specification at Step 7", () => {
    const alistairStep = dashboardSource.indexOf('id: "ask_alistair"');
    const roleSpecificationStep = dashboardSource.indexOf('id: "role_specification"');

    expect(alistairStep).toBeGreaterThan(-1);
    expect(roleSpecificationStep).toBeGreaterThan(alistairStep);
    expect(dashboardSource).toContain('title: "6. Explore with Alistair"');
    expect(dashboardSource).toContain('title: "7. Role Specification"');
    expect(dashboardSource).toContain("Your Lifework journey has seven stages");
    expect(dashboardSource).toContain("const totalSteps = 7;");
  });

  it("uses the counsellor unlock for the standalone Alistair step and no longer embeds it in Role Specification", () => {
    expect(dashboardSource).toContain('const isAlistair = step.id === "ask_alistair";');
    expect(dashboardSource).toContain("isAlistair || isRoleSpec");
    expect(dashboardSource).toContain('path: "/career-explorer"');
    expect(dashboardSource).toContain(
      "Alistair wrote your report so he's the ideal person to talk to about what you now believe to be true and potential roles you might be going for."
    );
    expect(dashboardSource).not.toContain("Ask Alistair to help you test this Role Specification");
  });

  it("shows an unlocked Alistair step as available in the read-only counsellor preview", () => {
    expect(dashboardSource).toContain("if (isPreview && isAlistair)");
    expect(dashboardSource).toContain("Available to client");
    expect(dashboardSource).toContain("Explore with Alistair");
  });
});
