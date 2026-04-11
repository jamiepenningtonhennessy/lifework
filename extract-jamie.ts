import { createConnection } from 'mysql2/promise';
import { writeFileSync } from 'fs';

const conn = await createConnection(process.env.DATABASE_URL as string);

// Get Jamie's wowReportJson (client id 1)
const [rows] = await conn.query(
  "SELECT clientId, wowReportJson FROM analysis_reports WHERE clientId = 1"
) as any;

if (!rows.length || !rows[0].wowReportJson) {
  console.log("No WOW report found for Jamie (id=1)");
  await conn.end();
  process.exit(1);
}

const json = JSON.parse(rows[0].wowReportJson);
console.log("Keys in wowReportJson:", Object.keys(json).join(', '));

// Save the full JSON for inspection
writeFileSync('/tmp/jamie-wow.json', JSON.stringify(json, null, 2));
console.log("Saved to /tmp/jamie-wow.json");

// Also get IPIP results for OCEAN sub-scales
const [ipip] = await conn.query(
  "SELECT * FROM ipip_results WHERE clientId = 1 LIMIT 1"
) as any;
if (ipip.length > 0) {
  writeFileSync('/tmp/jamie-ipip.json', JSON.stringify(ipip[0], null, 2));
  console.log("IPIP keys:", Object.keys(ipip[0]).join(', '));
}

// Also get VIA results
const [via] = await conn.query(
  "SELECT * FROM via_results WHERE clientId = 1 LIMIT 1"
) as any;
if (via.length > 0) {
  writeFileSync('/tmp/jamie-via.json', JSON.stringify(via[0], null, 2));
  console.log("VIA keys:", Object.keys(via[0]).join(', '));
}

await conn.end();
