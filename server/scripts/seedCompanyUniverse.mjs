/**
 * Seed script: loads company_universe from the three CSVs supplied by Maz.
 *
 * Run from project root:
 *   node server/scripts/seedCompanyUniverse.mjs
 *
 * Sources (in /home/ubuntu/upload/):
 *   company_universe.csv  — 510 rows: name, domain, tier, sector
 *   ats_map.csv           — 367 rows: name, domain, ats, ats_slug
 *   watchlist_extra.csv   —  42 rows: name, ats, ats_slug (no domain — these are extras)
 */

import fs from "fs";
import path from "path";
import { createConnection } from "mysql2/promise";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_DIR = "/home/ubuntu/upload";

// ─── CSV parser ──────────────────────────────────────────────────────────────

function parseCsv(filePath) {
  const text = fs.readFileSync(filePath, "utf8");
  const lines = text.trim().split("\n");
  const headers = lines[0].split(",").map((h) => h.trim());
  return lines.slice(1).map((line) => {
    // Handle quoted fields with commas inside
    const values = [];
    let current = "";
    let inQuotes = false;
    for (const ch of line) {
      if (ch === '"') { inQuotes = !inQuotes; }
      else if (ch === "," && !inQuotes) { values.push(current.trim()); current = ""; }
      else { current += ch; }
    }
    values.push(current.trim());
    const row = {};
    headers.forEach((h, i) => { row[h] = values[i] ?? ""; });
    return row;
  });
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const db = await createConnection(process.env.DATABASE_URL);

  // 1. Parse CSVs
  const universe = parseCsv(path.join(UPLOAD_DIR, "company_universe.csv"));
  const atsMap = parseCsv(path.join(UPLOAD_DIR, "ats_map.csv"));
  const extras = parseCsv(path.join(UPLOAD_DIR, "watchlist_extra.csv"));

  console.log(`Universe: ${universe.length} rows`);
  console.log(`ATS map:  ${atsMap.length} rows`);
  console.log(`Extras:   ${extras.length} rows`);

  // 2. Build ATS lookup by domain (primary) and name (fallback)
  const atsByDomain = new Map();
  const atsByName = new Map();
  for (const row of atsMap) {
    if (row.domain) atsByDomain.set(row.domain.toLowerCase(), row);
    if (row.name) atsByName.set(row.name.toLowerCase(), row);
  }

  // 3. Clear existing universe (safe on first run; idempotent)
  await db.execute("DELETE FROM company_universe");
  console.log("Cleared existing company_universe rows");

  // 4. Insert universe rows, enriched with ATS data
  let inserted = 0;
  for (const row of universe) {
    const ats = atsByDomain.get(row.domain?.toLowerCase()) || atsByName.get(row.name?.toLowerCase());
    const atsProvider = ats ? ats.ats : null;
    // For generic ATS the slug is the careers URL; store in both ats_slug and careers_url
    const atsSlug = ats ? ats.ats_slug : null;
    const careersUrl = atsProvider === "generic" ? atsSlug : null;

    await db.execute(
      `INSERT INTO company_universe (name, domain, tier, sector, ats_provider, ats_slug, careers_url, active)
       VALUES (?, ?, ?, ?, ?, ?, ?, true)`,
      [row.name, row.domain || null, row.tier || null, row.sector || null, atsProvider, atsSlug, careersUrl]
    );
    inserted++;
  }
  console.log(`Inserted ${inserted} universe rows`);

  // 5. Insert watchlist extras (no domain; only name + ATS)
  let extrasInserted = 0;
  for (const row of extras) {
    // Skip if already in universe by name
    const [existing] = await db.execute(
      "SELECT id FROM company_universe WHERE LOWER(name) = LOWER(?) LIMIT 1",
      [row.name]
    );
    if (existing.length > 0) {
      // Update ATS fields on existing row
      await db.execute(
        "UPDATE company_universe SET ats_provider = ?, ats_slug = ? WHERE LOWER(name) = LOWER(?)",
        [row.ats || null, row.ats_slug || null, row.name]
      );
      continue;
    }
    await db.execute(
      `INSERT INTO company_universe (name, domain, tier, sector, ats_provider, ats_slug, careers_url, active)
       VALUES (?, NULL, NULL, NULL, ?, ?, NULL, true)`,
      [row.name, row.ats || null, row.ats_slug || null]
    );
    extrasInserted++;
  }
  console.log(`Inserted ${extrasInserted} extra rows (${extras.length - extrasInserted} merged into existing)`);

  // 6. Summary
  const [countResult] = await db.execute("SELECT COUNT(*) as cnt FROM company_universe");
  console.log(`Total company_universe rows: ${countResult[0].cnt}`);

  const [atsCount] = await db.execute(
    "SELECT ats_provider, COUNT(*) as cnt FROM company_universe WHERE ats_provider IS NOT NULL GROUP BY ats_provider ORDER BY cnt DESC"
  );
  console.log("ATS breakdown:");
  for (const r of atsCount) console.log(`  ${r.ats_provider}: ${r.cnt}`);

  await db.end();
  console.log("Done.");
}

main().catch((err) => { console.error(err); process.exit(1); });
