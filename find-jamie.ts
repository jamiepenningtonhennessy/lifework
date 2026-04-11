import { createConnection } from 'mysql2/promise';

const conn = await createConnection(process.env.DATABASE_URL as string);

// Find Jamie Pennington
const [clients] = await conn.query(
  "SELECT id, firstName, lastName FROM client_profiles WHERE firstName LIKE '%Jamie%' OR lastName LIKE '%Pennington%' LIMIT 5"
) as any;
console.log("Clients:", JSON.stringify(clients));

if (clients.length > 0) {
  const id = clients[0].id;
  const [reports] = await conn.query(
    `SELECT client_id, 
     CHAR_LENGTH(wow_report_json) as json_len,
     CHAR_LENGTH(life_history_section) as lh_len,
     CHAR_LENGTH(via_section) as via_len,
     CHAR_LENGTH(ocean_section) as ocean_len
     FROM analysis_reports WHERE client_id = ?`,
    [id]
  ) as any;
  console.log("Report lengths:", JSON.stringify(reports));
  
  if (reports.length > 0) {
    // Get the actual section content (first 500 chars each)
    const [data] = await conn.query(
      `SELECT client_id,
       LEFT(life_history_section, 300) as lh_preview,
       LEFT(via_section, 300) as via_preview,
       LEFT(ocean_section, 300) as ocean_preview
       FROM analysis_reports WHERE client_id = ?`,
      [id]
    ) as any;
    console.log("Previews:", JSON.stringify(data));
  }
}

await conn.end();
