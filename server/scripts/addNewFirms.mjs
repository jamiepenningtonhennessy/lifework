/**
 * addNewFirms.mjs
 * - Updates DLA Piper, Clifford Chance, Simmons & Simmons with correct ATS configs
 * - Inserts Foot Anstey as a new company
 */
import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// Update DLA Piper → Workday dlapiper|dlapiper (wd1, 171 listings verified)
await conn.execute(`UPDATE company_universe SET 
  ats_provider = 'workday',
  ats_slug = 'dlapiper|dlapiper',
  careers_url = 'https://dlapiper.wd1.myworkdayjobs.com/dlapiper'
  WHERE name = 'DLA Piper'`);
console.log('✓ DLA Piper → Workday dlapiper|dlapiper (171 listings)');

// Update Clifford Chance → SmartRecruiters cliffordchance (153 listings verified)
await conn.execute(`UPDATE company_universe SET 
  ats_provider = 'smartrecruiters',
  ats_slug = 'cliffordchance',
  careers_url = 'https://careers.smartrecruiters.com/CliffordChance'
  WHERE name = 'Clifford Chance'`);
console.log('✓ Clifford Chance → SmartRecruiters cliffordchance (153 listings)');

// Update Simmons & Simmons → Workday simmonssimmons|SimmonsSimmonsExternal (83 listings verified)
await conn.execute(`UPDATE company_universe SET 
  ats_provider = 'workday',
  ats_slug = 'simmonssimmons|SimmonsSimmonsExternal',
  careers_url = 'https://simmonssimmons.wd3.myworkdayjobs.com/SimmonsSimmonsExternal'
  WHERE name = 'Simmons & Simmons'`);
console.log('✓ Simmons & Simmons → Workday simmonssimmons|SimmonsSimmonsExternal (83 listings)');

// Insert Foot Anstey → Greenhouse footanstey (24 listings verified)
// Quality tags: structured_learning, collaboration, scale_and_stability (regional full-service firm)
await conn.execute(`INSERT INTO company_universe 
  (name, domain, tier, sector, ats_provider, ats_slug, careers_url, active, qualities)
  VALUES (
    'Foot Anstey',
    'footanstey.com',
    'law_firm',
    'uk_regional',
    'greenhouse',
    'footanstey',
    'https://boards.greenhouse.io/footanstey',
    1,
    '["structured_learning","collaboration","scale_and_stability"]'
  )`);
console.log('✓ Foot Anstey → inserted (Greenhouse footanstey, 24 listings)');

// Verify
const [rows] = await conn.execute(`SELECT id, name, ats_provider, ats_slug FROM company_universe WHERE name IN ('DLA Piper','Clifford Chance','Simmons & Simmons','Foot Anstey')`);
console.log('\nVerification:');
rows.forEach(r => console.log(' ', r.id, r.name, '→', r.ats_provider, r.ats_slug));

await conn.end();
