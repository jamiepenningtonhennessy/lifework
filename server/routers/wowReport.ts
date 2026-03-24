/**
 * WOW Report Router
 *
 * Generates a premium 7-section AI career analysis report for a client,
 * renders it as a branded PDF (navy/gold/cream, Playfair Display), uploads
 * to S3, and stores the URL in analysis_reports.wowReportPdfUrl.
 *
 * Sections:
 *   1. Your Lifework Summary          — 200-word portrait
 *   2. Your Life History Pattern      — recurring themes from achievements
 *   3. Your Character Strengths (VIA) — top 7 with narrative
 *   4. Your Personality Profile       — Big Five with career implications
 *   5. Career Directions              — 3-5 tailored directions
 *   6. Your Development Edge          — constructive growth areas
 *   7. Questions for Your Coaching Conversation
 */

import { createRequire } from "module";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../_core/trpc";
import { invokeLLM } from "../_core/llm";
import { storagePut } from "../storage";

import {
  getClientProfileById,
  getAchievements,
  getFamilyBackground,
  getEducationHistory,
  getCareerHistory,
  getViaResults,
  getIpipResults,
  getAnalysisReport,
  upsertAnalysisReport,
} from "../db";

// pdfmake is CJS-only; use createRequire so it works in the ESM server context
const _require = createRequire(import.meta.url);

// ─── VIA Strength Descriptions ───────────────────────────────────────────────

const VIA_DESCRIPTIONS: Record<string, string> = {
  Creativity: "Thinking of novel and productive ways to conceptualise and do things.",
  Curiosity: "Taking an interest in ongoing experience for its own sake; finding subjects and topics fascinating.",
  Judgment: "Thinking things through and examining them from all sides; not jumping to conclusions.",
  "Love of Learning": "Mastering new skills, topics, and bodies of knowledge, whether on one's own or formally.",
  Perspective: "Being able to provide wise counsel to others; having ways of looking at the world that make sense to oneself and to other people.",
  Bravery: "Not shrinking from threat, challenge, difficulty, or pain; speaking up for what is right.",
  Perseverance: "Finishing what one starts; persisting in a course of action in spite of obstacles.",
  Honesty: "Speaking the truth but more broadly presenting oneself in a genuine way and acting without pretence.",
  Zest: "Approaching life with excitement and energy; not doing things halfway or half-heartedly.",
  Love: "Valuing close relations with others, in particular those in which sharing and caring are reciprocated.",
  Kindness: "Doing favours and good deeds for others; helping them; taking care of them.",
  "Social Intelligence": "Being aware of the motives and feelings of other people and oneself.",
  Teamwork: "Working well as a member of a group or team; being loyal to the group.",
  Fairness: "Treating all people the same according to notions of fairness and justice.",
  Leadership: "Encouraging a group of which one is a member to get things done and at the same time maintain good relations within the group.",
  Forgiveness: "Forgiving those who have done wrong; accepting the shortcomings of others.",
  Humility: "Letting one's accomplishments speak for themselves; not regarding oneself as more special than one is.",
  Prudence: "Being careful about one's choices; not taking undue risks; not saying or doing things that might later be regretted.",
  "Self-Regulation": "Regulating what one feels and does; being disciplined; controlling one's appetites and emotions.",
  "Appreciation of Beauty": "Noticing and appreciating beauty, excellence, and/or skilled performance in various domains of life.",
  Gratitude: "Being aware of and thankful for the good things that happen; taking time to express thanks.",
  Hope: "Expecting the best in the future and working to achieve it; believing that a good future is something that can be brought about.",
  Humor: "Liking to laugh and tease; bringing smiles to other people; seeing the light side.",
  Spirituality: "Having coherent beliefs about the higher purpose and meaning of the universe.",
};

// ─── Big Five Domain Labels ───────────────────────────────────────────────────

const BIG5_LABELS: Record<string, { name: string; low: string; high: string }> = {
  N: { name: "Neuroticism", low: "Emotionally stable and calm", high: "Emotionally reactive and sensitive" },
  E: { name: "Extraversion", low: "Reflective and independent", high: "Energised by people and action" },
  O: { name: "Openness", low: "Practical and conventional", high: "Imaginative and intellectually curious" },
  A: { name: "Agreeableness", low: "Direct and competitive", high: "Cooperative, empathetic, and trusting" },
  C: { name: "Conscientiousness", low: "Flexible and spontaneous", high: "Organised, disciplined, and goal-directed" },
};

