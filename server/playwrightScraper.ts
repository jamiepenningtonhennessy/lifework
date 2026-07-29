/**
 * playwrightScraper.ts
 *
 * Headless browser scraper for law firm careers pages that use JavaScript-rendered
 * content (bespoke portals, iCIMS, Teamtailor, AllHires, etc.).
 *
 * Uses a single shared browser instance to stay within the 512 MiB memory budget.
 * The browser is launched lazily on first use and kept alive across requests.
 *
 * In production (Docker), Chromium is provided by the system package and
 * PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH points to /usr/bin/chromium.
 * In dev (sandbox), /usr/bin/chromium is already present.
 */

import { chromium, Browser, BrowserContext } from "playwright-core";

export interface ScrapedListing {
  externalId: string;
  title: string;
  location?: string;
  url: string;
  raw?: Record<string, unknown>;
}

// ─── Shared browser singleton ────────────────────────────────────────────────

let _browser: Browser | null = null;
let _launchPromise: Promise<Browser> | null = null;

async function getBrowser(): Promise<Browser> {
  if (_browser && _browser.isConnected()) return _browser;
  if (_launchPromise) return _launchPromise;

  const executablePath =
    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ||
    process.env.CHROMIUM_PATH ||
    "/usr/bin/chromium";

  _launchPromise = chromium
    .launch({
      executablePath,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--single-process",
        "--no-zygote",
      ],
      headless: true,
    })
    .then((b) => {
      _browser = b;
      _launchPromise = null;
      b.on("disconnected", () => {
        _browser = null;
      });
      return b;
    });

  return _launchPromise;
}

// ─── Core scrape function ─────────────────────────────────────────────────────

/**
 * Scrape a careers page using a headless browser.
 * Waits for the page to settle, then extracts job listing links and titles.
 *
 * Strategy:
 * 1. Navigate to the careers URL
 * 2. Wait for network idle (JS has run)
 * 3. Look for job listing patterns: <a> tags with job-like href patterns,
 *    or common job board markup (role titles in h2/h3/li with links)
 * 4. Return up to 30 listings
 */
export async function scrapeCareerPage(
  careersUrl: string,
  firmName: string,
  timeoutMs = 20000
): Promise<ScrapedListing[]> {
  let context: BrowserContext | null = null;
  try {
    const browser = await getBrowser();
    context = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      viewport: { width: 1280, height: 800 },
    });

    const page = await context.newPage();

    // Block images, fonts, and media to speed up loading
    await page.route("**/*", (route) => {
      const type = route.request().resourceType();
      if (["image", "media", "font", "stylesheet"].includes(type)) {
        route.abort();
      } else {
        route.continue();
      }
    });

    await page.goto(careersUrl, {
      waitUntil: "networkidle",
      timeout: timeoutMs,
    });

    // Give JS frameworks a moment to render
    await page.waitForTimeout(1500);

    // Extract job listings using multiple heuristics
    const listings = await page.evaluate(() => {
      const results: Array<{
        title: string;
        url: string;
        location: string;
      }> = [];
      const seen = new Set<string>();

      // Heuristic 1: Look for <a> tags whose href contains job-like path segments
      const jobPathPatterns =
        /\/(job|jobs|vacancy|vacancies|role|roles|career|careers|position|opening|apply|requisition|posting|advert)\//i;
      const jobIdPattern = /[?&](id|jobId|req|reqId|jobReqId|vacancyId)=/i;

      const allLinks = Array.from(document.querySelectorAll("a[href]"));
      for (const a of allLinks) {
        const href = (a as HTMLAnchorElement).href;
        const text = a.textContent?.trim() || "";

        if (!href || href.startsWith("javascript") || href === "#") continue;
        if (text.length < 4 || text.length > 200) continue;
        if (seen.has(href)) continue;

        // Skip navigation links
        const lowerText = text.toLowerCase();
        if (
          [
            "home",
            "about",
            "contact",
            "login",
            "register",
            "sign in",
            "back",
            "next",
            "previous",
            "apply",
            "read more",
            "learn more",
            "view all",
            "see all",
          ].includes(lowerText)
        )
          continue;

        if (jobPathPatterns.test(href) || jobIdPattern.test(href)) {
          seen.add(href);

          // Try to find location near this element
          const parent =
            a.closest("li") ||
            a.closest("tr") ||
            a.closest("[class*='job']") ||
            a.closest("[class*='vacancy']") ||
            a.closest("[class*='role']") ||
            a.parentElement;
          const locationEl = parent?.querySelector(
            "[class*='location'], [class*='place'], [class*='city'], [class*='office']"
          );
          const location = locationEl?.textContent?.trim() || "";

          results.push({ title: text, url: href, location });
          if (results.length >= 40) break;
        }
      }

      // Heuristic 2: If we found very few, try heading-based extraction
      if (results.length < 3) {
        const headings = Array.from(
          document.querySelectorAll("h2, h3, h4, [class*='job-title'], [class*='vacancy-title'], [class*='role-title']")
        );
        for (const h of headings) {
          const text = h.textContent?.trim() || "";
          if (text.length < 4 || text.length > 200) continue;
          if (seen.has(text)) continue;

          // Find closest link
          const link =
            h.querySelector("a") ||
            h.closest("a") ||
            h.parentElement?.querySelector("a");
          const href = link
            ? (link as HTMLAnchorElement).href
            : window.location.href;

          seen.add(text);
          results.push({ title: text, url: href, location: "" });
          if (results.length >= 40) break;
        }
      }

      return results;
    });

    return listings
      .filter((l) => l.title && l.title.length > 3)
      .slice(0, 30)
      .map((l, idx) => ({
        externalId: l.url || `${firmName}-${idx}`,
        title: l.title,
        location: l.location || undefined,
        url: l.url,
        raw: { scraped: true, source: careersUrl },
      }));
  } catch (err) {
    console.error(
      `[playwright] Error scraping ${firmName} (${careersUrl}):`,
      err instanceof Error ? err.message : String(err)
    );
    return [];
  } finally {
    if (context) {
      await context.close().catch(() => {});
    }
  }
}

/**
 * Gracefully close the shared browser.
 * Call this during server shutdown.
 */
export async function closeBrowser(): Promise<void> {
  if (_browser) {
    await _browser.close().catch(() => {});
    _browser = null;
  }
}
