/**
 * testLawFirmScrape.mjs
 * Quick smoke-test: fetch listings from a sample of newly-fixed law firms.
 * Run: node server/scripts/testLawFirmScrape.mjs
 */

// ── Workday fetcher (mirrors jobsPipeline.ts logic) ─────────────────────────
async function fetchWorkday(slug) {
  const [tenant, jobType] = slug.split('|');
  const url = `https://${tenant}.wd3.myworkdayjobs.com/wday/cxs/${tenant}/${jobType}/jobs`;
  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ limit: 5, offset: 0, searchText: '' }),
      signal: AbortSignal.timeout(15000),
    });
    if (!resp.ok) {
      // Try wd1 subdomain
      const url2 = `https://${tenant}.wd1.myworkdayjobs.com/wday/cxs/${tenant}/${jobType}/jobs`;
      const resp2 = await fetch(url2, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limit: 5, offset: 0, searchText: '' }),
        signal: AbortSignal.timeout(15000),
      });
      if (!resp2.ok) return { ok: false, status: resp2.status };
      const data = await resp2.json();
      return { ok: true, count: data.total ?? data.jobPostings?.length ?? 0 };
    }
    const data = await resp.json();
    return { ok: true, count: data.total ?? data.jobPostings?.length ?? 0 };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

// ── SmartRecruiters fetcher ──────────────────────────────────────────────────
async function fetchSmartRecruiters(slug) {
  const url = `https://api.smartrecruiters.com/v1/companies/${slug}/postings?limit=5`;
  try {
    const resp = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!resp.ok) return { ok: false, status: resp.status };
    const data = await resp.json();
    return { ok: true, count: data.totalFound ?? data.content?.length ?? 0 };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

const tests = [
  { name: 'Linklaters',              provider: 'workday',         slug: 'linklaters|Linklaters' },
  { name: 'Freshfields',             provider: 'workday',         slug: 'freshfields|FBD_101' },
  { name: 'Herbert Smith Freehills', provider: 'workday',         slug: 'herbertsmithfreehills|External' },
  { name: 'Hogan Lovells',           provider: 'workday',         slug: 'hoganlovells|Hogan_Lovells_External' },
  { name: 'CMS',                     provider: 'workday',         slug: 'cmno|CMS_Career_Site' },
  { name: 'White & Case',            provider: 'workday',         slug: 'whitecase|WhiteCase' },
  { name: 'Weil Gotshal',            provider: 'workday',         slug: 'weil|work_at_weil' },
  { name: 'Clyde & Co',              provider: 'workday',         slug: 'clydeco|clydecocareers' },
  { name: 'Sullivan & Worcester',    provider: 'smartrecruiters', slug: 'SullivanWorcesterLLP' },
  // Already working
  { name: 'Norton Rose Fulbright',   provider: 'workday',         slug: 'nrf|External' },
  { name: 'Morgan Lewis',            provider: 'workday',         slug: 'morganlewis|morganlewis' },
];

console.log('Testing law firm ATS endpoints...\n');
for (const t of tests) {
  let result;
  if (t.provider === 'workday') result = await fetchWorkday(t.slug);
  else if (t.provider === 'smartrecruiters') result = await fetchSmartRecruiters(t.slug);
  else result = { ok: false, error: 'unknown provider' };

  const icon = result.ok ? '✓' : '✗';
  const detail = result.ok ? `${result.count} listings` : (result.error || `HTTP ${result.status}`);
  console.log(`${icon} ${t.name.padEnd(30)} ${detail}`);
}
