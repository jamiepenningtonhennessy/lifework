/**
 * One-off script: run Sage enrichment for a specific client by ID.
 * Usage: node scripts/runEnrichmentForClient.mjs <clientId>
 *
 * This replicates the logic of runSageEnrichment() in routers.ts but
 * can be called directly from the shell without needing auth.
 */
import { createConnection } from "mysql2/promise";
import * as dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "../.env") });

const clientId = parseInt(process.argv[2], 10);
if (!clientId || isNaN(clientId)) {
  console.error("Usage: node scripts/runEnrichmentForClient.mjs <clientId>");
  process.exit(1);
}

const conn = await createConnection(process.env.DATABASE_URL);

// 1. Fetch achievements
const [achievements] = await conn.query(
  "SELECT id, decade, title, description, sageEnrichment FROM achievements WHERE clientId = ? ORDER BY sortOrder, id",
  [clientId]
);
console.log(`Found ${achievements.length} achievements for client ${clientId}`);

// 2. Fetch chat session transcript (life_history)
const [sessions] = await conn.query(
  "SELECT messages FROM chat_sessions WHERE clientId = ? AND section = 'life_history' ORDER BY createdAt",
  [clientId]
);

if (!sessions.length) {
  console.error("No life_history chat sessions found for this client.");
  await conn.end();
  process.exit(1);
}

const allMessages = [];
for (const session of sessions) {
  try {
    const msgs = JSON.parse(session.messages || "[]");
    allMessages.push(...msgs);
  } catch { /* skip */ }
}

if (!allMessages.length) {
  console.error("No messages found in life_history sessions.");
  await conn.end();
  process.exit(1);
}

const transcript = allMessages
  .map(m => `${m.role === "peter" || m.role === "assistant" ? "Sage" : "Client"}: ${m.content}`)
  .join("\n\n");

console.log(`Transcript length: ${transcript.length} chars, ${allMessages.length} messages`);

// 3. Build LLM prompt
const achievementsSummary = achievements
  .map(a => `ID:${a.id} | [${a.decade}] ${a.title} | ${a.description ?? "(no description)"}`)
  .join("\n");

const systemPrompt = `You are a career counsellor assistant helping to enrich a client's achievement records.
You have a list of achievement stories the client wrote themselves, and a transcript of their conversation with Sage (a life history interviewer).
Your task: for each achievement story, identify any additional detail, clarification, or emotional nuance that the client revealed during the Sage conversation that was NOT already present in their original written description.
Only include genuinely new information — do not repeat what is already in the description.
If the Sage conversation added nothing new for a particular story, return null for that entry.
Return a JSON array. Each element must have:
  - id: the achievement ID (integer)
  - enrichment: a string of 1-4 sentences in the third person capturing the new detail, OR null if nothing new was revealed
Return ONLY the JSON array. No markdown fences, no commentary.`;

const userPrompt = `ACHIEVEMENT STORIES:\n${achievementsSummary}\n\nSAGE CONVERSATION TRANSCRIPT:\n${transcript}`;

// 4. Call Anthropic via fetch
console.log("Calling LLM to extract enrichments...");
const apiResponse = await fetch("https://api.anthropic.com/v1/messages", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-api-key": process.env.ANTHROPIC_API_KEY,
    "anthropic-version": "2023-06-01",
  },
  body: JSON.stringify({
    model: "claude-sonnet-4-5",
    max_tokens: 4000,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  }),
});

if (!apiResponse.ok) {
  const errText = await apiResponse.text();
  console.error("Anthropic API error:", errText);
  await conn.end();
  process.exit(1);
}

const responseData = await apiResponse.json();
const raw = responseData.content?.[0]?.type === "text" ? responseData.content[0].text : "[]";
let results;
try {
  const cleaned = raw.replace(/^```[\s\S]*?\n/, "").replace(/```$/, "").trim();
  results = JSON.parse(cleaned);
} catch (e) {
  console.error("Failed to parse LLM response:", raw.slice(0, 500));
  await conn.end();
  process.exit(1);
}

console.log(`LLM returned ${results.length} entries`);

// 5. Write enrichments back
let enriched = 0;
let skipped = 0;
for (const item of results) {
  if (item.enrichment && item.enrichment.trim().length > 0) {
    await conn.query(
      "UPDATE achievements SET sageEnrichment = ? WHERE id = ?",
      [item.enrichment.trim(), item.id]
    );
    enriched++;
    console.log(`  ✓ Enriched achievement ${item.id}`);
  } else {
    skipped++;
  }
}

console.log(`\nDone: ${enriched} enriched, ${skipped} skipped`);

// 6. Check final count
const [[{ total, enrichedCount }]] = await conn.query(
  `SELECT COUNT(*) as total,
    SUM(CASE WHEN sageEnrichment IS NOT NULL AND LENGTH(TRIM(sageEnrichment)) > 0 THEN 1 ELSE 0 END) as enrichedCount
   FROM achievements WHERE clientId = ?`,
  [clientId]
);
console.log(`Final enrichment count: ${enrichedCount}/${total}`);

await conn.end();
