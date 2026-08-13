import { describe, expect, it } from "vitest";
import { getLegacyLifeworkRedirectUrl, getOriginalRequestHostname } from "./legacyLifeworkRedirect";

describe("getLegacyLifeworkRedirectUrl", () => {
  it("prefers the original proxy hostname over an internal application host", () => {
    expect(getOriginalRequestHostname({
      host: "internal.manus.app",
      forwardedHost: "penningtonhennessy.com",
    })).toBe("penningtonhennessy.com");
  });

  it("moves the primary legacy Lifework page to the standalone domain", () => {
    expect(getLegacyLifeworkRedirectUrl("penningtonhennessy.com", "/coaching/lifework"))
      .toBe("https://lifeworkpath.com/");
  });

  it("preserves campaign query strings and supports the www legacy host", () => {
    expect(getLegacyLifeworkRedirectUrl("www.penningtonhennessy.com", "/coaching/lifework/", "?utm_source=linkedin"))
      .toBe("https://lifeworkpath.com/?utm_source=linkedin");
  });

  it("preserves legacy Lifework sub-routes on the standalone domain", () => {
    expect(getLegacyLifeworkRedirectUrl("penningtonhennessy.com", "/coaching/lifework/interview"))
      .toBe("https://lifeworkpath.com/interview");
    expect(getLegacyLifeworkRedirectUrl("penningtonhennessy.com", "/coaching/lifework/webinar"))
      .toBe("https://lifeworkpath.com/webinar");
  });

  it("does not redirect other Pennington Hennessy pages or Lifework routes", () => {
    expect(getLegacyLifeworkRedirectUrl("penningtonhennessy.com", "/coaching")).toBeNull();
    expect(getLegacyLifeworkRedirectUrl("penningtonhennessy.com", "/coaching/lifeworkshop")).toBeNull();
    expect(getLegacyLifeworkRedirectUrl("lifeworkpath.com", "/coaching/lifework")).toBeNull();
  });
});
