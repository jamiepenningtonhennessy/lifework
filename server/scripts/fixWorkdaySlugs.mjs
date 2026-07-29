/**
 * fixWorkdaySlugs.mjs
 * Tries multiple Workday subdomain/jobType combinations for firms that returned 404/422.
 */

async function tryWorkday(tenant, jobType, subdomain = 'wd3') {
  const url = `https://${tenant}.${subdomain}.myworkdayjobs.com/wday/cxs/${tenant}/${jobType}/jobs`;
  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ limit: 3, offset: 0, searchText: '' }),
      signal: AbortSignal.timeout(10000),
    });
    if (resp.ok) {
      const data = await resp.json();
      const count = data.total ?? data.jobPostings?.length ?? '?';
      return { ok: true, count, url };
    }
    return { ok: false, status: resp.status };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

// Hogan Lovells — try different jobType values
console.log('\n--- Hogan Lovells ---');
for (const jt of ['Hogan_Lovells_External', 'HoganLovells', 'External', 'hoganlovells', 'Search', 'Careers']) {
  const r = await tryWorkday('hoganlovells', jt);
  console.log(`  ${jt}: ${r.ok ? `✓ ${r.count} listings` : `✗ ${r.status || r.error}`}`);
  if (r.ok) break;
}

// White & Case — try different tenant/jobType
console.log('\n--- White & Case ---');
for (const [t, jt, sd] of [
  ['whitecase', 'WhiteCase', 'wd3'],
  ['whitecase', 'External', 'wd3'],
  ['whitecase', 'whitecase', 'wd3'],
  ['whitecase', 'Careers', 'wd3'],
  ['whitecase', 'WhiteCase', 'wd1'],
  ['whitecase', 'External', 'wd1'],
]) {
  const r = await tryWorkday(t, jt, sd);
  console.log(`  ${t}|${jt} (${sd}): ${r.ok ? `✓ ${r.count} listings` : `✗ ${r.status || r.error}`}`);
  if (r.ok) break;
}

// Clyde & Co — try different subdomain
console.log('\n--- Clyde & Co ---');
for (const [t, jt, sd] of [
  ['clydeco', 'clydecocareers', 'wd103'],
  ['clydeco', 'clydecocareers', 'wd3'],
  ['clydeco', 'External', 'wd3'],
  ['clydeco', 'ClydeCo', 'wd3'],
  ['clydeco', 'Careers', 'wd3'],
]) {
  const r = await tryWorkday(t, jt, sd);
  console.log(`  ${t}|${jt} (${sd}): ${r.ok ? `✓ ${r.count} listings` : `✗ ${r.status || r.error}`}`);
  if (r.ok) break;
}

// Morgan Lewis
console.log('\n--- Morgan Lewis ---');
for (const [t, jt, sd] of [
  ['morganlewis', 'morganlewis', 'wd3'],
  ['morganlewis', 'External', 'wd3'],
  ['morganlewis', 'MorganLewis', 'wd3'],
  ['morganlewis', 'Careers', 'wd3'],
  ['morganlewis', 'morganlewis', 'wd1'],
]) {
  const r = await tryWorkday(t, jt, sd);
  console.log(`  ${t}|${jt} (${sd}): ${r.ok ? `✓ ${r.count} listings` : `✗ ${r.status || r.error}`}`);
  if (r.ok) break;
}
