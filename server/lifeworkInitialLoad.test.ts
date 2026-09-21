import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { shouldLoadStandaloneLanding } from "../client/src/lib/lifeworkDomain";

const mainSource = readFileSync(resolve(process.cwd(), "client/src/main.tsx"), "utf8");
const appMainSource = readFileSync(resolve(process.cwd(), "client/src/appMain.tsx"), "utf8");
const landingMainSource = readFileSync(resolve(process.cwd(), "client/src/lifeworkPathMain.tsx"), "utf8");
const htmlSource = readFileSync(resolve(process.cwd(), "client/index.html"), "utf8");
const viteSource = readFileSync(resolve(process.cwd(), "vite.config.ts"), "utf8");

describe("LifeworkPath initial-load routing", () => {
  it("selects the lightweight landing entry only for standalone root visits", () => {
    expect(shouldLoadStandaloneLanding("lifeworkpath.com", "/")).toBe(true);
    expect(shouldLoadStandaloneLanding("www.lifeworkpath.com", "/")).toBe(true);
    expect(shouldLoadStandaloneLanding("plumtrees-kfbbe6kq.manus.space", "/")).toBe(true);
    expect(shouldLoadStandaloneLanding("lifeworkpath.com", "/dashboard")).toBe(false);
    expect(shouldLoadStandaloneLanding("penningtonhennessy.com", "/")).toBe(false);
  });

  it("defers the full authenticated application bundle for a standalone landing visit", () => {
    expect(mainSource).toContain('void import("./lifeworkPathMain")');
    expect(mainSource).toContain('void import("./appMain")');
    expect(mainSource).not.toContain('import App from "./App"');
    expect(landingMainSource).toContain('import LifeworkLandingConcepts from "./pages/LifeworkLandingConcepts"');
    expect(appMainSource).toContain('import App from "./App"');
  });

  it("shows an immediate branded status and a clear failure message rather than a blank root", () => {
    expect(htmlSource).toContain('class="site-bootstrap" role="status"');
    expect(htmlSource).toContain("Opening LifeworkPath");
    expect(mainSource).toContain('bootstrapMessage.textContent = "Opening Pennington Hennessy";');
    expect(mainSource).toContain('LifeworkPath could not open just now. Please refresh the page.');
  });

  it("keeps the Manus visual-editing runtime out of production visitor bundles", () => {
    expect(viteSource).toContain('defineConfig(({ mode }) => ({');
    expect(viteSource).toContain('...(mode === "production" ? [] : [vitePluginManusRuntime()]),');
  });
});
