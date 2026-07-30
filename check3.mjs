import mysql from 'mysql2/promise';
const conn = await mysql.createConnection(process.env.DATABASE_URL);

const [r1] = await conn.execute("DESCRIBE job_pipeline_runs");
console.log('job_pipeline_runs:', r1.map(c => c.Field));

const [r2] = await conn.execute("DESCRIBE client_monitor_list");
console.log('client_monitor_list:', r2.map(c => c.Field));

const [r3] = await conn.execute("DESCRIBE company_universe");
console.log('company_universe:', r3.map(c => c.Field));

await conn.end();
