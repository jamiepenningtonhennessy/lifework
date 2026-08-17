import { describe, expect, it } from "vitest";
import { isPenningtonHennessyHostname, isStandaloneLifeworkHostname } from "../client/src/lib/lifeworkDomain";

describe("standalone Lifework hostname routing", () => {
  it("recognises the new Lifework domain and its www alias", () => {
    expect(isStandaloneLifeworkHostname("lifeworkpath.com")).toBe(true);
    expect(isStandaloneLifeworkHostname("www.lifeworkpath.com")).toBe(true);
  });

  it("recognises the existing standalone Lifework hostname", () => {
    expect(isStandaloneLifeworkHostname("lifework.manus.space")).toBe(true);
  });

  it("renders Lifework in the managed project viewer", () => {
    expect(isStandaloneLifeworkHostname("plumtrees-kfbbe6kq.manus.space")).toBe(true);
  });

  it("keeps the Pennington Hennessy domain on its own homepage", () => {
    expect(isStandaloneLifeworkHostname("penningtonhennessy.com")).toBe(false);
    expect(isStandaloneLifeworkHostname("www.penningtonhennessy.com")).toBe(false);
    expect(isStandaloneLifeworkHostname(null)).toBe(false);
  });

  it("recognises only the public Pennington Hennessy hosts for the legacy redirect", () => {
    expect(isPenningtonHennessyHostname("penningtonhennessy.com")).toBe(true);
    expect(isPenningtonHennessyHostname("www.penningtonhennessy.com")).toBe(true);
    expect(isPenningtonHennessyHostname("lifeworkpath.com")).toBe(false);
    expect(isPenningtonHennessyHostname("localhost")).toBe(false);
  });
});
