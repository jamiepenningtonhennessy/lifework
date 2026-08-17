import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const gateSource = readFileSync(
  resolve(process.cwd(), "client/src/components/CounsellorPinGate.tsx"),
  "utf8"
);
const mainSource = readFileSync(
  resolve(process.cwd(), "client/src/main.tsx"),
  "utf8"
);

describe("counsellor portal API guard", () => {
  it("waits for confirmed authentication before the PIN gate makes protected portal requests", () => {
    expect(gateSource).toContain("const { loading: authLoading, isAuthenticated } = useAuth");
    expect(gateSource).toContain("redirectOnUnauthenticated: true");
    expect(gateSource).toContain("redirectPath: getLoginUrl(window.location.pathname)");
    expect(gateSource).toContain("enabled: !authLoading && isAuthenticated");
    expect(gateSource).toContain("if (authLoading || !isAuthenticated || mode === \"loading\")");
  });

  it("uses an origin-explicit JSON API endpoint for deep-link portal routes", () => {
    expect(mainSource).toContain("url: `${window.location.origin}/api/trpc`");
    expect(mainSource).toContain('accept: "application/json"');
  });
});
