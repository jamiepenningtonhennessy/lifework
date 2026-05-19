import { describe, it, expect } from "vitest";
import {
  POST_TYPES,
  LIFEWORK_ASPECTS,
  BLOG_VOICES,
} from "./routers/blogWriter";

describe("Blog Writing Machine — taxonomy contract", () => {
  it("exports at least 5 post types", () => {
    expect(POST_TYPES.length).toBeGreaterThanOrEqual(5);
  });

  it("exports at least 10 Lifework aspects", () => {
    expect(LIFEWORK_ASPECTS.length).toBeGreaterThanOrEqual(10);
  });

  it("exports exactly 6 voices matching the WOW Report voice set", () => {
    const ids = BLOG_VOICES.map((v) => v.id);
    expect(ids).toContain("house");
    expect(ids).toContain("mark");
    expect(ids).toContain("oliver-sacks");
    expect(ids).toContain("william-zinsser");
    expect(ids).toContain("clive-james");
    expect(ids).toContain("michael-lewis");
    expect(ids.length).toBe(6);
  });

  it("all post type ids are non-empty strings", () => {
    for (const pt of POST_TYPES) {
      expect(typeof pt.id).toBe("string");
      expect(pt.id.length).toBeGreaterThan(0);
      expect(typeof pt.label).toBe("string");
      expect(pt.label.length).toBeGreaterThan(0);
    }
  });

  it("all aspect ids are non-empty strings", () => {
    for (const asp of LIFEWORK_ASPECTS) {
      expect(typeof asp.id).toBe("string");
      expect(asp.id.length).toBeGreaterThan(0);
      expect(typeof asp.label).toBe("string");
      expect(asp.label.length).toBeGreaterThan(0);
    }
  });

  it("all voice ids are non-empty strings", () => {
    for (const v of BLOG_VOICES) {
      expect(typeof v.id).toBe("string");
      expect(v.id.length).toBeGreaterThan(0);
      expect(typeof v.label).toBe("string");
      expect(v.label.length).toBeGreaterThan(0);
    }
  });
});
