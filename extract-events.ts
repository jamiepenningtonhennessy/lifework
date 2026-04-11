import { createConnection } from "mysql2/promise";
import * as fs from "fs";

const DB = process.env.DATABASE_URL!;
const conn = await createConnection(DB);

// Get Jamie's clientId
const [clients] = await conn.execute(
  "SELECT id, firstName, lastName FROM client_profiles WHERE firstName LIKE '%Jamie%' OR lastName LIKE '%Pennington%' LIMIT 5"
) as any;
console.log("Clients:", JSON.stringify(clients));

const clientId = clients[0]?.id;
if (!clientId) { console.log("No client found"); process.exit(1); }

// Get all achievements
const [rows] = await conn.execute(
  `SELECT decade, age, title, description, esf, sageEnrichment, counsellorNotes, skills, othersObservations, sortOrder
   FROM achievements WHERE clientId = ? ORDER BY sortOrder, age, id`,
  [clientId]
) as any;

fs.writeFileSync("/tmp/jamie-events.json", JSON.stringify(rows, null, 2));
console.log(`Events: ${rows.length}`);
console.log("First:", JSON.stringify(rows[0], null, 2));

await conn.end();
