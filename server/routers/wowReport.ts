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
 *   5. Your Behavioural Style         — Insights colour energy profile
 *   6. Career Directions              — 3-5 tailored directions
 *   7. Your Development Edge          — constructive growth areas
 *   8. Conclusions
 */

import { createRequire } from "module";
import { PH_LOGO_WHITE_BASE64 } from "./phLogoBase64.js";
import { LIFEWORK_LOGO_BASE64 } from "./lifeworkLogoBase64.js";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../_core/trpc";
import { invokeLLM } from "../_core/llm";
import { storagePut } from "../storage";
import { generateWheelPng } from "./insightsWheelPng.js";

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
  clientFullName: string;
  pronouns: string;
  contextText: string;
  viaRanked: Array<{ name: string; score: number; rank: number; strengthId?: string }>;
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
  const clientFullName = [profile.firstName, profile.lastName].filter(Boolean).join(" ") || "the client";
  const pronouns = profile.pronouns ?? "they/them";

  // Parse VIA
  const viaRanked: Array<{ name: string; score: number; rank: number; strengthId?: string }> = (() => {
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
      lines.push(`${i + 1}. ${s.name} (score: ${s.score}/25)`);
    });
  }

  if (Object.keys(domainScores).length > 0) {
    lines.push("\n--- BIG FIVE PERSONALITY (IPIP-NEO, percentile 0-100) ---");
    for (const [key, val] of Object.entries(domainScores)) {
      const label = BIG5_LABELS[key];
      if (label) lines.push(`${label.name}: ${val} — ${val >= 60 ? label.high : val <= 40 ? label.low : "moderate"}`);
    }
  }

  return { clientName, clientFullName, pronouns, contextText: lines.join("\n"), viaRanked, domainScores, facetScores };
}

// ─── Helper: Generate all 7 sections via LLM ─────────────────────────────────

interface WowReportSections {
  clientName: string;
  clientFullName: string;
  generatedAt: string;
  summary: string;
  lifeHistoryPattern: string;
  viaSection: string;
  personalitySection: string;
  behaviouralStyle: string;
  primaryColour: string;
  secondaryColour: string;
  jungianType: string;
  careerDirections: string;
  developmentEdge: string;
  coachingQuestions: string;
  viaRanked: Array<{ name: string; score: number; rank: number; strengthId?: string }>;
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
  const { clientName, clientFullName, pronouns, contextText, viaRanked, domainScores } = await buildClientContext(clientId);
  // pronouns is a string like "they/them/their" or "he/him/his" or "she/her/her"
  const pronounParts = pronouns.split("/");
  const subj = pronounParts[0] ?? "they";
  const poss = pronounParts[2] ?? pronounParts[1] ?? "their";

  // ── Insights colour energy derivation from Big Five ──────────────────────
  const eScore = domainScores["E"] ?? 50;
  const aScore = domainScores["A"] ?? 50;
  const oScore = domainScores["O"] ?? 50;
  const cScore = domainScores["C"] ?? 50;
  const isExtravert = eScore >= 50;
  const isFeeler = aScore >= 50;
  const primaryColour = !isExtravert && !isFeeler ? "Cool Blue"
    : isExtravert && !isFeeler ? "Fiery Red"
    : !isExtravert && isFeeler ? "Earth Green"
    : "Sunshine Yellow";
  const eDistance = Math.abs(eScore - 50);
  const aDistance = Math.abs(aScore - 50);
  const secondaryColour = (() => {
    if (eDistance < aDistance) {
      const flippedE = isExtravert ? 30 : 70;
      const c2 = !(flippedE >= 50) && !isFeeler ? "Cool Blue" : (flippedE >= 50) && !isFeeler ? "Fiery Red" : !(flippedE >= 50) && isFeeler ? "Earth Green" : "Sunshine Yellow";
      return c2 !== primaryColour ? c2 : (!isExtravert ? "Earth Green" : "Sunshine Yellow");
    } else {
      const flippedA = isFeeler ? 30 : 70;
      const c2 = !isExtravert && !(flippedA >= 50) ? "Cool Blue" : isExtravert && !(flippedA >= 50) ? "Fiery Red" : !isExtravert && (flippedA >= 50) ? "Earth Green" : "Sunshine Yellow";
      return c2 !== primaryColour ? c2 : primaryColour;
    }
  })();
  const jungianType = `${isExtravert ? "E" : "I"}${oScore >= 50 ? "N" : "S"}${isFeeler ? "F" : "T"}${cScore >= 50 ? "J" : "P"}`;

