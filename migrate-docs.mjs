import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const conn = await mysql.createConnection(process.env.DATABASE_URL);
try {
  await conn.execute('ALTER TABLE `chat_sessions` ADD `uploadedDocuments` text NULL');
  console.log('Migration applied: uploadedDocuments column added to chat_sessions');
} catch (e) {
  if (e.code === 'ER_DUP_FIELDNAME') {
    console.log('Column already exists — skipping');
  } else {
    throw e;
  }
} finally {
  await conn.end();
}
