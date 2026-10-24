import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const backgroundSource = readFileSync(
  resolve(process.cwd(), "client/src/pages/Background.tsx"),
  "utf8"
);

describe("Family Background form", () => {
  it("opens the Career History tab when the client page is given its review query", () => {
    expect(backgroundSource).toContain('new URLSearchParams(window.location.search).get("tab") === "career"');
    expect(backgroundSource).toContain('? "career"');
    expect(backgroundSource).toContain(': "family"');
  });

  it("uses inclusive parent or guardian occupation fields without a duplicate father field", () => {
    expect(backgroundSource).toContain("Parent / Guardian 1 — Occupation");
    expect(backgroundSource).toContain("Parent / Guardian 2 — Occupation");
    expect(backgroundSource).not.toContain("Father's Occupation");
  });

  it("asks about household rules and a family motto in the family narrative prompt", () => {
    expect(backgroundSource).toContain(
      "What were three rules that I would need to know to be a happy and well-regarded member of your household?"
    );
    expect(backgroundSource).toContain(
      "And what might your family motto have been, if you had been asked for one?"
    );
  });

  it("uses the approved managed Stage 2 explainer rather than the previous Drive iframe", () => {
    expect(backgroundSource).toContain(
      '/manus-storage/lifework_step2_background_career_explainer_839de757.mp4'
    );
    expect(backgroundSource).toContain("Lifework Background and Career History explainer");
    expect(backgroundSource).not.toContain("1FQ9fnNAvFIvwPqqmwC_t7ODEOhj0w1ld/preview");
  });
});
