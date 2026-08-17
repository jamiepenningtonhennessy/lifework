import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const dashboardSource = readFileSync(
  resolve(process.cwd(), "client/src/pages/ClientDashboard.tsx"),
  "utf8"
);

describe("client dashboard Alistair journey", () => {
  it("makes Explore with Alistair the sixth and final client dashboard step", () => {
    const alistairStep = dashboardSource.indexOf('id: "ask_alistair"');

    expect(alistairStep).toBeGreaterThan(-1);
    expect(dashboardSource).toContain('title: "6. Explore with Alistair"');
    expect(dashboardSource).toContain("Your Lifework journey has six stages");
    expect(dashboardSource).toContain("const totalSteps = 6;");
    expect(dashboardSource).not.toContain('id: "role_specification"');
  });

  it("uses the counsellor unlock for the final standalone Alistair step", () => {
    expect(dashboardSource).toContain('const isAlistair = step.id === "ask_alistair";');
    expect(dashboardSource).toContain("else if (isAlistair)");
    expect(dashboardSource).toContain('path: "/career-explorer"');
    expect(dashboardSource).toContain(
      "Alistair wrote your report so he's the ideal person to talk to about what you now believe to be true and potential roles you might be going for."
    );
    expect(dashboardSource).not.toContain("Role Specification");
  });

  it("shows an unlocked Alistair step as available in the read-only counsellor preview", () => {
    expect(dashboardSource).toContain("if (isPreview && isAlistair)");
    expect(dashboardSource).toContain("Available to client");
    expect(dashboardSource).toContain("Explore with Alistair");
  });
});
