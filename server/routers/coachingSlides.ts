/**
 * coachingSlides.ts  (v2 — amended per feedback)
 *
 * Slide structure:
 *   1. Title slide — leave as is
 *   2. Who You Are — 32pt bullets, 2 blank lines spacing, 2 examples per bullet
 *   3. Life History — 32pt bullets, 2 blank lines spacing, 2 examples per bullet
 *   4. Character Strengths — evidence table (strength + life history evidence), no bars
 *   5. Personality Profile — bars in top half, conclusions (what it says + VIA comparison) in bottom half
 *   6. Behavioural Style — descriptor font 14pt, "On bad day" paragraph
 *   7. The Pattern — descriptor font 14pt, "On bad day" paragraph
 *   8. So What? — subtitle 14pt, career direction bullets 32pt
 */

import PptxGenJSModule from "pptxgenjs";
const PptxGenJS = (PptxGenJSModule as any).default ?? PptxGenJSModule;
import { storagePut } from "../storage.js";
import { invokeLLM } from "../_core/llm.js";
import { LIFEWORK_LOGO_BASE64 } from "./lifeworkLogoBase64.js";
import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc.js";
import { TRPCError } from "@trpc/server";
import { getAnalysisReport } from "../db.js";

// ─── Brand colours ────────────────────────────────────────────────────────────
const NAVY       = "1a2744";
const GOLD       = "c9973a";
const CREAM      = "f5f0e8";
const WHITE      = "FFFFFF";
const LIGHT_NAVY = "2a3a5e";
const MUTED      = "8a9bbf";

// ─── Slide dimensions (widescreen 13.33 × 7.5 inches) ────────────────────────
const W = 13.33;
const H = 7.5;

// ─── Colour energy colours ────────────────────────────────────────────────────
const COLOUR_HEX: Record<string, string> = {
  "Fiery Red":       "C0392B",
  "Sunshine Yellow": "D4AC0D",
  "Earth Green":     "27AE60",
  "Cool Blue":       "2980B9",
};

// ─── Colour energy descriptors ────────────────────────────────────────────────
const COLOUR_DESCRIPTORS: Record<string, string> = {
  "Cool Blue":       "Analytical · precise · cautious · questioning",
  "Fiery Red":       "Decisive · competitive · demanding · strong-willed",
  "Sunshine Yellow": "Sociable · dynamic · expressive · enthusiastic",
  "Earth Green":     "Caring · patient · sharing · relaxed",
};

// ─── Colour energy "on a bad day" ─────────────────────────────────────────────
const COLOUR_BAD_DAY: Record<string, string> = {
  "Cool Blue":       "On a bad day: can appear cold, detached, or overly critical — others may feel judged or shut out.",
  "Fiery Red":       "On a bad day: can appear aggressive, impatient, or controlling — others may feel steamrollered or dismissed.",
  "Sunshine Yellow": "On a bad day: can appear unfocused, over-optimistic, or attention-seeking — others may feel exhausted or unheard.",
  "Earth Green":     "On a bad day: can appear indecisive, resistant to change, or passive — others may feel frustrated by lack of momentum.",
};

// ─── OCEAN domain labels ──────────────────────────────────────────────────────
const OCEAN_LABELS: Record<string, string> = {
  O: "Openness",
  C: "Conscientiousness",
  E: "Extraversion",
  A: "Agreeableness",
  N: "Neuroticism",
};

// ─── LLM helper: extract slide bullets with examples ─────────────────────────
async function extractBulletsWithExamples(
  section: string,
  instruction: string,
  count: number
): Promise<Array<{ bullet: string; examples: string[] }>> {
  const sys = `You extract concise bullet points with supporting examples from career analysis report sections for coaching slides.
Each bullet must be:
- Maximum 12 words
- A complete, standalone insight
- Written in second person ("You…" or "Your…")
- Free of markdown formatting, asterisks, or special characters
Each bullet must have exactly 2 short examples (real or plausible illustrations, 6–10 words each).
Return ONLY a JSON array of objects, nothing else.
Example: [{"bullet":"You build systems from restless curiosity.","examples":["Redesigning the firm's case management process","Creating a new client onboarding framework"]}]`;

  const user = `${instruction}\n\nExtract exactly ${count} bullets with 2 examples each from this section:\n\n${section.slice(0, 3000)}`;

  try {
    const raw = await invokeLLM({ messages: [
      { role: "system", content: sys },
      { role: "user", content: user },
    ]});
    const rawContent = raw.choices[0]?.message?.content ?? "[]";
    const content = typeof rawContent === "string" ? rawContent : "[]";
    const cleaned = content.replace(/```json\n?|\n?```/g, "").trim();
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed)) return parsed.slice(0, count);
  } catch {
    // fall through
  }
  return Array(count).fill({ bullet: "—", examples: ["—", "—"] });
}

// ─── LLM helper: simple bullet extraction (no examples) ──────────────────────
async function extractBullets(
  section: string,
  instruction: string,
  count: number
): Promise<string[]> {
  const sys = `You extract concise bullet points from career analysis report sections for coaching slides.
Each bullet must be maximum 12 words, second person, no markdown.
Return ONLY a JSON array of strings. Example: ["You thrive when building something new."]`;

  const user = `${instruction}\n\nExtract exactly ${count} bullets from this section:\n\n${section.slice(0, 3000)}`;

  try {
    const raw = await invokeLLM({ messages: [
      { role: "system", content: sys },
      { role: "user", content: user },
    ]});
    const rawContent = raw.choices[0]?.message?.content ?? "[]";
    const content = typeof rawContent === "string" ? rawContent : "[]";
    const cleaned = content.replace(/```json\n?|\n?```/g, "").trim();
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed)) return parsed.slice(0, count).map(String);
  } catch {
    // fall through
  }
  return Array(count).fill("—");
}

