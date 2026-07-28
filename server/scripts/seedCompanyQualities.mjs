/**
 * seedCompanyQualities.mjs
 *
 * Reads /home/ubuntu/company_qualities.json and seeds the qualities column
 * into the company_universe table.
 *
 * Run: node server/scripts/seedCompanyQualities.mjs
 */

import { readFileSync } from "fs";
import mysql from "mysql2/promise";

const data = JSON.parse(readFileSync("/home/ubuntu/company_qualities.json", "utf-8"));

const conn = await mysql.createConnection(process.env.DATABASE_URL);

let updated = 0;
let skipped = 0;

for (const company of data) {
  if (!company.qualities || company.qualities.length === 0) {
    skipped++;
    continue;
  }
  const qualitiesJson = JSON.stringify(company.qualities);
  await conn.execute("UPDATE company_universe SET qualities = ? WHERE id = ?", [
    qualitiesJson,
    company.id,
  ]);
  updated++;
}

await conn.end();

console.log(`Updated ${updated} companies, skipped ${skipped}`);
