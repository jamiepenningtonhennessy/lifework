import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);
const clientId = 690001;

const [achievements] = await conn.execute(
  'SELECT id, title, sageEnrichment, esf FROM achievements WHERE clientId = ?',
  [clientId]
);
console.log('Total achievements:', achievements.length);
const enriched = achievements.filter(a => a.sageEnrichment && a.sageEnrichment.trim().length > 0).length;
console.log('Enriched (sageEnrichment set):', enriched);
const required = Math.min(achievements.length, 20);
console.log('Required for VIA gate:', required);
console.log('Gate passes?', enriched >= required);

const [profiles] = await conn.execute(
  'SELECT viaStatus, ipipStatus FROM client_profiles WHERE id = ?',
  [clientId]
);
console.log('Profile status:', JSON.stringify(profiles[0]));

achievements.forEach(a => console.log(' -', a.title, '| enriched:', !!(a.sageEnrichment && a.sageEnrichment.trim())));

await conn.end();
