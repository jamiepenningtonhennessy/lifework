import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("../client/src/pages/IpipSurvey.tsx", import.meta.url), "utf8");

describe("IPIP Personality Profile introduction", () => {
  it("keeps the written assessment orientation while removing the separate explainer player", () => {
    expect(source).toContain("About this assessment");
    expect(source).toContain("IPIP-NEO-120");
    expect(source).toContain("There are no right or wrong answers.");
    expect(source).not.toContain("Watch before you begin");
    expect(source).not.toContain("1t1UYw3YRal-UZ0efJrtr3H_IqH08ANsy");
    expect(source).not.toContain("<iframe");
  });
});