// ─── Helper: Build client data context string ─────────────────────────────────

async function buildClientContext(clientId: number): Promise<{
  clientName: string;
  pronouns: string;
  contextText: string;
  viaRanked: Array<{ strength: string; score: number; rank: number }>;
  domainScores: Record<string, number>;
  facetScores: Record<string, number>;
}> {
  const [profile, achievementsList, family, education, career, via, ipip] = await Promise.all([
    getClientProfileById(clientId),
    getAchievements(clientId),
    getFamilyBackground(clientId),
    getEducationHistory(clientId),
    getCareerHistory(clientId),
    getViaResults(clientId),
    getIpipResults(clientId),
  ]);

  if (!profile) throw new TRPCError({ code: "NOT_FOUND", message: "Client not found" });

  const clientName = profile.firstName ?? "the client";
  const pronouns = profile.pronouns ?? "they/them";

  // Parse VIA
  const viaRanked: Array<{ strength: string; score: number; rank: number }> = (() => {
    try {
      const r = via?.rankedStrengths;
      if (!r) return [];
      return typeof r === "string" ? JSON.parse(r) : (r as any[]);
    } catch { return []; }
  })();

  // Parse IPIP
  const domainScores: Record<string, number> = (() => {
    try {
      const d = ipip?.domainScores;
      if (!d) return {};
      return typeof d === "string" ? JSON.parse(d) : (d as Record<string, number>);
    } catch { return {}; }
  })();
  const facetScores: Record<string, number> = (() => {
    try {
      const f = ipip?.facetScores;
      if (!f) return {};
      return typeof f === "string" ? JSON.parse(f) : (f as Record<string, number>);
    } catch { return {}; }
  })();

  // Build context text
  const lines: string[] = [];

  lines.push(`CLIENT: ${clientName}`);
  lines.push(`PRONOUNS: ${pronouns}`);
  if (profile.currentRole) lines.push(`CURRENT ROLE: ${profile.currentRole}`);
  if (profile.currentOrg) lines.push(`CURRENT ORGANISATION: ${profile.currentOrg}`);

  if (achievementsList.length > 0) {
    lines.push("\n--- LIFE HISTORY ACHIEVEMENTS ---");
    for (const a of achievementsList) {
      lines.push(`[${a.decade?.toUpperCase() ?? "??"}, Age ${a.age ?? "?"}] ${a.title} (${a.esf ?? "?"})`);
      if (a.description) lines.push(`  ${a.description}`);
      if (a.othersObservations) lines.push(`  Others observed: ${a.othersObservations}`);
    }
  }

  if (family) {
    lines.push("\n--- FAMILY BACKGROUND ---");
    if (family.fatherOccupation) lines.push(`Father: ${family.fatherOccupation}`);
    if (family.motherOccupation) lines.push(`Mother: ${family.motherOccupation}`);
    if (family.siblingPosition) lines.push(`Sibling position: ${family.siblingPosition}`);
    if (family.upbringingLocation) lines.push(`Upbringing: ${family.upbringingLocation}`);
    if (family.familyNarrative) lines.push(`Family narrative: ${family.familyNarrative}`);
    if (family.significantInfluences) lines.push(`Significant influences: ${family.significantInfluences}`);
  }

  if (education.length > 0) {
    lines.push("\n--- EDUCATION ---");
    for (const e of education) {
      lines.push(`${e.institution} — ${e.qualification ?? ""} ${e.subject ?? ""} (${e.yearFrom ?? ""}–${e.yearTo ?? ""})`);
      if (e.highlights) lines.push(`  ${e.highlights}`);
    }
  }

  if (career.length > 0) {
    lines.push("\n--- CAREER HISTORY ---");
    for (const c of career) {
      lines.push(`${c.organisation} — ${c.role ?? ""} (${c.yearFrom ?? ""}–${c.yearTo ?? ""})`);
      if (c.keyResponsibilities) lines.push(`  ${c.keyResponsibilities}`);
      if (c.highlights) lines.push(`  Highlights: ${c.highlights}`);
      if (c.whyLeft) lines.push(`  Why left: ${c.whyLeft}`);
    }
  }

  if (viaRanked.length > 0) {
    lines.push("\n--- VIA CHARACTER STRENGTHS (ranked) ---");
    viaRanked.slice(0, 10).forEach((s, i) => {
      lines.push(`${i + 1}. ${s.strength} (score: ${s.score})`);
    });
  }

  if (Object.keys(domainScores).length > 0) {
    lines.push("\n--- BIG FIVE PERSONALITY (IPIP-NEO, percentile 0-100) ---");
    for (const [key, val] of Object.entries(domainScores)) {
      const label = BIG5_LABELS[key];
      if (label) lines.push(`${label.name}: ${val} — ${val >= 60 ? label.high : val <= 40 ? label.low : "moderate"}`);
    }
  }

  return { clientName, pronouns, contextText: lines.join("\n"), viaRanked, domainScores, facetScores };
}