// ─── LLM helper: extract VIA evidence table ──────────────────────────────────
async function extractViaEvidence(
  viaSection: string,
  lifeHistorySection: string,
  strengths: Array<{ name: string; score: number }>
): Promise<Array<{ strength: string; evidence: string[] }>> {
  const strengthList = strengths.slice(0, 5).map((s) => s.name).join(", ");
  const sys = `You are a career analyst. For each VIA character strength listed, extract 2 brief pieces of evidence from the life history section that demonstrate this strength in action. Each evidence item should be 8–12 words, concrete, and specific to the person's history. Return ONLY a JSON array. Example: [{"strength":"Humor","evidence":["Defused tense client meetings with well-timed wit","Used comedy to build rapport in new teams"]}]`;
  const user = `Strengths to analyse: ${strengthList}\n\nVIA section:\n${viaSection.slice(0, 2000)}\n\nLife history:\n${lifeHistorySection.slice(0, 2000)}`;

  try {
    const raw = await invokeLLM({ messages: [
      { role: "system", content: sys },
      { role: "user", content: user },
    ]});
    const rawContent = raw.choices[0]?.message?.content ?? "[]";
    const content = typeof rawContent === "string" ? rawContent : "[]";
    const cleaned = content.replace(/```json\n?|\n?```/g, "").trim();
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed)) return parsed;
  } catch {
    // fall through
  }
  return strengths.slice(0, 5).map((s) => ({ strength: s.name, evidence: ["—", "—"] }));
}

// ─── LLM helper: OCEAN conclusions ───────────────────────────────────────────
async function extractOceanConclusions(
  personalitySection: string,
  viaSection: string,
  domainScores: Record<string, number>
): Promise<{ whatItSays: string[]; viaComparison: string[] }> {
  const scoresSummary = Object.entries(domainScores)
    .map(([k, v]) => `${OCEAN_LABELS[k] ?? k}: ${Math.round(v)}`)
    .join(", ");
  const sys = `You are a career analyst. Given OCEAN personality scores and a VIA character strengths section, produce two sets of bullet points:
1. "What it says" — 3 bullets describing what the OCEAN profile reveals about this person (max 12 words each, second person)
2. "How it challenges or reinforces the VIA" — 2 bullets noting where OCEAN and VIA align or create interesting tension (max 14 words each)
Return ONLY JSON: {"whatItSays":["...","...","..."],"viaComparison":["...","..."]}`;
  const user = `OCEAN scores: ${scoresSummary}\n\nPersonality section:\n${personalitySection.slice(0, 1500)}\n\nVIA section:\n${viaSection.slice(0, 1000)}`;

  try {
    const raw = await invokeLLM({ messages: [
      { role: "system", content: sys },
      { role: "user", content: user },
    ]});
    const rawContent = raw.choices[0]?.message?.content ?? "{}";
    const content = typeof rawContent === "string" ? rawContent : "{}";
    const cleaned = content.replace(/```json\n?|\n?```/g, "").trim();
    const parsed = JSON.parse(cleaned);
    if (parsed.whatItSays && parsed.viaComparison) return parsed;
  } catch {
    // fall through
  }
  return { whatItSays: ["—", "—", "—"], viaComparison: ["—", "—"] };
}

// ─── Shared layout helpers ────────────────────────────────────────────────────
function addFooter(slide: any, clientName: string, slideNum: number, total: number) {
  slide.addShape("rect", { x: 0.4, y: H - 0.45, w: W - 0.8, h: 0.02, fill: { color: GOLD }, line: { color: GOLD } });
  slide.addText(clientName, { x: 0.4, y: H - 0.42, w: 5, h: 0.3, fontSize: 7, color: MUTED, fontFace: "Calibri" });
  slide.addText(`${slideNum} / ${total}`, { x: W - 1.5, y: H - 0.42, w: 1.1, h: 0.3, fontSize: 7, color: MUTED, fontFace: "Calibri", align: "right" });
}

function addLogo(slide: any) {
  // Logo ratio is 2.48:1 (171×69px). Width 1.24in → height 0.5in
  try { slide.addImage({ data: LIFEWORK_LOGO_BASE64, x: W - 1.55, y: 0.15, w: 1.24, h: 0.5 }); } catch { /* skip */ }
}

function addEyebrow(slide: any, text: string, x = 0.55, y = 0.28) {
  slide.addText(text.toUpperCase(), { x, y, w: 8, h: 0.25, fontSize: 7.5, color: GOLD, bold: true, fontFace: "Calibri", charSpacing: 2 });
}

function addHeading(slide: any, text: string, x = 0.55, y = 0.55, w = 8) {
  slide.addText(text, { x, y, w, h: 0.7, fontSize: 26, color: WHITE, bold: true, fontFace: "Georgia" });
}

function addAccentBar(slide: any, x = 0.55, y = 1.25, w = 1.2) {
  slide.addShape("rect", { x, y, w, h: 0.04, fill: { color: GOLD }, line: { color: GOLD } });
}

