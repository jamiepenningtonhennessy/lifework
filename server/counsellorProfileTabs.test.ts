import { describe, expect, it } from "vitest";
import { isClientProfileTabVisible } from "../shared/counsellorProfileTabs";

describe("standard counsellor client-profile tab visibility", () => {
  const hiddenForStandardCounsellors = [
    "report",
    "virtual-peter",
    "role-decoder",
    "linkedin-rewriter",
    "jobs",
  ];

  it("keeps every tool visible in the master counsellor view", () => {
    hiddenForStandardCounsellors.forEach((tabId) => {
      expect(isClientProfileTabVisible(tabId, "master")).toBe(true);
    });
  });

  it("hides only the selected tools for a standard counsellor", () => {
    hiddenForStandardCounsellors.forEach((tabId) => {
      expect(isClientProfileTabVisible(tabId, "standard-counsellor")).toBe(false);
    });
    expect(isClientProfileTabVisible("overview", "standard-counsellor")).toBe(true);
    expect(isClientProfileTabVisible("interview", "standard-counsellor")).toBe(true);
    expect(isClientProfileTabVisible("wow-report", "standard-counsellor")).toBe(true);
  });
});