  const sys = `You are a senior career analyst at Pennington Hennessy, trained in the Dependable Strengths methodology of Bernard Haldane. You write premium career analysis reports that combine rigorous psychometric interpretation with deep life history analysis. Your writing is precise, warm, and analytically authoritative — the voice of a trusted senior adviser, not a letter-writer.

CRITICAL TONE RULES (non-negotiable):
- NEVER open any section with a salutation, greeting, or letter-style introduction. No "Dear ${clientName}", no "It is a privilege to present...", no "We are delighted to...", no "This report aims to...".
- NEVER include flattery, fawning, or obsequious preamble of any kind. Go straight into the analysis.
- This is a professional report, not a letter. Every section must open immediately with substantive analytical content.
- Write in second person ("You are...") throughout. Use the client's first name (${clientName}) naturally. Use pronouns: ${pronouns}.

FORMATTING RULES (strictly follow):
- Every paragraph must be 3-5 sentences maximum. Never write a paragraph longer than 5 sentences.
- Separate every paragraph with a blank line.
- Use ## for subheadings within a section where helpful (e.g. "## Strength 1: Creativity").
- Use **bold** to highlight key terms or strength names on first mention.
- You may use a short bullet list (3-6 items) where it genuinely aids clarity, but default to paragraphs.
- Never write walls of text. White space is as important as the words.`;

  const ctx = `CLIENT DATA FOR ${clientName.toUpperCase()}:\n${contextText}`;

  const insightsSys = `You are an experienced Insights Discovery practitioner writing the Behavioural Style section of a premium career report for ${clientName}.
${pronouns ? `Use pronouns: ${pronouns}.` : ""}

This section uses the Insights Discovery vocabulary (colour energies) to give the client a clear, practical picture of how they tend to show up in professional settings. It stands alongside — not instead of — the Big Five personality profile already covered in the previous section.

Write the following four sub-sections using ## headings:

## Colour Energy Profile
Describe ${clientName}'s primary (${primaryColour}) and secondary (${secondaryColour}) colour energies in plain language. Explain what each energy means in practice — how it shows up in communication style, decision-making, and relationships at work. Be specific about the combination.

## At Their Best
Describe what ${clientName} looks like when operating from their strongest energies — what colleagues notice, how they contribute, what they bring to a team.

## Under Pressure
Describe how ${clientName} is likely to behave when stressed or outside their comfort zone. What might colleagues observe?

## Working With Others
Give one or two practical observations about how ${clientName} tends to work with people whose colour energies are very different from their own.

Keep the tone warm, direct, and non-judgmental. Begin with a brief framing sentence acknowledging this is a tool for self-awareness, not a fixed label. Write in second person ("You are...") throughout. Do NOT include any introductory paragraph before the first ## heading.`;

  const insightsData = Object.keys(domainScores).length > 0
    ? `Primary colour energy: ${primaryColour}\nSecondary colour energy: ${secondaryColour}\nJungian type approximation: ${jungianType}\nExtraversion: ${eScore}/100\nAgreeableness: ${aScore}/100\nOpenness: ${oScore}/100\nConscientiousness: ${cScore}/100`
    : "IPIP-NEO data not available — Insights profile cannot be generated.";

  console.log(`[WOW Report] Starting 8-section parallel generation for client ${clientId}`);

