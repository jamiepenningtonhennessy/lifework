import { createConnection } from "mysql2/promise";
import { config } from "dotenv";
config();
const dbUrl = process.env.DATABASE_URL;

const conn = await createConnection(dbUrl);
const [rows] = await conn.execute(
  "SELECT wowReportJson FROM analysis_reports WHERE wowReportStatus = 'done' ORDER BY id DESC LIMIT 1"
);
if (!rows[0]) { console.log("no rows"); process.exit(1); }
const j = JSON.parse(rows[0].wowReportJson);

// Replicate extractAllSections logic
function stripMarkdownInline(text) {
  if (!text) return "";
  return text
    .replace(/\*\*\*(.+?)\*\*\*/g, "$1")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/___(.+?)___/g, "$1")
    .replace(/__(.+?)__/g, "$1")
    .replace(/_(.+?)_/g, "$1")
    .replace(/`(.+?)`/g, "$1")
    .replace(/^#{1,6}\s+/, "")
    .replace(/^[-*•]\s+/, "")
    .trim();
}

function splitParagraphs(text) {
  if (!text) return [""];
  const filtered = text.split("\n").filter(l => !l.trim().startsWith("|")).join("\n");
  const lines = filtered.split("\n");
  const paras = [];
  let current = [];
  for (const line of lines) {
    if (line.startsWith("## ") || line.startsWith("# ")) {
      if (current.length > 0) { paras.push(current.join(" ").trim()); current = []; }
      continue;
    }
    if (line.trim() === "") {
      if (current.length > 0) { paras.push(current.join(" ").trim()); current = []; }
    } else {
      current.push(line.trim());
    }
  }
  if (current.length > 0) paras.push(current.join(" ").trim());
  return paras.filter(p => p.length > 0).map(p => stripMarkdownInline(p));
}

function extractAllSections(text) {
  if (!text) return [];
  const lines = text.split("\n");
  const sections = [];
  let currentHeading = "";
  let currentLines = [];
  for (const line of lines) {
    if (line.startsWith("## ") || line.startsWith("# ")) {
      if (currentHeading) {
        const paras = splitParagraphs(currentLines.join("\n"));
        if (paras.length > 0) sections.push({ heading: currentHeading, paragraphs: paras });
      }
      currentHeading = line.replace(/^#+\s*/, "").trim();
      currentLines = [];
    } else {
      currentLines.push(line);
    }
  }
  if (currentHeading) {
    const paras = splitParagraphs(currentLines.join("\n"));
    if (paras.length > 0) sections.push({ heading: currentHeading, paragraphs: paras });
  }
  return sections;
}

const ch6 = extractAllSections(j.developmentEdge || "");
const ch8 = extractAllSections(j.careerDirections || "");

console.log("=== CH6 sections ===");
console.log(JSON.stringify(ch6, null, 2));
console.log("\n=== CH8 sections (first 2) ===");
console.log(JSON.stringify(ch8.slice(0, 2), null, 2));

await conn.end();
