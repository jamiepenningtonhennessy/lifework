import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// Find Caitlin by name
const [users] = await conn.execute(
  "SELECT id, name, openId, email FROM users WHERE name LIKE '%Caitlin%' OR name LIKE '%caitlin%' OR name LIKE '%Shubat%' OR name LIKE '%shubat%' LIMIT 5"
);
console.log('Users found:', JSON.stringify(users, null, 2));

if (users.length > 0) {
  for (const user of users) {
    const [profiles] = await conn.execute(
      'SELECT id, viaStatus, ipipStatus, analysisStatus FROM client_profiles WHERE userId = ?',
      [user.id]
    );
    console.log(`\nClient profiles for ${user.name} (userId=${user.id}):`, JSON.stringify(profiles, null, 2));
  }
}

await conn.end();
