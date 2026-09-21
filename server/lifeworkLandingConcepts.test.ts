import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const conceptSource = readFileSync(
  resolve(process.cwd(), "client/src/pages/LifeworkLandingConcepts.tsx"),
  "utf8",
);
const appSource = readFileSync(resolve(process.cwd(), "client/src/App.tsx"), "utf8");

describe("Lifework landing-page concepts", () => {
  it("offers three separate review-only routes without replacing the public home route", () => {
    expect(appSource).toContain('path="/lifework-designs/journal"');
    expect(appSource).toContain('path="/lifework-designs/title-page"');
    expect(appSource).toContain('path="/lifework-designs/field-notes"');
    expect(appSource).toContain('path="/" component={RootRoute}');
    expect(appSource).toContain('window.location.hostname.endsWith(".manus.computer")');
    expect(appSource).toContain('window.location.hostname === "plumtrees-kfbbe6kq.manus.space"');
    expect(appSource).toContain('Redirect to="/lifework-designs/journal"');
  });

  it("retains the existing public landing-page copy and approved testimonial source", () => {
    expect(conceptSource).toContain("What if the right career");
    expect(conceptSource).toContain("already lives inside you?");
    expect(conceptSource).toContain("We understand what this");
    expect(conceptSource).toContain("Three stages.");
    expect(conceptSource).toContain("A lifetime of clarity.");
    expect(conceptSource).toContain('publicForPage.useQuery({ pageKey: "lifework_home" })');
  });

  it("uses the Quiet Authority report design system rather than the older PH visual treatment", () => {
    expect(conceptSource).toContain('"Cormorant Garamond"');
    expect(conceptSource).toContain('"Source Serif 4"');
    expect(conceptSource).toContain('"Libre Franklin"');
    expect(conceptSource).toContain("--paper: #f6f1e9");
    expect(conceptSource).toContain("--gold: #b8862f");
    expect(conceptSource).toContain("lc-section-rail");
  });
});
