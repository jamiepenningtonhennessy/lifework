import { describe, expect, it } from "vitest";
import { canAccessBrandedReport, renderHtmlReport } from "./html-report";

describe("canAccessBrandedReport", () => {
  it("allows a counsellor to inspect any client report", () => {
    expect(canAccessBrandedReport({ id: 1, role: "admin" }, 42)).toBe(true);
  });

  it("allows a client to inspect only their own report", () => {
    expect(canAccessBrandedReport({ id: 42, role: "user" }, 42)).toBe(true);
    expect(canAccessBrandedReport({ id: 42, role: "user" }, 43)).toBe(false);
  });

  it("does not permit an anonymous identifier to access a report", () => {
    expect(canAccessBrandedReport({ role: "user" }, 42)).toBe(false);
  });
});

describe("renderHtmlReport — Quiet Authority template", () => {
  it("retains the Quiet Authority structural report treatment", () => {
    const html = renderHtmlReport({
      CLIENT: { NAME: "David Example", FIRST_NAME: "David" },
      BRAND: { COMPANY: "Lifework" },
      REPORT: { EDITION_LABEL: "Career Analysis", DATE: "August 2026", ANALYST: "Jamie Pennington" },
    });

    expect(html).toContain("--navy:#1A2744");
    expect(html).toContain("Cormorant+Garamond");
    expect(html).toContain("Source+Serif+4");
    expect(html).toContain('class="rail"');
    expect(html).toContain("Life<b>work</b>");
    expect(html).toContain("David Example");
  });
});
