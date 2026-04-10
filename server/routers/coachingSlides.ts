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
  try { slide.addImage({ data: LIFEWORK_LOGO_BASE64, x: W - 1.4, y: 0.2, w: 1.0, h: 0.5 }); } catch { /* skip */ }
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
  behaviouralStyle: string;
  primaryColour: string;
  secondaryColour: string;
  jungianType: string;
  careerDirections: string;
  reportType: string;
}

export async function generateCoachingSlides(data: SlideSections): Promise<Buffer> {
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";

  const TOTAL = 8;
  const name = data.clientName || "Client";

  // ── Extract all LLM content in parallel ──────────────────────────────────
  const [
    summaryBulletsWithEx,
    lifeBulletsWithEx,
    viaEvidence,
    oceanConclusions,
    patternBullets,
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
      "The pattern across all instruments",
      "So what? — your next steps",
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
      // Main bullet at 32pt
      slide.addText([{
        text: item.bullet ?? "—",
        options: { bullet: { code: "25CF", color: GOLD }, color: WHITE, fontSize: 22, fontFace: "Georgia", bold: true, paraSpaceAfter: 2 },
      }], { x: 0.55, y, w: W - 1.1, h: 0.55 });
      // Two examples at 13pt in muted colour
      const exampleText = (item.examples ?? ["—", "—"]).map((ex: string, j: number) => `${j === 0 ? "e.g." : "or"} ${ex}`).join("   ·   ");
      slide.addText(exampleText, {
        x: 0.75, y: y + 0.52, w: W - 1.3, h: 0.3,
        fontSize: 11, color: MUTED, fontFace: "Calibri", italic: true,
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
        options: { bullet: { code: "25CF", color: GOLD }, color: WHITE, fontSize: 22, fontFace: "Georgia", bold: true, paraSpaceAfter: 2 },
      }], { x: 0.55, y, w: W - 1.1, h: 0.55 });
      const exampleText = (item.examples ?? ["—", "—"]).map((ex: string, j: number) => `${j === 0 ? "e.g." : "or"} ${ex}`).join("   ·   ");
      slide.addText(exampleText, {
        x: 0.75, y: y + 0.52, w: W - 1.3, h: 0.3,
        fontSize: 11, color: MUTED, fontFace: "Calibri", italic: true,
      });
    });

    addFooter(slide, name, 3, TOTAL);
  }

  // ── SLIDE 4: Character Strengths — evidence table (no bars) ───────────────
  {
    const slide = pptx.addSlide();
    slide.addShape("rect", { x: 0, y: 0, w: W, h: H, fill: { color: NAVY }, line: { color: NAVY } });
    slide.addShape("rect", { x: 0, y: 0, w: 0.12, h: H, fill: { color: GOLD }, line: { color: GOLD } });

    addLogo(slide);
    addEyebrow(slide, "Chapter 3");
    addHeading(slide, "Character Strengths");
    addAccentBar(slide);

    // Column headers
    slide.addText("Strength", {
      x: 0.55, y: 1.38, w: 2.8, h: 0.28,
      fontSize: 8, color: GOLD, bold: true, fontFace: "Calibri", charSpacing: 1.5,
    });
    slide.addText("Evidence from your life history", {
      x: 3.5, y: 1.38, w: W - 4.0, h: 0.28,
      fontSize: 8, color: GOLD, bold: true, fontFace: "Calibri", charSpacing: 1.5,
    });
    // Header divider
    slide.addShape("rect", { x: 0.55, y: 1.67, w: W - 1.1, h: 0.015, fill: { color: GOLD }, line: { color: GOLD } });

    const rowH = 0.88;
    viaEvidence.slice(0, 5).forEach((row, i) => {
      const y = 1.72 + i * rowH;
      // Alternating row tint
      if (i % 2 === 0) {
        slide.addShape("rect", { x: 0.55, y, w: W - 1.1, h: rowH - 0.06, fill: { color: LIGHT_NAVY }, line: { color: LIGHT_NAVY } });
      }
      // Rank circle
      slide.addShape("ellipse", { x: 0.6, y: y + 0.18, w: 0.38, h: 0.38, fill: { color: GOLD }, line: { color: GOLD } });
      slide.addText(String(i + 1), {
        x: 0.6, y: y + 0.18, w: 0.38, h: 0.38,
        fontSize: 10, color: NAVY, bold: true, fontFace: "Calibri", align: "center", valign: "middle",
      });
      // Strength name
      slide.addText(row.strength ?? "—", {
        x: 1.1, y: y + 0.1, w: 2.3, h: 0.65,
        fontSize: 13, color: WHITE, bold: true, fontFace: "Calibri", valign: "middle",
      });
      // Evidence items
      const ev = row.evidence ?? ["—", "—"];
      slide.addText(`· ${ev[0] ?? "—"}`, {
        x: 3.5, y: y + 0.06, w: W - 4.0, h: 0.35,
        fontSize: 11, color: WHITE, fontFace: "Calibri",
      });
      slide.addText(`· ${ev[1] ?? "—"}`, {
        x: 3.5, y: y + 0.42, w: W - 4.0, h: 0.35,
        fontSize: 11, color: MUTED, fontFace: "Calibri",
      });
    });

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
    const BAR_MAX_W = W - 5.5;
    // Top half: bars (compressed into rows of 0.55 each)
    domains.forEach((key, i) => {
      const score = scores[key] ?? 50;
      const y = 1.42 + i * 0.55;
      const barW = (score / 100) * BAR_MAX_W;
      const label = OCEAN_LABELS[key] ?? key;

      slide.addText(label, { x: 0.55, y, w: 2.8, h: 0.3, fontSize: 11, color: WHITE, fontFace: "Calibri", bold: true });
      slide.addShape("rect", { x: 3.5, y: y + 0.04, w: BAR_MAX_W, h: 0.22, fill: { color: LIGHT_NAVY }, line: { color: LIGHT_NAVY } });
      if (barW > 0) {
        const barColour = score >= 60 ? GOLD : score <= 40 ? "4a6fa5" : "6b8cba";
        slide.addShape("rect", { x: 3.5, y: y + 0.04, w: barW, h: 0.22, fill: { color: barColour }, line: { color: barColour } });
      }
      slide.addText(`${Math.round(score)}`, { x: 3.5 + BAR_MAX_W + 0.1, y, w: 0.6, h: 0.3, fontSize: 10, color: MUTED, fontFace: "Calibri" });
    });

    // Divider between halves
    const divY = 4.2;
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

  // ── SLIDE 7: The Pattern (synthesis) — descriptor 14pt, "On bad day" ──────
  {
    const slide = pptx.addSlide();
    slide.addShape("rect", { x: 0, y: 0, w: W, h: H, fill: { color: NAVY }, line: { color: NAVY } });
    slide.addShape("rect", { x: 0, y: 0, w: 0.12, h: H, fill: { color: GOLD }, line: { color: GOLD } });

    addLogo(slide);
    addEyebrow(slide, "Synthesis");
    addHeading(slide, "The Pattern");
    addAccentBar(slide);

    slide.addText("What emerges when all the instruments are read together", {
      x: 0.55, y: 1.32, w: W - 1.1, h: 0.3,
      fontSize: 14, color: MUTED, fontFace: "Calibri", italic: true,
    });

    const patternItems = patternBullets.map((b) => ({
      text: b,
      options: { bullet: { code: "25CF", color: GOLD }, color: WHITE, fontSize: 15, fontFace: "Calibri", paraSpaceAfter: 8 },
    }));
    slide.addText(patternItems, { x: 0.55, y: 1.72, w: W - 1.1, h: 2.8, valign: "top" });

    // "On bad day" for secondary colour (the shadow side of the pattern)
    const badDayText = COLOUR_BAD_DAY[data.secondaryColour] ?? COLOUR_BAD_DAY[data.primaryColour] ?? "";
    if (badDayText) {
      slide.addShape("rect", { x: 0.55, y: 4.65, w: W - 1.1, h: 0.04, fill: { color: GOLD }, line: { color: GOLD } });
      slide.addText(badDayText, {
        x: 0.55, y: 4.75, w: W - 1.1, h: 0.7,
        fontSize: 12, color: MUTED, fontFace: "Calibri", italic: true,
      });
    }

    addFooter(slide, name, 7, TOTAL);
  }

  // ── SLIDE 8: So What? — subtitle 14pt, bullets 32pt ───────────────────────
  {
    const slide = pptx.addSlide();
    slide.addShape("rect", { x: 0, y: 0, w: W, h: H, fill: { color: CREAM }, line: { color: CREAM } });
    slide.addShape("rect", { x: 0, y: 0, w: W, h: 1.4, fill: { color: NAVY }, line: { color: NAVY } });
    slide.addShape("rect", { x: 0, y: 0, w: 0.12, h: H, fill: { color: GOLD }, line: { color: GOLD } });

    addLogo(slide);
    addEyebrow(slide, "Application");
    addHeading(slide, "So What?");

    // Subtitle at 14pt
    slide.addText("Career directions — what this means for you", {
      x: 0.55, y: 1.5, w: W - 1.1, h: 0.38,
      fontSize: 14, color: NAVY, fontFace: "Calibri", italic: true, bold: false,
    });

    // Career direction bullets at 32pt (large, impactful)
    const items = soWhatBullets.map((b) => ({
      text: b,
      options: { bullet: { code: "25CF", color: GOLD }, color: NAVY, fontSize: 18, fontFace: "Georgia", bold: true, paraSpaceAfter: 10 },
    }));
    slide.addText(items, { x: 0.55, y: 2.0, w: W - 1.1, h: 4.0, valign: "top" });

    // "Your question" prompt box at bottom
    slide.addShape("rect", { x: 0.55, y: H - 1.2, w: W - 1.1, h: 0.65, fill: { color: NAVY }, line: { color: GOLD, pt: 1 } });
    slide.addText("Your question for today:", {
      x: 0.75, y: H - 1.15, w: 3.5, h: 0.55,
      fontSize: 9, color: GOLD, bold: true, fontFace: "Calibri", valign: "middle",
    });

    addFooter(slide, name, 8, TOTAL);
  }

  // ── Write to buffer ────────────────────────────────────────────────────────
  const buffer = await pptx.write({ outputType: "nodebuffer" }) as unknown as Buffer;
  return buffer;
}

// ─── tRPC procedure wrapper ───────────────────────────────────────────────────
import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc.js";
import { TRPCError } from "@trpc/server";

const counselorProcedure = protectedProcedure.use(({ ctx, next }: { ctx: any; next: any }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Counselor access required" });
  }
  return next({ ctx });
});
import { getAnalysisReport } from "../db.js";

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
