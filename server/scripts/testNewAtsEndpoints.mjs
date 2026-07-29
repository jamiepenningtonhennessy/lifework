/**
 * testNewAtsEndpoints.mjs
 * Tests all newly discovered ATS API endpoints live
 */

async function testWorkday(slug) {
  const [company, jobSite] = slug.split('|');
  // Try wd3, wd1, wd5 subdomains
  for (const sub of ['wd3','wd1','wd5','wd103']) {
    try {
      const url = `https://${company}.${sub}.myworkdayjobs.com/wday/cxs/${company}/${jobSite}/jobs`;
      const r = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limit: 5, offset: 0 }),
        signal: AbortSignal.timeout(8000),
      });
      if (r.ok) {
        const data = await r.json();
        const count = data.total || data.jobPostings?.length || 0;
        return { ok: true, count, url };
      }
    } catch {}
  }
  return { ok: false };
}

async function testIcims(slug) {
  const url = `https://careers-${slug}.icims.com/jobs/search?ss=1&searchCategory=0&in_iframe=1&output=json`;
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (r.ok) {
      const text = await r.text();
      const count = (text.match(/"id":/g) || []).length;
      return { ok: true, count, url };
    }
  } catch {}
  // Try alternate pattern
  try {
    const url2 = `https://${slug}.icims.com/jobs/search?ss=1&searchCategory=0&in_iframe=1&output=json`;
    const r2 = await fetch(url2, { signal: AbortSignal.timeout(8000) });
    if (r2.ok) {
      const text = await r2.text();
      const count = (text.match(/"id":/g) || []).length;
      return { ok: true, count, url: url2 };
    }
  } catch {}
  return { ok: false };
}

async function testGreenhouse(slug) {
  const url = `https://boards-api.greenhouse.io/v1/boards/${slug}/jobs`;
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (r.ok) {
      const data = await r.json();
      return { ok: true, count: data.jobs?.length || 0, url };
    }
  } catch {}
  return { ok: false };
}

async function testPinpoint(slug) {
  const url = `https://${slug}.pinpointhq.com/api/v1/jobs`;
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (r.ok) {
      const data = await r.json();
      return { ok: true, count: data.data?.length || 0, url };
    }
  } catch {}
  return { ok: false };
}

async function testCurrentVacancies(slug) {
  const url = `https://${slug}.current-vacancies.com/api/jobs`;
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (r.ok) {
      const data = await r.json();
      return { ok: true, count: Array.isArray(data) ? data.length : (data.jobs?.length || 0), url };
    }
  } catch {}
  return { ok: false };
}

async function testEngageAts(firm, postUrl) {
  try {
    const r = await fetch(postUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ pageNumber: 1, pageSize: 10 }),
      signal: AbortSignal.timeout(8000),
    });
    if (r.ok) {
      const data = await r.json();
      return { ok: true, count: data.totalCount || data.vacancies?.length || 0, url: postUrl };
    }
  } catch {}
  return { ok: false };
}

const tests = [
  // Workday
  { firm: 'Ashurst', type: 'workday', slug: 'perkinscoie|perkinscoieexternal' },
  { firm: 'Cooley', type: 'workday', slug: 'cooley|Cooley_US_LLP' },
  { firm: 'Morgan Lewis', type: 'workday', slug: 'morganlewis|morganlewis' },
  { firm: 'Simpson Thacher', type: 'workday', slug: 'stblaw|careers' },
  { firm: 'Skadden', type: 'workday', slug: 'skadden|Skadden_Careers' },
  // iCIMS
  { firm: 'Addleshaw Goddard', type: 'icims', slug: 'addleshawgoddard' },
  { firm: 'Cravath', type: 'icims', slug: 'cravath' },
  { firm: 'Latham & Watkins', type: 'icims', slug: 'lw' },
  { firm: 'Mayer Brown', type: 'icims', slug: 'globalcareers-mayerbrown' },
  { firm: 'Morrison Foerster', type: 'icims', slug: 'mofo' },
  { firm: 'Orrick', type: 'icims', slug: 'orrick' },
  { firm: 'Penningtons Manches', type: 'icims', slug: 'penningtonslaw' },
  { firm: 'Ropes & Gray', type: 'icims', slug: 'ropesgray' },
  { firm: 'Sidley Austin', type: 'icims', slug: 'sidley' },
  { firm: 'Stephenson Harwood', type: 'icims', slug: 'stephenson-careers-shlegal' },
  { firm: 'Willkie Farr', type: 'icims', slug: 'willkie' },
  // Greenhouse
  { firm: 'Fried Frank', type: 'greenhouse', slug: 'friedfrank' },
  // Pinpoint
  { firm: 'DAC Beachcroft', type: 'pinpoint', slug: 'apply.dacbeachcroft.com' },
  { firm: 'Trowers & Hamlins', type: 'pinpoint', slug: 'trowers' },
  // current-vacancies
  { firm: 'Fieldfisher', type: 'current_vacancies', slug: 'fieldfisher' },
  { firm: 'Macfarlanes', type: 'current_vacancies', slug: 'macfarlanes' },
  // engage_ats
  { firm: 'Slaughter and May', type: 'engage_ats', slug: 'https://joinus.slaughterandmay.com/V2/Vacancy/GetVacancies' },
];

console.log('Testing ATS endpoints...\n');
const results = [];

for (const t of tests) {
  let result;
  if (t.type === 'workday') result = await testWorkday(t.slug);
  else if (t.type === 'icims') result = await testIcims(t.slug);
  else if (t.type === 'greenhouse') result = await testGreenhouse(t.slug);
  else if (t.type === 'pinpoint') result = await testPinpoint(t.slug);
  else if (t.type === 'current_vacancies') result = await testCurrentVacancies(t.slug);
  else if (t.type === 'engage_ats') result = await testEngageAts(t.firm, t.slug);
  else result = { ok: false };

  const status = result.ok ? `✓ ${result.count} listings` : '✗ failed';
  console.log(`${t.firm.padEnd(30)} [${t.type.padEnd(18)}] ${status}${result.url ? ' → ' + result.url.substring(0,70) : ''}`);
  results.push({ ...t, ...result });
}

const working = results.filter(r => r.ok);
console.log(`\n${working.length}/${results.length} endpoints working`);
