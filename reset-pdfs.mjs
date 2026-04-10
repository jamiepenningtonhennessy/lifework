import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const mysql = require('/home/ubuntu/plum-trees/node_modules/mysql2/promise');

const conn = await mysql.createConnection(process.env.DATABASE_URL);
const [result] = await conn.execute(
  'UPDATE analysis_reports SET wowReportPdfUrl = NULL WHERE wowReportPdfUrl IS NOT NULL'
);
console.log(`Cleared ${result.affectedRows} PDF URLs`);
await conn.end();
