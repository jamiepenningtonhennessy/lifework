import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resolveChromiumPath } from "./masterReportPdf";

vi.mock("node:fs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs")>();
  return { ...actual, existsSync: vi.fn() };
});
vi.mock("node:fs/promises", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs/promises")>();
  return { ...actual, readdir: vi.fn() };
});

beforeEach(() => {
  vi.stubEnv("PUPPETEER_EXECUTABLE_PATH", "");
  vi.mocked(existsSync).mockReset().mockReturnValue(false);
  vi.mocked(readdir).mockReset();
});
afterEach(() => vi.unstubAllEnvs());

describe("production report browser selection", () => {
  it("uses the explicit production browser without probing downloaded caches", async () => {
    vi.stubEnv("PUPPETEER_EXECUTABLE_PATH", "/usr/bin/chromium");
    expect(await resolveChromiumPath()).toBe("/usr/bin/chromium");
    expect(existsSync).not.toHaveBeenCalled();
    expect(readdir).not.toHaveBeenCalled();
  });

  it("prefers a system browser even when a downloaded cache exists", async () => {
    const cache = join(process.cwd(), ".cache", "puppeteer", "chrome");
    vi.mocked(existsSync).mockImplementation((path) => path === "/usr/bin/chromium" || path === cache);
    expect(await resolveChromiumPath()).toBe("/usr/bin/chromium");
    expect(readdir).not.toHaveBeenCalled();
  });

  it("retains a cached browser as a development fallback when no system browser exists", async () => {
    const cache = join(process.cwd(), ".cache", "puppeteer", "chrome");
    const chrome = join(cache, "linux-test", "chrome-linux64", "chrome");
    vi.mocked(existsSync).mockImplementation((path) => path === cache || path === chrome);
    vi.mocked(readdir).mockResolvedValueOnce(["linux-test"] as any).mockResolvedValueOnce(["chrome-linux64"] as any);
    expect(await resolveChromiumPath()).toBe(chrome);
  });

  it("allows Puppeteer discovery when there is neither a system nor cached executable", async () => {
    expect(await resolveChromiumPath()).toBeUndefined();
  });

  it("tolerates an unreadable development cache", async () => {
    vi.mocked(existsSync).mockImplementation((path) => String(path).endsWith(".cache/puppeteer/chrome"));
    vi.mocked(readdir).mockRejectedValue(new Error("permission denied"));
    expect(await resolveChromiumPath()).toBeUndefined();
  });
});

describe("production report browser image contract", () => {
  it("installs Chromium and its system dependencies and builds the full application before the PDF check", async () => {
    const dockerfile = await readFile(join(process.cwd(), "Dockerfile"), "utf8");
    expect(dockerfile).toContain("FROM node:22-bookworm-slim");
    expect(dockerfile).toMatch(/apt-get install[\s\S]*chromium/);
    expect(dockerfile).toContain("fonts-liberation");
    expect(dockerfile).toContain("PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium");
    expect(dockerfile).toContain("PUPPETEER_SKIP_DOWNLOAD=true");
    expect(dockerfile).toContain("COPY . .");
    expect(dockerfile).toContain("corepack pnpm install --frozen-lockfile");
    expect(dockerfile.indexOf("corepack pnpm run build")).toBeLessThan(dockerfile.indexOf("node scripts/check-report-browser.mjs"));
    expect(dockerfile).toContain("ENV NODE_ENV=production");
    expect(dockerfile).toContain('CMD ["node", "dist/index.js"]');
    expect(dockerfile).not.toMatch(/COPY.*\.env/);
    expect(dockerfile).not.toMatch(/(?:JWT_SECRET|DATABASE_URL)\s*=/);
  });

  it("skips redundant browser downloads when the production image supplies one", async () => {
    const pkg = JSON.parse(await readFile(join(process.cwd(), "package.json"), "utf8"));
    expect(pkg.scripts.postinstall).toContain('$PUPPETEER_SKIP_DOWNLOAD');
    expect(pkg.scripts.postinstall).toContain('!= "true"');
  });

  it("uses the same container-safe browser launch flags for the smoke check and final renderer", async () => {
    const check = await readFile(join(process.cwd(), "scripts/check-report-browser.mjs"), "utf8");
    const renderer = await readFile(join(process.cwd(), "server/masterReportPdf.ts"), "utf8");
    for (const arg of ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-gpu", "--single-process", "--no-zygote", "--font-render-hinting=none"]) {
      expect(check).toContain(arg);
      expect(renderer).toContain(arg);
    }
    expect(check).toContain("page.pdf(");
    expect(check).toContain('"%PDF-"');
    expect(check).toContain("process.exitCode = 1");
  });

  it("fails the build check if the configured executable is absent rather than silently proceeding", () => {
    const result = spawnSync(process.execPath, ["scripts/check-report-browser.mjs"], {
      cwd: process.cwd(),
      env: { ...process.env, PUPPETEER_EXECUTABLE_PATH: "/nonexistent/lifework-chrome" },
      encoding: "utf8",
      timeout: 30_000,
    });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("[report-browser-check] FAILED");
    expect(result.stdout).not.toContain("Passed");
  }, 35_000);
});