// ─── Helper: Generate all 7 sections via LLM ─────────────────────────────────

interface WowReportSections {
  clientName: string;
  generatedAt: string;
  summary: string;
  lifeHistoryPattern: string;
  viaSection: string;
  personalitySection: string;
  careerDirections: string;
  developmentEdge: string;
  coachingQuestions: string;
  viaRanked: Array<{ strength: string; score: number; rank: number }>;
  domainScores: Record<string, number>;
}

// ─── Helper: call LLM with a per-request timeout ────────────────────────────
async function callLLMWithTimeout(
  systemPrompt: string,
  userPrompt: string,
  timeoutMs = 90_000
): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const apiUrl = (process.env.BUILT_IN_FORGE_API_URL ?? "https://forge.manus.im").replace(/\/$/, "");
    const apiKey = process.env.BUILT_IN_FORGE_API_KEY ?? "";
    const resp = await fetch(`${apiUrl}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 4096,
      }),
      signal: controller.signal,
    });
    if (!resp.ok) {
      const txt = await resp.text();
      throw new Error(`LLM error ${resp.status}: ${txt.substring(0, 200)}`);
    }
    const data = await resp.json() as { choices: Array<{ message: { content: string } }> };
    return data.choices[0]?.message?.content ?? "";
  } finally {
    clearTimeout(timer);
  }
}

async function generateWowSections(clientId: number): Promise<WowReportSections> {
  const { clientName, pronouns, contextText, viaRanked, domainScores } = await buildClientContext(clientId);
  // pronouns is a string like "they/them/their" or "he/him/his" or "she/her/her"
  const pronounParts = pronouns.split("/");
  const subj = pronounParts[0] ?? "they";
  const poss = pronounParts[2] ?? pronounParts[1] ?? "their";

  const sys = `You are a senior career analyst at Pennington Hennessy, trained in the Dependable Strengths methodology of Bernard Haldane. You write premium career analysis reports that combine rigorous psychometric interpretation with deep life history analysis. Your writing is warm, precise, and personal. Write in second person ("You are...") throughout. Use the client's first name (${clientName}) naturally. Use pronouns: ${pronouns}. Write in flowing paragraphs — never bullet points.`;

  const ctx = `CLIENT DATA FOR ${clientName.toUpperCase()}:\n${contextText}`;

  console.log(`[WOW Report] Starting 7-section parallel generation for client ${clientId}`);

  // Run all 7 sections in parallel — each with its own 90s timeout
  const [
    summary,
    lifeHistoryPattern,
    viaSection,
    personalitySection,
    careerDirections,
    developmentEdge,
    coachingQuestions,
  ] = await Promise.all([
    callLLMWithTimeout(sys,
      `${ctx}\n\nWrite a single 250-word portrait of ${clientName} as a professional. This is the opening "wow" statement — synthesise life history patterns, character strengths, and personality into the most insightful thing anyone has ever said about ${clientName}'s career. Begin with "${clientName} is..."`
    ),
    callLLMWithTimeout(sys,
      `${ctx}\n\nWrite 3-4 paragraphs identifying recurring themes across ${clientName}'s life history achievements. What patterns emerge across the decades? What do the Enjoyable/Satisfying/Fulfilling classifications reveal? What did others consistently notice? Connect these patterns to ${subj} current professional identity. Reference actual achievements from the data.`
    ),
    callLLMWithTimeout(sys,
      `${ctx}\n\nWrite an interpretive narrative for ${clientName}'s top 7 VIA Character Strengths. For each strength, write 2-3 sentences: what it means in ${clientName}'s specific context, and how it has shown up in ${subj} life history. Then write a 2-paragraph synthesis: how these strengths work together as a system, and what they mean for ${clientName}'s career.`
    ),
    callLLMWithTimeout(sys,
      `${ctx}\n\nWrite an interpretive narrative of ${clientName}'s Big Five personality profile. For each of the five domains, write 2-3 sentences interpreting the score in the context of ${clientName}'s career and life history. Then write a 2-paragraph "Working Style" synthesis: how ${clientName} operates at ${subj} best, and what environments bring out the best in ${subj}.`
    ),
    callLLMWithTimeout(sys,
      `${ctx}\n\nWrite 3-5 career directions for ${clientName}, each as a paragraph. For each: name the direction clearly, explain why it fits ${clientName}'s specific combination of life history, character strengths, and personality, and give one concrete example of what it could look like in practice. These should feel tailored and specific — not generic job titles.`
    ),
    callLLMWithTimeout(sys,
      `${ctx}\n\nWrite 2-3 paragraphs on ${clientName}'s development edge — the areas where growth would most expand ${subj} career options. Frame these constructively as "edges to develop" rather than weaknesses. Connect each to specific data from the profile. End with an encouraging observation about ${clientName}'s capacity for growth.`
    ),
    callLLMWithTimeout(sys,
      `${ctx}\n\nWrite 6 reflective questions for ${clientName} to explore in ${poss} coaching conversation. These should be open, specific to ${clientName}'s data, and designed to deepen self-understanding. Introduce them with one sentence: "These questions are designed to take you deeper into what you have already discovered about yourself."`
    ),
  ]);

  console.log(`[WOW Report] All 7 sections generated successfully for client ${clientId}`);

  return {
    clientName,
    generatedAt: new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }),
    summary,
    lifeHistoryPattern,
    viaSection,
    personalitySection,
    careerDirections,
    developmentEdge,
    coachingQuestions,
    viaRanked,
    domainScores,
  };
}