// ─── Main export ──────────────────────────────────────────────────────────────
export interface SlideSections {
  clientName: string;
  summary: string;
  lifeHistoryPattern: string;
  viaSection: string;
  viaRanked: Array<{ name: string; score: number; rank: number }>;
  personalitySection: string;
  domainScores: Record<string, number>;
  facetScores?: Record<string, number>;
  behaviouralStyle: string;
  primaryColour: string;
  secondaryColour: string;
  jungianType: string;
  careerDirections: string;
  developmentEdge: string;
  coachingQuestions: string;
  reportType: string;
}

export async function generateCoachingSlides(data: SlideSections): Promise<Buffer> {
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";

  const TOTAL = 9;
  const name = data.clientName || "Client";

  // ── Extract all LLM content in parallel ──────────────────────────────────
  const [
    summaryBulletsWithEx,
    lifeBulletsWithEx,
    viaEvidence,
    oceanConclusions,
    patternBullets,
    devEdgeBullets,
    soWhatBullets,
  ] = await Promise.all([
    extractBulletsWithExamples(
      data.summary,
      "Extract 4 key insights that describe who this person is at their core.",
      4
    ),
    extractBulletsWithExamples(
      data.lifeHistoryPattern,
      "Extract 4 recurring themes or patterns from this person's life history.",
      4
    ),
    extractViaEvidence(data.viaSection, data.lifeHistoryPattern, data.viaRanked ?? []),
    extractOceanConclusions(data.personalitySection, data.viaSection, data.domainScores ?? {}),
    extractBullets(
      [data.summary, data.lifeHistoryPattern, data.viaSection, data.personalitySection].join("\n\n"),
      "Extract 4 insights that emerge ONLY when you look across ALL instruments together.",
      4
    ),
    extractBullets(
      data.developmentEdge ?? "",
      "Extract 3-4 concise development edge insights. Each should name the gap clearly and what it costs if unaddressed.",
      4
    ),
    extractBullets(
      data.careerDirections,
      "Extract 4 concrete career direction insights or role suggestions for this person.",
      4
    ),
  ]);

  // ── SLIDE 1: Title (unchanged) ─────────────────────────────────────────────
  {
    const slide = pptx.addSlide();
    slide.addShape("rect", { x: 0, y: 0, w: W, h: H, fill: { color: NAVY }, line: { color: NAVY } });
    slide.addShape("rect", { x: 0, y: 0, w: 0.12, h: H, fill: { color: GOLD }, line: { color: GOLD } });
    slide.addShape("rect", { x: W * 0.62, y: 0, w: W * 0.38, h: H, fill: { color: CREAM }, line: { color: CREAM } });

    addLogo(slide);

    slide.addText("LIFEWORK", { x: 0.55, y: 1.6, w: 6, h: 0.4, fontSize: 10, color: GOLD, bold: true, fontFace: "Calibri", charSpacing: 4 });
    slide.addText("Coaching Session", { x: 0.55, y: 2.1, w: 7.5, h: 1.0, fontSize: 44, color: WHITE, bold: true, fontFace: "Georgia" });
    slide.addText(name, { x: 0.55, y: 3.2, w: 7, h: 0.6, fontSize: 22, color: GOLD, fontFace: "Georgia", italic: true });
    slide.addShape("rect", { x: 0.55, y: 3.9, w: 2.0, h: 0.04, fill: { color: GOLD }, line: { color: GOLD } });
    slide.addText(new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }), {
      x: 0.55, y: 4.05, w: 6, h: 0.35, fontSize: 11, color: MUTED, fontFace: "Calibri",
    });

    slide.addText("Today's session", { x: W * 0.64, y: 1.5, w: W * 0.34, h: 0.35, fontSize: 9, color: NAVY, bold: true, fontFace: "Calibri", charSpacing: 1.5 });
    const agenda = [
      "Who you are",
      "Life history pattern",
      "Character strengths (VIA)",
      "Personality profile (OCEAN)",
      "Behavioural style",
      "Development edge",
      "Tell me about yourself",
      "Career directions",
    ];
    agenda.forEach((item, i) => {
      slide.addText(`${i + 1}.  ${item}`, {
        x: W * 0.64, y: 1.95 + i * 0.52, w: W * 0.33, h: 0.45,
        fontSize: 10.5, color: LIGHT_NAVY, fontFace: "Calibri",
      });
    });
  }

  // ── SLIDE 2: Who You Are — 32pt, spacing, 2 examples per bullet ───────────
  {
    const slide = pptx.addSlide();
    slide.addShape("rect", { x: 0, y: 0, w: W, h: H, fill: { color: NAVY }, line: { color: NAVY } });
    slide.addShape("rect", { x: 0, y: 0, w: 0.12, h: H, fill: { color: GOLD }, line: { color: GOLD } });

    addLogo(slide);
    addEyebrow(slide, "Chapter 1");
    addHeading(slide, "Who You Are");
    addAccentBar(slide);

    // Two blank lines of spacing before bullets
    const startY = 1.6;
    const bulletSpacing = 1.35;

    summaryBulletsWithEx.forEach((item, i) => {
      const y = startY + i * bulletSpacing;
      // Main bullet at 28pt, centred
      slide.addText([{
        text: item.bullet ?? "—",
        options: { bullet: { code: "25CF", color: GOLD }, color: WHITE, fontSize: 28, fontFace: "Georgia", bold: true, paraSpaceAfter: 2 },
      }], { x: 0.55, y, w: W - 1.1, h: 0.65, align: "left" });
      // Two examples at 13pt in muted colour
      const exampleText = (item.examples ?? ["—", "—"]).map((ex: string, j: number) => `${j === 0 ? "e.g." : "or"} ${ex}`).join("   ·   ");
      slide.addText(exampleText, {
        x: 0.75, y: y + 0.62, w: W - 1.3, h: 0.3,
        fontSize: 11, color: MUTED, fontFace: "Calibri", italic: true, align: "left",
      });
    });

    addFooter(slide, name, 2, TOTAL);
  }

  // ── SLIDE 3: Life History — 32pt, spacing, 2 examples per bullet ──────────
  {
    const slide = pptx.addSlide();
    slide.addShape("rect", { x: 0, y: 0, w: W, h: H, fill: { color: NAVY }, line: { color: NAVY } });
    slide.addShape("rect", { x: 0, y: 0, w: 0.12, h: H, fill: { color: GOLD }, line: { color: GOLD } });

    addLogo(slide);
    addEyebrow(slide, "Chapter 2");
    addHeading(slide, "Life History — The Pattern");
    addAccentBar(slide);

    const startY = 1.6;
    const bulletSpacing = 1.35;

    lifeBulletsWithEx.forEach((item, i) => {
      const y = startY + i * bulletSpacing;
      slide.addText([{
        text: item.bullet ?? "—",
        options: { bullet: { code: "25CF", color: GOLD }, color: WHITE, fontSize: 28, fontFace: "Georgia", bold: true, paraSpaceAfter: 2 },
      }], { x: 0.55, y, w: W - 1.1, h: 0.65, align: "left" });
      const exampleText = (item.examples ?? ["—", "—"]).map((ex: string, j: number) => `${j === 0 ? "e.g." : "or"} ${ex}`).join("   ·   ");
      slide.addText(exampleText, {
        x: 0.75, y: y + 0.62, w: W - 1.3, h: 0.3,
        fontSize: 11, color: MUTED, fontFace: "Calibri", italic: true, align: "left",
      });
    });

    addFooter(slide, name, 3, TOTAL);
  }

  // ── SLIDE 4: Character Strengths — full evidence table (matches WOW report) ─
  {
    // Parse the markdown evidence table from viaSection
    const parseViaTable = (viaSection: string) => {
      const rows: Array<{ strength: string; definition: string; rank: string; freq: string; salience: string; achievements: string }> = [];
      const lines = viaSection.split("\n");
      let inTable = false;
      let headerParsed = false;
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("|")) { if (inTable && rows.length > 0) break; continue; }
        if (/^\|[-:\| ]+\|$/.test(trimmed)) { headerParsed = true; inTable = true; continue; }
        const cells = trimmed.slice(1, -1).split("|").map((c: string) => c.trim());
        if (!headerParsed) { inTable = true; continue; } // skip header row
        if (cells.length >= 6) {
          rows.push({ strength: cells[0], definition: cells[1], rank: cells[2], freq: cells[3], salience: cells[4], achievements: cells[5] });
        }
      }
      return rows;
    };
    const tableRows = parseViaTable(data.viaSection ?? "");

    const slide = pptx.addSlide();
    // Cream background (matches WOW report style for this table)
    slide.addShape("rect", { x: 0, y: 0, w: W, h: H, fill: { color: CREAM }, line: { color: CREAM } });
    slide.addShape("rect", { x: 0, y: 0, w: W, h: 1.15, fill: { color: NAVY }, line: { color: NAVY } });
    slide.addShape("rect", { x: 0, y: 0, w: 0.12, h: H, fill: { color: GOLD }, line: { color: GOLD } });
    addLogo(slide);
    addEyebrow(slide, "Chapter 3");
    addHeading(slide, "Character Strengths");

    // Column layout (inches): Strength(1.5) | Definition(3.0) | Rank(0.7) | Freq(0.7) | Salience(1.1) | Achievements(rest)
    const COL_W = [1.5, 3.0, 0.7, 0.7, 1.1, 4.68];
    const xs: number[] = [];
    let cx = 0.55;
    for (const w of COL_W) { xs.push(cx); cx += w; }

    // Header row
    const HEADER_Y = 1.22;
    const HEADER_H = 0.32;
    slide.addShape("rect", { x: 0.55, y: HEADER_Y, w: W - 0.85, h: HEADER_H, fill: { color: NAVY }, line: { color: NAVY } });
    const headers = ["Strength", "VIA Definition", "Survey Rank", "Freq (of N)", "Identity Salience", "Achievements with evidence"];
    headers.forEach((h, ci) => {
      slide.addText(h, {
        x: xs[ci] + 0.06, y: HEADER_Y + 0.02, w: COL_W[ci] - 0.08, h: HEADER_H - 0.04,
        fontSize: 7, color: GOLD, bold: true, fontFace: "Calibri", valign: "middle",
      });
    });
    // Gold divider under header
    slide.addShape("rect", { x: 0.55, y: HEADER_Y + HEADER_H, w: W - 0.85, h: 0.015, fill: { color: GOLD }, line: { color: GOLD } });

    // Data rows
    const DATA_Y = HEADER_Y + HEADER_H + 0.03;
    const rowCount = Math.min(tableRows.length > 0 ? tableRows.length : (data.viaRanked ?? []).length, 7);
    const rowH = rowCount > 0 ? Math.min(0.82, (H - DATA_Y - 0.55) / rowCount) : 0.82;
    const rowColors = ["f5f0e8", "ede5d8"];

    if (tableRows.length === 0) {
      // Fallback: show viaRanked only
      (data.viaRanked ?? []).slice(0, 5).forEach((s, i) => {
        const y = DATA_Y + i * rowH;
        slide.addShape("rect", { x: 0.55, y, w: W - 0.85, h: rowH - 0.04, fill: { color: rowColors[i % 2] }, line: { color: rowColors[i % 2] } });
        slide.addText(s.name, { x: xs[0] + 0.06, y: y + 0.04, w: COL_W[0] - 0.08, h: rowH - 0.1, fontSize: 11, color: NAVY, bold: true, fontFace: "Calibri", valign: "middle" });
        slide.addText(String(s.rank ?? i + 1), { x: xs[2] + 0.06, y: y + 0.04, w: COL_W[2] - 0.08, h: rowH - 0.1, fontSize: 11, color: NAVY, fontFace: "Calibri", align: "center", valign: "middle" });
      });
    } else {
      tableRows.slice(0, 7).forEach((row, i) => {
        const y = DATA_Y + i * rowH;
        const bg = rowColors[i % 2];
        slide.addShape("rect", { x: 0.55, y, w: W - 0.85, h: rowH - 0.04, fill: { color: bg }, line: { color: bg } });
        // Strength name (bold navy)
        slide.addText(row.strength, { x: xs[0] + 0.06, y: y + 0.04, w: COL_W[0] - 0.08, h: rowH - 0.1, fontSize: 12, color: NAVY, bold: true, fontFace: "Calibri", valign: "top" });
        // VIA Definition
        slide.addText(row.definition, { x: xs[1] + 0.06, y: y + 0.04, w: COL_W[1] - 0.08, h: rowH - 0.1, fontSize: 12, color: "333333", fontFace: "Calibri", valign: "top" });
        // Survey Rank (centred)
        slide.addText(row.rank, { x: xs[2] + 0.06, y: y + 0.04, w: COL_W[2] - 0.08, h: rowH - 0.1, fontSize: 12, color: NAVY, fontFace: "Calibri", align: "center", valign: "middle" });
        // Freq (centred)
        slide.addText(row.freq, { x: xs[3] + 0.06, y: y + 0.04, w: COL_W[3] - 0.08, h: rowH - 0.1, fontSize: 12, color: NAVY, fontFace: "Calibri", align: "center", valign: "middle" });
        // Identity Salience — colour-coded
        const salCol = row.salience.includes("VERY") ? "7b2d00" : row.salience === "HIGH" ? "1a5c2a" : row.salience === "MEDIUM" ? "7a5c00" : "555555";
        slide.addText(row.salience, { x: xs[4] + 0.06, y: y + 0.04, w: COL_W[4] - 0.08, h: rowH - 0.1, fontSize: 12, color: salCol, bold: true, fontFace: "Calibri", valign: "middle" });
        // Achievements
        slide.addText(row.achievements, { x: xs[5] + 0.06, y: y + 0.04, w: COL_W[5] - 0.1, h: rowH - 0.1, fontSize: 12, color: "333333", fontFace: "Calibri", valign: "top" });
      });
    }
    addFooter(slide, name, 4, TOTAL);
  }

  // ── SLIDE 5: Personality Profile — bars top half, conclusions bottom half ──
  {
    const slide = pptx.addSlide();
    slide.addShape("rect", { x: 0, y: 0, w: W, h: H, fill: { color: NAVY }, line: { color: NAVY } });
    slide.addShape("rect", { x: 0, y: 0, w: 0.12, h: H, fill: { color: GOLD }, line: { color: GOLD } });

    addLogo(slide);
    addEyebrow(slide, "Chapter 4");
    addHeading(slide, "Personality Profile");
    addAccentBar(slide);

    const domains = ["O", "C", "E", "A", "N"];
    const scores = data.domainScores ?? {};
    const facets = data.facetScores ?? {};
    const BAR_MAX_W = W - 5.5;
    // OCEAN facet key map — 6 facets per domain
    const DOMAIN_FACET_KEYS: Record<string, string[]> = {
      O: ["O1","O2","O3","O4","O5","O6"],
      C: ["C1","C2","C3","C4","C5","C6"],
      E: ["E1","E2","E3","E4","E5","E6"],
      A: ["A1","A2","A3","A4","A5","A6"],
      N: ["N1","N2","N3","N4","N5","N6"],
    };
    const FACET_LABEL: Record<string, string> = {
      O1:"Imagination", O2:"Artistic Interests", O3:"Emotionality", O4:"Adventurousness", O5:"Intellect", O6:"Liberalism",
      C1:"Self-Efficacy", C2:"Orderliness", C3:"Dutifulness", C4:"Achievement-Striving", C5:"Self-Discipline", C6:"Cautiousness",
      E1:"Friendliness", E2:"Gregariousness", E3:"Assertiveness", E4:"Activity Level", E5:"Excitement-Seeking", E6:"Cheerfulness",
      A1:"Trust", A2:"Morality", A3:"Altruism", A4:"Cooperation", A5:"Modesty", A6:"Sympathy",
      N1:"Anxiety", N2:"Anger", N3:"Depression", N4:"Self-Consciousness", N5:"Immoderation", N6:"Vulnerability",
    };
    // Each domain row = bar (0.25h) + facet line (0.28h) + gap (0.18h) = 0.71 per domain
    const ROW_H = 0.71;
    domains.forEach((key, i) => {
      const score = scores[key] ?? 50;
      const y = 1.42 + i * ROW_H;
      const barW = (score / 100) * BAR_MAX_W;
      const label = OCEAN_LABELS[key] ?? key;

      slide.addText(label, { x: 0.55, y, w: 2.8, h: 0.3, fontSize: 11, color: WHITE, fontFace: "Calibri", bold: true });
      slide.addShape("rect", { x: 3.5, y: y + 0.04, w: BAR_MAX_W, h: 0.22, fill: { color: LIGHT_NAVY }, line: { color: LIGHT_NAVY } });
      if (barW > 0) {
        slide.addShape("rect", { x: 3.5, y: y + 0.04, w: barW, h: 0.22, fill: { color: GOLD }, line: { color: GOLD } });
      }
      slide.addText(`${Math.round(score)}`, { x: 3.5 + BAR_MAX_W + 0.1, y, w: 0.6, h: 0.3, fontSize: 10, color: MUTED, fontFace: "Calibri" });
      // Facet scores line underneath the bar
      const facetKeys = DOMAIN_FACET_KEYS[key] ?? [];
      const facetLine = facetKeys
        .map(fk => `${FACET_LABEL[fk] ?? fk}: ${facets[fk] !== undefined ? Math.round(facets[fk]) : "—"}`)
        .join("  ·  ");
      slide.addText(facetLine, {
        x: 0.55, y: y + 0.3, w: W - 1.1, h: 0.28,
        fontSize: 7.5, color: MUTED, fontFace: "Calibri", italic: true,
      });
    });

    // Divider between halves — pushed down to accommodate facet lines
    const divY = 1.42 + 5 * ROW_H + 0.1;
    slide.addShape("rect", { x: 0.55, y: divY, w: W - 1.1, h: 0.02, fill: { color: GOLD }, line: { color: GOLD } });

    // Bottom half: conclusions
    slide.addText("What it says", {
      x: 0.55, y: divY + 0.12, w: 5, h: 0.28,
      fontSize: 8.5, color: GOLD, bold: true, fontFace: "Calibri", charSpacing: 1.5,
    });
    const whatItems = oceanConclusions.whatItSays.map((b: string) => ({
      text: b,
      options: { bullet: { code: "25CF", color: GOLD }, color: WHITE, fontSize: 11, fontFace: "Calibri", paraSpaceAfter: 3 },
    }));
    slide.addText(whatItems, { x: 0.55, y: divY + 0.42, w: W * 0.5 - 0.3, h: 1.5, valign: "top" });

    slide.addText("How it challenges / reinforces the VIA", {
      x: W * 0.5 + 0.2, y: divY + 0.12, w: W * 0.5 - 0.8, h: 0.28,
      fontSize: 8.5, color: GOLD, bold: true, fontFace: "Calibri", charSpacing: 1.5,
    });
    const viaItems = oceanConclusions.viaComparison.map((b: string) => ({
      text: b,
      options: { bullet: { code: "25CF", color: GOLD }, color: WHITE, fontSize: 11, fontFace: "Calibri", paraSpaceAfter: 3 },
    }));
    slide.addText(viaItems, { x: W * 0.5 + 0.2, y: divY + 0.42, w: W * 0.5 - 0.8, h: 1.5, valign: "top" });

    addFooter(slide, name, 5, TOTAL);
  }

  // ── SLIDE 6: Behavioural Style — descriptor 14pt, "On bad day" ────────────
  {
    const slide = pptx.addSlide();
    slide.addShape("rect", { x: 0, y: 0, w: W, h: H, fill: { color: NAVY }, line: { color: NAVY } });
    slide.addShape("rect", { x: 0, y: 0, w: 0.12, h: H, fill: { color: GOLD }, line: { color: GOLD } });

    addLogo(slide);
    addEyebrow(slide, "Chapter 5");
    addHeading(slide, "Behavioural Style");
    addAccentBar(slide);

    // Primary colour box
    const primaryHex = COLOUR_HEX[data.primaryColour] ?? GOLD;
    slide.addShape("rect", { x: 0.55, y: 1.5, w: 3.5, h: 2.0, fill: { color: primaryHex }, line: { color: primaryHex } });
    slide.addText("PRIMARY", { x: 0.55, y: 1.55, w: 3.5, h: 0.35, fontSize: 8, color: WHITE, bold: true, fontFace: "Calibri", align: "center", charSpacing: 2 });
    slide.addText(data.primaryColour || "—", { x: 0.55, y: 2.1, w: 3.5, h: 0.65, fontSize: 20, color: WHITE, bold: true, fontFace: "Georgia", align: "center", valign: "middle" });
    // Descriptor at 14pt
    slide.addText(COLOUR_DESCRIPTORS[data.primaryColour] ?? "", {
      x: 0.55, y: 3.55, w: 3.5, h: 0.4,
      fontSize: 14, color: WHITE, fontFace: "Calibri", align: "center", italic: true,
    });

    // Secondary colour box
    const secondaryHex = COLOUR_HEX[data.secondaryColour] ?? LIGHT_NAVY;
    slide.addShape("rect", { x: 4.3, y: 1.5, w: 2.4, h: 2.0, fill: { color: secondaryHex }, line: { color: secondaryHex } });
    slide.addText("SECONDARY", { x: 4.3, y: 1.55, w: 2.4, h: 0.35, fontSize: 8, color: WHITE, bold: true, fontFace: "Calibri", align: "center", charSpacing: 2 });
    slide.addText(data.secondaryColour || "—", { x: 4.3, y: 2.1, w: 2.4, h: 0.65, fontSize: 16, color: WHITE, bold: true, fontFace: "Georgia", align: "center", valign: "middle" });
    // Descriptor at 14pt
    slide.addText(COLOUR_DESCRIPTORS[data.secondaryColour] ?? "", {
      x: 4.3, y: 3.55, w: 2.4, h: 0.4,
      fontSize: 14, color: WHITE, fontFace: "Calibri", align: "center", italic: true,
    });

    // Jungian type
    slide.addText("JUNGIAN TYPE", { x: 7.2, y: 1.5, w: 5.5, h: 0.35, fontSize: 8, color: GOLD, bold: true, fontFace: "Calibri", charSpacing: 2 });
    slide.addText(data.jungianType || "—", { x: 7.2, y: 1.9, w: 5.5, h: 1.0, fontSize: 52, color: WHITE, bold: true, fontFace: "Georgia" });

    // "On bad day" section — primary colour
    const badDayText = COLOUR_BAD_DAY[data.primaryColour] ?? "";
    if (badDayText) {
      slide.addShape("rect", { x: 0.55, y: 4.1, w: W - 1.1, h: 0.04, fill: { color: GOLD }, line: { color: GOLD } });
      slide.addText(badDayText, {
        x: 0.55, y: 4.2, w: W - 1.1, h: 0.7,
        fontSize: 12, color: MUTED, fontFace: "Calibri", italic: true,
      });
    }

    addFooter(slide, name, 6, TOTAL);
  }

  // ── SLIDE 7: Development Edge ──────────────────────────────────────────────────────────────
  {
    const slide = pptx.addSlide();
    slide.addShape("rect", { x: 0, y: 0, w: W, h: H, fill: { color: NAVY }, line: { color: NAVY } });
    slide.addShape("rect", { x: 0, y: 0, w: 0.12, h: H, fill: { color: GOLD }, line: { color: GOLD } });

    addLogo(slide);
    addEyebrow(slide, "Chapter 6");
    addHeading(slide, "Development Edge");
    addAccentBar(slide);

    slide.addText("Where the evidence points to growth opportunities", {
      x: 0.55, y: 1.32, w: W - 1.1, h: 0.3,
      fontSize: 14, color: MUTED, fontFace: "Calibri", italic: true,
    });

    // Split any single long bullet into sentence-per-bullet
    const splitSentences = (bullets: string[]): string[] => {
      const result: string[] = [];
      for (const b of bullets) {
        const sentences = b.split(/(?<=[.!?])\s+(?=[A-Z])/).map(s => s.trim()).filter(s => s.length > 4);
        if (sentences.length > 1) result.push(...sentences);
        else result.push(b);
      }
      return result;
    };
    const devBulletsExpanded = splitSentences(devEdgeBullets);
    const devItems7 = devBulletsExpanded.map((b) => ({
      text: b,
      options: { bullet: { code: "25CF", color: GOLD }, color: WHITE, fontSize: 28, fontFace: "Calibri", paraSpaceAfter: 10 },
    }));
    slide.addText(devItems7, { x: 0.55, y: 1.72, w: W - 1.1, h: 4.5, valign: "top", align: "left" });
    addFooter(slide, name, 7, TOTAL);
  }

  // ── SLIDE 8: Tell Me About Yourself ───────────────────────────────────────────────────────────
  {
    // Extract the Tell Me About Yourself paragraph from coachingQuestions
    // The stored text uses a plain heading (no ## prefix) followed by the intro line then the content
    const extractTellMe9 = (text: string): Array<{ text: string; options: any }> => {
      const idx = text.search(/Tell Me About Yourself/i);
      if (idx < 0) return [];
      const after = text.slice(idx);
      // Skip the heading line and the intro line
      const body = after
        .replace(/^Tell Me About Yourself[^\n]*\n+/i, '')
        .replace(/^The following is a suggested answer[^\n]*\n+/i, '')
        .replace(/^drawn from everything[^\n]*\n+/i, '')
        .trim();
      // Split into lines and build pptxgenjs paragraph objects
      const lines = body.split(/\n/).filter(l => l.trim());
      const runs: Array<{ text: string; options: any }> = [];
      for (const line of lines) {
        const isBullet = /^[*\-]\s+/.test(line.trim());
        const clean = line.replace(/^[*\-]\s+/, '').replace(/\*\*/g, '').trim();
        // Display verbatim — second person throughout
        const display = clean;
        runs.push({
          text: (isBullet ? '\u2022  ' : '') + display + '\n',
          options: {
            fontSize: isBullet ? 18 : 18,
            bold: isBullet,
            color: NAVY,
            fontFace: "Georgia",
            paraSpaceAfter: isBullet ? 2 : 6,
          }
        });
      }
      return runs;
    };
    const tellMeRuns = extractTellMe9(data.coachingQuestions ?? "");

    const slide = pptx.addSlide();
    slide.addShape("rect", { x: 0, y: 0, w: W, h: H, fill: { color: CREAM }, line: { color: CREAM } });
    slide.addShape("rect", { x: 0, y: 0, w: W, h: 1.4, fill: { color: NAVY }, line: { color: NAVY } });
    slide.addShape("rect", { x: 0, y: 0, w: 0.12, h: H, fill: { color: GOLD }, line: { color: GOLD } });

    addLogo(slide);
    addEyebrow(slide, "Chapter 7");
    addHeading(slide, "Tell Me About Yourself");

    slide.addText("A suggested answer \u2014 drawn from everything your Lifework analysis has revealed", {
      x: 0.55, y: 1.48, w: W - 1.1, h: 0.32,
      fontSize: 10, color: NAVY, fontFace: "Calibri", italic: true,
    });
    slide.addShape("rect", { x: 0.55, y: 1.82, w: W - 1.1, h: 0.02, fill: { color: GOLD }, line: { color: GOLD } });

    if (tellMeRuns.length > 0) {
      slide.addText(tellMeRuns, {
        x: 0.55, y: 1.9, w: W - 1.1, h: H - 2.6,
        valign: "top",
      });
    } else {
      slide.addText("(Conclusions chapter not yet generated \u2014 generate the WOW Report first)", {
        x: 0.55, y: 1.9, w: W - 1.1, h: H - 2.6,
        fontSize: 12, color: NAVY, fontFace: "Georgia", valign: "top", italic: true,
      });
    }

    addFooter(slide, name, 8, TOTAL);
  }

  // ── SLIDE 9: Career Directions ──────────────────────────────────────────────────────────────
  {
    const slide = pptx.addSlide();
    slide.addShape("rect", { x: 0, y: 0, w: W, h: H, fill: { color: CREAM }, line: { color: CREAM } });
    slide.addShape("rect", { x: 0, y: 0, w: W, h: 1.4, fill: { color: NAVY }, line: { color: NAVY } });
    slide.addShape("rect", { x: 0, y: 0, w: 0.12, h: H, fill: { color: GOLD }, line: { color: GOLD } });

    addLogo(slide);
    addEyebrow(slide, "Chapter 8");
    addHeading(slide, "Career Directions");

    slide.addShape("rect", { x: 0.55, y: 1.5, w: W - 1.1, h: 0.65, fill: { color: NAVY }, line: { color: GOLD, pt: 1 } });
    slide.addText("Your question for today:", {
      x: 0.75, y: 1.52, w: W - 1.5, h: 0.6,
      fontSize: 11, color: GOLD, bold: true, fontFace: "Calibri", valign: "middle",
    });
    slide.addText("What the evidence suggests you might be considering", {
      x: 0.55, y: 2.28, w: W - 1.1, h: 0.38,
      fontSize: 14, color: NAVY, fontFace: "Calibri", italic: true, bold: false,
    });
    // Split any single long bullet into sentence-per-bullet
    const soWhatExpanded = soWhatBullets.flatMap((b) => {
      const sentences = b.split(/(?<=[.!?])\s+(?=[A-Z])/).map(s => s.trim()).filter(s => s.length > 4);
      return sentences.length > 1 ? sentences : [b];
    });
    const items10 = soWhatExpanded.map((b) => ({
      text: b,
      options: { bullet: { code: "25CF", color: GOLD }, color: NAVY, fontSize: 28, fontFace: "Georgia", bold: true, paraSpaceAfter: 10 },
    }));
    slide.addText(items10, { x: 0.55, y: 2.75, w: W - 1.1, h: 3.5, valign: "top", align: "left" });
    addFooter(slide, name, 9, TOTAL);
  }

  // ── Write to buffer ────────────────────────────────────────────────────────
  const buffer = await pptx.write({ outputType: "nodebuffer" }) as unknown as Buffer;
  return buffer;
}
// ─── tRPC procedure wrapper ───────────────────────────────────────────────────
const counselorProcedure = protectedProcedure.use(({ ctx, next }: { ctx: any; next: any }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Counselor access required" });
  }
  return next({ ctx });
});

