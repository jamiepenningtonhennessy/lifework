/**
 * updateAllAtsConfigs.mjs
 * Updates all law firms with confirmed ATS configurations from the research.
 * 
 * Confirmed working:
 * - Workday: Cooley, Morgan Lewis, Simpson Thacher, Skadden
 * - iCIMS: Cravath, Latham & Watkins, Mayer Brown, Morrison Foerster, Orrick,
 *          Penningtons Manches Cooper, Ropes & Gray, Sidley Austin, Stephenson Harwood,
 *          Willkie Farr (jobs-willkie slug)
 * - Greenhouse: Fried Frank (needs slug verification — mark as greenhouse, try friedfrank)
 * 
 * Also adds new firms not yet in the universe:
 * - Cooley, Morgan Lewis, Simpson Thacher, Skadden, Cravath
 */

import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// ─── Update existing firms with correct ATS configs ────────────────────────

const updates = [
  // iCIMS firms (already in DB as generic)
  { name: 'Latham & Watkins', ats_provider: 'icims', ats_slug: 'lw', careers_url: 'https://careers-lw.icims.com/' },
  { name: 'Mayer Brown', ats_provider: 'icims', ats_slug: 'globalcareers-mayerbrown', careers_url: 'https://globalcareers-mayerbrown.icims.com/' },
  { name: 'Morrison Foerster', ats_provider: 'icims', ats_slug: 'mofo', careers_url: 'https://careers-mofo.icims.com/' },
  { name: 'Orrick', ats_provider: 'icims', ats_slug: 'orrick', careers_url: 'https://careers-orrick.icims.com/' },
  { name: 'Penningtons Manches Cooper', ats_provider: 'icims', ats_slug: 'penningtonslaw', careers_url: 'https://careers-penningtonslaw.icims.com/' },
  { name: 'Ropes & Gray', ats_provider: 'icims', ats_slug: 'ropesgray', careers_url: 'https://careers-ropesgray.icims.com/' },
  { name: 'Sidley Austin', ats_provider: 'icims', ats_slug: 'sidley', careers_url: 'https://careers-sidley.icims.com/' },
  { name: 'Stephenson Harwood', ats_provider: 'icims', ats_slug: 'stephenson-careers-shlegal', careers_url: 'https://stephenson-careers-shlegal.icims.com/' },
  { name: 'Willkie Farr', ats_provider: 'icims', ats_slug: 'jobs-willkie', careers_url: 'https://jobs-willkie.icims.com/' },
  // Greenhouse
  { name: 'Fried Frank', ats_provider: 'greenhouse', ats_slug: 'friedfrank', careers_url: 'https://boards.greenhouse.io/friedfrank' },
];

let updated = 0;
for (const u of updates) {
  const [result] = await conn.execute(
    'UPDATE company_universe SET ats_provider = ?, ats_slug = ?, careers_url = ? WHERE name = ?',
    [u.ats_provider, u.ats_slug, u.careers_url, u.name]
  );
  if (result.affectedRows > 0) {
    console.log(`✓ Updated: ${u.name} → ${u.ats_provider}/${u.ats_slug}`);
    updated++;
  } else {
    console.log(`⚠ Not found: ${u.name}`);
  }
}

// ─── Get next available ID ─────────────────────────────────────────────────

const [[{ maxId }]] = await conn.execute('SELECT MAX(id) as maxId FROM company_universe');
let nextId = (maxId || 600) + 1;

// ─── Insert new firms ──────────────────────────────────────────────────────

const newFirms = [
  {
    name: 'Cooley',
    tier: 'law_firm',
    sector: 'Law Firm',
    country: 'US',
    ats_provider: 'workday',
    ats_slug: 'cooley|Cooley_US_LLP',
    careers_url: 'https://cooley.wd1.myworkdayjobs.com/',
    qualities: JSON.stringify(['prestige', 'commercial_intensity', 'innovation', 'autonomy']),
  },
  {
    name: 'Morgan Lewis',
    tier: 'law_firm',
    sector: 'Law Firm',
    country: 'US',
    ats_provider: 'workday',
    ats_slug: 'morganlewis|morganlewis',
    careers_url: 'https://morganlewis.wd5.myworkdayjobs.com/',
    qualities: JSON.stringify(['prestige', 'commercial_intensity', 'collaboration', 'scale_and_stability']),
  },
  {
    name: 'Simpson Thacher & Bartlett',
    tier: 'law_firm',
    sector: 'Law Firm',
    country: 'US',
    ats_provider: 'workday',
    ats_slug: 'stblaw|careers',
    careers_url: 'https://stblaw.wd1.myworkdayjobs.com/',
    qualities: JSON.stringify(['prestige', 'commercial_intensity', 'autonomy', 'scale_and_stability']),
  },
  {
    name: 'Skadden Arps',
    tier: 'law_firm',
    sector: 'Law Firm',
    country: 'US',
    ats_provider: 'workday',
    ats_slug: 'skadden|Skadden_Careers',
    careers_url: 'https://skadden.wd5.myworkdayjobs.com/',
    qualities: JSON.stringify(['prestige', 'commercial_intensity', 'autonomy', 'innovation']),
  },
  {
    name: 'Cravath Swaine & Moore',
    tier: 'law_firm',
    sector: 'Law Firm',
    country: 'US',
    ats_provider: 'icims',
    ats_slug: 'cravath',
    careers_url: 'https://careers-cravath.icims.com/',
    qualities: JSON.stringify(['prestige', 'commercial_intensity', 'autonomy', 'scale_and_stability']),
  },
];

let inserted = 0;
for (const f of newFirms) {
  // Check if already exists
  const [[existing]] = await conn.execute('SELECT id FROM company_universe WHERE name = ?', [f.name]);
  if (existing) {
    // Update instead
    await conn.execute(
      'UPDATE company_universe SET ats_provider = ?, ats_slug = ?, careers_url = ?, qualities = ? WHERE name = ?',
      [f.ats_provider, f.ats_slug, f.careers_url, f.qualities, f.name]
    );
    console.log(`✓ Updated existing: ${f.name}`);
    updated++;
    continue;
  }
  await conn.execute(
    `INSERT INTO company_universe (id, name, tier, sector, ats_provider, ats_slug, careers_url, qualities, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
    [nextId++, f.name, f.tier, f.sector, f.ats_provider, f.ats_slug, f.careers_url, f.qualities]
  );
  console.log(`✓ Inserted: ${f.name} → ${f.ats_provider}/${f.ats_slug}`);
  inserted++;
}

await conn.end();

console.log(`\nDone: ${updated} updated, ${inserted} inserted`);
