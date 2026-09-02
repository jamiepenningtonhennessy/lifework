import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const homePageSource = readFileSync(resolve(process.cwd(), "client/src/pages/Home.tsx"), "utf8");
const alternateHomeSource = readFileSync(resolve(process.cwd(), "client/src/pages/LifeworkStandalone.tsx"), "utf8");

describe("Lifework home testimonial widget", () => {
  it("uses the approved home-page placement list and never hard-coded quotes", () => {
    for (const source of [homePageSource, alternateHomeSource]) {
      expect(source).toContain('publicForPage.useQuery({ pageKey: "lifework_home" })');
      expect(source).toContain("homeTestimonials.slice(0, 4)");
      expect(source).toContain("Verified feedback selected for this page will appear here.");
      expect(source).not.toContain("I finally understood why some things feel effortless");
      expect(source).not.toContain("I had spent twelve years building a career");
    }
  });
});
