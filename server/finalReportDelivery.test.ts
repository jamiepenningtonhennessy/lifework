import { describe, expect, it } from "vitest";
import { canAccessFinalReport, finalReportFilename } from "./finalReportDelivery";

describe("final report delivery", () => {
  it("creates a safe, stable filename for a stored client PDF", () => {
    expect(finalReportFilename("Jane Example")).toBe("Lifework-Jane-Example.pdf");
    expect(finalReportFilename("  A/B: Test  ")).toBe("Lifework-AB-Test.pdf");
    expect(finalReportFilename("")).toBe("Lifework-Report.pdf");
  });

  it("retains the established client-versus-counsellor access boundary", () => {
    expect(canAccessFinalReport({ id: 7, role: "user" }, 7)).toBe(true);
    expect(canAccessFinalReport({ id: 7, role: "user" }, 8)).toBe(false);
    expect(canAccessFinalReport({ id: 1, role: "admin" }, 8)).toBe(true);
  });
});