export const coachingSlidesRouter = router({
  generate: counselorProcedure
    .input(z.object({ clientId: z.number() }))
    .mutation(async ({ input }) => {
      const report = await getAnalysisReport(input.clientId);
      if (!report || !report.wowReportJson) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No WOW report found for this client. Generate the WOW Report first.",
        });
      }

      let sections: SlideSections;
      try {
        sections = JSON.parse(report.wowReportJson) as SlideSections;
      } catch {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Stored report sections are corrupted." });
      }

      // Fetch facetScores fresh from DB if not present in stored JSON (older reports)
      if (!sections.facetScores || Object.keys(sections.facetScores).length === 0) {
        try {
          const { getIpipResults } = await import("../db.js");
          const ipip = await getIpipResults(input.clientId);
          if (ipip?.facetScores) {
            sections.facetScores = typeof ipip.facetScores === "string"
              ? JSON.parse(ipip.facetScores)
              : ipip.facetScores;
          }
        } catch { /* best-effort */ }
      }

      const pptxBuffer = await generateCoachingSlides(sections);
      const fileKey = `coaching-slides/client-${input.clientId}-${Date.now()}.pptx`;
      const { url } = await storagePut(
        fileKey,
        pptxBuffer,
        "application/vnd.openxmlformats-officedocument.presentationml.presentation"
      );

      return { url };
    }),
});
