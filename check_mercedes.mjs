import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// 1. Find Mercedes by name or access code 660001
const [users] = await conn.execute(
  `SELECT u.id, u.name, u.email, cp.id as profile_id, cp.first_name, cp.last_name, cp.current_role, cp.access_code
   FROM users u 
   LEFT JOIN client_profiles cp ON cp.user_id = u.id 
   WHERE u.name LIKE '%Mercedes%' OR cp.first_name LIKE '%Mercedes%' OR cp.access_code = '660001'
   LIMIT 5`
);
console.log('\n=== User / Profile ===');
console.log(JSON.stringify(users, null, 2));

if (users.length > 0) {
  const profileId = users[0].profile_id;
  
  // 2. Count achievements
  const [achievements] = await conn.execute(
    `SELECT COUNT(*) as count FROM achievements WHERE client_profile_id = ?`, [profileId]
  );
  console.log('\n=== Achievements count ===', achievements[0].count);

  // Show the achievements themselves
  const [achList] = await conn.execute(
    `SELECT decade, age, title, esf, description FROM achievements WHERE client_profile_id = ? ORDER BY age ASC`, [profileId]
  );
  console.log('\n=== Achievements detail ===');
  for (const a of achList) {
    console.log(`  [${a.decade ?? '?'}, age ${a.age ?? '?'}] ${a.title} (${a.esf ?? '?'})`);
    if (a.description) console.log(`    ${a.description.substring(0, 120)}`);
  }
  
  // 3. Check Sage (chat_peter) sessions
  const [sageSessions] = await conn.execute(
    `SELECT id, created_at, updated_at, LENGTH(messages) as messages_length, messages 
     FROM chat_peter_sessions WHERE client_profile_id = ? LIMIT 3`, [profileId]
  );
  console.log('\n=== Sage (chat_peter) sessions ===');
  if (sageSessions.length === 0) {
    console.log('No Sage sessions found');
  } else {
    for (const s of sageSessions) {
      const msgs = JSON.parse(s.messages || '[]');
      console.log(`Session ${s.id}: ${msgs.length} messages, created ${s.created_at}`);
      if (msgs.length > 0) {
        console.log('  First client message:', msgs.find(m => m.role === 'client')?.content?.substring(0, 150));
        console.log('  Last message:', msgs[msgs.length-1]?.content?.substring(0, 150));
      }
    }
  }
  
  // 4. Check Career Explorer (Alistair) sessions
  const [ceSessions] = await conn.execute(
    `SELECT id, created_at, updated_at, preferred_name, LENGTH(messages) as messages_length
     FROM career_explorer_sessions WHERE client_profile_id = ? LIMIT 3`, [profileId]
  );
  console.log('\n=== Career Explorer (Alistair) sessions ===');
  if (ceSessions.length === 0) {
    console.log('No Career Explorer sessions found');
  } else {
    for (const s of ceSessions) {
      const [msgs] = await conn.execute(
        `SELECT messages FROM career_explorer_sessions WHERE id = ?`, [s.id]
      );
      const parsed = JSON.parse(msgs[0]?.messages || '[]');
      console.log(`Session ${s.id}: ${parsed.length} messages, preferred_name: ${s.preferred_name}, created ${s.created_at}`);
    }
  }
  
  // 5. Check WOW report
  const [reports] = await conn.execute(
    `SELECT id, created_at, wow_report_pdf_url IS NOT NULL as has_pdf FROM analysis_reports WHERE client_profile_id = ? LIMIT 3`, [profileId]
  );
  console.log('\n=== Analysis Reports ===');
  console.log(JSON.stringify(reports, null, 2));
}

await conn.end();
