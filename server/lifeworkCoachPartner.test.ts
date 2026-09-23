import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const appSource = readFileSync(resolve(process.cwd(), "client/src/App.tsx"), "utf8");
const entrySource = readFileSync(resolve(process.cwd(), "client/src/lifeworkPathMain.tsx"), "utf8");
const pageSource = readFileSync(resolve(process.cwd(), "client/src/pages/LifeworkCoachPartner.tsx"), "utf8");

describe("Lifework coach-partner landing page", () => {
  it("makes the coach proposition available at the public coaches route", () => {
    expect(appSource).toContain('path="/coaches" component={LifeworkCoachPartner}');
    expect(entrySource).toContain('import LifeworkCoachPartner from "./pages/LifeworkCoachPartner"');
    expect(entrySource).toContain('pathname === "/coaches" || pathname === "/coaches/"');
  });

  it("keeps the supplied proposition intact while improving its concise sales copy", () => {
    expect(pageSource).toContain("Give your clients");
    expect(pageSource).toContain("something more to find.");
    expect(pageSource).toContain("Lifework is a structured career-analysis programme built on life history");
    expect(pageSource).toContain("Six stages");
    expect(pageSource).toContain("Two AI guides");
    expect(pageSource).toContain("The WOW Report");
  });

  it("keeps the partnership section editorial and community-focused", () => {
    expect(pageSource).toContain('className="lcp-section lcp-partnership"');
    expect(pageSource).toContain("Coaching need not");
    expect(pageSource).toContain("be solitary.");
    expect(pageSource).toContain("meaningful belonging");
    expect(pageSource).not.toContain("The commercial model");
    expect(pageSource).not.toContain("Simple terms.");
    expect(pageSource).not.toContain("Terms and belonging");
    expect(pageSource).not.toContain("£1,000");
    expect(pageSource).not.toContain("£500");
    expect(pageSource).not.toContain("£250 per client");
    expect(pageSource).not.toContain(".lcp-terms { background: var(--lcp-navy)");
  });

  it("ends with the requested direct Jamie contact call to action", () => {
    expect(pageSource).toContain("Get in touch with Jamie");
    expect(pageSource).toContain("mailto:jamie@lifeworkpath.com?subject=Lifework%20Coach%20Partner%20Enquiry");
    expect(pageSource).toContain("jamie@lifeworkpath.com");
  });

  it("uses the LifeworkPath editorial system and provides responsive layout rules", () => {
    expect(pageSource).toContain('--lcp-paper: #f6f1e9');
    expect(pageSource).toContain('--lcp-navy: #1a2744');
    expect(pageSource).toContain('--lcp-gold: #b8862f');
    expect(pageSource).toContain('"Cormorant Garamond"');
    expect(pageSource).toContain('"Libre Franklin"');
    expect(pageSource).toContain('@media (max-width: 800px)');
    expect(pageSource).toContain('@media (prefers-reduced-motion: reduce)');
  });
});
