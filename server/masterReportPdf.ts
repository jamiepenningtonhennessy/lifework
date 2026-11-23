import { existsSync } from "node:fs";
import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { withMasterReportBrowser } from "./masterReportBrowser";

/**
 * Renders the established Quiet Authority HTML report design to PDF. Before
 * printing, it moves complete content units to matching continuation pages
 * whenever they would meet the footer. Headings stay with their first content
 * block. The normal report template remains unchanged; continuation pages
 * appear only where a page genuinely needs one.
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

export async function resolveChromiumPath(): Promise<string | undefined> {
  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    return process.env.PUPPETEER_EXECUTABLE_PATH;
  }

  // A system installation provides its runtime shared libraries as well as the
  // executable. A downloaded Chrome cache alone does not guarantee those exist.
  const systemChrome = SYSTEM_CHROME_CANDIDATES.find((candidate) => existsSync(candidate));
  if (systemChrome) return systemChrome;

  return findProjectCacheChrome();
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

  // Keep the original sibling DOM and CSS: wrappers would change margin
  // collapsing and the approved master's first-child/grid styling. A unit is
  // a chain of headings/labels/rules followed by its first substantive block.
  const keepsWithNext = (block) =>
    block.matches("h1,h2,h3,h4,h5,h6,[role='heading'],[data-keep-with-next],.section-h,.subhead,.stage,.eyebrow,.hr-gold") ||
    (!block.textContent.trim() && !block.querySelector("img,svg,canvas,table,ol,ul,video"));

  const contentUnits = (blocks) => {
    const units = [];
    let pending = [];
    for (const block of blocks) {
      pending.push(block);
      if (!keepsWithNext(block)) {
        units.push(pending);
        pending = [];
      }
    }
    if (pending.length) units.push(pending);
    return units;
  };

  const unitFits = (unit, footer) => {
    const safeBottom = footer.getBoundingClientRect().top - 22;
    return unit.every((block) => block.getBoundingClientRect().bottom <= safeBottom);
  };

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

    const units = contentUnits(Array.from(sourceMain.children));
    let currentPage = sourcePage;
    let currentMain = sourceMain;
    let currentFooter = sourceFooter;

    for (const unit of units) {
      // Once a continuation exists, every following sibling must join it before
      // its fit is measured. This preserves content order and permits a second
      // continuation if the continuation itself fills up.
      for (const block of unit) {
        if (block.parentElement !== currentMain) currentMain.append(block);
      }
      if (unitFits(unit, currentFooter)) continue;

      // Do not create an empty continuation or detach a heading merely to fit an
      // oversized paragraph/table. Reject the render rather than release a PDF
      // with clipped content. The message contains no client/report prose.
      if (currentMain.firstElementChild === unit[0]) {
        throw new Error("Lifework report has a heading/content unit taller than the usable page area.");
      }

      const continuation = createContinuation(sourcePage, currentPage);
      if (!continuation) {
        throw new Error("Lifework report could not create a matching continuation page.");
      }
      const continuationBody = getDirectChild(continuation, ".body");
      const continuationMain = continuationBody
        ? getDirectChild(continuationBody, ".main")
        : null;
      const continuationFooter = getDirectChild(continuation, ".foot");
      if (!continuationMain || !continuationFooter) {
        continuation.remove();
        throw new Error("Lifework report continuation page is missing its content area or footer.");
      }

      continuationMain.append(...unit);
      currentPage = continuation;
      currentMain = continuationMain;
      currentFooter = continuationFooter;
      if (!unitFits(unit, currentFooter)) {
        throw new Error("Lifework report has a heading/content unit taller than the usable page area.");
      }
    }

    // A deterministic keep-with-next gate before PDF capture supplements the
    // PDF text/header/footer preflight. No unit may span separate .main areas.
    for (const unit of units) {
      if (unit.some((block) => block.parentElement !== unit[0].parentElement)) {
        throw new Error("Lifework report separated a heading from its following content.");
      }
    }
  }
})();
`;

export async function generateMasterReportPdf(html: string): Promise<Buffer> {
  const executablePath = await resolveChromiumPath();
  return withMasterReportBrowser(executablePath, async (browser) => {
    const context = await browser.createBrowserContext();
    try {
      const page = await context.newPage();
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
      await context.close();
    }
  });
}
