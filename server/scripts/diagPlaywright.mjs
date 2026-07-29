/**
 * diagPlaywright.mjs — inspect what's actually on these careers pages
 */
import { chromium } from 'playwright-core';

const EXECUTABLE = '/usr/bin/chromium';

async function inspect(url, firmName) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`INSPECTING: ${firmName}`);
  console.log(`URL: ${url}`);
  const browser = await chromium.launch({
    executablePath: EXECUTABLE,
    args: ['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage','--disable-gpu','--single-process','--no-zygote'],
    headless: true,
  });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 800 },
  });
  const page = await context.newPage();
  await page.route('**/*', route => {
    const t = route.request().resourceType();
    if (['image','media','font'].includes(t)) route.abort();
    else route.continue();
  });
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await Promise.race([
      page.waitForLoadState('networkidle', { timeout: 8000 }),
      new Promise(r => setTimeout(r, 8000)),
    ]);
    await page.waitForTimeout(2000);

    const info = await page.evaluate(() => {
      // Count all links
      const allLinks = Array.from(document.querySelectorAll('a[href]'));
      const linkSample = allLinks.slice(0, 20).map(a => ({ text: a.textContent?.trim()?.substring(0,50), href: a.href?.substring(0,80) }));
      
      // Count elements with job-related classes
      const jobEls = document.querySelectorAll('[class*="job"],[class*="vacancy"],[class*="role"],[class*="position"],[class*="listing"],[class*="opportunity"]');
      
      // Get page title
      const title = document.title;
      
      // Get all unique href patterns
      const hrefPatterns = [...new Set(allLinks.map(a => {
        try { return new URL(a.href).pathname.split('/').slice(0,3).join('/'); } catch { return ''; }
      }).filter(Boolean))].slice(0, 20);
      
      return { title, totalLinks: allLinks.length, linkSample, jobElCount: jobEls.length, hrefPatterns };
    });
    
    console.log(`Title: ${info.title}`);
    console.log(`Total links: ${info.totalLinks}`);
    console.log(`Job-class elements: ${info.jobElCount}`);
    console.log(`Href patterns (first 20): ${info.hrefPatterns.join(', ')}`);
    console.log(`Link sample:`);
    info.linkSample.forEach(l => console.log(`  "${l.text}" → ${l.href}`));
  } catch(e) {
    console.log(`ERROR: ${e.message}`);
  }
  await browser.close();
}

await inspect('https://joinus.slaughterandmay.com/', 'Slaughter and May');
await inspect('https://www.ashurst.com/en/careers/', 'Ashurst (main site)');
