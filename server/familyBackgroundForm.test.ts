import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const backgroundSource = readFileSync(
  resolve(process.cwd(), "client/src/pages/Background.tsx"),
  "utf8"
);

describe("Family Background form", () => {
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
});