// ─── Helper: Render PDF with pdfmake ─────────────────────────────────────────

// ─── Helper: Render PDF with pdfmake 0.3.x ───────────────────────────────────

async function renderWowPdf(sections: WowReportSections): Promise<Buffer> {
  // pdfmake 0.3.x server API — load via createRequire (ESM-compatible)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfmake = _require("pdfmake") as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const RobotoFonts = _require("pdfmake/fonts/Roboto") as any;
  pdfmake.addFonts(RobotoFonts);

  // ── Colour palette ──
  const NAVY = "#0a1628";
  const GOLD = "#c9973a";
  const CREAM = "#f5f0e8";
  const LIGHT_GOLD = "#f0e6cc";
  const DARK_GREY = "#2c2c2c";
  const MID_GREY = "#666666";

  // ── Helpers ──
  const para = (text: string, opts: Record<string, unknown> = {}) => ({
    text,
    font: "Roboto",
    fontSize: 10.5,
    color: DARK_GREY,
    lineHeight: 1.5,
    margin: [0, 0, 0, 8] as [number, number, number, number],
    ...opts,
  });

  const heading = (text: string) => ({
    text,
    font: "Roboto",
    fontSize: 14,
    bold: true,
    color: NAVY,
    margin: [0, 20, 0, 6] as [number, number, number, number],
  });

  const subheading = (text: string) => ({
    text,
    font: "Roboto",
    fontSize: 11,
    bold: true,
    color: GOLD,
    margin: [0, 10, 0, 4] as [number, number, number, number],
  });

  const divider = () => ({
    canvas: [{ type: "line", x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 0.5, lineColor: LIGHT_GOLD }],
    margin: [0, 8, 0, 8] as [number, number, number, number],
  });

  // ── Markdown → pdfmake converter ──
  // Handles: ## headings, ### subheadings, **bold** inline, bullet lists, numbered lists, plain paragraphs
  const parseBoldInline = (text: string): unknown => {
    if (!text.includes("**")) return text;
    const parts: unknown[] = [];
    const segments = text.split(/(\*\*[^*]+\*\*)/);
    for (const seg of segments) {
      if (seg.startsWith("**") && seg.endsWith("**")) {
        parts.push({ text: seg.slice(2, -2), bold: true });
      } else if (seg) {
        parts.push(seg);
      }
    }
    return { text: parts };
  };
  const markdownToPdfContent = (markdown: string): unknown[] => {
    const lines = markdown.split("\n");
    const result: unknown[] = [];
    let listBuffer: unknown[] = [];
    let listType: "bullet" | "ordered" | null = null;
    let paraBuffer: string[] = [];
    const flushList = () => {
      if (listBuffer.length === 0) return;
      result.push(listType === "bullet"
        ? { ul: listBuffer, font: "Roboto", fontSize: 10.5, color: DARK_GREY, lineHeight: 1.4, margin: [0, 4, 0, 8] }
        : { ol: listBuffer, font: "Roboto", fontSize: 10.5, color: DARK_GREY, lineHeight: 1.4, margin: [0, 4, 0, 8] });
      listBuffer = []; listType = null;
    };
    const flushPara = () => {
      if (paraBuffer.length === 0) return;
      const text = paraBuffer.join(" ").trim();
      if (!text) { paraBuffer = []; return; }
      if (text.includes("**")) {
        result.push({ ...para(""), text: parseBoldInline(text) });
      } else {
        result.push(para(text));
      }
      paraBuffer = [];
    };
    for (const rawLine of lines) {
      const line = rawLine.trimEnd();
      if (/^##\s/.test(line)) {
        flushPara(); flushList();
        result.push(subheading(line.replace(/^##\s+/, "")));
        continue;
      }
      if (/^###\s/.test(line)) {
        flushPara(); flushList();
        result.push(subheading(line.replace(/^###\s+/, "")));
        continue;
      }
      if (/^#\s/.test(line)) {
        flushPara(); flushList();
        result.push(subheading(line.replace(/^#\s+/, "")));
        continue;
      }
      const bulletMatch = line.match(/^[\-\*]\s+(.+)/);
      if (bulletMatch) {
        flushPara();
        if (listType !== "bullet") { flushList(); listType = "bullet"; }
        listBuffer.push(parseBoldInline(bulletMatch[1]));
        continue;
      }
      const numberedMatch = line.match(/^\d+\.\s+(.+)/);
      if (numberedMatch) {
        flushPara();
        if (listType !== "ordered") { flushList(); listType = "ordered"; }
        listBuffer.push(parseBoldInline(numberedMatch[1]));
        continue;
      }
      if (line.trim() === "") { flushPara(); flushList(); continue; }
      paraBuffer.push(line);
    }
    flushPara(); flushList();
    return result;
  };
  const sectionBlock = (title: string, content: string) => [
    heading(title),
    divider(),
    ...markdownToPdfContent(content),
  ];

  // ── VIA bar chart (simple text-based) ──
  const viaRows = sections.viaRanked.slice(0, 10).map((s, i) => [
    { text: `${i + 1}. ${s.strength}`, font: "Roboto", fontSize: 9, color: DARK_GREY, bold: i < 3 },
    {
      canvas: [{
        type: "rect",
        x: 0, y: 2,
        w: Math.round((s.score / 5) * 120),
        h: 8,
        color: i < 3 ? GOLD : LIGHT_GOLD,
      }],
      margin: [0, 0, 0, 2] as [number, number, number, number],
    },
    { text: s.score.toFixed(2), font: "Roboto", fontSize: 9, color: MID_GREY },
  ]);

  // ── Big Five bars ──
  const BIG5_NAMES: Record<string, string> = {
    N: "Neuroticism", E: "Extraversion", O: "Openness",
    A: "Agreeableness", C: "Conscientiousness",
  };
  const big5Rows = Object.entries(sections.domainScores).map(([key, val]) => [
    { text: BIG5_NAMES[key] ?? key, font: "Roboto", fontSize: 9, color: DARK_GREY },
    {
      canvas: [{
        type: "rect",
        x: 0, y: 2,
        w: Math.round((val / 100) * 120),
        h: 8,
        color: NAVY,
      }],
      margin: [0, 0, 0, 2] as [number, number, number, number],
    },
    { text: `${val}th`, font: "Roboto", fontSize: 9, color: MID_GREY },
  ]);

  // ── Document definition ──
  const docDefinition = {
    pageSize: "A4",
    pageMargins: [60, 80, 60, 80] as [number, number, number, number],
    defaultStyle: { font: "Roboto", fontSize: 10.5, color: DARK_GREY },

    background: (currentPage: number) =>
      currentPage === 1
        ? {
            canvas: [
              { type: "rect", x: 0, y: 0, w: 595, h: 200, color: NAVY },
            ],
          }
        : null,

    header: (currentPage: number) =>
      currentPage > 1
        ? {
            columns: [
              { text: "LIFEWORK CAREER ANALYSIS", font: "Roboto", fontSize: 7, color: MID_GREY, margin: [60, 20, 0, 0] },
              { text: sections.clientName.toUpperCase(), font: "Roboto", fontSize: 7, color: GOLD, alignment: "right", margin: [0, 20, 60, 0] },
            ],
          }
        : null,

    footer: (currentPage: number, pageCount: number) => ({
      columns: [
        { text: "Pennington Hennessy", font: "Roboto", fontSize: 7, color: MID_GREY, margin: [60, 0, 0, 0] },
        { text: `${currentPage} / ${pageCount}`, font: "Roboto", fontSize: 7, color: MID_GREY, alignment: "right", margin: [0, 0, 60, 0] },
      ],
    }),

    content: [
      // ── Cover ──
      {
        text: "LIFEWORK",
        font: "Roboto",
        fontSize: 28,
        bold: true,
        color: CREAM,
        margin: [0, 60, 0, 0] as [number, number, number, number],
      },
      {
        text: "CAREER ANALYSIS",
        font: "Roboto",
        fontSize: 14,
        color: GOLD,
        letterSpacing: 3,
        margin: [0, 4, 0, 0] as [number, number, number, number],
      },
      {
        text: sections.clientName,
        font: "Roboto",
        fontSize: 22,
        bold: true,
        color: CREAM,
        margin: [0, 30, 0, 0] as [number, number, number, number],
      },
      {
        text: sections.generatedAt,
        font: "Roboto",
        fontSize: 10,
        color: LIGHT_GOLD,
        margin: [0, 6, 0, 0] as [number, number, number, number],
      },
      { text: "", margin: [0, 0, 0, 120] as [number, number, number, number] },
      {
        text: "Pennington Hennessy  ·  Lifework Career Analysis",
        font: "Roboto",
        fontSize: 8,
        color: LIGHT_GOLD,
        margin: [0, 0, 0, 0] as [number, number, number, number],
      },

      // ── Page break before content ──
      { text: "", pageBreak: "before" },

      // ── Section 1: Summary ──
      ...sectionBlock("1. Your Lifework Summary", sections.summary),

      // ── Section 2: Life History Pattern ──
      ...sectionBlock("2. Your Life History Pattern", sections.lifeHistoryPattern),

      // ── Section 3: VIA Character Strengths ──
      heading("3. Your Character Strengths"),
      divider(),
      ...(sections.viaRanked.length > 0
        ? [
            subheading("Strength Rankings"),
            {
              table: {
                widths: [160, 130, 40],
                body: viaRows,
              },
              layout: "noBorders",
              margin: [0, 0, 0, 12] as [number, number, number, number],
            },
          ]
        : []),
      ...markdownToPdfContent(sections.viaSection),

      // ── Section 4: Personality Profile ──
      heading("4. Your Personality Profile"),
      divider(),
      ...(big5Rows.length > 0
        ? [
            subheading("Big Five Personality Dimensions"),
            {
              table: {
                widths: [120, 130, 40],
                body: big5Rows,
              },
              layout: "noBorders",
              margin: [0, 0, 0, 12] as [number, number, number, number],
            },
          ]
        : []),
      ...markdownToPdfContent(sections.personalitySection),

      // ── Section 5: Career Directions ──
      ...sectionBlock("5. Career Directions", sections.careerDirections),

      // ── Section 6: Development Edge ──
      ...sectionBlock("6. Your Development Edge", sections.developmentEdge),

      // ── Section 7: Coaching Questions ──
      heading("7. Questions for Your Coaching Conversation"),
      divider(),
      ...markdownToPdfContent(sections.coachingQuestions),

      // ── Closing ──
      { text: "", margin: [0, 20, 0, 0] as [number, number, number, number] },
      {
        canvas: [{ type: "rect", x: 0, y: 0, w: 515, h: 40, color: NAVY }],
        margin: [0, 0, 0, 0] as [number, number, number, number],
      },
      {
        text: "This report is confidential and prepared exclusively for the named individual.",
        font: "Roboto",
        fontSize: 8,
        color: CREAM,
        alignment: "center",
        margin: [0, -30, 0, 0] as [number, number, number, number],
      },
    ],
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfDoc = pdfmake.createPdf(docDefinition as any);
  // In pdfmake 0.3.x, getBuffer() returns a Promise<Buffer>
  return pdfDoc.getBuffer() as Promise<Buffer>;
}

// ─── Background Job ──────────────────────────────────────────────────────────

async function runGenerationJob(clientId: number): Promise<void> {
  try {
    // Mark as generating
    const existing = await getAnalysisReport(clientId);
    const base = existing ?? { clientId, generatedAt: new Date() };
    await upsertAnalysisReport({
      ...base,
      wowReportStatus: "generating",
      wowReportError: null,
    } as Parameters<typeof upsertAnalysisReport>[0]);
    // Generate sections via LLM (parallel, 7 calls)
    console.log(`[WOW Report] runGenerationJob starting for client ${clientId}`);
    const sections = await generateWowSections(clientId);
    // Render PDF
    console.log(`[WOW Report] Rendering PDF for client ${clientId}`);
    const pdfBuffer = await renderWowPdf(sections);
    console.log(`[WOW Report] PDF rendered, size: ${pdfBuffer.length} bytes`);
    // Upload to S3
    const fileKey = `wow-reports/client-${clientId}-${Date.now()}.pdf`;
    const { url: pdfUrl } = await storagePut(fileKey, pdfBuffer, "application/pdf");
    console.log(`[WOW Report] Uploaded to S3: ${pdfUrl}`);
    // Persist result
    const existing2 = await getAnalysisReport(clientId);
    const base2 = existing2 ?? { clientId, generatedAt: new Date() };
    await upsertAnalysisReport({
      ...base2,
      wowReportJson: JSON.stringify(sections),
      wowReportPdfUrl: pdfUrl,
      wowReportGeneratedAt: new Date(),
      wowReportStatus: "done",
      wowReportError: null,
    } as Parameters<typeof upsertAnalysisReport>[0]);
    console.log(`[WOW Report] Done for client ${clientId}`);
  } catch (err) {
    const msg = err instanceof Error ? `${err.message}\n${err.stack ?? ""}` : String(err);
    console.error(`[WOW Report] Generation failed for client ${clientId}:`, msg);
    try {
      const existing3 = await getAnalysisReport(clientId);
      const base3 = existing3 ?? { clientId, generatedAt: new Date() };
      await upsertAnalysisReport({
        ...base3,
        wowReportStatus: "error",
        wowReportError: msg.substring(0, 500),
      } as Parameters<typeof upsertAnalysisReport>[0]);
    } catch (e2) {
      console.error(`[WOW Report] Failed to write error status for client ${clientId}:`, e2);
    }
  }
}

// ─── Router ───────────────────────────────────────────────────────────────────
const counselorProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Counselor access required" });
  }
  return next({ ctx });
});
export const wowReportRouter = router({
  /**
   * Kick off WOW Report generation as a background job.
   * Returns immediately — client should poll wowReport.get for status.
   */
  generate: counselorProcedure
    .input(z.object({ clientId: z.number(), forceRegenerate: z.boolean().optional().default(false) }))
    .mutation(async ({ input }) => {
      const existing = await getAnalysisReport(input.clientId);
      // Return cached if available and not forcing regeneration
      if (existing?.wowReportPdfUrl && !input.forceRegenerate) {
        return { started: false, cached: true };
      }
      // If already generating, don't start a second job
      if ((existing as any)?.wowReportStatus === "generating") {
        return { started: false, alreadyRunning: true };
      }
      // Fire and forget — do NOT await
      void runGenerationJob(input.clientId);
      return { started: true, cached: false };
    }),
  /**
   * Get the current WOW Report status for a client.
   * Used for polling during generation.
   */
  get: counselorProcedure
    .input(z.object({ clientId: z.number() }))
    .query(async ({ input }) => {
      const report = await getAnalysisReport(input.clientId);
      if (!report) return { exists: false, status: null, pdfUrl: null, generatedAt: null, sections: null, error: null };
      const sections = (() => {
        try { return report.wowReportJson ? JSON.parse(report.wowReportJson) : null; }
        catch { return null; }
      })();
      return {
        exists: !!report.wowReportPdfUrl,
        status: (report as any).wowReportStatus ?? null,
        pdfUrl: report.wowReportPdfUrl ?? null,
        generatedAt: report.wowReportGeneratedAt ?? null,
        sections,
        error: (report as any).wowReportError ?? null,
      };
    }),
});
