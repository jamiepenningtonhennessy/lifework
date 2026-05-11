import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);
const clientId = 690001;

// Check interview messages
const [messages] = await conn.execute(
  'SELECT role, LEFT(content, 100) as preview, createdAt FROM interview_messages WHERE clientId = ? ORDER BY createdAt DESC LIMIT 20',
  [clientId]
);
console.log('Interview messages (last 20):', messages.length);
messages.forEach(m => console.log(` [${m.role}] ${m.preview}`));

// Check chat sessions
const [sessions] = await conn.execute(
  'SELECT id, sessionType, createdAt, updatedAt FROM career_explorer_sessions WHERE clientId = ? ORDER BY createdAt DESC LIMIT 5',
  [clientId]
);
console.log('\nCareer explorer sessions:', sessions.length);
sessions.forEach(s => console.log(` [${s.sessionType}] ${s.createdAt}`));

await conn.end();