  // Run all 8 sections in parallel — each with its own 90s timeout
  const [
    summary,
    lifeHistoryPattern,
    viaSection,
    personalitySection,
    behaviouralStyle,
    careerDirections,
    developmentEdge,
    coachingQuestions,
  ] = await Promise.all([
    callLLMWithTimeout(sys,
      `${ctx}\n\nWrite a single 250-word portrait of ${clientName} as a professional. This is the opening "wow" statement — the most insightful thing anyone has ever said about ${clientName}'s career.\n\nAnalytical principle: the earliest experiences carry the deepest imprint. The themes that appear first in the life history are the truest signal of who this person is. Your portrait should be rooted in those early-established patterns, then show how they have expressed themselves across the decades.\n\nBegin with "${clientName} is..." and write a single flowing portrait that:\n- Identifies the core theme or motif that runs from ${clientName}'s earliest experiences to today\n- Shows how that theme has reproduced itself in different forms across ${subj} life\n- Connects it to ${subj} character strengths and personality\n- Ends with a sentence that feels like a revelation — something ${clientName} may never have heard said so clearly\n\nDo NOT include any introductory paragraph explaining what the report is about. Go straight into the personal portrait.`
    ),
    callLLMWithTimeout(sys,
      `${ctx}\n\nWrite a substantial, multi-section chapter analysing the recurring themes in ${clientName}'s life history. This chapter should be long enough to fill 2-3 pages of a premium career report — approximately 700-900 words. It is one of the most important sections of the report, because the client has invested significant effort in recording these experiences, and they deserve a thorough, personal, and insightful analysis in return.\n\nANALYTICAL PRINCIPLE: The earliest experiences carry the deepest imprint. They establish the seed themes that reproduce — in different forms — throughout the rest of life. Think of it like a piece of music: the opening bars introduce the motifs that will recur, develop, and vary across all subsequent movements. Your job is to identify those motifs and trace them through the decades with specificity and warmth.\n\nSTRUCTURE THE CHAPTER AS FOLLOWS:\n\n## The Opening Bars: What the Early Years Reveal\nBegin here. Examine ${clientName}'s earliest recorded achievements — childhood and adolescence. Write 3-4 paragraphs that:\n- Name the 2-3 seed themes already visible in these early experiences\n- Quote or reference specific early achievements by name and decade\n- Explain why these early patterns matter: they were chosen freely, before career pressures, social expectations, or financial necessity shaped the choices. They are the clearest signal of who ${clientName} truly is.\n- Note what the Enjoyable/Satisfying/Fulfilling classifications of these early achievements reveal about ${clientName}'s motivational core\n\n## The Recurring Motifs: How the Themes Develop\nThis is the heart of the chapter. Write one substantial paragraph (4-5 sentences) for EACH of the 2-3 seed themes you identified above. For each theme:\n- Give it a clear, evocative name as a ### subheading (e.g. ### The Builder, ### The Connector, ### The Solver)\n- Show specifically how this theme first appeared in early life\n- Trace at least 3-4 concrete examples of how it has reproduced across different decades and contexts — different roles, different settings, but recognisably the same underlying pattern\n- Note any moments where the theme intensified, was suppressed, or found a new form of expression\n- Connect the theme to what others have consistently observed about ${clientName}\n\n## What the Pattern Reveals\nClose the chapter with 2-3 paragraphs that:\n- Synthesise the overall pattern: what is the single most consistent thread running from ${clientName}'s earliest experiences to ${subj} current professional identity?\n- Reflect on what the ESF distribution across the whole life history tells us — which activities have consistently been Enjoyable, Satisfying, or Fulfilling, and what this reveals about ${clientName}'s deepest motivational drivers\n- End with a statement that feels like a genuine insight — something ${clientName} may recognise but has never heard articulated so clearly: the connection between who ${subj} was at the very beginning and who ${subj} is today\n\nThroughout: write in second person (\"You...\"), use ${clientName}'s first name naturally, reference actual achievements from the data by name and decade, and maintain the warm, precise, personal tone of a senior career analyst who has read every word of the life history with care.`
    ),
    callLLMWithTimeout(sys,
      `${ctx}\n\nWrite an interpretive narrative for ${clientName}'s top 7 VIA Character Strengths. Begin IMMEDIATELY with the first strength — do NOT write any introductory paragraph, preamble, greeting, or scene-setting text before the first ## heading. For each strength, write 2-3 sentences: what it means in ${clientName}'s specific context, and how it has shown up in ${subj} life history. Then write a 2-paragraph synthesis: how these strengths work together as a system, and what they mean for ${clientName}'s career.`
    ),
    callLLMWithTimeout(sys,
      `${ctx}\n\nWrite an interpretive narrative of ${clientName}'s Big Five personality profile. Begin IMMEDIATELY with the heading "## Your Personality Profile: A Deep Dive" — do NOT write any introductory paragraph, preamble, or scene-setting text before this heading. Then for each of the five domains, write 2-3 sentences interpreting the score in the context of ${clientName}'s career and life history. Then write a 2-paragraph "Working Style" synthesis: how ${clientName} operates at ${subj} best, and what environments bring out the best in ${subj}.`
    ),
    callLLMWithTimeout(insightsSys, insightsData),
    callLLMWithTimeout(sys,
      `${ctx}\n\nWrite 3-5 career directions for ${clientName}. Begin IMMEDIATELY with the first direction — no introductory paragraph, no preamble, no scene-setting. For each direction: name it clearly as a ## heading, explain why it fits ${clientName}'s specific combination of life history, character strengths, and personality, and give one concrete example of what it could look like in practice. These should feel tailored and specific — not generic job titles.`
    ),
    callLLMWithTimeout(sys,
      `${ctx}\n\nWrite 2-3 paragraphs on ${clientName}'s development edge — the areas where growth would most expand ${subj} career options. Begin IMMEDIATELY with the first development area — no introductory paragraph, no preamble, no scene-setting. Frame these constructively as "edges to develop" rather than weaknesses. Connect each to specific data from the profile. End with an encouraging observation about ${clientName}'s capacity for growth.`
    ),
    callLLMWithTimeout(sys,
      `${ctx}\n\nWrite the Conclusions chapter for ${clientName}'s Lifework report. This is the synthesis chapter — it draws together everything the report has uncovered and presents it as a coherent whole. Structure it under the following four headings. Do NOT write any introductory paragraph before the first heading. Begin immediately with ## Past.\n\n## Past: What Your Life History Reveals\nDraw on the Life History Pattern analysis. In 3-4 paragraphs:\n- Name the 2-3 seed themes that were already present in ${clientName}'s earliest recorded experiences (childhood and adolescence)\n- Show how these themes have reproduced themselves — in different forms — across the decades\n- Identify the single most consistent thread: the foundational motif that connects who ${clientName} was at the very beginning to who ${subj} is today\n- Be specific: reference actual achievements by name and decade\n\n## Present: Who You Are\nDraw on the VIA Character Strengths, Big Five personality profile, and Behavioural Style (Insights colour energies). In 3-4 paragraphs:\n- Name ${clientName}'s 3-4 most distinctive character strengths and explain what makes them powerful in combination\n- Interpret the personality profile in plain language: what kind of professional is ${clientName} at ${subj} best?\n- Connect the Insights colour energy profile to the VIA and personality data — do they reinforce each other?\n- Paint a clear, specific picture of ${clientName} operating at full capacity\n\n## Future: Where You Are Headed\nDraw on the Career Directions and Development Edge sections. In 2-3 paragraphs:\n- Summarise the 2-3 most compelling career directions and explain why they are the right fit for this specific person\n- Name the 1-2 development edges that, if addressed, would most expand ${clientName}'s options\n- End with a forward-looking statement that connects the seed themes from the Past section to the future directions — showing that the path forward is not a departure but a continuation of who ${clientName} has always been\n\n## Tell Me About Yourself\nIntroduce this section with exactly this sentence: "Here is a suggested answer to the interview question 'Tell me about yourself' — drawn from everything your Lifework analysis has revealed:"\n\nThen write a single paragraph of 5-7 sentences that ${clientName} could use as a confident, authentic answer to that interview question. It should:\n- Open with the foundational motif (the core thread from the Past section)\n- Weave in 2-3 of the most distinctive character strengths and personality traits\n- Reference 1-2 of the most compelling career directions\n- Sound natural, confident, and genuinely personal — not like a CV summary\n- Be something ${clientName} could actually say aloud in an interview without it feeling scripted\n\nThis chapter should feel like the culmination of the whole report — the moment when everything comes together into a clear, confident picture of who ${clientName} is and where ${subj} is going.`
    ),
  ]);

