/**
 * Seed the historical_clients table from virtual_peter_final.json
 * and generate LLM semantic tags for each record.
 *
 * Usage: node scripts/seed-historical-clients.mjs
 *
 * Environment variables required:
 *   DATABASE_URL
 *   BUILT_IN_FORGE_API_URL
 *   BUILT_IN_FORGE_API_KEY
 */

import { readFileSync } from "fs";
import { createConnection } from "mysql2/promise";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_FILE = path.join(__dirname, "../../virtual_peter_final.json");
const BATCH_SIZE = 3;
const DELAY_MS = 2000;

const forgeApiUrl = process.env.BUILT_IN_FORGE_API_URL?.replace(/\/$/, "") || "https://forge.manus.ai";

async function generateSemanticTags(careerDescription, narrativeSample) {
  const narrativeText = (narrativeSample || [])
    .slice(0, 4)
    .map((n) => `- ${n.slice(0, 150)}`)
    .join("\n");

  const prompt = `You are analysing a career counselling client profile from Peter Daws' Dependable Strengths database.

Career outcome: ${careerDescription}

Life history samples:
${narrativeText || "(no narrative samples available)"}

Extract the key patterns. Return a JSON object with exactly these fields:
- themes: array of 6-8 lowercase thematic keywords describing this person's motivated strengths (e.g. "organising", "communicating", "leading", "creating", "analysing", "building", "teaching", "performing")
- environment: string describing preferred work environment (one of: "people-facing", "intellectual", "practical", "creative", "technical", "outdoor", "structured", "entrepreneurial")
- motivation: string describing primary motivation (one of: "achievement", "service", "expression", "analysis", "leadership", "craft", "connection", "discovery")
- sector: array of 1-3 likely sectors (e.g. "legal", "education", "arts", "business", "healthcare", "technology", "public sector", "media", "charity", "finance")
- summary: one concise sentence (max 20 words) describing this person's career pattern

Return ONLY valid JSON.`;

  const response = await fetch(`${forgeApiUrl}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${process.env.BUILT_IN_FORGE_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gemini-2.5-flash",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 400,
      response_format: { type: "json_object" },
      thinking: { budget_tokens: 0 },
    }),
  });

  if (!response.ok) {
    throw new Error(`LLM API failed: ${response.status}`);
  }

  const result = await response.json();
  const content = result.choices?.[0]?.message?.content;
  if (!content) throw new Error("No content in LLM response");

  return JSON.parse(content);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  console.log("Loading data from", DATA_FILE);
  const clients = JSON.parse(readFileSync(DATA_FILE, "utf-8"));
  console.log(`Loaded ${clients.length} historical clients`);

  const db = await createConnection(process.env.DATABASE_URL);
  console.log("Connected to database");

  // Check existing
  const [existingRows] = await db.execute(
    "SELECT externalId FROM historical_clients"
  );
  const existingIds = new Set(existingRows.map((r) => r.externalId));
  console.log(`Already in database: ${existingIds.size}`);

  const toProcess = clients.filter((c) => !existingIds.has(c.id));
  console.log(`To process: ${toProcess.length}`);

  if (toProcess.length === 0) {
    console.log("All clients already seeded.");
    await db.end();
    return;
  }

  let processed = 0;
  let errors = 0;

  for (let i = 0; i < toProcess.length; i += BATCH_SIZE) {
    const batch = toProcess.slice(i, i + BATCH_SIZE);

    await Promise.all(
      batch.map(async (client) => {
        try {
          const tags = await generateSemanticTags(
            client.career_description,
            client.narrative_sample
          );

          // Store tags as the "embedding" (JSON object, not vector)
          // The embeddingText stores the career description for display
          await db.execute(
            `INSERT INTO historical_clients 
             (externalId, careerDescription, tier, narrativeSample, embeddingText, embedding, embeddingReady)
             VALUES (?, ?, ?, ?, ?, ?, true)
             ON DUPLICATE KEY UPDATE
               careerDescription = VALUES(careerDescription),
               tier = VALUES(tier),
               narrativeSample = VALUES(narrativeSample),
               embeddingText = VALUES(embeddingText),
               embedding = VALUES(embedding),
               embeddingReady = true`,
            [
              client.id,
              client.career_description,
              client.tier,
              JSON.stringify(client.narrative_sample || []),
              client.career_description, // embeddingText = career description
              JSON.stringify(tags), // embedding = semantic tags object
            ]
          );

          processed++;
        } catch (err) {
          errors++;
          console.error(
            `Error processing ${client.career_description.slice(0, 40)}: ${err.message}`
          );
        }
      })
    );

    if (processed % 20 === 0 || i + BATCH_SIZE >= toProcess.length) {
      console.log(
        `Progress: ${processed + errors}/${toProcess.length} (${processed} ok, ${errors} errors)`
      );
    }

    if (i + BATCH_SIZE < toProcess.length) {
      await sleep(DELAY_MS);
    }
  }

  console.log(`\nDone! Processed: ${processed}, Errors: ${errors}`);

  const [finalCount] = await db.execute(
    "SELECT COUNT(*) as count, SUM(embeddingReady) as ready FROM historical_clients"
  );
  console.log(
    `Database: ${finalCount[0].count} clients, ${finalCount[0].ready} with tags`
  );

  await db.end();
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
