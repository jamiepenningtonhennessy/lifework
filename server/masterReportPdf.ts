import { existsSync } from "node:fs";
import { readdir } from "node:fs/promises";
import { join } from "node:path";

/**
 * Renders the established Quiet Authority HTML report design to PDF. Before
 * printing, it moves complete direct content blocks to matching continuation
 * pages whenever they would meet the footer. The normal report template remains
 * unchanged; continuation pages appear only where a page genuinely needs one.
 */

const SYSTEM_CHROME_CANDIDATES = [
  "/usr/bin/chromium-browser",
  "/usr/bin/chromium",
  "/usr/bin/google-chrome",
  "/usr/bin/google-chrome-stable",
  "/usr/local/bin/chromium-browser",
  "/usr/local/bin/chromium",
];

async function findProjectCacheChrome(): Promise<string | undefined> {
  try {
    const cacheDir = join(process.cwd(), ".cache", "puppeteer", "chrome");
    if (!existsSync(cacheDir)) return undefined;

    for (const platformVersion of await readdir(cacheDir)) {
      const platformDirectory = join(cacheDir, platformVersion);
      for (const build of await readdir(platformDirectory)) {
        const candidate = join(platformDirectory, build, "chrome");
        if (existsSync(candidate)) return candidate;
      }
    }
  } catch {
    // Puppeteer can still discover its managed browser without this cache path.
  }
  return undefined;
}

async function resolveChromiumPath(): Promise<string | undefined> {
  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    return process.env.PUPPETEER_EXECUTABLE_PATH;
  }

  const projectCacheChrome = await findProjectCacheChrome();
  if (projectCacheChrome) return projectCacheChrome;

  return SYSTEM_CHROME_CANDIDATES.find((candidate) => existsSync(candidate));
}

/**
 * Plain browser JavaScript. It stays outside TypeScript helper transformation so
 * Chromium receives exactly the same paginator in development and production.
 */
const MASTER_PAGINATOR_SCRIPT = String.raw`
(() => {
  const sourcePages = Array.from(document.querySelectorAll("section.page"));
  const continuationCounts = new Map();

  const getDirectChild = (parent, selector) =>
    Array.from(parent.children).find((child) => child.matches(selector)) || null;

  const nextContinuationLabel = (sourceLabel, count) => {
    const trimmed = sourceLabel.trim();
    const numericLabel = trimmed.match(/^(\d+)([a-z])?$/i);
    if (numericLabel) {
      const base = numericLabel[1];
      const existingSuffix = (numericLabel[2] || "").toLowerCase();
      const start = existingSuffix ? existingSuffix.charCodeAt(0) - "a".charCodeAt(0) + 1 : 0;
      const letter = String.fromCharCode("a".charCodeAt(0) + Math.min(start + count, 25));
      return base + letter;
    }
    return count === 0 ? trimmed + " · continued" : trimmed + " · continued " + (count + 1);
  };

  const createContinuation = (sourcePage, currentPage) => {
    const sourceBody = getDirectChild(sourcePage, ".body");
    const sourceFooter = getDirectChild(sourcePage, ".foot");
    const sourceHeader = getDirectChild(sourcePage, ".band");
    if (!sourceBody || !sourceFooter || !sourceHeader) return null;

    const continuation = sourcePage.cloneNode(false);
    continuation.classList.add("lw-generated-continuation");

    const header = sourceHeader.cloneNode(true);
    const headerLabel = header.lastElementChild;
    if (headerLabel && !/continued/i.test(headerLabel.textContent || "")) {
      headerLabel.textContent = (headerLabel.textContent || "") + " · continued";
    }

    const body = sourceBody.cloneNode(false);
    const footer = sourceFooter.cloneNode(true);
    const sourceRail = getDirectChild(sourceBody, ".rail");
    if (sourceRail) {
      const rail = sourceRail.cloneNode(true);
      rail.classList.add("cont");
      const railSub = rail.querySelector(".sub");
      if (railSub) railSub.textContent = "Continued";
      body.append(rail);
    }

    const sourceMain = getDirectChild(sourceBody, ".main");
    if (!sourceMain) return null;
    const main = sourceMain.cloneNode(false);
    body.append(main);

    const count = continuationCounts.get(sourcePage) || 0;
    continuationCounts.set(sourcePage, count + 1);
    const sourceLabel = (sourceFooter.querySelector(".cur") || {}).textContent || "Continued";
    const continuationLabel = footer.querySelector(".cur");
    if (continuationLabel) {
      continuationLabel.textContent = nextContinuationLabel(sourceLabel, count);
    }

    continuation.append(header, body, footer);
    currentPage.after(continuation);
    return continuation;
  };

  for (const sourcePage of sourcePages) {
    const sourceBody = getDirectChild(sourcePage, ".body");
    const sourceMain = sourceBody ? getDirectChild(sourceBody, ".main") : null;
    const sourceFooter = getDirectChild(sourcePage, ".foot");

    // Cover, title and divider pages intentionally have their own fixed
    // layouts. Every standard page with a .main area can gain a continuation.
    if (!sourceBody || !sourceMain || !sourceFooter) continue;

    const blocks = Array.from(sourceMain.children);
    let currentPage = sourcePage;
    let currentMain = sourceMain;
    let currentFooter = sourceFooter;

    for (const block of blocks) {
      // Once a continuation exists, every following sibling must join it before
      // its fit is measured. This preserves content order and permits a second
      // continuation if the continuation itself fills up.
      if (block.parentElement !== currentMain) currentMain.append(block);

      const footerTop = currentFooter.getBoundingClientRect().top;
      const blockBottom = block.getBoundingClientRect().bottom;
      const safeBottom = footerTop - 22;
      if (blockBottom <= safeBottom) continue;

      const continuation = createContinuation(sourcePage, currentPage);
      // A single indivisible item taller than an empty page is deliberately left
      // in place: the PDF preflight will reject it rather than silently dropping
      // or splitting client content.
      if (!continuation || currentMain.children.length === 1) continue;

      const continuationBody = getDirectChild(continuation, ".body");
      const continuationMain = continuationBody
        ? getDirectChild(continuationBody, ".main")
        : null;
      const continuationFooter = getDirectChild(continuation, ".foot");
      if (!continuationMain || !continuationFooter) {
        continuation.remove();
        continue;
      }

      continuationMain.append(block);
      currentPage = continuation;
      currentMain = continuationMain;
      currentFooter = continuationFooter;
    }
  }
})();
`;

export async function generateMasterReportPdf(html: string): Promise<Buffer> {
  const puppeteer = (await import("puppeteer")).default;
  const executablePath = await resolveChromiumPath();
  const browser = await puppeteer.launch({
    headless: true,
    executablePath,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--single-process",
      "--no-zygote",
      "--font-render-hinting=none",
    ],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: ["networkidle0", "domcontentloaded"] });
    await page.evaluate(() => document.fonts.ready);
    await page.evaluate(MASTER_PAGINATOR_SCRIPT);

    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
      preferCSSPageSize: true,
    });

    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}
