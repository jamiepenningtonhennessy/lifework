/**
 * testPlaywright.mjs — standalone test for the Playwright scraper
 * Run: node server/scripts/testPlaywright.mjs
 */
import { chromium } from 'playwright-core';

const EXECUTABLE = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || '/usr/bin/chromium';

async function scrape(url, firmName) {
  let context = null;
  try {
    const browser = await chromium.launch({
      executablePath: EXECUTABLE,
      args: ['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage','--disable-gpu','--single-process','--no-zygote'],
      headless: true,
    });
    context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1280, height: 800 },
    });
    const page = await context.newPage();
    await page.route('**/*', route => {
      const t = route.request().resourceType();
      if (['image','media','font'].includes(t)) route.abort();
      else route.continue();
    });
    // Use domcontentloaded + short wait for faster loading, then try networkidle
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
      // Wait for network to settle but don't block on it
      await Promise.race([
        page.waitForLoadState('networkidle', { timeout: 8000 }),
        new Promise(r => setTimeout(r, 8000)),
      ]);
    } catch {
      // If goto itself fails, bail out
      return [];
    }
    await page.waitForTimeout(1500);

    const listings = await page.evaluate(() => {
      const results = [];
      const seen = new Set();
      // Broad job path patterns — includes /job/, /jobs/, /vacancy/, /vacancies/, /role/, /position/, /opening/, /requisition/, /posting/, /advert/, /opportunity/
      const jobPathPatterns = /\/(job|jobs|vacancy|vacancies|role|roles|career|careers|position|positions|opening|openings|apply|requisition|posting|advert|opportunity|opportunities)(\/|$|\?)/i;
      const jobIdPattern = /[?&](id|jobId|req|reqId|jobReqId|vacancyId|opportunityId)=/i;
      // Also match URLs that end in a numeric ID (common in bespoke portals)
      const numericEndPattern = /\/\d{4,}\/?$/;
      const skipTexts = new Set(['home','about','contact','login','register','sign in','sign up','back','next','previous','apply','read more','learn more','view all','see all','submit','close','cancel','search','filter','sort','reset','clear','load more','show more']);
      
      const allLinks = Array.from(document.querySelectorAll('a[href]'));
      for (const a of allLinks) {
        const href = a.href;
        const text = a.textContent?.trim() || '';
        if (!href || href.startsWith('javascript') || href === '#' || href === window.location.href) continue;
        if (text.length < 4 || text.length > 200) continue;
        if (seen.has(href)) continue;
        if (skipTexts.has(text.toLowerCase())) continue;
        
        const matchesPattern = jobPathPatterns.test(href) || jobIdPattern.test(href) || numericEndPattern.test(href);
        if (matchesPattern) {
          seen.add(href);
          const parent = a.closest('li') || a.closest('tr') || a.closest('[class*="job"]') || a.closest('[class*="vacancy"]') || a.closest('[class*="role"]') || a.closest('[class*="position"]') || a.parentElement;
          const locationEl = parent?.querySelector('[class*="location"],[class*="place"],[class*="city"],[class*="office"],[class*="region"]');
          results.push({ title: text, url: href, location: locationEl?.textContent?.trim() || '' });
          if (results.length >= 40) break;
        }
      }
      
      // Fallback: look for heading elements near links if we found few results
      if (results.length < 3) {
        const containers = Array.from(document.querySelectorAll('[class*="job"],[class*="vacancy"],[class*="role"],[class*="position"],[class*="listing"],[class*="opportunity"]'));
        for (const container of containers) {
          const link = container.querySelector('a[href]') || (container.tagName === 'A' ? container : null);
          const heading = container.querySelector('h1,h2,h3,h4,[class*="title"],[class*="name"]');
          const text = (heading || link)?.textContent?.trim() || '';
          const href = link ? link.href : '';
          if (text.length < 4 || text.length > 200 || !href || seen.has(href)) continue;
          seen.add(href);
          results.push({ title: text, url: href, location: '' });
          if (results.length >= 40) break;
        }
      }
      
      return results;
    });

    await browser.close();
    return listings;
  } catch (e) {
    if (context) await context.close().catch(() => {});
    return { error: e.message };
  }
}

const testFirms = [
  { name: 'Slaughter and May', url: 'https://joinus.slaughterandmay.com/' },
  { name: 'Eversheds Sutherland', url: 'https://careers.eversheds-sutherland.com/' },
  { name: 'Pinsent Masons', url: 'https://www.pinsentmasons.com/careers' },
  { name: 'Ashurst', url: 'https://careers.ashurst.com/' },
];

for (const firm of testFirms) {
  console.log(`\nTesting ${firm.name}...`);
  const results = await scrape(firm.url, firm.name);
  if (results.error) {
    console.log(`  ✗ Error: ${results.error}`);
  } else {
    console.log(`  ✓ ${results.length} listings found`);
    results.slice(0, 3).forEach(r => console.log(`    - ${r.title.substring(0,60)} | ${r.url.substring(0,70)}`));
  }
}
console.log('\nDone.');
