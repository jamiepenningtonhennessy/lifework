import 'dotenv/config';
import { createConnection } from 'mysql2/promise';

const conn = await createConnection(process.env.DATABASE_URL);
const [rows] = await conn.execute(
  "SELECT wowReportJson FROM analysis_reports WHERE wowReportStatus = 'done' ORDER BY id DESC LIMIT 1"
);
const j = JSON.parse(rows[0].wowReportJson);
const text = j.viaSection || '';

function stripMarkdownInline(s) {
  return s
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .trim();
}

function splitParagraphs(t) {
  return t
    .split(/\n{2,}/)
    .map(p => p.replace(/\n/g, ' ').trim())
    .filter(p => p && !p.startsWith('#') && !p.startsWith('|') && !p.startsWith('---'))
    .map(stripMarkdownInline)
    .filter(p => p.length > 0);
}

function extractKeyFindings(t) {
  const kfMatch = t.match(/##\s*(?:The\s+)?Key\s+Findings?\s*\n([\s\S]*?)(?=\n##|$)/i);
  if (!kfMatch) return splitParagraphs(t).slice(-3);
  return splitParagraphs(kfMatch[1]);
}

function extractPullquote(t) {
  const kf = extractKeyFindings(t);
  const last = kf[kf.length - 1] ?? '';
  const sentences = last.split(/(?<=[.!?])\s+/);
  return sentences[sentences.length - 1] ?? last;
}

const kf = extractKeyFindings(text);
const pq = extractPullquote(text);
console.log('KEY_FINDINGS count:', kf.length);
kf.forEach((p, i) => console.log(`  [${i}]`, p.substring(0, 150)));
console.log('PULLQUOTE:', pq);

// Also check what ch3KeyFindings filter does
const filtered = kf.filter(f => !f.includes('|') && !f.startsWith('---'));
console.log('\nAfter filter count:', filtered.length);
filtered.forEach((p, i) => console.log(`  [${i}]`, p.substring(0, 150)));

await conn.end();
