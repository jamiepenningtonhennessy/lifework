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

async function renderWowPdf(sections: WowReportSections): Promise<Buffer> {
  // pdfmake is CJS; load via createRequire (defined at module top)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfMake = _require("pdfmake/build/pdfmake.js") as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfFonts = _require("pdfmake/build/vfs_fonts.js") as any;
  pdfMake.vfs = pdfFonts.pdfMake?.vfs ?? pdfFonts.vfs;

  // ── Colour palette ──
  const NAVY = "#0a1628";
  const GOLD = "#c9973a";
  const CREAM = "#f5f0e8";
  const LIGHT_GOLD = "#f0e6cc";
  const WHITE = "#ffffff";
  const DARK_GREY = "#2c2c2c";
  const MID_GREY = "#666666";

  // ── Helper: wrap text into pdfmake paragraph objects ──
  const body = (text: string, color = DARK_GREY): any => ({
    text,
    fontSize: 10.5,
    color,
    lineHeight: 1.6,
    margin: [0, 0, 0, 10],
  });

  const sectionTitle = (text: string): any[] => [
    {
      canvas: [{ type: "line", x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 0.5, lineColor: GOLD }],
      margin: [0, 20, 0, 8],
    },
    {
      text: text.toUpperCase(),
      fontSize: 8,
      bold: true,
      color: GOLD,
      letterSpacing: 2,
      margin: [0, 0, 0, 4],
    },
  ];

  const sectionHeading = (text: string): any => ({
    text,
    fontSize: 18,
    bold: true,
    color: NAVY,
    font: "Roboto",
    margin: [0, 0, 0, 14],
  });

  // ── VIA bar chart ──
  const viaChart = (): any[] => {
    if (!sections.viaRanked.length) return [];
    const top7 = sections.viaRanked.slice(0, 7);
    const maxScore = Math.max(...top7.map((s) => s.score), 1);
    const BAR_MAX = 300;
    return [
      ...sectionTitle("Character Strengths at a Glance"),
      {
        margin: [0, 4, 0, 16],
        stack: top7.map((s, i) => ({
          margin: [0, 0, 0, 6],
          stack: [
            {
              columns: [
                { text: `${i + 1}. ${s.strength}`, fontSize: 9, bold: i === 0, color: DARK_GREY, width: 160 },
                {
                  canvas: [
                    { type: "rect", x: 0, y: 2, w: Math.round((s.score / maxScore) * BAR_MAX), h: 10, r: 2, color: i === 0 ? GOLD : "#d4b87a" },
                  ],
                  width: BAR_MAX + 10,
                },
                { text: `${s.score}`, fontSize: 8, color: MID_GREY, width: 30, alignment: "right" },
              ],
            },
          ],
        })),
      },
    ];
  };

  // ── Big Five radar-style table ──
  const big5Table = (): any[] => {
    const domains = ["N", "E", "O", "A", "C"];
    const rows = domains.map((key) => {
      const score = sections.domainScores[key] ?? 50;
      const label = BIG5_LABELS[key];
      const BAR_MAX = 200;
      return [
        { text: label?.name ?? key, fontSize: 9, color: DARK_GREY, bold: false },
        {
          canvas: [
            { type: "rect", x: 0, y: 3, w: BAR_MAX, h: 8, r: 2, color: "#e8e0d0" },
            { type: "rect", x: 0, y: 3, w: Math.round((score / 100) * BAR_MAX), h: 8, r: 2, color: NAVY },
          ],
          width: BAR_MAX + 10,
        },
        { text: `${score}`, fontSize: 8, color: MID_GREY, alignment: "right" },
      ];
    });

    return [
      ...sectionTitle("Personality Profile at a Glance"),
      {
        margin: [0, 4, 0, 16],
        table: {
          widths: [130, "*", 30],
          body: rows,
        },
        layout: {
          hLineWidth: () => 0,
          vLineWidth: () => 0,
          paddingTop: () => 4,
          paddingBottom: () => 4,
        },
      },
    ];
  };

  // ── Document definition ──
  const docDefinition: any = {
    pageSize: "A4",
    pageMargins: [50, 50, 50, 60],
    defaultStyle: {
      font: "Roboto",
      fontSize: 10.5,
      color: DARK_GREY,
    },
    footer: (currentPage: number, pageCount: number) => ({
      columns: [
        { text: `${sections.clientName} — Lifework Career Analysis`, fontSize: 8, color: MID_GREY, margin: [50, 0, 0, 0] },
        { text: `Prepared by Pennington Hennessy — Confidential`, fontSize: 8, color: MID_GREY, alignment: "center" },
        { text: `${currentPage} / ${pageCount}`, fontSize: 8, color: MID_GREY, alignment: "right", margin: [0, 0, 50, 0] },
      ],
      margin: [0, 10, 0, 0],
    }),
    content: [
      // ── Cover page ──
      {
        canvas: [
          { type: "rect", x: 0, y: 0, w: 515, h: 720, color: NAVY },
        ],
        absolutePosition: { x: 50, y: 50 },
      },
      {
        text: "LIFEWORK",
        fontSize: 9,
        bold: true,
        color: GOLD,
        letterSpacing: 4,
        margin: [0, 60, 0, 0],
      },
      {
        canvas: [{ type: "line", x1: 0, y1: 0, x2: 60, y2: 0, lineWidth: 1, lineColor: GOLD }],
        margin: [0, 8, 0, 0],
      },
      {
        text: "Career Analysis",
        fontSize: 32,
        bold: true,
        color: WHITE,
        margin: [0, 16, 0, 0],
      },
      {
        text: "Report",
        fontSize: 32,
        bold: true,
        color: GOLD,
        margin: [0, 0, 0, 40],
      },
      {
        text: sections.clientName,
        fontSize: 20,
        color: WHITE,
        margin: [0, 0, 0, 8],
      },
      {
        text: sections.generatedAt,
        fontSize: 11,
        color: "#aaaaaa",
        margin: [0, 0, 0, 0],
      },
      {
        text: "Prepared by Pennington Hennessy",
        fontSize: 10,
        color: "#888888",
        margin: [0, 8, 0, 0],
      },
      {
        text: "\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n",
        fontSize: 10,
        color: WHITE,
      },
      // ── Confidentiality notice ──
      {
        canvas: [{ type: "rect", x: 0, y: 0, w: 515, h: 60, r: 4, color: LIGHT_GOLD }],
        absolutePosition: { x: 50, y: 700 },
      },
      {
        text: "CONFIDENTIAL — This report is prepared exclusively for the named individual. It is not intended for distribution and should not be shared without the express permission of Pennington Hennessy.",
        fontSize: 8,
        color: "#7a6030",
        margin: [0, 0, 0, 0],
        absolutePosition: { x: 62, y: 710 },
      },

      // ── Page break ──
      { text: "", pageBreak: "after" },

      // ── Section 1: Summary ──
      ...sectionTitle("Section One"),
      sectionHeading("Your Lifework Summary"),
      body(sections.summary),

      // ── Section 2: Life History Pattern ──
      { text: "", pageBreak: "before" },
      ...sectionTitle("Section Two"),
      sectionHeading("Your Life History Pattern"),
      body(sections.lifeHistoryPattern),

      // ── Section 3: VIA ──
      { text: "", pageBreak: "before" },
      ...sectionTitle("Section Three"),
      sectionHeading("Your Character Strengths"),
      ...viaChart(),
      body(sections.viaSection),

      // ── Section 4: Big Five ──
      { text: "", pageBreak: "before" },
      ...sectionTitle("Section Four"),
      sectionHeading("Your Personality Profile"),
      ...big5Table(),
      body(sections.personalitySection),

      // ── Section 5: Career Directions ──
      { text: "", pageBreak: "before" },
      ...sectionTitle("Section Five"),
      sectionHeading("Career Directions"),
      body(sections.careerDirections),

      // ── Section 6: Development Edge ──
      { text: "", pageBreak: "before" },
      ...sectionTitle("Section Six"),
      sectionHeading("Your Development Edge"),
      body(sections.developmentEdge),

      // ── Section 7: Coaching Questions ──
      { text: "", pageBreak: "before" },
      ...sectionTitle("Section Seven"),
      sectionHeading("Questions for Your Coaching Conversation"),
      body(sections.coachingQuestions),

      // ── Closing ──
      {
        canvas: [{ type: "line", x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 0.5, lineColor: GOLD }],
        margin: [0, 30, 0, 16],
      },
      {
        text: "© Pennington Hennessy — penningtonhennessy.com",
        fontSize: 9,
        color: MID_GREY,
        alignment: "center",
      },
    ],
  };

  return new Promise<Buffer>((resolve, reject) => {
    try {
      const pdfDoc = pdfMake.createPdf(docDefinition);
      pdfDoc.getBuffer((buffer: Buffer) => {
        resolve(buffer);
      });
    } catch (err) {
      reject(err);
    }
  });
}
// ─── Background job runner ───────────────────────────────────────────────────
// Runs the full generation pipeline asynchronously (fire-and-forget).
// Status is tracked in the DB so the client can poll wowReport.get.
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

    // Generate sections via LLM (the slow part)
    const sections = await generateWowSections(clientId);
    // Render PDF
    const pdfBuffer = await renderWowPdf(sections);
    // Upload to S3
    const fileKey = `wow-reports/client-${clientId}-${Date.now()}.pdf`;
    const { url: pdfUrl } = await storagePut(fileKey, pdfBuffer, "application/pdf");
    // Persist result
    await upsertAnalysisReport({
      ...base,
      wowReportJson: JSON.stringify(sections),
      wowReportPdfUrl: pdfUrl,
      wowReportGeneratedAt: new Date(),
      wowReportStatus: "done",
      wowReportError: null,
    } as Parameters<typeof upsertAnalysisReport>[0]);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[WOW Report] Generation failed for client ${clientId}:`, msg);
    try {
      const existing2 = await getAnalysisReport(clientId);
      const base2 = existing2 ?? { clientId, generatedAt: new Date() };
      await upsertAnalysisReport({
        ...base2,
        wowReportStatus: "error",
        wowReportError: msg,
      } as Parameters<typeof upsertAnalysisReport>[0]);
    } catch { /* ignore secondary failure */ }
  }
}

// ─── Router ──────────────────────────────────────────────────────────────────
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
