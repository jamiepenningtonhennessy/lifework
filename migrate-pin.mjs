import mysql from "mysql2/promise";

const url = process.env.DATABASE_URL;
const conn = await mysql.createConnection(url);

await conn.execute(`
  CREATE TABLE IF NOT EXISTS \`counsellor_pin\` (
    \`id\` int AUTO_INCREMENT NOT NULL,
    \`pinHash\` varchar(256) NOT NULL,
    \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT \`counsellor_pin_id\` PRIMARY KEY(\`id\`)
  )
`);

console.log("✓ counsellor_pin table created");
await conn.end();
