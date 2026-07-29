/**
 * fixFailingAts.mjs - test and fix the 9 failing ATS endpoints
 */

async function t(label, url, method = 'GET', body = null) {
  try {
    const opts = { signal: AbortSignal.timeout(8000), headers: { 'Content-Type': 'application/json' } };
    if (method === 'POST') { opts.method = 'POST'; opts.body = JSON.stringify(body || {}); }
    const r = await fetch(url, opts);
    const text = await r.text().catch(() => '');
    const snippet = text.substring(0, 80).replace(/\n/g, ' ');
    console.log(`${label}: ${r.status} ${r.ok ? 'OK' : 'FAIL'} | ${snippet}`);
    return { ok: r.ok, status: r.status, text };
  } catch (e) {
    console.log(`${label}: ERR ${e.message.substring(0, 60)}`);
    return { ok: false };
  }
}

console.log('=== Ashurst / Perkins Coie (Workday) ===');
await t('perkinscoie wd3', 'https://perkinscoie.wd3.myworkdayjobs.com/wday/cxs/perkinscoie/perkinscoieexternal/jobs', 'POST');
await t('perkinscoie wd1', 'https://perkinscoie.wd1.myworkdayjobs.com/wday/cxs/perkinscoie/perkinscoieexternal/jobs', 'POST');
await t('ashurstperkinscoie wd3', 'https://ashurstperkinscoie.wd3.myworkdayjobs.com/wday/cxs/ashurstperkinscoie/External/jobs', 'POST');

console.log('\n=== Addleshaw Goddard (iCIMS) ===');
await t('AG careers subdomain', 'https://careers.addleshawgoddard.com/jobs/search?ss=1&searchCategory=0&in_iframe=1&output=json');
await t('AG icims subdomain', 'https://addleshawgoddard.icims.com/jobs/search?ss=1&searchCategory=0&in_iframe=1&output=json');
await t('AG careers-AG', 'https://careers-addleshawgoddard.icims.com/jobs/search?ss=1&searchCategory=0&in_iframe=1&output=json');

console.log('\n=== Willkie Farr (iCIMS) ===');
await t('jobs-willkie', 'https://jobs-willkie.icims.com/jobs/search?ss=1&searchCategory=0&in_iframe=1&output=json');
await t('careers-willkie', 'https://careers-willkie.icims.com/jobs/search?ss=1&searchCategory=0&in_iframe=1&output=json');
await t('willkie icims', 'https://willkie.icims.com/jobs/search?ss=1&searchCategory=0&in_iframe=1&output=json');

console.log('\n=== Fried Frank (Greenhouse) ===');
await t('friedfrank', 'https://boards-api.greenhouse.io/v1/boards/friedfrank/jobs');
await t('friedfrankharrisshriver', 'https://boards-api.greenhouse.io/v1/boards/friedfrankharrisshriver/jobs');
await t('friedfrankhsj', 'https://boards-api.greenhouse.io/v1/boards/friedfrankhsj/jobs');

console.log('\n=== DAC Beachcroft (Pinpoint) ===');
await t('dacbeachcroft.pinpointhq', 'https://dacbeachcroft.pinpointhq.com/api/v1/jobs');
await t('apply.dacbeachcroft', 'https://apply.dacbeachcroft.com/api/v1/jobs');

console.log('\n=== Trowers & Hamlins (Pinpoint) ===');
await t('trowers.pinpointhq', 'https://trowers.pinpointhq.com/api/v1/jobs');
await t('trowers-hamlins.pinpointhq', 'https://trowers-hamlins.pinpointhq.com/api/v1/jobs');

console.log('\n=== Fieldfisher (current-vacancies) ===');
await t('fieldfisher CV api', 'https://fieldfisher.current-vacancies.com/api/jobs');
await t('fieldfisher CV v2', 'https://fieldfisher.current-vacancies.com/api/v2/jobs');
await t('fieldfisher CV list', 'https://fieldfisher.current-vacancies.com/vacancies');

console.log('\n=== Macfarlanes (current-vacancies) ===');
await t('macfarlanes CV api', 'https://macfarlanes.current-vacancies.com/api/jobs');
await t('macfarlanes CV v2', 'https://macfarlanes.current-vacancies.com/api/v2/jobs');

console.log('\n=== Slaughter and May (engage|ats) ===');
await t('S&M GET', 'https://joinus.slaughterandmay.com/V2/Vacancy/GetVacancies');
await t('S&M POST empty', 'https://joinus.slaughterandmay.com/V2/Vacancy/GetVacancies', 'POST', {});
await t('S&M POST paged', 'https://joinus.slaughterandmay.com/V2/Vacancy/GetVacancies', 'POST', { pageNumber: 1, pageSize: 10 });
await t('S&M POST search', 'https://joinus.slaughterandmay.com/V2/Vacancy/Search', 'POST', {});
await t('S&M GET list', 'https://joinus.slaughterandmay.com/V2/Vacancy/List');

console.log('\nDone.');
