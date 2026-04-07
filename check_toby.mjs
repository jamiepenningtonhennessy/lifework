import { createConnection } from "./node_modules/mysql2/promise.js";
import { readFileSync } from "fs";

// Load env
try {
  const envContent = readFileSync(".env", "utf8");
  envContent.split("\n").forEach(line => {
    const [key, ...rest] = line.split("=");
    if (key && rest.length) process.env[key.trim()] = rest.join("=").trim().replace(/^["']|["']$/g, "");
  });
} catch {}

const url = process.env.DATABASE_URL;
if (!url) { console.error("No DATABASE_URL"); process.exit(1); }

const conn = await createConnection(url);

// Find users with "toby" in name or email
const [users] = await conn.execute(
  "SELECT id, name, email FROM users WHERE LOWER(name) LIKE ? OR LOWER(email) LIKE ? LIMIT 10",
  ["%toby%", "%toby%"]
);
console.log("Users matching 'toby':", JSON.stringify(users, null, 2));

for (const user of users) {
  const [profiles] = await conn.execute(
    "SELECT id, interview_status, via_status, ipip_status FROM client_profiles WHERE user_id = ?",
    [user.id]
  );
  if (!profiles.length) { console.log(`No profile for ${user.name}`); continue; }
  const p = profiles[0];
  console.log(`\nProfile for ${user.name} (profile_id=${p.id}):`, JSON.stringify(p, null, 2));

  const [sessions] = await conn.execute(
    `SELECT id, section, is_complete, 
     CASE WHEN summary IS NOT NULL AND summary != '' THEN 'YES' ELSE 'NO' END as has_summary,
     LENGTH(messages) as msg_bytes,
     created_at
     FROM chat_sessions WHERE client_id = ? ORDER BY created_at DESC`,
    [p.id]
  );
  console.log(`Chat sessions:`, JSON.stringify(sessions, null, 2));
}

await conn.end();
