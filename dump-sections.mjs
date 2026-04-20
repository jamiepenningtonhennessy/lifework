import { createConnection } from "mysql2/promise";
import { config } from "dotenv";
config();
const dbUrl = process.env.DATABASE_URL;

const conn = await createConnection(dbUrl);
const [rows] = await conn.execute(
  "SELECT wowReportJson FROM analysis_reports WHERE wowReportStatus = 'done' ORDER BY id DESC LIMIT 1"
);
if (!rows[0]) { console.log("no rows"); process.exit(1); }
const j = JSON.parse(rows[0].wowReportJson);

console.log("=== developmentEdge (first 800 chars) ===");
console.log((j.developmentEdge || "").slice(0, 800));
console.log("\n=== careerDirections (first 800 chars) ===");
console.log((j.careerDirections || "").slice(0, 800));
console.log("\n=== viaSection key findings (first 400 chars) ===");
console.log((j.viaSection || "").slice(0, 400));
console.log("\n=== lifeHistoryPattern keyfind (first 400 chars) ===");
console.log((j.lifeHistoryPattern || "").slice(0, 400));

await conn.end();
