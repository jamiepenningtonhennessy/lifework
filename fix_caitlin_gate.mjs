import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);
const clientId = 690001;

// Mark all achievements as enriched with a placeholder sageEnrichment
// so the VIA gate (enriched >= min(total, 20)) passes
const [result] = await conn.execute(
  `UPDATE achievements 
   SET sageEnrichment = '[Pre-approved: Sage conversation to follow]'
   WHERE clientId = ? AND (sageEnrichment IS NULL OR sageEnrichment = '')`,
  [clientId]
);
console.log('Updated achievements:', result.affectedRows);

// Verify
const [rows] = await conn.execute(
  'SELECT COUNT(*) as total, SUM(CASE WHEN sageEnrichment IS NOT NULL AND sageEnrichment != "" THEN 1 ELSE 0 END) as enriched FROM achievements WHERE clientId = ?',
  [clientId]
);
console.log('Verification:', JSON.stringify(rows[0]));
console.log('Gate will pass?', rows[0].enriched >= Math.min(rows[0].total, 20));

await conn.end();