  console.log(`[WOW Report] All 8 sections generated successfully for client ${clientId}`);

  return {
    clientName,
    clientFullName,
    generatedAt: new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }),
    summary,
    lifeHistoryPattern,
    viaSection,
    personalitySection,
    behaviouralStyle,
    primaryColour,
    secondaryColour,
    jungianType,
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

  // Generate Insights wheel PNG (320px) for embedding in Section 5
  const eScore = sections.domainScores["E"] ?? 50;
  const aScore = sections.domainScores["A"] ?? 50;
  let wheelDataUrl: string | null = null;
  try {
    const wheelPng = await generateWheelPng(eScore, aScore, 320);
    wheelDataUrl = `data:image/png;base64,${wheelPng.toString("base64")}`;
  } catch (e) {
    console.warn("[WOW Report] Failed to generate Insights wheel PNG:", e);
  }

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

  // Divider — using a table with a coloured top border (no canvas, avoids pdfmake height-check crash)
  const divider = () => ({
    table: { widths: ["*"], body: [[{ text: "", border: [false, true, false, false], borderColor: [LIGHT_GOLD, LIGHT_GOLD, LIGHT_GOLD, LIGHT_GOLD] }]] },
    layout: "noBorders",
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
    { text: "", pageBreak: "before" },
    heading(title),
    divider(),
    ...markdownToPdfContent(content),
  ];

  // ── Bar chart helper — nested 2-cell table with fillColor (no canvas, no Unicode glyphs) ──
  // Uses a nested table so the filled/empty portions are solid colour blocks at a fixed height.
  const makeBarCell = (ratio: number, fillColor: string, emptyColor = "#e8e0d0") => {
    const totalWidth = 120;
    const filledW = Math.max(2, Math.round(ratio * totalWidth));
    const emptyW = totalWidth - filledW;
    return {
      table: {
        widths: [filledW, emptyW],
        heights: [8],
        body: [[
          { text: "", fillColor, border: [false, false, false, false] as [boolean, boolean, boolean, boolean] },
          { text: "", fillColor: emptyColor, border: [false, false, false, false] as [boolean, boolean, boolean, boolean] },
        ]],
      },
      layout: {
        defaultBorder: false,
        paddingLeft: () => 0,
        paddingRight: () => 0,
        paddingTop: () => 0,
        paddingBottom: () => 0,
      },
      margin: [0, 3, 0, 3] as [number, number, number, number],
    };
  };

  // ── VIA bar chart ──
  const viaRows = sections.viaRanked.slice(0, 10).map((s, i) => [
    { text: `${i + 1}. ${s.name}`, font: "Roboto", fontSize: 9, color: DARK_GREY, bold: i < 3 },
    makeBarCell(s.score / 25, i < 3 ? GOLD : LIGHT_GOLD),
    { text: `${s.score}`, font: "Roboto", fontSize: 9, color: MID_GREY },
  ]);

  // ── Big Five bars ──
  const BIG5_NAMES: Record<string, string> = {
    N: "Neuroticism", E: "Extraversion", O: "Openness",
    A: "Agreeableness", C: "Conscientiousness",
  };
  const big5Rows = Object.entries(sections.domainScores).map(([key, val]) => [
    { text: BIG5_NAMES[key] ?? key, font: "Roboto", fontSize: 9, color: DARK_GREY },
    makeBarCell(val / 100, NAVY, "#d0d8e8"),
    { text: `${val}th`, font: "Roboto", fontSize: 9, color: MID_GREY },
  ]);

  // ── Document definition ──
  const docDefinition = {
    pageSize: "A4",
    pageMargins: [60, 80, 60, 80] as [number, number, number, number],
    defaultStyle: { font: "Roboto", fontSize: 10.5, color: DARK_GREY },

    background: null,

    header: (currentPage: number) =>
      currentPage > 1
        ? {
            columns: [
              { text: "LIFEWORK CAREER ANALYSIS", font: "Roboto", fontSize: 7, color: MID_GREY, margin: [60, 20, 0, 0] },
              { text: sections.clientFullName, font: "Roboto", fontSize: 7, color: GOLD, alignment: "right", margin: [0, 20, 60, 0] },
            ],
          }
        : { text: "", margin: [0, 0, 0, 0] },

    footer: (currentPage: number, pageCount: number) =>
      currentPage > 1
        ? {
            columns: [
              { text: "Pennington Hennessy", font: "Roboto", fontSize: 7, color: MID_GREY, margin: [60, 20, 0, 0] },
              { text: `${currentPage - 1} / ${pageCount - 1}`, font: "Roboto", fontSize: 7, color: MID_GREY, alignment: "right", margin: [0, 20, 60, 0] },
            ],
          }
        : { text: "", margin: [0, 0, 0, 0] },

    content: [
      // ── Cover page — white, matching lifeworkcover.pdf template ──
      // Large top spacer to push client name to ~55% down the page
      // pageMargins top=80, so we need ~380pt of space before the name
      { text: "", margin: [0, 0, 0, 300] as [number, number, number, number] },
      // Client full name — large, light-weight, centred
      {
        text: sections.clientFullName,
        font: "Roboto",
        fontSize: 40,
        bold: false,
        color: DARK_GREY,
        alignment: "center",
        margin: [0, 0, 0, 10] as [number, number, number, number],
      },
      // Date — medium weight, right-aligned to match template
      {
        text: sections.generatedAt,
        font: "Roboto",
        fontSize: 11,
        color: MID_GREY,
        alignment: "center",
        margin: [0, 0, 0, 0] as [number, number, number, number],
      },
      // Lifework logo — bottom-right corner using absolutePosition
      {
        image: LIFEWORK_LOGO_BASE64,
        width: 130,
        absolutePosition: { x: 595 - 60 - 130, y: 842 - 60 - 45 },
      },

      // ── Section 1: Summary (sectionBlock already includes pageBreak: 'before') ──
      ...sectionBlock("1. Your Lifework Summary", sections.summary),

      // ── Section 2: Life History Pattern ──
      ...sectionBlock("2. Your Life History Pattern", sections.lifeHistoryPattern),

      // ── Section 3: VIA Character Strengths ──
      { text: "", pageBreak: "before" },
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
      { text: "", pageBreak: "before" },
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

      // ── Section 5: Behavioural Style ──
      { text: "", pageBreak: "before" },
      heading("5. Your Behavioural Style"),
      divider(),
      // Wheel + colour energy cards side by side
      ...(sections.primaryColour ? [
        {
          columns: [
            // Wheel image
            wheelDataUrl ? {
              image: wheelDataUrl,
              width: 190,
              height: 190,
              margin: [0, 0, 16, 12] as [number, number, number, number],
            } : { text: "", width: 0 },
            // Colour energy cards stacked
            {
              stack: [
                {
                  table: {
                    widths: ["*"],
                    body: [[
                      {
                        stack: [
                          { text: "PRIMARY ENERGY", fontSize: 7, color: NAVY, characterSpacing: 1, margin: [0, 0, 0, 3] as [number, number, number, number] },
                          { text: sections.primaryColour, fontSize: 14, bold: true, color: GOLD },
                        ],
                        border: [false, false, false, false],
                        fillColor: "#f5f1e8",
                        margin: [10, 8, 10, 8] as [number, number, number, number],
                      },
                    ]],
                  },
                  layout: "noBorders",
                  margin: [0, 0, 0, 6] as [number, number, number, number],
                },
                {
                  table: {
                    widths: ["*"],
                    body: [[
                      {
                        stack: [
                          { text: "SECONDARY ENERGY", fontSize: 7, color: NAVY, characterSpacing: 1, margin: [0, 0, 0, 3] as [number, number, number, number] },
                          { text: sections.secondaryColour, fontSize: 14, bold: false, color: NAVY },
                        ],
                        border: [false, false, false, false],
                        fillColor: "#eae6de",
                        margin: [10, 8, 10, 8] as [number, number, number, number],
                      },
                    ]],
                  },
                  layout: "noBorders",
                  margin: [0, 0, 0, 6] as [number, number, number, number],
                },
                sections.jungianType ? {
                  table: {
                    widths: ["*"],
                    body: [[
                      {
                        stack: [
                          { text: "JUNGIAN TYPE", fontSize: 7, color: NAVY, characterSpacing: 1, margin: [0, 0, 0, 3] as [number, number, number, number] },
                          { text: sections.jungianType, fontSize: 18, bold: true, color: NAVY, font: "Roboto" },
                        ],
                        border: [false, false, false, false],
                        fillColor: "#ede8df",
                        margin: [10, 8, 10, 8] as [number, number, number, number],
                      },
                    ]],
                  },
                  layout: "noBorders",
                  margin: [0, 0, 0, 0] as [number, number, number, number],
                } as object : { text: "" } as object,
              ],
              width: "*",
            },
          ],
          columnGap: 0,
          margin: [0, 0, 0, 16] as [number, number, number, number],
        },
      ] : []),
      ...markdownToPdfContent(sections.behaviouralStyle),

      // ── Section 6: Career Directions ──
      ...sectionBlock("6. Career Directions", sections.careerDirections),

      // ── Section 7: Development Edge ──
      ...sectionBlock("7. Your Development Edge", sections.developmentEdge),

      // ── Section 8: Conclusions ──
      { text: "", pageBreak: "before" },
      heading("8. Conclusions"),
      divider(),
      ...markdownToPdfContent(sections.coachingQuestions),

      // ── Closing ──
      { text: "", margin: [0, 20, 0, 0] as [number, number, number, number] },
      {
        // Navy closing bar — table with navy fill (no canvas)
        table: {
          widths: ["*"],
          body: [[
            {
              text: "This report is confidential and prepared exclusively for the named individual.",
              font: "Roboto",
              fontSize: 8,
              color: CREAM,
              alignment: "center",
              fillColor: NAVY,
              border: [false, false, false, false],
              margin: [0, 12, 0, 12] as [number, number, number, number],
            },
          ]],
        },
        layout: "noBorders",
        margin: [0, 0, 0, 0] as [number, number, number, number],
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
