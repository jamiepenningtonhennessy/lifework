import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const conceptSource = readFileSync(
  resolve(process.cwd(), "client/src/pages/LifeworkLandingConcepts.tsx"),
  "utf8",
);
const appSource = readFileSync(resolve(process.cwd(), "client/src/App.tsx"), "utf8");

describe("Lifework landing page", () => {
  it("retains three separate review routes and selects Field Notes for the public standalone home", () => {
    expect(appSource).toContain('path="/lifework-designs/journal"');
    expect(appSource).toContain('path="/lifework-designs/title-page"');
    expect(appSource).toContain('path="/lifework-designs/field-notes"');
    expect(appSource).toContain('path="/" component={RootRoute}');
    expect(appSource).toContain('<LifeworkLandingConcepts forcedConcept="field-notes" reviewOnly={false} />');
  });

  it("retains the existing public landing-page copy and approved testimonial source", () => {
    expect(conceptSource).toContain("What if the right career");
    expect(conceptSource).toContain("already lives inside you?");
    expect(conceptSource).toContain("We understand what</span>");
    expect(conceptSource).toContain('this <span className="lc-guide-gold">feels like.</span>');
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

  it("keeps the selected Field Notes experience free of blue panels, including the final quotation and footer", () => {
    expect(conceptSource).toContain('.lw-concept .lc-closing { padding: 110px 0 78px; background: var(--paper-deep)');
    expect(conceptSource).toContain('.lw-concept .lc-footer { border-top: 1px solid var(--rule); background: var(--paper)');
    expect(conceptSource).toContain('.lw-concept[data-concept="field-notes"] .lc-video { background: var(--paper-deep)');
    expect(conceptSource).toContain('.lw-concept[data-concept="field-notes"] .lc-video-frame { background: #fffdf9');
  });

  it("preserves the access-code journey on the selected public landing page", () => {
    expect(conceptSource).toContain('trpc.auth.verifyAccessCode.useMutation');
    expect(conceptSource).toContain('sessionStorage.setItem("lw_access_granted", "1")');
    expect(conceptSource).toContain('getLoginUrl(lifeworkLandingPath())');
    expect(conceptSource).toContain('Enter the code supplied by your counsellor');
  });

  it("uses the independent LifeworkPath contact address and omits PH service attribution", () => {
    expect(conceptSource).toContain('mailto:jamie@lifeworkpath.com');
    expect(conceptSource).toContain('Email Jamie — jamie@lifeworkpath.com');
    expect(conceptSource).not.toContain('penningtonhennessy.com');
    expect(conceptSource).not.toContain('Pennington Hennessy');
  });

  it("composes the guide headline on two deliberate lines with muted-gold emphasis", () => {
    expect(conceptSource).toContain('className="lc-section-heading lc-guide-heading"');
    expect(conceptSource).toContain('We understand what</span><br />');
    expect(conceptSource).toContain('this <span className="lc-guide-gold">feels like.</span>');
    expect(conceptSource).toContain('.lc-guide-heading .lc-guide-line { white-space: nowrap; }');
    expect(conceptSource).toContain('.lc-guide-heading .lc-guide-gold { color: var(--gold); }');
  });
});
