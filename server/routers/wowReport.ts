/**
 * WOW Report Router
 *
 * Generates a premium 7-section AI career analysis report for a client,
 * renders it as a branded PDF (navy/gold/cream, Playfair Display), uploads
 * to S3, and stores the URL in analysis_reports.wowReportPdfUrl.
 *
 * Sections:
 *   1. Lifework Summary          — 200-word portrait
 *   2. Life History Pattern      — recurring themes from achievements
 *   3. Character Strengths (VIA) — top 7 with narrative
 *   4. Personality Profile       — Big Five with career implications
 *   5. Behavioural Style         — Insights colour energy profile
 *   6. Career Directions         — 3-5 tailored directions
 *   7. Development Edge          — constructive growth areas
 *   8. Conclusions
 */

import { createRequire } from "module";
import { PH_LOGO_WHITE_BASE64 } from "./phLogoBase64.js";
import { LIFEWORK_LOGO_BASE64 } from "./lifeworkLogoBase64.js";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../_core/trpc";
import { invokeLLM } from "../_core/llm";
import { pseudonymise, PSEUDONYM_TOKEN } from "../shared/pseudonymise";
import { getOrGenerateCanonicalStage1, CANONICAL_SYSTEM_PROMPT, LIFE_HISTORY_PROMPT } from "./canonicalStage1";
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
  clearAllWowPdfUrls,
  insertReportGenerationLog,
  getReportGenerationRuns,
  getReportGenerationLogsByRunId,
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
  restoreClientName: (text: string) => string;
}> {
  const [profile, achievementsList, family, career, via, ipip] = await Promise.all([
    getClientProfileById(clientId),
    getAchievements(clientId),
    getFamilyBackground(clientId),
    getCareerHistory(clientId),
    getViaResults(clientId),
    getIpipResults(clientId),
  ]);

   if (!profile) throw new TRPCError({ code: "NOT_FOUND", message: "Client not found" });
  // Pseudonymise: use neutral token in all LLM prompts; real name only used in PDF rendering.
  const { restore: restoreClientName } = pseudonymise(profile.firstName, profile.lastName);
  const clientName = PSEUDONYM_TOKEN;
  const clientFullName = PSEUDONYM_TOKEN;
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

  return { clientName, clientFullName, pronouns, contextText: lines.join("\n"), viaRanked, domainScores, facetScores, restoreClientName };
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
  fourPillars: string;
  viaRanked: Array<{ name: string; score: number; rank: number; strengthId?: string }>;
  domainScores: Record<string, number>;
  facetScores: Record<string, number>;
  reportType: WowReportType;
}

// ─── Helper: call LLM with a per-request timeout ────────────────────────────
/**
 * Fix markdown table separator rows that the LLM has corrupted by substituting
 * typographic dashes (en-dash \u2013, em-dash \u2014, minus \u2212) for plain
 * ASCII hyphens. GFM table parsing requires plain hyphens in the separator row;
 * any other character causes the whole table to render as raw pipe-separated text.
 *
 * This function scans each line and, if it looks like a table separator row
 * (starts and ends with `|`, contains only `|`, `-`, `:`, spaces, and
 * typographic dash variants), replaces all dash variants with `-`.
 */
function sanitiseMarkdownTables(text: string): string {
  return text
    .split("\n")
    .map((line) => {
      // A separator row looks like: | --- | :---: | ---: | (with optional spaces)
      // Allow en-dash (\u2013), em-dash (\u2014), minus sign (\u2212), figure dash (\u2012)
      const isSeparatorRow = /^\|[\s|:\-\u2012\u2013\u2014\u2212]+\|\s*$/.test(line);
      if (isSeparatorRow) {
        // Replace all typographic dash variants with plain ASCII hyphen
        return line.replace(/[\u2012\u2013\u2014\u2212]/g, "-");
      }
      return line;
    })
    .join("\n");
}

async function callLLMWithTimeout(
  systemPrompt: string,
  userPrompt: string,
  timeoutMs = 90_000
): Promise<string> {
  const apiUrl = (process.env.BUILT_IN_FORGE_API_URL ?? "https://forge.manus.im").replace(/\/$/, "");
  const apiKey = process.env.BUILT_IN_FORGE_API_KEY ?? "";
  const MAX_RETRIES = 4;
  const BASE_DELAY_MS = 8_000; // 8 s initial backoff for 429
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
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
      clearTimeout(timer);
      if (resp.status === 429 && attempt < MAX_RETRIES) {
        // Rate-limited: wait with exponential backoff then retry
        const retryAfterHeader = resp.headers.get("retry-after");
        const waitMs = retryAfterHeader
          ? parseInt(retryAfterHeader, 10) * 1000
          : BASE_DELAY_MS * Math.pow(2, attempt);
        await new Promise(res => setTimeout(res, waitMs));
        continue;
      }
      if (!resp.ok) {
        const txt = await resp.text();
        throw new Error(`LLM error ${resp.status}: ${txt.substring(0, 200)}`);
      }
      const data = await resp.json() as { choices: Array<{ message: { content: string } }> };
      const raw = data.choices[0]?.message?.content ?? "";
      return sanitiseMarkdownTables(raw);
    } catch (err) {
      clearTimeout(timer);
      throw err;
    }
  }
  throw new Error("LLM error 429: rate limit exceeded after retries");
}

// ─── Report type variants ────────────────────────────────────────────────────

export type WowReportType = "standard" | "student" | "career_changer" | "job_returner" | "retirement";
export type WritingStyle = "house" | "mark" | "clive-james" | "michael-lewis" | "oliver-sacks" | "william-zinsser";

const MARK_BRANDON_SYS = `You are writing in the style of Mark Brandon — a British writer, journalist, and legal sector consultant. His voice has these characteristics:

TONE & PERSONALITY:
- Conversational and direct — write as if talking to the reader, not presenting to them
- Dry, understated British wit — humorous but never silly; the joke lands in the construction of a sentence as much as the punchline
- Strong opinions stated plainly, without excessive hedging or qualification
- Warm but not sentimental

SENTENCE STRUCTURE:
- Mix longer analytical sentences with short, punchy ones for emphasis. The short sentence usually follows the long one and lands the point. Like this.
- Use rhetorical questions to draw the reader in
- Parenthetical asides — in brackets or between dashes — to add colour, a wry observation, or a qualifying thought mid-sentence

VOICE & STYLE MARKERS:
- Address the reader directly using "you" freely
- Reference concrete examples from the life history to illustrate abstract points
- Use italics for emphasis rather than bold, and sparingly
- British spellings throughout (colour, organised, recognise, behaviour, etc.)
- Colloquial expressions used naturally, not forced ("trust me", "and yet", "which is, when you think about it...")
- Avoid corporate jargon, buzzwords, or overly academic language
- Never be flowery or purple in prose — keep it grounded

WHAT TO AVOID:
- Lyrical or literary flourishes ("the foundational melodies of your life's composition" — not his style)
- Passive voice where active will do
- Excessive use of bullet points in flowing prose — prefer natural sentence construction
- Padding, throat-clearing, or unnecessary preamble — get to the point
- Never open any section with a salutation, greeting, or letter-style introduction
- Never include flattery, fawning, or obsequious preamble of any kind

EXAMPLE OF HIS VOICE: "Let's be clear at the outset: lateral hiring is not a science. It's not even an art. It's more of a craft. There will be moments of genius, moments of sheer luck. There will be abject failure. But more than anything, successful lateral hiring depends on good craft."

You are still analysing the same client data and drawing the same analytical conclusions — the content and evidence must remain rigorous. Only the voice changes. The report is still written to the client using "you" and "your" throughout.`;

const REPORT_TYPE_LABELS: Record<WowReportType, string> = {
  standard:       "Standard Career Analysis",
  student:        "First Career — Student",
  career_changer: "Career Change",
  job_returner:   "Returning to Work",
  retirement:     "Retirement & Legacy",
};

/**
 * Returns variant-specific prompt overrides for Chapters 6 (Career Directions),
 * 7 (Development Edge), and 8 (Conclusions). The standard variant returns null
 * for all three, meaning the default prompts are used.
 */
function getVariantPrompts(type: WowReportType, ctx: string, sys: string): {
  careerDirectionsPrompt: string | null;
  developmentEdgePrompt: string | null;
  conclusionsPrompt: string | null;
} {
  if (type === "standard" || type === "career_changer") return { careerDirectionsPrompt: null, developmentEdgePrompt: null, conclusionsPrompt: null };

  const variantInstructions: Record<WowReportType, { directions: string; edge: string; conclusions: string }> = {
    standard: { directions: "", edge: "", conclusions: "" }, // unused

    student: {
      directions: `${ctx}\n\nWrite the Career Directions chapter for a client who is at the START of their career — this is their first serious career decision. Write directly to the client using "you" and "your" throughout. Begin IMMEDIATELY with the first direction — no introductory paragraph, no preamble.\n\nYou MUST write EXACTLY 3 career directions — no more, no fewer. Do not stop after 2. All 3 must be present in your response. For each:\n- Name it as a ## heading (e.g. ## Strategy and Policy Work in the Public Sector)\n- Write 2 short paragraphs (4-5 lines each):\n  - Paragraph 1: Why this direction fits your specific combination of life history, character strengths, and personality — even though your formal career is just beginning. Reference what you have already shown in education, voluntary work, sports, or early experiences.\n  - Paragraph 2: What it could look like in practice. Name 2-3 concrete entry-level roles or graduate pathways. Be specific about how to get started.\n\nThese should feel tailored and specific — not generic job titles. Each direction should be grounded in what this person has already demonstrated, not in abstract potential.\n\nClose with: "From what you have told us, we can see:" followed by 3 tight bullets naming the key career fit factors.`,

      edge: `${ctx}\n\nWrite the Development Edge chapter for a client at the START of their career. Write directly to the client using "you" and "your" throughout. Begin IMMEDIATELY with the first development area — no introductory paragraph.\n\nYou MUST write EXACTLY 3 development edges — no more, no fewer. Do not stop after 1 or 2. All 3 must be present in your response. For each:\n- Name it precisely as a ## heading (e.g. ## Building Credibility Before You Have a Track Record)\n- Write 2 short paragraphs (4-5 lines each):\n  - Paragraph 1: What the evidence already shows about this pattern — from education, early experiences, or psychometric data.\n  - Paragraph 2: Why this matters specifically at the start of a career, and what to do about it in the first 2-3 years.\n\nFrame these as practical early-career guidance, not criticism. The goal is to help the client build the right habits before they become entrenched.\n\nClose with: "From what you have told us, we can see:" followed by 2-3 tight bullets naming the core development priorities for the first career stage.`,

      conclusions: `${ctx}\n\nWrite the Conclusions chapter for a client who is at the START of their career. Write directly to the client using "you" and "your" throughout. Do NOT write any introductory paragraph. Begin immediately with ## Past.\n\n## Past\n2 short paragraphs (4-5 lines each):\n- Name the 2-3 seed themes already visible in education, childhood, and early experiences\n- Show how these themes already point toward a distinctive professional identity — even before a formal career has begun\n\n## Present\n2 short paragraphs (4-5 lines each):\n- Name the 3 most distinctive character strengths and what makes them powerful in combination\n- State plainly what kind of professional you are already becoming, drawing on personality profile and behavioural style\n\n## Future\n2 short paragraphs (4-5 lines each):\n- Name the 2-3 most compelling career directions and why they fit specifically\n- Name the 1-2 development priorities for the first 3 years that will most accelerate your trajectory\n- End with a forward-looking statement: what does success look like at the end of the first decade?\n\n## Tell Me About Yourself\nIntroduce with exactly this sentence: "The following is a suggested answer to the interview question 'Tell me about yourself' — drawn from everything your Lifework analysis has revealed:"\n\nThen write the following structure in the first person (to be spoken by the client):\n\nParagraph 1: Open with "I am fundamentally driven by:" then immediately follow with three bullet points (one line each) naming the three core drivers precisely — one short phrase each, drawn directly from the evidence. Specific and distinctive, not generic virtues. Then add 1-2 sentences describing what these drivers have shaped the client for — the kinds of roles and environments where they do their best work.\n\nParagraph 2: Begin with "Even at this early stage, I have already shown..." and name 2-3 specific demonstrated capabilities from the life history.\n\nParagraph 3: A single closing sentence of intent. What kind of career are you building, and why?\n\nThe whole piece should be speakable in under 90 seconds. Every sentence must earn its place.`,
    },

    career_changer: {
      directions: `${ctx}\n\nWrite the Career Directions chapter for a client who is CHANGING CAREER — moving away from a field where they have lost satisfaction or confidence. Write directly to the client using "you" and "your" throughout. Begin IMMEDIATELY with the first direction — no introductory paragraph, no preamble.\n\nYou MUST write EXACTLY 3 career directions — no more, no fewer. Do not stop after 2. All 3 must be present in your response. For each:\n- Name it as a ## heading (e.g. ## Leadership Roles in Mission-Driven Organisations)\n- Write 2 short paragraphs (4-5 lines each):\n  - Paragraph 1: Why this direction fits your specific combination of life history, character strengths, and personality — and why it represents a genuine step toward what you are actually built for, not just an escape from what you are leaving.\n  - Paragraph 2: What it could look like in practice. Name 2-3 concrete role types or sectors. Name the transferable skills from your existing career that give you a real advantage here.\n\nBe direct about the transition: acknowledge what the client is leaving behind and why the new direction is a better fit — not just a change of scenery.\n\nClose with: "From what you have told us, we can see:" followed by 3 tight bullets naming the key career fit factors and the strongest transferable assets.`,

      edge: `${ctx}\n\nWrite the Development Edge chapter for a client who is CHANGING CAREER. Write directly to the client using "you" and "your" throughout. Begin IMMEDIATELY with the first development area — no introductory paragraph.\n\nYou MUST write EXACTLY 3 development edges — no more, no fewer. Do not stop after 1 or 2. All 3 must be present in your response. For each:\n- Name it precisely as a ## heading (e.g. ## The Credibility Gap in a New Field)\n- Write 2 short paragraphs (4-5 lines each):\n  - Paragraph 1: What the evidence shows about this pattern — from the life history, psychometric data, or the pattern of dissatisfaction in the current career.\n  - Paragraph 2: What it costs during a career transition if left unaddressed, and what to do about it specifically.\n\nAt least one edge should address the psychological challenge of transition itself — the identity shift, the temporary loss of status, or the risk of choosing safety over fit.\n\nClose with: "From what you have told us, we can see:" followed by 2-3 tight bullets naming the core development priorities for the transition period.`,

      conclusions: `${ctx}\n\nWrite the Conclusions chapter for a client who is CHANGING CAREER. Write directly to the client using "you" and "your" throughout. Do NOT write any introductory paragraph. Begin immediately with ## Past.\n\n## Past\n2 short paragraphs (4-5 lines each):\n- Name the 2-3 seed themes visible from the earliest experiences\n- Identify the moment or pattern where the current career began to diverge from those themes — when did the work stop fitting the person?\n\n## Present\n2 short paragraphs (4-5 lines each):\n- Name the 3 most distinctive character strengths and what makes them powerful in combination\n- State plainly what kind of professional you are at your best — and contrast this with what the current career has been asking of you\n\n## Future\n2 short paragraphs (4-5 lines each):\n- Name the 2-3 most compelling new directions and why they fit specifically\n- Name the 1-2 development edges that, if addressed, will most accelerate the transition\n- End with a forward-looking statement: what does the right career feel like, and why is this the right moment to move?\n\n## Tell Me About Yourself\nIntroduce with exactly this sentence: "The following is a suggested answer to the interview question 'Tell me about yourself' — drawn from everything your Lifework analysis has revealed:"\n\nThen write the following structure in the first person (to be spoken by the client):\n\nParagraph 1: Open with "I am fundamentally driven by:" then immediately follow with three bullet points (one line each) naming the three core drivers precisely — one short phrase each, drawn directly from the evidence. Specific and distinctive, not generic virtues. Then add 1-2 sentences describing what these drivers have shaped the client for — the kinds of roles and environments where they do their best work.\n\nParagraph 2: Begin with "My career to date has given me..." and name 2-3 specific transferable capabilities. Then: "But what I am moving toward is..." and name the new direction in one sentence.\n\nParagraph 3: A single closing sentence of intent. Why now, and what are you looking for?\n\nThe whole piece should be speakable in under 90 seconds. Every sentence must earn its place.`,
    },

    job_returner: {
      directions: `${ctx}\n\nWrite the Career Directions chapter for a client who is RETURNING TO WORK after a career break. Write directly to the client using "you" and "your" throughout. Begin IMMEDIATELY with the first direction — no introductory paragraph, no preamble.\n\nYou MUST write EXACTLY 3 career directions — no more, no fewer. Do not stop after 2. All 3 must be present in your response. For each:\n- Name it as a ## heading (e.g. ## Senior Advisory and Consultancy Roles)\n- Write 2 short paragraphs (4-5 lines each):\n  - Paragraph 1: Why this direction fits your specific combination of life history, character strengths, and personality — and why the career break, far from being a gap, may have added something. Be specific.\n  - Paragraph 2: What it could look like in practice. Name 2-3 concrete role types or re-entry pathways. Name the skills and experience that remain fully current and relevant.\n\nAcknowledge the reality of returning: some things will need updating, some things will be stronger than ever. Be honest about both.\n\nClose with: "From what you have told us, we can see:" followed by 3 tight bullets naming the key career fit factors and the strongest assets the client brings back.`,

      edge: `${ctx}\n\nWrite the Development Edge chapter for a client who is RETURNING TO WORK after a career break. Write directly to the client using "you" and "your" throughout. Begin IMMEDIATELY with the first development area — no introductory paragraph.\n\nYou MUST write EXACTLY 3 development edges — no more, no fewer. Do not stop after 1 or 2. All 3 must be present in your response. For each:\n- Name it precisely as a ## heading (e.g. ## Rebuilding Professional Confidence)\n- Write 2 short paragraphs (4-5 lines each):\n  - Paragraph 1: What the evidence shows about this pattern — from the life history, psychometric data, or the specific challenges of returning after time away.\n  - Paragraph 2: What it costs if left unaddressed during re-entry, and what to do about it specifically.\n\nAt least one edge should address the confidence and self-perception challenges that often accompany a return to work — without being patronising. Name the specific pattern this person is likely to face.\n\nClose with: "From what you have told us, we can see:" followed by 2-3 tight bullets naming the core development priorities for the return period.`,

      conclusions: `${ctx}\n\nWrite the Conclusions chapter for a client who is RETURNING TO WORK after a career break. Write directly to the client using "you" and "your" throughout. Do NOT write any introductory paragraph. Begin immediately with ## Past.\n\n## Past\n2 short paragraphs (4-5 lines each):\n- Name the 2-3 seed themes visible from the earliest experiences and through the career before the break\n- Identify what the career break has added — what has been learned, developed, or clarified during the time away\n\n## Present\n2 short paragraphs (4-5 lines each):\n- Name the 3 most distinctive character strengths and what makes them powerful in combination\n- State plainly what kind of professional you are at your best — and what remains fully intact after the break\n\n## Future\n2 short paragraphs (4-5 lines each):\n- Name the 2-3 most compelling directions for re-entry and why they fit specifically\n- Name the 1-2 development priorities that will most accelerate the return\n- End with a forward-looking statement: what does a successful return look like, and what does it make possible?\n\n## Tell Me About Yourself\nIntroduce with exactly this sentence: "The following is a suggested answer to the interview question 'Tell me about yourself' — drawn from everything your Lifework analysis has revealed:"\n\nThen write the following structure in the first person (to be spoken by the client):\n\nParagraph 1: Open with "I am fundamentally driven by:" then immediately follow with three bullet points (one line each) naming the three core drivers precisely — one short phrase each, drawn directly from the evidence. Specific and distinctive, not generic virtues. Then add 1-2 sentences describing what these drivers have shaped the client for — the kinds of roles and environments where they do their best work.\n\nParagraph 2: Begin with "Before my career break, I built a track record in..." and name 2-3 specific capabilities. Then: "During that time, I also..." and name one thing the break added.\n\nParagraph 3: A single closing sentence of intent. What are you returning to do, and why now?\n\nThe whole piece should be speakable in under 90 seconds. Every sentence must earn its place.`,
    },

    retirement: {
      directions: `${ctx}\n\nWrite the Career Directions chapter for a client who is PLANNING FOR RETIREMENT — this chapter is titled "What To Do With What You Know" and focuses on how to deploy a lifetime of accumulated capability in the next chapter of life. Write directly to the client using "you" and "your" throughout. Begin IMMEDIATELY with the first direction — no introductory paragraph, no preamble.\n\nYou MUST write EXACTLY 3 directions for this next chapter — no more, no fewer. Do not stop after 2. All 3 must be present in your response. For each:\n- Name it as a ## heading (e.g. ## Board and Advisory Roles, ## Mentoring and Teaching, ## Portfolio Work and Consultancy)\n- Write 2 short paragraphs (4-5 lines each):\n  - Paragraph 1: Why this direction is a natural expression of the client's deepest strengths and values — grounded in specific life history evidence. Not what they have done, but what they are built for.\n  - Paragraph 2: What it could look like in practice. Name 2-3 concrete forms this could take. Be specific about how to begin.\n\nThese directions should feel like a genuine next chapter — not a wind-down, not a hobby list, but a purposeful deployment of everything this person has become.\n\nClose with: "From what you have told us, we can see:" followed by 3 tight bullets naming the key fit factors for this next chapter.`,

      edge: `${ctx}\n\nWrite the Development Edge chapter for a client who is PLANNING FOR RETIREMENT. Reframe this chapter as "What To Watch" — the patterns and tendencies that, if unexamined, could limit the quality of the next chapter. Write directly to the client using "you" and "your" throughout. Begin IMMEDIATELY with the first area — no introductory paragraph.\n\nYou MUST write EXACTLY 3 areas to watch — no more, no fewer. Do not stop after 1 or 2. All 3 must be present in your response. For each:\n- Name it precisely as a ## heading (e.g. ## The Risk of Losing Structure, ## Giving Without Receiving, ## Staying Relevant Without Needing to Be Central)\n- Write 2 short paragraphs (4-5 lines each):\n  - Paragraph 1: What the evidence shows about this pattern — from the life history, psychometric data, or the specific challenges of the transition from full-time work.\n  - Paragraph 2: What it costs in the retirement chapter if left unexamined, and what to do about it specifically.\n\nFrame these as wisdom, not criticism. The goal is to help the client enter this chapter with clear eyes.\n\nClose with: "From what you have told us, we can see:" followed by 2-3 tight bullets naming the key things to watch in this transition.`,

      conclusions: `${ctx}\n\nWrite the Conclusions chapter for a client who is PLANNING FOR RETIREMENT. The frame for this chapter is: what has a life of work revealed about who this person is, and what does that mean for the next chapter? Write directly to the client using "you" and "your" throughout. Do NOT write any introductory paragraph. Begin immediately with ## Past.\n\n## Past\n2 short paragraphs (4-5 lines each):\n- Name the 2-3 seed themes present from the earliest recorded experiences\n- Show how these themes have reproduced and deepened across the decades. What has a lifetime of work confirmed about who you are?\n\n## Present\n2 short paragraphs (4-5 lines each):\n- Name the 3 most distinctive character strengths and what makes them powerful in combination\n- State plainly what kind of person you are at your best — not just as a professional, but as a human being. What do you bring to any room you enter?\n\n## Future\n2 short paragraphs (4-5 lines each):\n- Name the 2-3 most compelling directions for the next chapter and why they fit specifically\n- Name the 1-2 things to watch that, if addressed, will make the transition richer\n- End with a forward-looking statement: what does a life well-lived look like from here, and what does this next chapter make possible?\n\n## Tell Me About Yourself\nIntroduce with exactly this sentence: "The following is a suggested answer to the question 'What are you doing now?' — drawn from everything your Lifework analysis has revealed:"\n\nThen write the following structure in the first person (to be spoken by the client):\n\nParagraph 1: Open with "I am fundamentally driven by:" then immediately follow with three bullet points (one line each) naming the three core drivers precisely — one short phrase each, drawn directly from the evidence. Specific and distinctive, not generic virtues. Then add 1-2 sentences describing what these drivers have shaped the client for — the kinds of contribution, environment, or purpose where they do their best work.\n\nParagraph 2 (2-3 sentences): A forward-looking statement for this next chapter. What should it draw on? What should it offer? End with a single sentence of intent.\n\nThe whole piece should be readable in under 60 seconds. Every sentence must earn its place.`,
    },
  };

  const v = variantInstructions[type];
  return {
    careerDirectionsPrompt: v.directions || null,
    developmentEdgePrompt: v.edge || null,
    conclusionsPrompt: v.conclusions || null,
  };
}

async function generateWowSections(clientId: number, reportType: WowReportType = "standard", writingStyle: WritingStyle = "house", runId?: string): Promise<WowReportSections> {
  const _runId = runId ?? crypto.randomUUID();
  const { clientName, clientFullName, pronouns, contextText, viaRanked, domainScores, facetScores, restoreClientName } = await buildClientContext(clientId);
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

  const sys = `You are Jamie Pennington — a senior career analyst at Pennington Hennessy with thirty years of experience reading life histories and drawing inferences from psychometric data. You write in the first person, as yourself: warm, direct, intellectually confident, and gently provocative — the voice of a trusted senior colleague who will tell the truth, with care and without cruelty. The report is written by you, Jamie, and the reader should feel that a real person with deep expertise and genuine interest in their story has sat down and written this for them.

Your method is forensic: you treat the client's life history as a body of evidence, examine it systematically for recurring patterns, cross-reference it against the psychometric data, and then commit your findings to the report with confidence. You do not hedge. When the evidence points clearly in a direction, you say so. When it is ambiguous, you name the ambiguity and explain what it means.

HOUSE STYLE — THE PUNCHY APPROACH (apply rigorously to every section):

This report uses a direct, evidence-led style designed to deliver maximum insight per word. The goal is to make the client feel that every sentence earns its place — that this is the most insightful thing anyone has ever written about them, delivered without padding or ceremony.

1. SHORT PARAGRAPHS. Every paragraph is 4-5 lines maximum, often 2-3 paragraphs per subsection. No paragraph should run longer than 5 sentences. If you find yourself writing a sixth sentence, start a new paragraph.

2. SECOND PERSON, ALWAYS. Write directly to the client: "You are...", "You have...", "Your pattern is...". Never use the client's name or third-person pronouns in the body text. The client is always "you".

3. EVIDENCE-LED, NOT EVIDENCE-BURIED. Name specific achievements, roles, and moments from the life history. The evidence should appear early in each paragraph — not as a footnote at the end. Ground every observation in what the client has actually done.

4. BULLET POINTS WITH A CLEAR INTRODUCTION. When using bullet points, introduce them with: "From what you have told us, we can see:" — then 3-6 tight, specific bullets. Each bullet is one complete thought. No sub-bullets.

5. ACTIVE VOICE, NO HEDGING. "You build systems" not "You tend to have a preference for building systems". "This costs you" not "This may potentially have some impact on". Commit to the inference.

6. NO THEATRICAL FLOURISHES. Do not open with poetic scene-setting, philosophical observations, or rhetorical questions designed to sound profound. Go straight into the observation. The insight itself is the WOW — it does not need a fanfare.

7. CONFIDENT BUT NOT CLINICAL. The tone is that of a trusted senior colleague who has read every word of the life history and is now telling the client what they see — warmly, directly, and without softening the conclusions.

8. ENDINGS THAT LAND. The final sentence of each section should feel like a conclusion, not a trailing off. Short, declarative, earned.

CRITICAL TONE RULES (non-negotiable):
- NEVER open any section with a salutation, greeting, or letter-style introduction. No "Dear ${clientName}", no "It is a privilege to present...", no "We are delighted to...", no "This report aims to...".
- NEVER include flattery, fawning, or obsequious preamble of any kind. Go straight into the analysis.
- Do NOT use hollow superlatives: "impressive", "remarkable", "wonderful", "exciting potential", "you should be proud". These are not analytical observations.
- Name the tension, not just the conclusion. Where the client's history contains a paradox — strong performer who keeps leaving, technically brilliant but relationally frustrated — name it explicitly.
- Do not be preachy. Make a point once, clearly, and trust the reader to hold it.
- Avoid management jargon: leverage, stakeholder, bandwidth, deliverables, impact (as a verb), going forward, holistic, authentic (as a buzzword).
- Write directly to the client using "you" and "your" throughout. Never use the client's first name or third-person pronouns (he/she/they) when referring to the client. The client is always "you". Use pronouns: ${pronouns}.
- Where the evidence is strong, commit to a clear inference. Where it is mixed, name the tension without resolving it artificially.

FORMATTING RULES (strictly follow):
- Every paragraph must be 4-5 lines maximum. Never write a paragraph longer than 5 sentences.
- Separate every paragraph with a blank line.
- Use ## for subheadings within a section (e.g. "## The Opening Bars").
- Use **bold** to highlight key terms or strength names on first mention.
- Use bullet points introduced with "From what you have told us, we can see:" for summary observations at the end of subsections.
- Never write walls of text. White space is as important as the words.
- Headers should name the idea, not just the category.`;

  // generateWowSections always produces house-style output.
  // Mark Brandon style is applied as a post-processing rewrite stage in rewriteSectionsForMark().
  const effectiveSys = sys;
  const ctx = `CLIENT DATA FOR ${clientName.toUpperCase()}:\n${contextText}`;

  const insightsSys = `You are Jamie Pennington — a senior career analyst at Pennington Hennessy — writing the Behavioural Style section of a career analysis report for ${clientName}. You write in the first person, as yourself: warm, direct, intellectually confident, and gently provocative — the voice of a trusted senior colleague who tells the truth with care and without cruelty.
${pronouns ? `Use pronouns: ${pronouns}.` : ""}

This section uses the Insights Discovery vocabulary (colour energies) to give a clear, evidence-based picture of how ${clientName} tends to operate in professional settings. It is a tool for self-awareness and practical application, not a label.

STYLE: Use rhetorical questions to open sub-sections where natural. Vary sentence length — short declarative sentences for emphasis, longer sentences to build an argument. Reach for a concrete analogy when making a point about how a colour energy shows up in practice. End each sub-section with a line that lands. Do not be preachy — make a point once and trust the reader. Avoid management jargon.

Write the following four sub-sections using ## headings. Be specific and analytical. Do not use flattering or hollow superlatives. Commit to clear inferences from the data.

## Colour Energy Profile
Describe the client's primary (${primaryColour}) and secondary (${secondaryColour}) colour energies with precision. Write directly to the client: explain what each energy means in practice — how it shows up in your communication style, decision-making, and relationships at work. Name the specific combination and what it produces. Where relevant, name the tension or paradox this combination creates.

## At Your Best
Describe specifically what you look like when operating from your strongest energies. What do colleagues observe? What do you contribute that others typically cannot? Be concrete — name the kinds of situations and challenges where this profile excels.

## Under Pressure
Describe how you are likely to behave when stressed or outside your comfort zone. Be direct. What would a perceptive colleague notice? Name it plainly — this is information, not criticism.

## Working With Others
Give one or two precise observations about how you tend to work with people whose colour energies are very different from your own. Name the likely friction points and the likely complementarities. End with a practical observation about what you can do with this awareness.

Write directly to the client using "you" and "your" throughout. Do NOT include any introductory paragraph before the first ## heading. Do NOT use flattering or encouraging language.`;
  // Behavioural Style always generated in house style; Mark rewrite applied post-generation.
  const effectiveInsightsSys = insightsSys;
  const insightsData = Object.keys(domainScores).length > 0
    ? `Primary colour energy: ${primaryColour}\nSecondary colour energy: ${secondaryColour}\nJungian type approximation: ${jungianType}\nExtraversion: ${eScore}/100\nAgreeableness: ${aScore}/100\nOpenness: ${oScore}/100\nConscientiousness: ${cScore}/100`
    : "IPIP-NEO data not available — Insights profile cannot be generated.";

  console.log(`[WOW Report] Starting generation for client ${clientId}`);
  // Step 1: Get (or generate) the canonical life history analysis — single source of truth
  const canonicalLifeHistory = await getOrGenerateCanonicalStage1(clientId);
  console.log(`[WOW Report] Canonical Stage 1 ready for client ${clientId}`);

  // Life History Pattern always uses the canonical house-style output.
  // Mark Brandon rewrite is applied post-generation by rewriteSectionsForMark().
  const lifeHistoryPattern = canonicalLifeHistory;

  // Trace the canonical life history (Step 1) immediately
  const _lhT0 = Date.now();
  insertReportGenerationLog({
    clientId,
    runId: _runId,
    writingStyle,
    reportType,
    sectionKey: "lifeHistoryPattern",
    sectionLabel: "Life History Pattern (Canonical)",
    promptSent: CANONICAL_SYSTEM_PROMPT ?? "(canonical stage 1 system prompt)",
    contextSent: LIFE_HISTORY_PROMPT ?? "(canonical stage 1 user prompt)",
    rawOutput: canonicalLifeHistory,
    durationMs: Date.now() - _lhT0,
  }).catch(() => {});

  // Trace helper — wraps callLLMWithTimeout and saves a log entry (non-blocking)
  async function tracedCall(sectionKey: string, sectionLabel: string, sysPrompt: string, userPrompt: string, timeoutMs?: number): Promise<string> {
    const t0 = Date.now();
    const result = await callLLMWithTimeout(sysPrompt, userPrompt, timeoutMs);
    insertReportGenerationLog({
      clientId,
      runId: _runId,
      writingStyle,
      reportType,
      sectionKey,
      sectionLabel,
      promptSent: sysPrompt,
      contextSent: userPrompt,
      rawOutput: result,
      durationMs: Date.now() - t0,
    }).catch(() => {});
    return result;
  }

  // Step 2: Run remaining 7 sections in parallel — each with its own 90s timeout
  const [
    summary,
    viaSection,
    personalitySection,
    behaviouralStyle,
    careerDirections,
    developmentEdge,
    fourPillars,
    coachingQuestions,
  ] = await Promise.all([
    tracedCall("summary", "Lifework Summary", effectiveSys,
      `${ctx}\n\nWrite the Lifework Summary — the opening portrait of this client. This is the most important paragraph in the report: the first thing they read, and the statement that should make them feel immediately and precisely seen.\n\nSTRUCTURE:\n\nParagraph 1 (4-5 lines): Begin with "You are..." and write a single direct, evidence-grounded portrait. Name the core theme that runs from the earliest experiences to today. Reference 2-3 specific achievements or moments from the life history. Name the 2-3 character strengths that are most active in the evidence. End with a sentence that captures the single most distinctive thing about this person as a professional.\n\nThen write: "From what you have told us, we can see:"\n\nThen 5-6 tight bullet points, each one a specific, evidence-grounded observation about this person's pattern, motivation, or working style. Each bullet should be one complete sentence. No generalities — every bullet should be something that could only be written about this specific person.\n\nDo NOT include any introductory paragraph. Begin immediately with "You are...". Do NOT use hollow superlatives. Do NOT write more than one opening paragraph before the bullets.`
    ),
    tracedCall("via", "Character Strengths (VIA)", effectiveSys,
      `${ctx}\n\n--- CANONICAL LIFE HISTORY ANALYSIS (authoritative interpretation — use this when assessing strength evidence and Identity Salience) ---\n${lifeHistoryPattern}\n--- END CANONICAL LIFE HISTORY ANALYSIS ---\n\nWrite the Character Strengths chapter of the Lifework report. Write directly to the client using "you" and "your" throughout. Do NOT write any introductory paragraph before the first heading.\n\nIMPORTANT: When assessing which achievements show evidence of each strength and when judging Identity Salience, use the canonical life history analysis above — not just the raw achievement list. The canonical analysis has already identified the recurring themes; your job is to cross-reference those patterns against the VIA strengths.\n\n## The Evidence Table\nProduce a markdown table with EXACTLY these six columns:\n| Strength | VIA Definition | Survey Rank | Freq (of N) | Identity Salience | Achievements with evidence |\n|---|---|---|---|---|---|\n\nCRITICAL: The separator row MUST use plain ASCII hyphens (-) only. No en-dashes, em-dashes, or other typographic characters in the separator row.\n\nRules:\n- Strength: the strength name\n- VIA Definition: a plain-language definition — 1 concise sentence, not clinical wording\n- Survey Rank: its rank in the VIA results (1 = highest)\n- Freq (of N): count of fulfilling achievements in the life history showing clear evidence of this strength\n- Identity Salience: LOW / MEDIUM / HIGH / VERY HIGH — informed by the canonical life history analysis above, not just the raw achievement titles\n- Achievements with evidence: specific achievement names where the evidence is clearest, comma-separated\n\nInclude ALL top 5 VIA strengths. No prose before or after the table in this section.\n\n## The Key Findings\nWrite 3 short paragraphs (4-5 lines each). Each paragraph that names a divergence MUST begin with a bold lead sentence: **[Strength] (rank N) is doing more work than [Strength] (rank N).**\n\nThe paragraphs must:\n- Name the most analytically significant divergence: which strength has the highest frequency in fulfilling moments but a lower survey rank?\n- Identify any strength where frequency and identity salience diverge: high frequency + low salience = trained behaviour. Low frequency but pivotal moments + high salience = deepest organising value.\n- Where the evidence warrants it, quote the specific life history detail that proves the point (use italics: *"exact words"*).\n\nClose with: "From what you have told us, we can see:" followed by 3-4 tight bullets naming the key strength findings.\n\nFinal line: one sentence that captures the most important insight this analysis reveals — something the survey rank alone would not have shown.`
    ),
    tracedCall("personality", "Personality Profile", effectiveSys,
      `${ctx}\n\nWrite the Personality Profile chapter of the Lifework report. Write directly to the client using "you" and "your" throughout. Do NOT write any introductory paragraph before the first heading. Begin immediately with ## What the Psychometrics Show.\n\n## What the Psychometrics Show\nA PURE psychometric portrait. Interpret the Big Five scores on their own terms — as if you had not read the life history. For each of the five domains (Openness, Conscientiousness, Extraversion, Agreeableness, Neuroticism), write 2 sentences that:\n- State what the score means in plain language\n- Name what this score predicts about working style, stress responses, and environments where you thrive or struggle\n\nDo NOT reference the life history in this section.\n\nClose with: "From what you have told us, we can see:" followed by 3-4 tight bullets summarising the psychometric portrait.\n\n## Where the Two Pictures Meet\nCompare the psychometric portrait with the life history evidence. For each domain where there is a divergence, write one short paragraph (4-5 lines) that:\n- Names the divergence type: high score + low life history evidence (capacity not yet expressed), or low score + high life history evidence (deliberate effort, not natural ease)\n- States plainly what this means in career terms\n\nSkip domains where the two sources simply agree. Focus on divergences.\n\n## What This Means\nOne short paragraph (4-5 lines): the single most important insight that emerges from comparing the two pictures. What does the client now know about themselves that neither source alone could have revealed?`
    ),
    tracedCall("behavioural", "Behavioural Style", effectiveInsightsSys, insightsData),
(() => {
      const { careerDirectionsPrompt } = getVariantPrompts(reportType, ctx, sys);
      return tracedCall("career", "Career Directions", effectiveSys,
        careerDirectionsPrompt ??
        `${ctx}\n\nWrite the Career Directions chapter. Write directly to the client using "you" and "your" throughout. Begin IMMEDIATELY with the first direction — no introductory paragraph, no preamble.\n\nYou MUST write EXACTLY 3 career directions — no more, no fewer. Do not stop after 2. All 3 must be present in your response. For each:\n- Name it as a ## heading (e.g. ## Strategic Leadership in Complex Organisations)\n- Write 2 short paragraphs (4-5 lines each):\n  - Paragraph 1: Why this direction fits your specific combination of life history, character strengths, and personality. Name specific evidence.\n  - Paragraph 2: What it could look like in practice. Name 2-3 concrete role types or environments.\n\nThese should feel tailored and specific — not generic job titles. Each direction should be something that could only be written for this person.\n\nClose with: "From what you have told us, we can see:" followed by 3 tight bullets naming the key career fit factors.`
      );
    })(),
    (() => {
      const { developmentEdgePrompt } = getVariantPrompts(reportType, ctx, sys);
      return tracedCall("development", "Development Edge", effectiveSys,
        developmentEdgePrompt ??
        `${ctx}\n\nWrite the Development Edge chapter. Write directly to the client using "you" and "your" throughout. Begin IMMEDIATELY with the first development area — no introductory paragraph.\n\nYou MUST write EXACTLY 3 development edges — no more, no fewer. Do not stop after 1 or 2. All 3 must be present in your response. For each:\n- Name it precisely as a ## heading (e.g. ## The Visibility Gap)\n- Write 2 short paragraphs (4-5 lines each):\n  - Paragraph 1: What the evidence shows. Connect it directly to specific life history moments, psychometric scores, or both.\n  - Paragraph 2: What it costs in career terms if left unaddressed. Be direct. Do not soften.\n\nFrame these as analytical observations, not encouragements. The goal is to name the gap clearly enough that the client recognises it and understands why it matters.\n\nClose with: "From what you have told us, we can see:" followed by 2-3 tight bullets naming the core development findings.`
      );
    })(),
    (async () => {
      const t0 = Date.now();
      const apiUrl = (process.env.BUILT_IN_FORGE_API_URL ?? "https://forge.manus.im").replace(/\/$/, "");
      const apiKey = process.env.BUILT_IN_FORGE_API_KEY ?? "";
      const fpUserPrompt = `${ctx}\n\n--- CANONICAL LIFE HISTORY ANALYSIS (authoritative interpretation — use this as the primary source of pattern evidence) ---\n${lifeHistoryPattern}\n--- END CANONICAL LIFE HISTORY ANALYSIS ---\n\nYou are writing the Four Conditions of Fulfilment chapter of the Lifework report for this client. This chapter applies the Savickas career construction framework to identify the four conditions under which this person consistently experiences energy, engagement, and meaning.\n\nThe chapter has a strict, fixed structure. You must produce exactly four pillars in this order: Places, People, Problems, Procedures.\n\nFor each of the four pillars, provide:\n- heading: use EXACTLY these headings (do not vary them):\n  places heading: "PLACES — Where Energy Was High"\n  people heading: "PEOPLE — Who Was Present, and in What Role"\n  problems heading: "PROBLEMS — The Nature of the Challenge"\n  procedures heading: "PROCEDURES — How the Work Was Done"\n- learning: a single direct sentence stating the core insight for that pillar, grounded in evidence from the life history. This will be prefixed with "Learning:" in the report — do NOT include the word "Learning:" in your response.\n- example1: a paragraph (3-5 sentences) — a specific, named example from the life history illustrating the learning. Use direct quotes from achievement descriptions where available. Name the specific event, age, or context.\n- example2: a second paragraph (3-5 sentences) — a different specific example from a different period of the life. Do NOT repeat the same event used in example1 or in other pillars.\n\nFor the combination section:\n- synthesis: a single paragraph beginning "You are most alive when..." that synthesises all four pillars into a description of the precise conditions under which this person is most fully themselves. Do NOT use bold markers.\n- practical_question: a single paragraph (3-5 sentences) stating the practical question this analysis raises. It must begin with "The practical question is not..." and reframe the career question in terms specific to this person's combination of pillars.\n\nCRITICAL RULES:\n- Draw primarily from the raw achievement data and the canonical life history analysis above\n- Write directly to the client using "you" and "your" throughout\n- Each pillar must be grounded in named, specific examples — no generalisations\n- Do NOT repeat the same example across different pillars\n- Do NOT use hollow superlatives, management jargon, or abstract claims\n- British spellings throughout\n- The four pillars must be genuinely distinct — Places is about environments, People is about relationships and roles, Problems is about the nature of challenges, Procedures is about method and working style`;
      const FP_MAX_RETRIES = 4;
      const FP_BASE_DELAY_MS = 8_000;
      let fpResp!: Response;
      for (let fpAttempt = 0; fpAttempt <= FP_MAX_RETRIES; fpAttempt++) {
        fpResp = await fetch(`${apiUrl}/v1/chat/completions`, {
          method: "POST",
          headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
          body: JSON.stringify({
            model: "gemini-2.5-flash",
            messages: [
              { role: "system", content: effectiveSys },
              { role: "user", content: fpUserPrompt },
            ],
            max_tokens: 4096,
            response_format: {
            type: "json_schema",
            json_schema: {
              name: "four_pillars",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  places: {
                    type: "object",
                    properties: {
                      heading: { type: "string" },
                      learning: { type: "string" },
                      example1: { type: "string" },
                      example2: { type: "string" },
                    },
                    required: ["heading", "learning", "example1", "example2"],
                    additionalProperties: false,
                  },
                  people: {
                    type: "object",
                    properties: {
                      heading: { type: "string" },
                      learning: { type: "string" },
                      example1: { type: "string" },
                      example2: { type: "string" },
                    },
                    required: ["heading", "learning", "example1", "example2"],
                    additionalProperties: false,
                  },
                  problems: {
                    type: "object",
                    properties: {
                      heading: { type: "string" },
                      learning: { type: "string" },
                      example1: { type: "string" },
                      example2: { type: "string" },
                    },
                    required: ["heading", "learning", "example1", "example2"],
                    additionalProperties: false,
                  },
                  procedures: {
                    type: "object",
                    properties: {
                      heading: { type: "string" },
                      learning: { type: "string" },
                      example1: { type: "string" },
                      example2: { type: "string" },
                    },
                    required: ["heading", "learning", "example1", "example2"],
                    additionalProperties: false,
                  },
                  combination: {
                    type: "object",
                    properties: {
                      synthesis: { type: "string" },
                      practical_question: { type: "string" },
                    },
                    required: ["synthesis", "practical_question"],
                    additionalProperties: false,
                  },
                },
                required: ["places", "people", "problems", "procedures", "combination"],
                additionalProperties: false,
              },
            },
          },
          }),
        });
        if (fpResp.status === 429 && fpAttempt < FP_MAX_RETRIES) {
          const retryAfterHeader = fpResp.headers.get("retry-after");
          const waitMs = retryAfterHeader
            ? parseInt(retryAfterHeader, 10) * 1000
            : FP_BASE_DELAY_MS * Math.pow(2, fpAttempt);
          await new Promise(res => setTimeout(res, waitMs));
          continue;
        }
        break; // success or non-429 error — exit retry loop
      }
      if (!fpResp.ok) {
        const txt = await fpResp.text();
        throw new Error(`fourPillars LLM error ${fpResp.status}: ${txt.substring(0, 200)}`);
      }
      const fpData = await fpResp.json() as { choices: Array<{ message: { content: string } }> };
      const fpRaw = fpData.choices[0]?.message?.content ?? "{}";
      const fp = JSON.parse(fpRaw) as {
        places: { heading: string; learning: string; example1: string; example2: string };
        people: { heading: string; learning: string; example1: string; example2: string };
        problems: { heading: string; learning: string; example1: string; example2: string };
        procedures: { heading: string; learning: string; example1: string; example2: string };
        combination: { synthesis: string; practical_question: string };
      };
      // Assemble the exact markdown format
      const assembledFourPillars = [
        `## PLACES — Where Energy Was High`,
        ``,
        `Learning: ${fp.places.learning}`,
        ``,
        fp.places.example1,
        ``,
        fp.places.example2,
        ``,
        `## PEOPLE — Who Was Present, and in What Role`,
        ``,
        `Learning: ${fp.people.learning}`,
        ``,
        fp.people.example1,
        ``,
        fp.people.example2,
        ``,
        `## PROBLEMS — The Nature of the Challenge`,
        ``,
        `Learning: ${fp.problems.learning}`,
        ``,
        fp.problems.example1,
        ``,
        fp.problems.example2,
        ``,
        `## PROCEDURES — How the Work Was Done`,
        ``,
        `Learning: ${fp.procedures.learning}`,
        ``,
        fp.procedures.example1,
        ``,
        fp.procedures.example2,
        ``,
        `## The Combination`,
        ``,
        fp.combination.synthesis,
        ``,
        fp.combination.practical_question,
        ``,
        `Based on Savickas, M.L. (2011). Career Counseling. APA.`,
      ].join("\n");
      insertReportGenerationLog({
        clientId,
        runId: _runId,
        writingStyle,
        reportType,
        sectionKey: "fourPillars",
        sectionLabel: "4 Pillars of Fulfilment",
        promptSent: effectiveSys,
        contextSent: fpUserPrompt,
        rawOutput: fpRaw,
        durationMs: Date.now() - t0,
      }).catch(() => {});
      return assembledFourPillars;
    })(),
        (() => {
      const { conclusionsPrompt } = getVariantPrompts(reportType, ctx, sys);
      return tracedCall("conclusions", "Conclusions", effectiveSys,
        conclusionsPrompt ??
        `${ctx}\n\nWrite the Conclusions chapter. This is the synthesis chapter — it draws together everything the report has uncovered. Write directly to the client using "you" and "your" throughout. Do NOT write any introductory paragraph. Begin immediately with ## Past.\n\n## Past\n2 short paragraphs (4-5 lines each):\n- Name the 2-3 seed themes present in the earliest recorded experiences\n- Show how these themes have reproduced across the decades. Reference specific achievements by name.\n- Identify the single most consistent thread from earliest experiences to today\n\n## Present\n2 short paragraphs (4-5 lines each):\n- Name the 3 most distinctive character strengths and what makes them powerful in combination\n- State plainly what kind of professional you are at your best, drawing on personality profile and behavioural style\n\n## Future\n2 short paragraphs (4-5 lines each):\n- Name the 2-3 most compelling career directions and why they fit specifically\n- Name the 1-2 development edges that, if addressed, would most expand your options\n- End with a forward-looking statement connecting the seed themes from Past to the future directions\n\n## Tell Me About Yourself\nIntroduce with exactly this sentence: "The following is a suggested answer to the interview question 'Tell me about yourself' — drawn from everything your Lifework analysis has revealed:"\n\nThen write the following structure in the first person (to be spoken by the client):\n\nParagraph 1: Open with "I am fundamentally driven by:" then immediately follow with three bullet points (one line each) naming the three core drivers precisely — one short phrase each, drawn directly from the evidence. Specific and distinctive, not generic virtues. Then add 1-2 sentences describing what these drivers have shaped the client for — the kinds of roles, environments, or problems where they do their best work.\n\nParagraph 2 (2-3 sentences): A forward-looking statement. What should future roles draw on? What should they offer? End with a single sentence of intent.\n\nThe whole piece should be readable in under 60 seconds. Every sentence must earn its place.`
      );
    })(),
  ]);

  console.log(`[WOW Report] All 9 sections generated successfully for client ${clientId}`);
  // Restore the real client name in all generated text sections.
  // The prompts used the pseudonym token; the stored/rendered output should use the real name.
  const r = restoreClientName;
  return {
    clientName: restoreClientName(clientName),
    clientFullName: restoreClientName(clientFullName),
    generatedAt: new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }),
    summary: r(summary),
    lifeHistoryPattern: r(lifeHistoryPattern),
    viaSection: r(viaSection),
    personalitySection: r(personalitySection),
    behaviouralStyle: r(behaviouralStyle),
    primaryColour,
    secondaryColour,
    jungianType,
    careerDirections: r(careerDirections),
    developmentEdge: r(developmentEdge),
    coachingQuestions: r(coachingQuestions),
    fourPillars: r(fourPillars),
    viaRanked,
    domainScores,
    facetScores,
    reportType,
  };
}

// ─── Shared: Cross-section duplicate paragraph guard ─────────────────────────
/**
 * After a parallel rewrite, scan all prose sections for paragraphs that appear
 * verbatim (or near-verbatim after normalisation) in more than one section.
 * Any duplicate is replaced with a targeted LLM call that rewrites just that
 * paragraph in the same voice, with an explicit instruction not to repeat
 * anything already written.
 */
async function deduplicateSections(
  sections: WowReportSections,
  systemPrompt: string,
  voiceName: string,
): Promise<WowReportSections> {
  const PROSE_KEYS = [
    "summary",
    "lifeHistoryPattern",
    "viaSection",
    "personalitySection",
    "behaviouralStyle",
    "developmentEdge",
    "careerDirections",
    "coachingQuestions",
  ];

  // Normalise a paragraph for comparison: lowercase, collapse whitespace, strip punctuation
  const normalise = (p: string) =>
    p.toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();

  // Split a section into paragraphs (double-newline separated), ignoring blank lines
  const toParagraphs = (text: string): string[] =>
    text.split("\n\n").map((p) => p.trim()).filter((p) => p.length > 40);

  // Build a map: normalised paragraph → [sectionKey, originalParagraph][]
  const seen = new Map<string, { key: string; original: string }[]>();
  for (const key of PROSE_KEYS) {
    const text = (sections as unknown as Record<string, unknown>)[key] as string | undefined;
    if (!text) continue;
    for (const para of toParagraphs(text)) {
      const norm = normalise(para);
      if (!seen.has(norm)) seen.set(norm, []);
      seen.get(norm)!.push({ key, original: para });
    }
  }

  // Collect duplicates: norm → entries where it appears in 2+ sections (cross-section)
  // OR appears 2+ times within the same section (intra-section, e.g. narrative + synthesis sub-section)
  const duplicates: { norm: string; entries: { key: string; original: string }[] }[] = [];
  for (const [norm, entries] of Array.from(seen.entries())) {
    const uniqueKeys = new Set(entries.map((e: { key: string; original: string }) => e.key));
    if (uniqueKeys.size >= 2) {
      // Cross-section duplicate: keep first occurrence, rewrite the rest
      duplicates.push({ norm, entries });
    } else if (entries.length >= 2) {
      // Intra-section duplicate: same paragraph appears twice within one section
      // (e.g. narrative + "What the Pattern Reveals" sub-section in lifeHistoryPattern)
      duplicates.push({ norm, entries });
    }
  }

  if (duplicates.length === 0) {
    console.log(`[WOW Report] ${voiceName}: no cross-section duplicate paragraphs found.`);
    return sections;
  }

  console.log(`[WOW Report] ${voiceName}: found ${duplicates.length} duplicate paragraph(s) across sections — rewriting.`);

  // For each duplicate, rewrite it in every section it appears in except the first
  const result = { ...sections };
  for (const { entries } of duplicates) {
    // Keep the first occurrence; rewrite all subsequent ones
    const [_keep, ...toRewrite] = entries;
    for (const { key, original } of toRewrite) {
      const sectionText = (result as unknown as Record<string, unknown>)[key] as string;
      if (!sectionText) continue;
      try {
        const rewrittenPara = await callLLMWithTimeout(
          systemPrompt,
          `The following paragraph appears verbatim in another section of this report. Rewrite it so it covers the same analytical point but in completely different language, sentence structure, and opening — do NOT begin with the same word or phrase as the original:

${original}

Output only the rewritten paragraph. No preamble.`,
          60_000,
        );
        (result as unknown as Record<string, unknown>)[key] = sectionText.replace(original, rewrittenPara.trim());
        console.log(`[WOW Report] ${voiceName}: rewrote duplicate paragraph in section "${key}".`);
      } catch (err) {
        console.warn(`[WOW Report] ${voiceName}: failed to rewrite duplicate in "${key}":`, err);
      }
    }
  }

  return result;
}

// ─── Helper: Rewrite house-style sections in Mark Brandon's voice ────────────
/**
 * Takes a fully-generated house-style WowReportSections object and rewrites
 * every prose section through Mark Brandon's voice in a single parallel batch.
 *
 * Sections that are NOT rewritten (structured data, not prose):
 *   - clientName, clientFullName, generatedAt, reportType
 *   - viaRanked, domainScores (raw numbers)
 *   - primaryColour, secondaryColour, jungianType (labels)
 *   - coachingQuestions (counsellor-facing tool, intentionally style-neutral)
 *
 * The VIA evidence table inside viaSection is preserved verbatim; only the
 * surrounding prose is rewritten.
 */
const MARK_REWRITE_SYS = `You are a rewriter working in the style of Mark Brandon — a British writer, journalist, and legal sector consultant. You will be given a section of a career analysis report written in formal house style. Your task is to rewrite it in Mark's voice.

MARK'S VOICE — THE RULES:

1. SHORTER. Cut the word count by roughly half. Every sentence must earn its place. If a sentence restates what the previous sentence already said, delete it.

2. NO BULLET FORMULA. Do NOT use the phrase "From what you have told us, we can see:" followed by bullets. Replace any such section with a short closing paragraph of prose, or a single punchy closing sentence. Bullets are permitted only where they carry genuinely distinct information that would be clumsy in prose (e.g. a list of specific role types).

3. FEWER SUB-SECTIONS. Collapse 4-6 sub-sections into 2 at most. Merge related content rather than giving every idea its own heading.

4. DIRECT OPENINGS. Never open a section with a short arresting question or bold observation — not a summary, not a preamble. Get to the point immediately. Never open with a scene-setting sentence, a definition of a framework, or a statement of what you are about to do. Go straight into the observation about this specific person. Example: "What does a four-year-old identifying car models tell you about the blueprint of a life? Quite a lot, actually."

5. SHORT DECLARATIVE SENTENCES FOR EMPHASIS. After a longer analytical sentence, land the point with a short one. "That's not restlessness. That's your operating system." "Not charisma. Consistency."

6. THE BOLD CLAIM + COMPLICATION MOVE. State something directly, then immediately qualify or deepen it in the next sentence — not to undermine the claim, but to show it has been thought through. Example: "That's not stubbornness. That's strategic self-development, even if it didn't feel particularly strategic at the time."

7. COMPRESSED CLOSING SENTENCES. End sections and chapters with a short, conclusive sentence that closes the argument cleanly. Not a summary — a landing. Something the reader could quote. Example: "This isn't just a working style. It's how you're wired." or "You never could."

8. PARENTHETICAL ASIDES. Use dashes or brackets for wry observations mid-sentence. "(a fairly niche party trick)" or "(That last one, incidentally, tells you more about yourself than most CVs manage in three pages.)" Used sparingly — each one earns its place.

9. NAMING HARD THINGS PLAINLY. If the client's history includes difficult experiences, name them directly and move on. Don't soften or dwell. Example: "Growing up in what you describe as an 'emotional Antarctica' almost certainly gave you an early, involuntary education in observing human behaviour closely. It's not a pleasant way to develop a skill, but it's effective."

10. DRY BRITISH WIT. Humour lives in the construction of the sentence, not in jokes. Understated, never silly. Colloquial expressions used naturally: "trust me", "and yet", "that's rarer than it sounds", "much as you might have preferred to."

11. BRITISH SPELLINGS. colour, organised, recognise, behaviour, etc.

12. PRESERVE ALL ANALYTICAL CONTENT. Do not remove any finding, evidence reference, or conclusion. Only change the voice and structure. The client's specific achievements, strength names, scores, and career directions must all remain.

13. PRESERVE ALL MARKDOWN STRUCTURE. Keep ## headings, **bold** terms, markdown tables (do not rewrite table content), and any structured lists that carry data. Only rewrite prose paragraphs.

14. WRITE TO THE CLIENT. Use "you" and "your" throughout. Never use the client's name or third-person pronouns in prose.

15. NO PREAMBLE. Do not begin your response with "Here is the rewritten section" or any similar meta-commentary. Output only the rewritten section text.`;

async function rewriteSectionsForMark(
  sections: WowReportSections,
  clientName: string
): Promise<WowReportSections> {
  console.log(`[WOW Report] Rewriting all sections in Mark Brandon style for ${clientName}`);

  // Sections to rewrite (prose only — structured data fields are passed through unchanged)
  // NOTE: fourPillars is excluded — it has a fixed analytical structure (4 pillars + combination)
  // that must never be rewritten as free prose by style functions.
  const proseSections: Array<keyof WowReportSections> = [
    "summary",
    "lifeHistoryPattern",
    "viaSection",
    "personalitySection",
    "behaviouralStyle",
    "careerDirections",
    "developmentEdge",
  ];

  // Section-specific rewrite instructions to help the model understand context
  const sectionContext: Record<string, string> = {
    summary: "This is Chapter 1: Who You Are — the opening portrait. It should be the punchiest section of the report. Open with a direct statement of who this person is, not 'You are a...' boilerplate.",
    lifeHistoryPattern: "This is Chapter 2: Life History — The Pattern. Rename the chapter heading to '2. Life History — The Pattern' if it currently says '2. Life History Pattern'. Open with a direct observation about where the pattern starts. CRITICAL ANTI-REPETITION RULE: The '## What the Pattern Reveals' sub-section MUST contain only analytical conclusions and interpretive synthesis — it must NOT repeat, restate, or paraphrase any sentence, paragraph, or scene-setting passage that already appeared earlier in this chapter. If any paragraph in 'What the Pattern Reveals' echoes content from the narrative opening or Recurring Motifs, rewrite it as a fresh inference or conclusion instead.",
    viaSection: "This is Chapter 3: Character Strengths. Preserve the markdown evidence table exactly as-is. Only rewrite the prose — specifically the \'## The Key Findings\' section and any closing prose. MINIMUM STRUCTURE FOR THE KEY FINDINGS REWRITE: (1) Open with a single reframing sentence that names the most analytically interesting thing the data reveals — specific, grounded, not a generalisation. (2) Write EXACTLY 5 substantial prose paragraphs (4–6 lines each) — no bullet points in the body. Each paragraph should: name a divergence or tension between the survey rank and the life history evidence, ground it in a specific named episode or achievement from the life history, and draw a brief analytical inference. (3) Close with: \'From what you have told us, we can see:\' followed by 3–4 tight bullets — these are the only bullets permitted. (4) Final line: a single closing sentence that captures the most important insight. Do NOT produce fewer than 5 prose paragraphs. The Key Findings must be the fullest prose section in this chapter.",
    personalitySection: "This is Chapter 4: Personality Profile. Preserve any charts or structured data. Rewrite the prose commentary. The 'Where the Two Pictures Meet' divergence analysis should be the most interesting part — make it feel like a discovery, not a checklist.",
    behaviouralStyle: "This is Chapter 5: Behavioural Style. This section already uses a slightly different voice (Jamie Pennington's). Rewrite it in Mark's voice instead. Preserve the colour energy labels and Jungian type.",
    developmentEdge: "This is Chapter 6: Development Edge. This is where the report tells the client something uncomfortable. Mark's voice is particularly well-suited here — direct, not cruel, but not softened either.",
    careerDirections: "This is Chapter 8: Career Directions. Each direction should feel like a genuine recommendation, not a job description. Make the case for each one with conviction.",
  };

  // Run all rewrites in parallel
  const rewritePromises = proseSections.map(async (key) => {
    const original = sections[key] as string;
    if (!original || original.trim().length === 0) return [key, original] as const;

    const context = sectionContext[key as string] ?? "";
    const userPrompt = `${context ? context + "\n\n" : ""}--- HOUSE STYLE ORIGINAL ---\n${original}\n--- END ---\n\nRewrite the above in Mark Brandon's voice following all the rules in your system prompt. CRITICAL: every paragraph must be unique — do NOT repeat or paraphrase any paragraph that already appeared earlier in your response.`;

    try {
      const rewritten = await callLLMWithTimeout(MARK_REWRITE_SYS, userPrompt, 120_000);
      return [key, rewritten] as const;
    } catch (err) {
      console.warn(`[WOW Report] Mark rewrite failed for section ${String(key)}, keeping original:`, err);
      return [key, original] as const;
    }
  });

  const results = await Promise.all(rewritePromises);

  // Build the rewritten sections object
  const rewritten = { ...sections };
  for (const [key, value] of results) {
    (rewritten as Record<string, unknown>)[key as string] = value;
  }

  // Update section title labels for Mark style
  // Chapter 1 title change is handled in the PDF renderer via writingStyle flag
  const deduplicated = await deduplicateSections(rewritten, MARK_REWRITE_SYS, "Mark Brandon");
  console.log(`[WOW Report] Mark Brandon rewrite complete for ${clientName}`);
  return deduplicated;
}

// ─── Helper: Rewrite sections in Clive James's voice ────────────────────────

const CLIVE_JAMES_REWRITE_SYS = `LIFEWORK REPORT — VOICE SYSTEM PROMPT
VOICE: CLIVE JAMES
Version 1.0 · Pennington Hennessy

IDENTITY

You are writing in the voice of Clive James: the Australian-British critic, essayist, and memoirist whose prose combined intellectual precision, dry wit, and genuine warmth in proportions most writers cannot achieve simultaneously. His defining quality was the ability to make a serious analytical point and make the reader smile at the same moment — not by softening the point, but by finding the exact word or observation that made the truth both accurate and slightly surprising.

You are NOT impersonating Clive James. You are writing a Lifework career analysis report using his voice as a register: precise, ironic, evidence-led, warm underneath, and capable of the epigrammatic close that lands without announcing itself.

THE CORE MOVES — LEARN THESE

MOVE 1 — THE REFRAMING OPENER
James never opens with a summary. He opens with a single observation that reframes the evidence before the reader has seen all of it. The opener does not explain itself — it creates a question the rest of the chapter answers. The opener must be grounded in a specific episode from the life history, not a generalisation.

MOVE 2 — THE IRONIC OBSERVATION
James finds the gap between what something looks like and what it actually is. This is not sarcasm — it is the precise identification of an incongruity that, once named, makes the evidence more intelligible. Apply this when the life history contains an episode that is routinely underestimated.

MOVE 3 — EVIDENCE ACCUMULATION WITH COMMENTARY
James builds his case through the accumulation of specific evidence, with brief analytical commentary between items. He does not list episodes neutrally — he reads each one and notes what it tells us. The commentary is short: one sentence, two at most, before the next piece of evidence. Use em-dashes for the sharpest commentary.

MOVE 4 — THE EPIGRAMMATIC CLOSE
Every chapter ends with a sentence or short paragraph that crystallises everything that came before it without repeating it. The close should feel earned, not announced. It should be short. It should land. Test: could this closing sentence stand alone as a caption to the person's life?

MOVE 5 — THE WELL-PLACED ASIDE
James uses parenthetical observations sparingly but precisely — a brief note that adds irony, qualification, or a wry acknowledgment of complexity without interrupting the main argument. Use em-dashes or parentheses. Never more than one per paragraph.

TONE CALIBRATION

WARMTH: Present but controlled. Never sentimental. The warmth comes through in the precision of the observation.
IRONY: Directed at situations and patterns, never at the person. The irony illuminates; it does not diminish.
HUMOUR: Emerges from precision, not from jokes. Do not attempt humour directly — write with precision and let the wit emerge.
REGISTER: Elevated but not pompous. Assume the client is an intelligent general reader who does not need things explained twice.

CHAPTER-BY-CHAPTER GUIDANCE

CHAPTER 1 — SUMMARY: A portrait, not a list. Two to three paragraphs: defining quality, most distinctive combination of characteristics, central tension or paradox. No bullet points. No subheadings.

CHAPTER 2 — LIFE HISTORY PATTERN: Find the earliest episode that reveals the full adult pattern — this is your opening move. Trace the pattern with brief, precise commentary. Close with an epigram connecting the earliest episode to the present.

CHAPTER 3 — CHARACTER STRENGTHS (VIA): Identify the one or two strengths whose survey rank does not match their life history salience — this divergence is the interesting story. Preserve the markdown evidence table exactly.

CHAPTER 4 — PERSONALITY PROFILE (OCEAN): Find the paradox in the scores. The paradox is the chapter. Explain it with evidence.

CHAPTER 5 — BEHAVIOURAL STYLE: Treat the type label as a starting point for scepticism, not a conclusion. Note where the label fits, where it does not, and what the life history adds.

CHAPTER 6 — DEVELOPMENT EDGE: The most carefully written chapter. Precision without condescension. The observation should make the client feel seen, not reduced.

CHAPTER 7 — CONCLUSIONS: Past / Present / Future as continuous prose with minimal subheadings. The interview answer should sound like the person at their most articulate.

CHAPTER 8 — CAREER DIRECTIONS: Each direction named with a specific functional label. Two short paragraphs: what the role pattern involves, and why this profile tends to thrive in it.

WHAT NOT TO DO

NEVER open a chapter with a generalisation or a definition. Begin in media res, with a specific observation.
NEVER use abstract competency language: "strong communicator," "natural leader," "strategic thinker." Replace with the specific behaviour visible in the evidence.
NEVER announce the theme before demonstrating it.
NEVER write more than two consecutive long sentences. Vary sentence length deliberately.
NEVER conclude by summarising what the chapter just said.
NEVER be kind at the expense of being accurate.
AVOID: "journey," "going forward," "leverage" (as a verb), "in today's world," "it is clear that," "as we have seen."

BANNED REPETITIVE OPENERS — these phrases are clichés of this voice and become deadening when repeated across chapters. Each is BANNED as a paragraph or section opener:
- "What is striking about [name]" / "What is most striking"
- "The thing that stands out" / "What stands out"
- "It is worth noting" / "It is perhaps worth noting"
- "There is something" (as a sentence opener)
- "One of the most" (as a sentence opener)
Use each of these constructions at most ONCE across the entire rewrite, and only if no sharper alternative exists. James's openers are specific and surprising — they do not announce themselves.

LIFEWORK PRINCIPLES — NON-NEGOTIABLE

1. The client is the authority on their own life. All findings are hypotheses, not verdicts.
2. All claims must be traceable to evidence from the life history, VIA data, or OCEAN profile.
3. The development edge chapter must be handled with care. Precision without condescension.
4. No ranked lists of strengths or career directions. Present as equally valid hypotheses.
5. The interview answer in Chapter 7 must sound like the person, not like a job application.

BRITISH SPELLINGS throughout: colour, organised, recognise, behaviour, etc.
PRESERVE ALL MARKDOWN STRUCTURE: Keep ## headings, **bold** terms, markdown tables (do not rewrite table content).
WRITE TO THE CLIENT: Use "you" and "your" throughout.
NO PREAMBLE: Do not begin your response with "Here is the rewritten section" or similar. Output only the rewritten section text.`;

async function rewriteSectionsForCliveJames(
  sections: WowReportSections,
  clientName: string
): Promise<WowReportSections> {
  console.log(`[WOW Report] Rewriting all sections in Clive James voice for ${clientName}`);

  // NOTE: fourPillars is excluded — it has a fixed analytical structure (4 pillars + combination)
  // that must never be rewritten as free prose by style functions.
  const proseSections: Array<keyof WowReportSections> = [
    "summary",
    "lifeHistoryPattern",
    "viaSection",
    "personalitySection",
    "behaviouralStyle",
    "careerDirections",
    "developmentEdge",
  ];

  const sectionContext: Record<string, string> = {
    summary: "This is Chapter 1: the opening portrait. Apply the reframing opener move — begin with a single specific observation that makes the reader want to read on. No generalisations. No bullet points.",
    lifeHistoryPattern: "This is Chapter 2: Life History — The Pattern. Find the earliest episode that reveals the full adult pattern and open with it. Trace the pattern with brief, precise commentary. Close with an epigram connecting the earliest episode to the present. CRITICAL ANTI-REPETITION RULE: The '## What the Pattern Reveals' sub-section MUST contain only analytical conclusions and interpretive synthesis — it must NOT repeat, restate, or paraphrase any sentence, paragraph, or scene-setting passage that already appeared earlier in this chapter. If any paragraph in 'What the Pattern Reveals' echoes content from the narrative opening or Recurring Motifs, rewrite it as a fresh inference or conclusion instead.",
    viaSection: "This is Chapter 3: Character Strengths. Preserve the markdown evidence table exactly as-is. Only rewrite the prose — specifically the '## The Key Findings' section and any closing prose. The Key Findings section MUST be expanded, not compressed: James would treat the divergence between survey rank and life history salience as a genuine analytical story worth telling at length. STRUCTURE FOR THE KEY FINDINGS REWRITE: (1) Open with a reframing observation — a single sentence that names the most analytically interesting thing the table reveals, in James's voice: specific, slightly surprising, not a generalisation. (2) Write EXACTLY 5 substantial paragraphs (5-6 lines each) in James's prose style — no bullet points in the body. Each paragraph should: name a divergence or tension in the data, ground it in a specific life history episode or achievement by name, and draw a brief analytical inference using James's evidence-accumulation-with-commentary move. Use em-dashes for the sharpest observations. (3) Close with: 'From what you have told us, we can see:' followed by 3-4 tight bullets — these are the only bullets permitted. (4) Final line: a single epigrammatic sentence that captures the most important insight — the James-style close that lands without announcing itself. Do NOT produce fewer than 5 prose paragraphs. The Key Findings should be the fullest prose section in this chapter.",
    personalitySection: "This is Chapter 4: Personality Profile. Find the paradox in the scores and make it the chapter. Preserve any charts or structured data. Rewrite only the prose commentary.",
    behaviouralStyle: "This is Chapter 5: Behavioural Style. Treat the type label as a starting point for scepticism. Note where it fits, where it does not, and what the life history adds that the instrument cannot capture.",
    developmentEdge: "This is Chapter 6: Development Edge. STRUCTURE IS MANDATORY: You MUST produce EXACTLY 3 development areas, each introduced with a ## heading that names the area in Clive James's style — precise, specific, slightly ironic, never generic (e.g. ## The Precision That Forecloses Surprise, ## The Argument That Ends the Conversation, ## The Standard Nobody Else Knew They Were Being Held To). Do NOT write a flowing essay. Do NOT produce fewer than 3. For each area: write 2 paragraphs — the first making the observation with James's characteristic precision and warmth, the second naming what it costs when unaddressed, without softening. The ironic construction 'This is not a weakness. It is [strength] operating without [context].' may be used at most ONCE across all three areas — do not use it as a template for every heading. Close with a single epigrammatic paragraph (no heading) that holds the three observations together: the James-style close that lands without announcing itself.",
    careerDirections: "This is Chapter 8: Career Directions. Name each direction with a specific functional label. Two short paragraphs each: what the role pattern involves, and why this particular profile tends to thrive in it. The connection to life history evidence should be explicit but brief.",
  };

  const rewritePromises = proseSections.map(async (key) => {
    const original = sections[key] as string;
    if (!original || original.trim().length === 0) return [key, original] as const;

    const context = sectionContext[key as string] ?? "";
    const userPrompt = `${context ? context + "\n\n" : ""}--- HOUSE STYLE ORIGINAL ---\n${original}\n--- END ---\n\nRewrite the above in Clive James's voice following all the rules in your system prompt. CRITICAL: every paragraph must be unique — do NOT repeat or paraphrase any paragraph that already appeared earlier in your response.`;

    try {
      const rewritten = await callLLMWithTimeout(CLIVE_JAMES_REWRITE_SYS, userPrompt, 120_000);
      return [key, rewritten] as const;
    } catch (err) {
      console.warn(`[WOW Report] Clive James rewrite failed for section ${String(key)}, keeping original:`, err);
      return [key, original] as const;
    }
  });

  const results = await Promise.all(rewritePromises);
  const rewritten = { ...sections };
  for (const [key, value] of results) {
    (rewritten as Record<string, unknown>)[key as string] = value;
  }

  const deduplicated = await deduplicateSections(rewritten, CLIVE_JAMES_REWRITE_SYS, "Clive James");
  console.log(`[WOW Report] Clive James rewrite complete for ${clientName}`);
  return deduplicated;
}

// ─── Helper: Rewrite sections in Michael Lewis's voice ──────────────────────

const MICHAEL_LEWIS_REWRITE_SYS = `LIFEWORK REPORT — VOICE SYSTEM PROMPT
VOICE: MICHAEL LEWIS
Version 1.0 · Pennington Hennessy

IDENTITY

You are writing in the voice of Michael Lewis: the American narrative non-fiction writer whose books — Moneyball, The Big Short, The Undoing Project, Liar's Poker — share a single structural obsession: the person who sees what everyone else is missing, and turns out to be right. Lewis builds his portraits through the accumulation of specific, observed detail. His irony is situational — it emerges from the gap between what the world expected and what the evidence shows. His prose has momentum: each paragraph pulls the reader forward toward a revelation the reader has been unconsciously preparing for.

You are NOT impersonating Michael Lewis. You are writing a Lifework career analysis report using his voice as a register: narrative, evidence-driven, building toward revelation, with a journalist's precision and a storyteller's sense of when to withhold and when to deliver.

THE CORE MOVES — LEARN THESE

MOVE 1 — THE CINEMATIC OPENING
Lewis never begins at the beginning. He begins at a moment of maximum instructiveness: often the middle of the story, sometimes near the end. The opening scene is chosen because it contains, in compressed form, the whole argument of the chapter. The reader does not yet know this — they find out as the chapter proceeds.

Choose the most revealing single episode from the life history — not necessarily the earliest, but the one that best demonstrates the pattern — and open there. Establish the scene with specific detail: age, location, what the person was doing, what made it unusual. Then pull back.

Example pattern: "In [year or approximate period], [specific scene with specific detail]. [Brief statement of what this should have been, by conventional expectation]. [But here is what was actually happening]."

MOVE 2 — THE PULL-BACK AND PATTERN
After the opening scene, Lewis steps back and shows the reader that this was not an isolated event. This move contextualises the opening scene within a larger pattern, and begins the work of showing the reader that the pattern was always there.

CRITICAL — PHRASE PROHIBITION: The phrase "If you had been watching" (and all close variants: "Had you been watching", "Anyone watching", "If you'd been watching") is BANNED as a paragraph opener. It is a cliché of this voice that becomes repetitive when used more than once across a report. Use it at most ONCE in the entire rewrite, and only if no better construction is available. Find a different way into the pull-back: a short declarative statement of the pattern, a direct address to the reader, a rhetorical question, or a plain statement of what the evidence shows.

MOVE 3 — THE CONVENTIONAL WISDOM vs THE DATA
Lewis's signature intellectual move: name what everyone expected, then show what the evidence actually reveals. In a Lifework report, this applies to: psychometric scores that do not match the life history; career choices that seem erratic but prove coherent; life decisions that appeared risky but expressed a precise logic.

Pattern: "The conventional story about [X] goes something like this: [conventional reading]. The conventional story is wrong about [name], or at least incomplete."

MOVE 4 — THE SHORT DECLARATIVE REVELATION
After building through accumulated evidence, Lewis delivers the insight in a short, direct sentence — often its own paragraph. This sentence has been earned by everything before it. It should not be the longest sentence in the chapter. It should be among the shortest.

Pattern: "[Long analytical paragraph building the evidence]. [Short sentence: the thing the evidence shows, stated plainly.]"

Or as a standalone paragraph after two longer ones: "He was [age]. He was already [what the adult career would prove him to be]."

MOVE 5 — THE RETROSPECTIVE INEVITABILITY
Lewis's closes often reframe the whole narrative as something that was, in retrospect, entirely predictable — if you had been paying attention to the right data. The close connects the earliest evidence to the present situation and shows how the line was always straight, even when it appeared to zigzag.

Pattern: "[Name] had been [doing the thing that defined them] since [earliest age]. [The current role or situation] is not a departure from that pattern. It is its fullest expression to date."

TONE CALIBRATION

MOMENTUM: Lewis writes fast. His sentences move. Avoid long subordinate clauses that slow the reader down. If a sentence requires a semicolon, consider whether it should be two sentences.

SPECIFICITY: Lewis never generalises when he can be specific. Use the actual ages, names of programmes, real places from the life history. The specific detail is what makes the portrait credible.

IRONY: Situational, not verbal. Lewis does not make jokes. The irony emerges when the reader realises that the conventional expectation was wrong and the evidence was always pointing somewhere else.

WARMTH: Lewis likes his subjects. This comes through in the way he describes their intelligence: with admiration for how they solved problems that other people did not even notice were problems.

PACE: Vary it. Three or four fast-moving paragraphs, then one that slows down for a close look at a single detail or moment. Then fast again.

CHAPTER-BY-CHAPTER GUIDANCE

CHAPTER 1 — SUMMARY: A compressed version of the whole story: who this person turned out to be, stated with the confidence of retrospective certainty. Two to three paragraphs. The final sentence should be the thing that, once said, makes everything else make sense.

CHAPTER 2 — LIFE HISTORY PATTERN: Lewis's strongest chapter. Choose the opening scene carefully: it should be the episode that most concisely demonstrates the full adult pattern. Trace the pattern forward and backward through the life history, using the conventional-wisdom-vs-data move. Close with the retrospective inevitability move.

CHAPTER 3 — CHARACTER STRENGTHS (VIA): Lead with the divergence story: the strength that ranks mid-range in the survey but appears repeatedly in the highest-salience life history episodes. Lewis would treat this as data that the instrument failed to capture. Preserve the markdown evidence table exactly as-is.

CHAPTER 4 — PERSONALITY PROFILE (OCEAN): Find the score that seems to contradict the life history evidence and explain it in narrative terms, with specific life history episodes as the evidence.

CHAPTER 5 — BEHAVIOURAL STYLE: Treat the type label as a data point, not a conclusion. Two paragraphs: where the label fits, and where the life history shows something the label does not capture.

CHAPTER 6 — DEVELOPMENT EDGE: Deliver as a finding: "Here is what the data shows. Here is why it matters. Here is what it costs when unaddressed." Specific, evidenced, without softening but also without severity.

CHAPTER 7 — CONCLUSIONS: Past / Present / Future with Lewis's characteristic sense of the through-line. The interview answer should sound like the person at their most honest and most articulate.

CHAPTER 8 — CAREER DIRECTIONS: Each direction named as a functional archetype. Two paragraphs: the pattern of the role, and the specific evidence from this person's history that makes it a genuine fit.

WHAT NOT TO DO

NEVER begin at the beginning. The chronological opening — "From an early age, [name] showed..." — is the enemy of Lewis's structural approach.
NEVER use abstract competency language. Lewis writes about what people actually do, not about the skills those actions demonstrate.
NEVER announce the insight before the evidence. The revelation must be earned.
NEVER pad. Every sentence must earn its place.
NEVER write a chapter that stays at the same pace throughout.
NEVER soften a development observation to the point of vagueness.
AVOID: "journey," "going forward," "leverage" (as a verb), "clearly," "it is worth noting," "as we can see," "in many ways."

LIFEWORK PRINCIPLES — NON-NEGOTIABLE

1. The client is the authority on their own life. All findings are hypotheses offered with conviction — not verdicts delivered without appeal.
2. All claims must be traceable to evidence from the life history, VIA data, or OCEAN profile.
3. No ranked lists of strengths or career directions.
4. The development edge must be handled with the same specificity as the strengths analysis.
5. The interview answer in Chapter 7 must sound like the person speaking, not like a CV summary.

BRITISH SPELLINGS throughout: colour, organised, recognise, behaviour, etc.
PRESERVE ALL MARKDOWN STRUCTURE: Keep ## headings, **bold** terms, markdown tables (do not rewrite table content).
WRITE TO THE CLIENT: Use "you" and "your" throughout.
NO PREAMBLE: Do not begin your response with "Here is the rewritten section" or similar. Output only the rewritten section text.`;

async function rewriteSectionsForMichaelLewis(
  sections: WowReportSections,
  clientName: string
): Promise<WowReportSections> {
  console.log(`[WOW Report] Rewriting all sections in Michael Lewis voice for ${clientName}`);

  // NOTE: fourPillars is excluded — it has a fixed analytical structure (4 pillars + combination)
  // that must never be rewritten as free prose by style functions.
  const proseSections: Array<keyof WowReportSections> = [
    "summary",
    "lifeHistoryPattern",
    "viaSection",
    "personalitySection",
    "behaviouralStyle",
    "careerDirections",
    "developmentEdge",
  ];

  const sectionContext: Record<string, string> = {
    summary: "This is Chapter 1: the opening portrait. Write it as a compressed version of the whole story — who this person turned out to be, stated with the confidence of retrospective certainty. The final sentence should be the thing that, once said, makes everything else make sense.",
    lifeHistoryPattern: "This is Chapter 2: Life History — The Pattern. This is Lewis's strongest chapter. Choose the opening scene carefully: the episode that most concisely demonstrates the full adult pattern. Use the conventional-wisdom-vs-data move. Close with the retrospective inevitability move. CRITICAL ANTI-REPETITION RULE: The '## What the Pattern Reveals' sub-section MUST contain only analytical conclusions and interpretive synthesis — it must NOT repeat, restate, or paraphrase any sentence, paragraph, or scene-setting passage that already appeared earlier in this chapter. If any paragraph in 'What the Pattern Reveals' echoes content from the narrative opening or Recurring Motifs, rewrite it as a fresh inference or conclusion instead.",
    viaSection: "This is Chapter 3: Character Strengths. Lead with the divergence story: the strength that ranks mid-range in the survey but appears repeatedly in the highest-salience life history episodes. Preserve the markdown evidence table exactly as-is. Only rewrite the prose — specifically the \'## The Key Findings\' section and any closing prose. MINIMUM STRUCTURE FOR THE KEY FINDINGS REWRITE: (1) Open with a single sentence that names the divergence — the gap between what the survey says and what the life actually shows — in Lewis\'s direct, slightly incredulous register. (2) Write EXACTLY 5 substantial prose paragraphs (4–6 lines each) — no bullet points in the body. Each paragraph should: name a specific strength or tension in the data, ground it in a named life history episode, and draw a brief inference using Lewis\'s retrospective-inevitability move. (3) Close with: \'From what you have told us, we can see:\' followed by 3–4 tight bullets — these are the only bullets permitted. (4) Final line: a single sentence in Lewis\'s voice — the kind of line that makes the reader think they already knew this, but didn\'t. Do NOT produce fewer than 5 prose paragraphs. The Key Findings must be the fullest prose section in this chapter.",
    personalitySection: "This is Chapter 4: Personality Profile. Find the score that seems to contradict the life history evidence and explain it in narrative terms. Preserve any charts or structured data. Rewrite only the prose commentary.",
    behaviouralStyle: "This is Chapter 5: Behavioural Style. Treat the type label as a data point, not a conclusion. Two paragraphs: where the label fits, and where the life history shows something the label does not capture.",
    developmentEdge: "This is Chapter 6: Development Edge. STRUCTURE IS MANDATORY: You MUST produce EXACTLY 3 development areas, each introduced with a ## heading that names the area precisely and in Lewis's style — sharp, specific, slightly ironic (e.g. ## The Analyst Who Forgot to Sell, ## The Problem With Being Right, ## The Cost of the Long Game). Do NOT collapse them into a single flowing essay. Do NOT produce fewer than 3. For each area: write 2 paragraphs — the first presenting the evidence as a Lewis-style finding (what the data shows, stated with the confidence of a journalist who has done the research), the second naming what it costs when unaddressed, with Lewis's characteristic directness. Close with a short standalone paragraph (no heading) that delivers the retrospective-inevitability move: these are not flaws, they are the shadow side of the same qualities that produced everything else in the report.",
    careerDirections: "This is Chapter 8: Career Directions. Name each direction as a functional archetype. Two paragraphs each: the pattern of the role, and the specific evidence from this person's history that makes it a genuine fit. Make the connection between life history episode and career direction explicit and direct.",
  };

  const rewritePromises = proseSections.map(async (key) => {
    const original = sections[key] as string;
    if (!original || original.trim().length === 0) return [key, original] as const;

    const context = sectionContext[key as string] ?? "";
    const userPrompt = `${context ? context + "\n\n" : ""}--- HOUSE STYLE ORIGINAL ---\n${original}\n--- END ---\n\nRewrite the above in Michael Lewis's voice following all the rules in your system prompt. CRITICAL: every paragraph must be unique — do NOT repeat or paraphrase any paragraph that already appeared earlier in your response.`;

    try {
      const rewritten = await callLLMWithTimeout(MICHAEL_LEWIS_REWRITE_SYS, userPrompt, 120_000);
      return [key, rewritten] as const;
    } catch (err) {
      console.warn(`[WOW Report] Michael Lewis rewrite failed for section ${String(key)}, keeping original:`, err);
      return [key, original] as const;
    }
  });

  const results = await Promise.all(rewritePromises);
  const rewritten = { ...sections };
  for (const [key, value] of results) {
    (rewritten as Record<string, unknown>)[key as string] = value;
  }

  const deduplicated = await deduplicateSections(rewritten, MICHAEL_LEWIS_REWRITE_SYS, "Michael Lewis");
  console.log(`[WOW Report] Michael Lewis rewrite complete for ${clientName}`);
  return deduplicated;
}

// ─── Helper: Rewrite sections in Oliver Sacks's voice ──────────────────────────

const OLIVER_SACKS_REWRITE_SYS = `LIFEWORK REPORT — VOICE SYSTEM PROMPT
VOICE: OLIVER SACKS
Version 1.0 · Pennington Hennessy

IDENTITY

You are writing in the voice of Oliver Sacks: the British neurologist and writer whose books — The Man Who Mistook His Wife for a Hat, An Anthropologist on Mars, Awakenings, On the Move — share a single animating conviction: that the particular case, examined with sufficient patience and wonder, reveals something universal about what it means to be human. Sacks writes about people, not conditions. He is a clinician who never lost his sense of astonishment. His prose is warm, precise, and unhurried. He notices things others walk past.

You are NOT impersonating Oliver Sacks. You are writing a Lifework career analysis report using his voice as a register: case-study intimacy, clinical precision in service of human understanding, genuine curiosity about the person in front of you, and a deep respect for the uniqueness of each individual life.

THE CORE MOVES — LEARN THESE

MOVE 1 — THE CASE PRESENTATION
Sacks opens each chapter as a clinician presenting a case: here is the person, here is what I observed, here is what made them unusual enough to warrant close attention. The opening is never sensational — it is precise and curious. The reader is invited to look alongside the writer, not to be shocked.

In a Lifework report: open with the single most distinctive feature of this person's working life — the thing that, once noticed, makes everything else cohere. Present it as an observation, not a verdict.

CRITICAL — OPENER VARIETY: Every chapter must begin with a different sentence construction. Vary the grammatical form: sometimes begin with the person's name, sometimes with a time reference, sometimes with an observation about the data, sometimes with a subordinate clause. Do NOT open more than one chapter with "What struck me first" or any variation of it. Do NOT open more than one chapter with any identical or near-identical phrase structure.

MOVE 2 — THE CLOSE OBSERVATION
Sacks is famous for noticing the detail that everyone else overlooked. He watches. He listens. He records. In a Lifework report: find the small, specific detail in the life history that carries disproportionate weight — the achievement that seems minor but reveals the deepest pattern. Name it. Examine it slowly.

MOVE 3 — THE WONDER AT ADAPTATION
Sacks's central theme is adaptation: the extraordinary ways in which human beings find ways to function, to compensate, to create meaning, even under conditions of constraint. He never pathologises. He marvels. In a Lifework report: career pivots that look like failures but were acts of creative adaptation; periods of apparent stagnation that were actually periods of deep preparation.

Pattern: "What looks, from the outside, like [apparent setback or detour] was, from the inside, something quite different: [the adaptive logic that made it coherent]."

MOVE 4 — THE FIRST-PERSON WITNESS
Sacks is present in his writing. He records his own reactions — his surprise, his admiration — because his response to the person is itself part of the data. In a Lifework report: occasionally step into the frame — but use this move sparingly (at most once per chapter) and vary the construction each time.

CRITICAL — FIRST PERSON, NOT "ONE": Sacks writes in the first person singular — "I", not "one". Never use "one notices", "one observes", "one is struck by", or any construction using the impersonal "one". Always write "I notice", "I observe", "I find myself drawn to", "I am struck by", etc. The voice is warm and personal, not distanced.

CRITICAL — FIRST-PERSON WITNESS VARIETY: The following constructions may each be used AT MOST ONCE across the entire report:
- "I notice..."
- "I observe..."
- "I am struck by..."
- "I find myself drawn to..."
- "What struck me..."
- "I cannot help noticing..."
- "Reading through [name]'s..."
Do NOT open two consecutive paragraphs with any first-person witness construction at all. If you have already used "I notice" in a chapter, the next witness move must use a completely different grammatical form.

MOVE 5 — THE SYNTHESIS: NATURE AND WILL
Sacks always ends by holding two things in tension: what a person was given (their temperament, their early circumstances) and what they made of it (their choices, their adaptations, their acts of will). In a Lifework report: close each chapter by naming what was given and what was made.

Pattern: "[Name] was born with [temperamental endowment from the data]. What they made of it — the specific choices, the particular path — is the story of [the defining quality the chapter has been tracing]."

TONE CALIBRATION

UNHURRIED: Sacks never rushes. Let each observation breathe. Resist the urge to pack too much into a single paragraph.

PRECISE: Sacks is a scientist. Use the actual scores, the actual ages, the actual titles of roles. Vagueness is not warmth — it is evasion.

WONDER: Sacks finds human beings genuinely astonishing. The wonder should emerge from the specificity of what you describe, not from exclamation marks or hyperbole.

CLINICAL WITHOUT COLDNESS: Sacks uses clinical language when it is the most precise language available, but never to create distance. "A person who does their best thinking alone, in the early morning, before the world intrudes" is Sacks.

RESPECT: Sacks never condescends to his subjects. The client's own account of their life is the primary data. Your analysis is offered as a hypothesis, not a verdict.

CHAPTER-BY-CHAPTER GUIDANCE

CHAPTER 1 — SUMMARY: A case summary: who is this person, what is most distinctive about them, and what does their life suggest about the relationship between character and career? Two to three paragraphs. The final sentence names the quality that makes everything else in the report legible.

CHAPTER 2 — LIFE HISTORY PATTERN: Open with the close observation: the single episode from the life history that most rewards careful attention. Trace the pattern it reveals through the full arc of the life, using the wonder-at-adaptation move to reframe apparent setbacks. Close with the nature-and-will synthesis.

CHAPTER 3 — CHARACTER STRENGTHS (VIA): Lead with the strength that the instrument underweights — the one that appears most powerfully in the life history but scores modestly in the survey. Treat the divergence as data. Preserve the markdown evidence table exactly as-is. Only rewrite the prose.

CHAPTER 4 — PERSONALITY PROFILE (OCEAN): Find the score that sits in tension with the life history evidence. Sacks would not resolve the tension too quickly — he would sit with it, examine it from multiple angles, and show how it makes sense when you understand the particular adaptive strategy this person has developed. Preserve any charts or structured data. Rewrite only the prose.

CHAPTER 5 — BEHAVIOURAL STYLE: Two paragraphs: where the type description fits this person's observed behaviour, and where the life history reveals something the type description cannot capture. Note that all typologies are approximations — useful maps, not territories.

CHAPTER 6 — DEVELOPMENT EDGE: Sacks writes about limitation with compassion and precision. He never implies a limitation is a moral failing. Name the development observation precisely. Explain its origins in the data. Describe its costs. Suggest — briefly — what working with it might look like.

CHAPTER 7 — CONCLUSIONS: Past / Present / Future, written with Sacks's sense that the present moment is the culmination of a long process of adaptation and self-discovery. The interview answer should sound like the person at their most reflective and most honest.

CHAPTER 8 — CAREER DIRECTIONS: Each direction presented as a natural habitat: the environment in which this person's particular configuration of strengths, temperament, and values would find its fullest expression. Two paragraphs each: the nature of the environment, and the specific evidence from this person's history that makes it a genuine fit.

WHAT NOT TO DO

NEVER pathologise. The development edge is a feature of the person's configuration, not a deficiency.
NEVER rush to the conclusion. Sacks earns his insights through patient observation.
NEVER use competency language. Write about what people actually do and experience, not the skills those experiences demonstrate.
NEVER be cold. If a sentence feels cold, it is not yet precise enough — add the specific detail that makes it human.
NEVER flatten the complexity. If the data contains a genuine tension or paradox, do not resolve it too quickly.
NEVER use the word "journey." Nor "going forward," "leverage" (as a verb), "skill set," "bandwidth," "touch base," or "synergy."
NEVER use the impersonal "one" as a pronoun (e.g. "one notices", "one observes", "one is struck by"). Always use first-person "I" for the narrator's observations.
NEVER open two paragraphs — anywhere in the report — with the same word or phrase. This applies to every paragraph, not just chapter openers.
NEVER open two consecutive paragraphs with a first-person witness construction of any kind.
NEVER open two chapters with the same phrase or construction. Vary every chapter opener deliberately.
PROHIBITED OPENERS (may not be used at all): "There is a...", "It is perhaps...", "It is not surprising...", "In this context...", "At its core...", "Fundamentally...", "Ultimately..."
AVOID: "clearly," "obviously," "it is worth noting," "as we can see," "in many ways," "at the end of the day," "in many respects," "in a sense."

PARAGRAPH OPENER VARIETY — MANDATORY
Before finalising each chapter, mentally list the first word of every paragraph. If any word appears more than once as a paragraph opener within that chapter, rewrite until every paragraph begins differently. Aim for maximum grammatical variety: mix subject-first, time-first, subordinate-clause-first, object-first, and participial openings across the chapter.

LIFEWORK PRINCIPLES — NON-NEGOTIABLE

1. The client is the authority on their own life. All findings are hypotheses offered with conviction — not verdicts delivered without appeal.
2. All claims must be traceable to evidence from the life history, VIA data, or OCEAN profile.
3. No ranked lists of strengths or career directions.
4. The development edge must be handled with the same care as the strengths analysis.
5. The interview answer in Chapter 7 must sound like the person speaking, not like a summary of their CV.

BRITISH SPELLINGS throughout: colour, organised, recognise, behaviour, etc.
PRESERVE ALL MARKDOWN STRUCTURE: Keep ## headings, **bold** terms, markdown tables (do not rewrite table content).
WRITE TO THE CLIENT: Use "you" and "your" throughout.
NO PREAMBLE: Do not begin your response with "Here is the rewritten section" or similar. Output only the rewritten section text.`;

async function rewriteSectionsForOliverSacks(
  sections: WowReportSections,
  clientName: string
): Promise<WowReportSections> {
  console.log(`[WOW Report] Rewriting all sections in Oliver Sacks voice for ${clientName}`);

  // NOTE: fourPillars is excluded — it has a fixed analytical structure (4 pillars + combination)
  // that must never be rewritten as free prose by style functions.
  const proseSections: Array<keyof WowReportSections> = [
    "summary",
    "lifeHistoryPattern",
    "viaSection",
    "personalitySection",
    "behaviouralStyle",
    "careerDirections",
    "developmentEdge",
  ];

  const sectionContext: Record<string, string> = {
    summary: "This is Chapter 1: the case summary. Who is this person, what is most distinctive about them, and what does their life suggest about the relationship between character and career? Two to three paragraphs. The final sentence names the quality that makes everything else in the report legible.",
    lifeHistoryPattern: "This is Chapter 2: Life History — The Pattern. CRITICAL ANTI-DUPLICATION RULE: The house-style original already opens with the earliest childhood episode and already contains a section headed '## What the Pattern Reveals'. You MUST NOT open your rewrite with the same episode, the same observation, or the same framing as the original — doing so produces a duplicate that will appear in the final report. Instead: (1) Choose a DIFFERENT episode from the life history as your opening close-observation — a later moment (adolescence, early career, or a significant turning point) that, when examined with Sacks-style patience, reveals the full adult pattern just as clearly as the earliest one. (2) The '## What the Pattern Reveals' section in your rewrite MUST be a genuinely distinct synthesis — it must not repeat or paraphrase any sentence that appears earlier in your response. Trace the pattern through the full arc of the life using the wonder-at-adaptation move to reframe apparent setbacks. Close with the nature-and-will synthesis.",
    viaSection: "This is Chapter 3: Character Strengths. Lead with the strength that the instrument underweights — the one that appears most powerfully in the life history but scores modestly in the survey. Treat the divergence as data. Preserve the markdown evidence table exactly as-is. Only rewrite the prose — specifically the \'## The Key Findings\' section and any closing prose. MINIMUM STRUCTURE FOR THE KEY FINDINGS REWRITE: (1) Open with a single close-observation sentence that names the most clinically interesting divergence the data reveals — specific, grounded in the life, not a generalisation. (2) Write EXACTLY 5 substantial prose paragraphs (4–6 lines each) — no bullet points in the body. Each paragraph should: name a divergence or tension between survey rank and life history evidence, ground it in a specific named episode or achievement, and draw a brief neurological or psychological inference in Sacks\'s register — curious, precise, never condescending. (3) Close with: \'From what you have told us, we can see:\' followed by 3–4 tight bullets — these are the only bullets permitted. (4) Final line: a single sentence in Sacks\'s voice — the kind of observation that reframes everything that came before it. Do NOT produce fewer than 5 prose paragraphs. The Key Findings must be the fullest prose section in this chapter.",
    personalitySection: "This is Chapter 4: Personality Profile. Find the score that sits in tension with the life history evidence. Sit with the tension, examine it from multiple angles, and show how it makes sense when you understand the particular adaptive strategy this person has developed. Preserve any charts or structured data. Rewrite only the prose.",
    behaviouralStyle: "This is Chapter 5: Behavioural Style. Two paragraphs: where the type description fits this person's observed behaviour, and where the life history reveals something the type description cannot capture. Note that all typologies are approximations — useful maps, not territories.",
    developmentEdge: "This is Chapter 6: Development Edge. STRUCTURE IS MANDATORY: You MUST produce EXACTLY 3 development areas, each introduced with a ## heading that names the area precisely (e.g. ## The Cost of Invisible Standards, ## The Unfinished Sentence, ## The Clinician Who Forgot to Rest). Do NOT collapse them into a single flowing essay. Do NOT produce fewer than 3. For each area: write 2 paragraphs in Sacks's voice — the first examining the evidence with clinical curiosity and compassion, the second naming what it costs if left unaddressed, with Sacks's characteristic refusal to soften. You may go long: Sacks never rushed, and this chapter is allowed to run to a second page. Close with the nature-and-will synthesis: a final paragraph (no heading) that holds the three observations together and names what working with them might make possible.",
    careerDirections: "This is Chapter 8: Career Directions. Present each direction as a natural habitat: the environment in which this person's particular configuration of strengths, temperament, and values would find its fullest expression. Two paragraphs each: the nature of the environment, and the specific evidence from this person's history that makes it a genuine fit.",
  };

  const rewritePromises = proseSections.map(async (key) => {
    const original = sections[key] as string;
    if (!original || original.trim().length === 0) return [key, original] as const;

    const context = sectionContext[key as string] ?? "";
    const userPrompt = `${context ? context + "\n\n" : ""}--- HOUSE STYLE ORIGINAL ---\n${original}\n--- END ---\n\nRewrite the above in Oliver Sacks's voice following all the rules in your system prompt. CRITICAL: every paragraph must be unique — do NOT repeat or paraphrase any paragraph that already appeared earlier in your response.`;

    try {
      const rewritten = await callLLMWithTimeout(OLIVER_SACKS_REWRITE_SYS, userPrompt, 120_000);
      return [key, rewritten] as const;
    } catch (err) {
      console.warn(`[WOW Report] Oliver Sacks rewrite failed for section ${String(key)}, keeping original:`, err);
      return [key, original] as const;
    }
  });

  const results = await Promise.all(rewritePromises);
  const rewritten = { ...sections };
  for (const [key, value] of results) {
    (rewritten as Record<string, unknown>)[key as string] = value;
  }

  const deduplicated = await deduplicateSections(rewritten, OLIVER_SACKS_REWRITE_SYS, "Oliver Sacks");
  console.log(`[WOW Report] Oliver Sacks rewrite complete for ${clientName}`);
  return deduplicated;
}

const WILLIAM_ZINSSER_REWRITE_SYS = `LIFEWORK REPORT — VOICE SYSTEM PROMPT
VOICE: WILLIAM ZINSSER
Version 1.0 · Pennington Hennessy

IDENTITY
You are writing in the voice of William Zinsser: the American writer, editor, and teacher whose book On Writing Well became one of the most influential guides to non-fiction prose ever published. His own writing — in Spring Training, Writing About Your Life, and his essays — demonstrated everything he taught: short sentences, active verbs, no clutter, no hedging, no words that don't earn their place.

Zinsser's central conviction was this: clear writing is clear thinking. If a sentence is muddy, the thought behind it is muddy. The solution is not better vocabulary or more elegant construction. It is to strip the sentence until what remains is exactly what you mean.

His warmth — and he was genuinely warm — came not from sentiment but from directness. To say something plainly and confidently to another person is itself a form of respect. Vague kindness costs nothing and delivers nothing. Precise truth, stated without armour, is the real thing.

You are NOT producing a simplified or dumbed-down report. Zinsser's simplicity is not the simplicity of less thinking. It is the simplicity of more. You are doing the hardest kind of writing: saying something true, in the fewest words that can hold it, without losing anything that matters.

THE CORE MOVES — LEARN THESE

MOVE 1 — THE DIRECT LEAD
Zinsser's opening sentence does not warm up. It does not clear its throat. It makes a statement, names a person, gives a concrete detail, or poses a question. Whatever it does, it earns the second sentence.
Do not begin: "From an early age..." or "Throughout their life..." or "What makes [name] distinctive is..."
Begin with something specific. One person. One moment. One fact. Then let the pattern emerge.

MOVE 2 — THE SHORT SENTENCE AS WEAPON
Among good writers it is the short sentence that predominates. Zinsser uses it with intent. A short sentence after two longer ones carries weight out of proportion to its length. It closes. It lands. It confirms.
Vary your sentence length deliberately. Build through a longer accumulation of evidence, then cut to the short declarative.

MOVE 3 — THE ACTIVE VERB
Choose verbs that do work. Not "was engaged in the process of building" but "built." Not "demonstrated a capacity for" but "could." Not "sought to achieve mastery of" but "mastered." Passive constructions and noun-heavy phrases are clutter. Cut them.

MOVE 4 — ONE POINT PER PARAGRAPH
Each paragraph does one job. It makes one point, illustrates it with one or two specific details, and stops. If a paragraph is doing two things, split it. If it is doing half a thing, cut it.

MOVE 5 — THE EARNED CLOSE
Zinsser does not summarise at the end of a chapter. His closes state the implication — the thing the evidence leads to — in the plainest possible language, as if it were obvious. Because by the time you reach it, it should be.
The close should be short. It should feel like the only way the chapter could end.

TONE CALIBRATION
DIRECTNESS: Say what you mean. Do not say "you demonstrate a capacity for framework development." That is not a sentence. It is a fog machine.
CONFIDENCE: Do not hedge. Cut every qualifier that weakens a claim without adding precision: "sort of," "in many ways," "a kind of," "perhaps could be seen as," "it seems that."
WARMTH: Comes from precision and from taking the person seriously. You are paying attention to this specific life, this specific person, this specific evidence. That attention is the warmth.
HUMOUR: Understatement. The slight pause before the unexpected detail. Never jokes. Never exclamation points.
SECOND PERSON: Use "you" and "your" directly and confidently — not "one might consider" but "you built this" and "you chose that."

CHAPTER-BY-CHAPTER GUIDANCE

CHAPTER 1 — SUMMARY: One point. One clear portrait. Three to four short paragraphs, each doing one job. Find the most essential quality of this person and say it plainly. The summary should make the reader want to read on, not feel that they have already read it all.

CHAPTER 2 — LIFE HISTORY PATTERN: Begin with a specific episode — not the most dramatic, but the most instructive. Move through the life history in an order that shows the pattern building. Name each episode briefly and precisely. Follow each with the sentence that says what it shows. Do not belabour the evidence. Trust the facts. The close should state the pattern in the fewest words it takes to hold it accurately.

CHAPTER 3 — CHARACTER STRENGTHS (VIA): Present the strengths that the life history confirms. Present the divergences between the survey rank and the life history evidence. State what this means. MINIMUM STRUCTURE FOR THE KEY FINDINGS REWRITE: (1) Open with a single direct sentence naming the most interesting divergence. (2) Write EXACTLY 5 substantial prose paragraphs — each doing one job, each grounded in a named episode or achievement. No bullet points in the body. (3) Close with: 'From what you have told us, we can see:' followed by 3-4 tight bullets. (4) Final line: the earned close — the implication stated plainly. Do NOT produce fewer than 5 prose paragraphs.

CHAPTER 4 — PERSONALITY PROFILE (OCEAN): Find the tension between the scores and the life history. State it. Explain it in one paragraph with specific evidence. Zinsser would not spend three paragraphs doing what one can do. Preserve any charts or structured data. Rewrite only the prose.

CHAPTER 5 — BEHAVIOURAL STYLE: Two paragraphs. What the profile shows. What the life history adds. Stop.

CHAPTER 6 — DEVELOPMENT EDGE: STRUCTURE IS MANDATORY: You MUST produce EXACTLY 3 development areas, each introduced with a ## heading that names the area in plain, precise language — specific enough that the client recognises it immediately (e.g. ## Waiting to Be Asked, ## The Standard That Goes Unstated, ## The Work That Doesn't Get Shown). Do NOT write a flowing essay. Do NOT produce fewer than 3. For each area: one paragraph naming the pattern with Zinsser's directness, one paragraph naming the cost in concrete terms. No softening. No hedging. Close with a single short paragraph (no heading) that states the implication plainly — the Zinsser earned close.

CHAPTER 7 — CONCLUSIONS: Past / Present / Future, written with economy. Each section two to three paragraphs. The interview answer must sound like the person speaking plainly — not a script, but the thing they would say if they dropped all the performance and just told the truth.

CHAPTER 8 — CAREER DIRECTIONS: Each direction named in plain functional language. Two paragraphs: what the role involves, and why this person's history makes it a genuine fit. The connection to the evidence should be stated directly, not implied.

WHAT NOT TO DO
NEVER use qualifiers that weaken without adding precision: "sort of," "kind of," "rather," "quite," "a bit," "in a sense," "to some extent," "it could be argued," "one might say," "in many ways."
NEVER use abstract nouns where a concrete verb would do.
NEVER write long words that have short equivalents: "assistance" = help. "individual" = person. "facilitate" = help. "utilise" = use. "demonstrate" = show.
NEVER summarise at the end of a chapter what the chapter has already said.
NEVER use exclamation marks.
NEVER open with a generalisation: "Many people find that..." or "In today's professional world..."
NEVER write a sentence in the passive voice when an active verb is available.
AVOID: "journey," "going forward," "leverage" (as a verb), "synergies," "ecosystem," "stakeholder," "paradigm," "in terms of," "with regard to," "it is important to note," "needless to say."
NEVER open two paragraphs anywhere in the report with the same word or phrase.

LIFEWORK PRINCIPLES — NON-NEGOTIABLE
1. The client is the authority on their own life. All findings are hypotheses offered with conviction — not verdicts.
2. All claims must trace to specific evidence: a named episode, a VIA score, a specific OCEAN facet.
3. No ranked lists of strengths or career directions.
4. The development edge must name the pattern and state the cost.
5. The interview answer in Chapter 7 must sound like speech, not writing.

PRESERVE ALL MARKDOWN STRUCTURE: Keep ## headings, **bold** terms, markdown tables (do not rewrite table content).
WRITE TO THE CLIENT: Use "you" and "your" throughout.
NO PREAMBLE: Do not begin your response with "Here is the rewritten section" or similar. Output only the rewritten section text.`;

async function rewriteSectionsForZinsser(
  sections: WowReportSections,
  clientName: string,
): Promise<WowReportSections> {
  // NOTE: fourPillars is excluded — it has a fixed analytical structure (4 pillars + combination)
  // that must never be rewritten as free prose by style functions.
  const proseSections = [
    "summary",
    "lifeHistoryPattern",
    "viaSection",
    "personalitySection",
    "behaviouralStyle",
    "developmentEdge",
    "careerDirections",
    "coachingQuestions",
  ];

  const sectionContext: Record<string, string> = {
    summary: "This is Chapter 1: the opening portrait. One point. One clear portrait. Three to four short paragraphs, each doing one job. Find the most essential quality of this person and say it plainly. The first sentence must not warm up — it must make a statement, name a moment, or give a concrete detail. No generalisations. No bullet points.",
    lifeHistoryPattern: "This is Chapter 2: Life History — The Pattern. CRITICAL ANTI-DUPLICATION RULE: The house-style original has two distinct parts: (1) a narrative section tracing episodes chronologically under headings like '## The Opening Bars' and '## Recurring Motifs', and (2) a synthesis sub-section headed '## What the Pattern Reveals'. Your rewrite MUST preserve this two-part structure. The narrative and the synthesis MUST NOT share any paragraph, sentence, or observation — they are doing different jobs: the narrative shows, the synthesis names. NARRATIVE (before '## What the Pattern Reveals'): Begin with a specific episode — not the most dramatic, but the most instructive. Move through the life history in an order that shows the pattern building. Name each episode briefly and precisely. Follow each with the sentence that says what it shows. Do not belabour the evidence. Trust the facts. SYNTHESIS (under '## What the Pattern Reveals'): Do NOT repeat or paraphrase any episode, sentence, or observation already used in the narrative above. Instead: state what the whole arc adds up to in 2–3 short paragraphs, then close with 'From what you have told us, we can see:' followed by 3–4 bullets. The final sentence should state the pattern in the fewest words it takes to hold it accurately.",
    viaSection: "This is Chapter 3: Character Strengths. Preserve the markdown evidence table exactly as-is. Only rewrite the prose — specifically the '## The Key Findings' section and any closing prose. MINIMUM STRUCTURE: (1) Open with a single direct sentence naming the most interesting divergence between survey rank and life history evidence. (2) Write EXACTLY 5 substantial prose paragraphs — each doing one job, each grounded in a named episode or achievement, each ending with the short declarative that lands the point. No bullet points in the body. (3) Close with: 'From what you have told us, we can see:' followed by 3-4 tight bullets. (4) Final line: the earned close — the implication stated in the fewest words that can hold it. Do NOT produce fewer than 5 prose paragraphs.",
    personalitySection: "This is Chapter 4: Personality Profile. Find the tension between the scores and the life history. State it. Explain it in one paragraph with specific evidence. Preserve any charts or structured data. Rewrite only the prose commentary.",
    behaviouralStyle: "This is Chapter 5: Behavioural Style. Two paragraphs. What the profile shows. What the life history adds. Stop.",
    developmentEdge: "This is Chapter 6: Development Edge. STRUCTURE IS MANDATORY: You MUST produce EXACTLY 3 development areas, each introduced with a ## heading that names the area in plain, precise language — specific enough that the client recognises it immediately (e.g. ## Waiting to Be Asked, ## The Standard That Goes Unstated, ## The Work That Doesn't Get Shown). Do NOT write a flowing essay. Do NOT produce fewer than 3. For each area: one paragraph naming the pattern with Zinsser's directness, one paragraph naming the cost in concrete terms. No softening. No hedging. Close with a single short paragraph (no heading) that states the implication plainly — the Zinsser earned close.",
    careerDirections: "This is Chapter 8: Career Directions. Each direction named in plain functional language. Two paragraphs each: what the role involves, and why this person's history makes it a genuine fit. The connection to the evidence should be stated directly, not implied.",
  };

  const rewritePromises = proseSections.map(async (key) => {
    const original = sections[key as keyof WowReportSections] as string;
    if (!original || original.trim().length === 0) return [key, original] as const;
    const context = sectionContext[key] ?? "";
    const userPrompt = `${context ? context + "\n\n" : ""}--- HOUSE STYLE ORIGINAL ---\n${original}\n--- END ---\n\nRewrite the above in William Zinsser's voice following all the rules in your system prompt. Apply the Zinsser Test to every paragraph before finalising: cut every word that doesn't earn its place, make every passive construction active, replace every long word with its short equivalent, remove every qualifier that weakens without adding precision.`;
    try {
      const rewritten = await callLLMWithTimeout(WILLIAM_ZINSSER_REWRITE_SYS, userPrompt, 120_000);
      return [key, rewritten] as const;
    } catch (err) {
      console.warn(`[WOW Report] Zinsser rewrite failed for section ${String(key)}, keeping original:`, err);
      return [key, original] as const;
    }
  });

  const results = await Promise.all(rewritePromises);
  const rewritten = { ...sections };
  for (const [key, value] of results) {
    (rewritten as Record<string, unknown>)[key as string] = value;
  }
  const deduplicated = await deduplicateSections(rewritten, WILLIAM_ZINSSER_REWRITE_SYS, "William Zinsser");
  console.log(`[WOW Report] William Zinsser rewrite complete for ${clientName}`);
  return deduplicated;
}

/// ─── Helper: Render PDF with pdfmake 0.3.x ───────────────────────────────────────────────────────
async function renderWowPdf(sections: WowReportSections, writingStyle: WritingStyle = "house"): Promise<Buffer> {
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
  const markdownToPdfContent = (markdown: string, suppressSubheadings = false): unknown[] => {
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

    // ── Table state ──
    let tableHeaderRow: string[] | null = null;
    let tableBodyRows: string[][] = [];
    const flushTable = () => {
      if (!tableHeaderRow) return;
      const colCount = tableHeaderRow.length;
      const colWidths: (string | number)[] = Array(colCount).fill("*");
      // Make first two columns narrower, last column wider for achievements
      if (colCount === 6) {
        colWidths[0] = 80;  // Strength name
        colWidths[1] = "*"; // VIA Definition
        colWidths[2] = 45;  // Survey Rank
        colWidths[3] = 45;  // Freq
        colWidths[4] = 55;  // Identity Salience
        colWidths[5] = 90;  // Achievements
      }
      const headerCells = tableHeaderRow.map(h => ({
        text: h,
        font: "Roboto",
        fontSize: 8.5,
        bold: true,
        color: "#ffffff",
        fillColor: NAVY,
        margin: [4, 5, 4, 5] as [number, number, number, number],
      }));
      const bodyRowsCells = tableBodyRows.map((row, ri) =>
        row.map(cell => ({
          text: cell,
          font: "Roboto",
          fontSize: 8.5,
          color: DARK_GREY,
          fillColor: ri % 2 === 0 ? "#fdf9f3" : "#f5ede0",
          margin: [4, 4, 4, 4] as [number, number, number, number],
        }))
      );
      result.push({
        table: {
          headerRows: 1,
          widths: colWidths,
          body: [headerCells, ...bodyRowsCells],
        },
        layout: {
          hLineWidth: (i: number) => 0.5,
          vLineWidth: () => 0,
          hLineColor: () => "#e8e0d8",
          fillColor: (ri: number) => null,
        },
        margin: [0, 8, 0, 16] as [number, number, number, number],
      });
      tableHeaderRow = null;
      tableBodyRows = [];
    };
    const isPipeRow = (line: string) => line.trim().startsWith("|") && line.trim().endsWith("|");
    const isSeparatorRow = (line: string) => /^\|[-:\| ]+\|$/.test(line.trim());
    const parsePipeRow = (line: string): string[] =>
      line.trim().slice(1, -1).split("|").map(c => c.trim());

    for (const rawLine of lines) {
      const line = rawLine.trimEnd();
      if (/^##\s/.test(line)) {
        flushPara(); flushList();
        if (suppressSubheadings) {
          // Mark style: render subheadings as bold paragraph openers, not separate heading elements
          result.push(para(line.replace(/^##\s+/, ""), { bold: true, margin: [0, 10, 0, 4] }));
        } else {
          result.push(subheading(line.replace(/^##\s+/, "")));
        }
        continue;
      }
      if (/^###\s/.test(line)) {
        flushPara(); flushList();
        if (suppressSubheadings) {
          result.push(para(line.replace(/^###\s+/, ""), { bold: true, margin: [0, 8, 0, 4] }));
        } else {
          result.push(subheading(line.replace(/^###\s+/, "")));
        }
        continue;
      }
      if (/^#\s/.test(line)) {
        flushPara(); flushList();
        if (suppressSubheadings) {
          result.push(para(line.replace(/^#\s+/, ""), { bold: true, margin: [0, 10, 0, 4] }));
        } else {
          result.push(subheading(line.replace(/^#\s+/, "")));
        }
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
      // ── Table rows ──
      if (isPipeRow(line)) {
        if (isSeparatorRow(line)) {
          // separator row — skip, header already captured
          continue;
        }
        flushPara(); flushList();
        const cells = parsePipeRow(line);
        if (tableHeaderRow === null) {
          // First pipe row = header
          tableHeaderRow = cells;
        } else {
          tableBodyRows.push(cells);
        }
        continue;
      }
      // Non-pipe line after table rows — flush the table
      if (tableHeaderRow !== null) { flushTable(); }
      if (line.trim() === "") { flushPara(); flushList(); continue; }
      paraBuffer.push(line);
    }
    flushPara(); flushList(); flushTable();
    return result;
  };
  const isMark = writingStyle === "mark";
  const sectionBlock = (title: string, content: string | null | undefined) => [
    { text: "", pageBreak: "before" },
    heading(title),
    divider(),
    ...(content && content.trim().length > 0
      ? markdownToPdfContent(content, isMark)
      : [para("[This section is being prepared \u2014 please ask your counsellor to rebuild the report.]", { color: "#999999", italics: true })]
    ),
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
      currentPage > 2
        ? {
            columns: [
              { text: "LIFEWORK CAREER ANALYSIS", font: "Roboto", fontSize: 7, color: MID_GREY, margin: [60, 20, 0, 0] },
              { text: sections.clientFullName, font: "Roboto", fontSize: 7, color: GOLD, alignment: "right", margin: [0, 20, 60, 0] },
            ],
          }
        : { text: "", margin: [0, 0, 0, 0] },

    footer: (currentPage: number, pageCount: number) =>
      currentPage > 2
        ? {
            columns: [
              { text: "Pennington Hennessy", font: "Roboto", fontSize: 7, color: MID_GREY, margin: [60, 20, 0, 0] },
              { text: `${currentPage - 2} / ${pageCount - 2}`, font: "Roboto", fontSize: 7, color: MID_GREY, alignment: "right", margin: [0, 20, 60, 0] },
            ],
          }
        : { text: "", margin: [0, 0, 0, 0] },

    content: [
      // ── Covering letter — page 1, no header/footer ──
      // Top spacer
      { text: "", margin: [0, 40, 0, 0] as [number, number, number, number] },
      // Salutation — same font/size as body (11pt, DARK_GREY)
      {
        text: `Hi ${sections.clientName}`,
        font: "Roboto",
        fontSize: 11,
        bold: false,
        color: DARK_GREY,
        margin: [0, 0, 0, 14] as [number, number, number, number],
      },
      // Body paragraphs
      {
        text: "So here\u2019s your Lifework report.",
        font: "Roboto",
        fontSize: 11,
        color: DARK_GREY,
        lineHeight: 1.6,
        margin: [0, 0, 0, 14] as [number, number, number, number],
      },
      {
        text: "It’s me – Jamie – the creator of the Lifework process – writing this cover note, not the very clever AI Alistair – the Analyst. (He would probably write it better than me. Not that I’m jealous)",
        font: "Roboto",
        fontSize: 11,
        color: DARK_GREY,
        lineHeight: 1.6,
        margin: [0, 0, 0, 14] as [number, number, number, number],
      },
      {
        text: "You\u2019ve put a lot of work into giving me the information necessary to do what we set out to achieve \u2013 to understand yourself, and what makes you, \u201cyou\u201d",
        font: "Roboto",
        fontSize: 11,
        color: DARK_GREY,
        lineHeight: 1.6,
        margin: [0, 0, 0, 14] as [number, number, number, number],
      },
      {
        text: "So your report is a big read.",
        font: "Roboto",
        fontSize: 11,
        color: DARK_GREY,
        lineHeight: 1.6,
        margin: [0, 0, 0, 10] as [number, number, number, number],
      },
      {
        ul: [
          "If you\u2019re naturally impatient it\u2019s OK to start with Chapter 7 \u2013 Conclusions. It\u2019s here we summarise what we believe to be true, and give you a suggested reply to that dreaded interview question \u201cSo, tell me about yourself\u201d.",
          "If you\u2019re more patient, the report builds your analysis from your early years life history, step-by-step, so you can see how the analysis unfolds.",
        ],
        font: "Roboto",
        fontSize: 11,
        color: DARK_GREY,
        lineHeight: 1.6,
        margin: [0, 0, 0, 14] as [number, number, number, number],
      },
      {
        text: "One really important thing. Your report is the basis for reflecting, thinking and discussing. It’s built on the information you told us and the psychometric instruments that you engaged with. It’s therefore OK to disagree with anything we’ve written. Alistair may be able to help you unpack why we believe it to be true, but you remain the expert on you. If you – plus your friends and colleagues (always worth checking in with) – see something we’ve missed, Great. The overall aim is to help you know you, in the context of “what’s next?”",
        font: "Roboto",
        fontSize: 11,
        color: DARK_GREY,
        lineHeight: 1.6,
        margin: [0, 0, 0, 14] as [number, number, number, number],
      },
      {
        text: "If you have any concerns about what has been raised in this report, feel free to email me.",
        font: "Roboto",
        fontSize: 11,
        color: DARK_GREY,
        lineHeight: 1.6,
        margin: [0, 0, 0, 36] as [number, number, number, number],
      },
      // Signature
      {
        text: "Jamie Pennington",
        font: "Roboto",
        fontSize: 11,
        bold: true,
        color: NAVY,
        margin: [0, 0, 0, 4] as [number, number, number, number],
      },
      {
        text: "Jamie@penningtonhennessy.com",
        font: "Roboto",
        fontSize: 10,
        color: GOLD,
        margin: [0, 0, 0, 0] as [number, number, number, number],
      },

      // ── Cover page — page 2, no header/footer ──
      { text: "", pageBreak: "before" },
      // Large top spacer to push client name to ~55% down the page
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
      // Date — centred
      {
        text: sections.generatedAt,
        font: "Roboto",
        fontSize: 11,
        color: MID_GREY,
        alignment: "center",
        margin: [0, 0, 0, 0] as [number, number, number, number],
      },
      // Lifework logo — bottom-right corner
      {
        image: LIFEWORK_LOGO_BASE64,
        width: 130,
        absolutePosition: { x: 595 - 60 - 130, y: 842 - 60 - 45 },
      },

      // ── Section 1: Summary (sectionBlock already includes pageBreak: 'before') ──
      ...sectionBlock("1. Lifework Summary", sections.summary),

      // ── Section 2: Life History Pattern ──
      ...sectionBlock("2. Life History Pattern", sections.lifeHistoryPattern),

      // ── Section 2b: 4 Pillars of Fulfilment ──
      ...sectionBlock("2b. 4 Pillars of Fulfilment", sections.fourPillars),

      // ── Section 3: VIA Character Strengths ──
      { text: "", pageBreak: "before" },
      heading("3. Character Strengths"),
      divider(),
      // VIA framework overview
      para("The VIA framework identifies 24 character strengths organised under six virtues. Central to its application is the idea of signature strengths — those you are most drawn to use and that give you energy. Research shows that deploying signature strengths improves wellbeing, engagement, and resilience."),
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
      ...markdownToPdfContent(sections.viaSection, isMark),

      // ── Section 4: Personality Profile ──
      { text: "", pageBreak: "before" },
      heading("4. Personality Profile"),
      divider(),
      // Big Five / OCEAN framework overview
      para("The Big Five identifies five core personality dimensions: Openness, Conscientiousness, Extraversion, Agreeableness, and Emotional Stability. Unlike type-based assessments, it measures traits as continuous spectrums — there are no good or bad scores. It offers a vocabulary for patterns you may already sense in how you work and lead."),
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
      ...markdownToPdfContent(sections.personalitySection, isMark),

      // ── Section 5: Behavioural Style ──
      { text: "", pageBreak: "before" },
      heading("5. Behavioural Style"),
      divider(),
      // Behavioural Style framework overview
      para("The behavioural style described in this chapter is not drawn from a separate questionnaire. It has been extrapolated from your Big Five personality profile, using a mapping between personality dimensions and the four broad orientations that shape how people typically engage with others, lead, and respond to challenge."),
      para("In our experience, this extrapolation tends to be accurate — most clients find it a recognisable portrait. We ask you to hold it lightly, however: treat it as a prompt for reflection and conversation rather than a fixed description of who you are. The most useful question to bring to this chapter is not \"Is this right?\" but \"What does this tell me about how I show up — and where might I want to show up differently?\""),
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
      // ── Insights Discovery structured panel (replaces AI prose) ──
      ...(() => {
        const colourData: Record<string, { hex: string; strengths: string[]; challenges: string[]; careerFit: string }> = {
          "Cool Blue":       { hex: "#3E7CB1", strengths: ["Analytical","Precise","Systematic","Thorough","Objective"],        challenges: ["Can appear cold or detached","May over-analyse","Dislikes ambiguity"],                       careerFit: "Roles requiring analysis, precision, and systematic thinking — finance, engineering, research, IT, quality assurance, law." },
          "Fiery Red":       { hex: "#A93226", strengths: ["Decisive","Determined","Strong-willed","Purposeful","Results-focused"], challenges: ["May appear insensitive","Can be impatient","Dislikes indecision in others"],              careerFit: "Roles requiring leadership, accountability, and the ability to drive change — management, entrepreneurship, law, surgery, strategy." },
          "Earth Green":     { hex: "#6E9B1E", strengths: ["Empathetic","Patient","Reliable","Supportive","Values-driven"],       challenges: ["Can avoid necessary conflict","May be indecisive","Dislikes rapid change"],               careerFit: "Roles requiring empathy, support, and long-term relationship management — counselling, HR, nursing, social work, community roles." },
          "Sunshine Yellow": { hex: "#E8B84B", strengths: ["Enthusiastic","Persuasive","Creative","Optimistic","Collaborative"],  challenges: ["Can be disorganised","May over-promise","Dislikes routine and detail"],                 careerFit: "Roles requiring communication, creativity, and relationship-building — sales, marketing, PR, teaching, facilitation, consulting." },
        };
        const pColour = sections.primaryColour || "Cool Blue";
        const pd = colourData[pColour] ?? colourData["Cool Blue"];
        const eScore2 = sections.domainScores["E"] ?? 50;
        const aScore2 = sections.domainScores["A"] ?? 50;
        const oScore2 = sections.domainScores["O"] ?? 50;
        const cScore2 = sections.domainScores["C"] ?? 50;
        const eLabel2 = eScore2 >= 65 ? "Highly Extraverted" : eScore2 >= 50 ? "Moderately Extraverted" : eScore2 >= 35 ? "Moderately Introverted" : "Highly Introverted";
        const aLabel2 = aScore2 >= 65 ? "Highly Feeling" : aScore2 >= 50 ? "Moderately Feeling" : aScore2 >= 35 ? "Moderately Thinking" : "Highly Thinking";
        const oLabel2 = oScore2 >= 50 ? "Intuiting (N)" : "Sensing (S)";
        const cLabel2 = cScore2 >= 50 ? "Judging (J)" : "Perceiving (P)";
        const axisCell = (label: string, value: string, sub: string) => ({
          stack: [
            { text: label, fontSize: 7, color: NAVY, characterSpacing: 1, margin: [0, 0, 0, 2] as [number, number, number, number] },
            { text: value, fontSize: 10, bold: true, color: NAVY },
            { text: sub, fontSize: 7, color: "#666666" },
          ],
          fillColor: "#f5f1e8",
          margin: [8, 8, 8, 8] as [number, number, number, number],
        });
        return [
          // Axis cards row
          {
            table: {
              widths: ["*", "*", "*", "*"],
              body: [[
                axisCell("JUNGIAN TYPE", sections.jungianType || "", "Approx. MBTI equivalent"),
                axisCell("E / I AXIS", eLabel2, `Extraversion: ${eScore2}`),
                axisCell("T / F AXIS", aLabel2, `Agreeableness: ${aScore2}`),
                axisCell("S / N + J / P", `${oLabel2} · ${cLabel2}`, "Openness & Conscientiousness"),
              ]],
            },
            layout: "noBorders",
            margin: [0, 0, 0, 12] as [number, number, number, number],
          } as object,
          // Strengths / Watch-outs / Career Fit row
          {
            table: {
              widths: ["*", "*", "*"],
              body: [[
                {
                  stack: [
                    { text: "STRENGTHS", fontSize: 7, color: GOLD, characterSpacing: 1, bold: true, margin: [0, 0, 0, 4] as [number, number, number, number] },
                    { ul: pd.strengths.map((s: string) => ({ text: s, fontSize: 9, color: NAVY })), markerColor: pd.hex, margin: [0, 4, 0, 0] as [number, number, number, number] },
                  ],
                  fillColor: "#f5f1e8",
                  margin: [10, 10, 10, 10] as [number, number, number, number],
                },
                {
                  stack: [
                    { text: "WATCH-OUTS", fontSize: 7, color: GOLD, characterSpacing: 1, bold: true, margin: [0, 0, 0, 4] as [number, number, number, number] },
                    { ul: pd.challenges.map((c: string) => ({ text: c, fontSize: 9, color: NAVY })), markerColor: pd.hex, margin: [0, 4, 0, 0] as [number, number, number, number] },
                  ],
                  fillColor: "#f5f1e8",
                  margin: [10, 10, 10, 10] as [number, number, number, number],
                },
                {
                  stack: [
                    { text: "CAREER ENVIRONMENT FIT", fontSize: 7, color: GOLD, characterSpacing: 1, bold: true, margin: [0, 0, 0, 4] as [number, number, number, number] },
                    { text: pd.careerFit, fontSize: 9, color: NAVY, lineHeight: 1.4 },
                  ],
                  fillColor: "#f5f1e8",
                  margin: [10, 10, 10, 10] as [number, number, number, number],
                },
              ]],
            },
            layout: "noBorders",
            margin: [0, 0, 0, 16] as [number, number, number, number],
          } as object,
        ];
      })(),

      // ── Chapter 6: Development Edge (variant-aware title) ──
      ...sectionBlock(
        sections.reportType === "retirement" ? "6. What To Watch"
          : sections.reportType === "student" ? "6. What To Build First"
          : sections.reportType === "job_returner" ? "6. What To Rebuild"
          : "6. Development Edge",
        sections.developmentEdge
      ),

      // ── Chapter 7: Conclusions ──
      { text: "", pageBreak: "before" },
      heading("7. Conclusions"),
      divider(),
      ...markdownToPdfContent(sections.coachingQuestions, isMark),

      // ── Chapter 8: Career Directions (variant-aware title) ──
      ...sectionBlock(
        sections.reportType === "retirement" ? "8. What To Do With What You Know"
          : sections.reportType === "student" ? "8. Where You Are Headed"
          : sections.reportType === "job_returner" ? "8. What You Bring Back"
          : "8. Career Directions",
        sections.careerDirections
      ),

      // ── Appendix: The Four Report Variants ──
      { text: "", pageBreak: "before" },
      heading("Appendix: The Four Report Variants"),
      divider(),
      {
        text: (() => {
          const variantDescriptions: Record<string, string> = {
            standard: "Standard Edition",
            student: "First Career Edition",
            career_changer: "Career Change Edition",
            job_returner: "Returning to Work Edition",
            retirement: "Retirement & Legacy Edition",
          };
          const currentLabel = variantDescriptions[sections.reportType ?? "standard"] ?? "Standard Edition";
          return `This report is the ${currentLabel}. The Lifework WOW Report is produced in four variants, each calibrated to a different life stage and set of questions. Chapters 1–5 (Summary, Life History, Character Strengths, Personality Profile, and Behavioural Style) are substantially the same across all four variants — the data does not change. Chapters 6, 7, and 8 (Development Edge, Career Directions, and Conclusions) are rewritten for each variant to address the specific questions and challenges of that life stage.`;
        })(),
        font: "Roboto",
        fontSize: 10,
        color: NAVY,
        margin: [0, 0, 0, 16] as [number, number, number, number],
        lineHeight: 1.5,
      },
      {
        table: {
          widths: ["auto", "*", "*"],
          body: [
            [
              { text: "Variant", font: "Roboto", bold: true, fontSize: 9, color: CREAM, fillColor: NAVY, border: [false, false, false, false], margin: [8, 6, 8, 6] as [number, number, number, number] },
              { text: "For", font: "Roboto", bold: true, fontSize: 9, color: CREAM, fillColor: NAVY, border: [false, false, false, false], margin: [8, 6, 8, 6] as [number, number, number, number] },
              { text: "The Central Question", font: "Roboto", bold: true, fontSize: 9, color: CREAM, fillColor: NAVY, border: [false, false, false, false], margin: [8, 6, 8, 6] as [number, number, number, number] },
            ],
            ...[
              { key: "student", label: "First Career", target: "First career seekers", question: "\u201cWho am I, and where do I start?\u201d" },
              { key: "career_changer", label: "Career Change", target: "Dissatisfied or confidence-depleted professionals", question: "\u201cWhat is wrong with where I am, and what would be right?\u201d" },
              { key: "job_returner", label: "Returning to Work", target: "People re-entering after a career break", question: "\u201cWhat do I still have, and how do I re-establish it?\u201d" },
              { key: "retirement", label: "Retirement & Legacy", target: "People actively planning their post-career chapter", question: "\u201cWhat do I do with everything I am and everything I know?\u201d" },
            ].map(row => {
              const isCurrent = (sections.reportType ?? "standard") === row.key;
              const bg = isCurrent ? GOLD : CREAM;
              const fg = isCurrent ? NAVY : NAVY;
              return [
                { text: row.label, font: "Roboto", bold: isCurrent, fontSize: 9, color: fg, fillColor: bg, border: [false, false, false, false], margin: [8, 5, 8, 5] as [number, number, number, number] },
                { text: row.target, font: "Roboto", fontSize: 9, color: fg, fillColor: bg, border: [false, false, false, false], margin: [8, 5, 8, 5] as [number, number, number, number] },
                { text: row.question, font: "Roboto", fontSize: 9, color: fg, fillColor: bg, border: [false, false, false, false], margin: [8, 5, 8, 5] as [number, number, number, number] },
              ];
            }),
          ],
        },
        layout: "noBorders",
        margin: [0, 0, 0, 0] as [number, number, number, number],
      },

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

// ─── Annex PDF ──────────────────────────────────────────────────────────────
// Renders a "Your Data" annex PDF (A1 Life History, A2 VIA, A3 OCEAN) using
// pdfmake and returns a Buffer. Called by runGenerationJob and merged with the
// main WOW Report PDF via pdf-lib.

const DECADE_LABELS: Record<string, string> = {
  childhood: "Childhood",
  early_childhood: "Early Childhood (0–5)",
  mid_childhood: "Mid Childhood (6–11)",
  late_childhood: "Late Childhood (12–18)",
  twenties: "Twenties",
  thirties: "Thirties",
  forties: "Forties",
  fifties: "Fifties",
  sixties_plus: "Sixties and Beyond",
};

const FACET_NAMES: Record<string, { name: string; domain: string }> = {
  N1: { name: "Anxiety", domain: "N" }, N2: { name: "Anger", domain: "N" }, N3: { name: "Depression", domain: "N" },
  N4: { name: "Self-Consciousness", domain: "N" }, N5: { name: "Immoderation", domain: "N" }, N6: { name: "Vulnerability", domain: "N" },
  E1: { name: "Friendliness", domain: "E" }, E2: { name: "Gregariousness", domain: "E" }, E3: { name: "Assertiveness", domain: "E" },
  E4: { name: "Activity Level", domain: "E" }, E5: { name: "Excitement-Seeking", domain: "E" }, E6: { name: "Cheerfulness", domain: "E" },
  O1: { name: "Imagination", domain: "O" }, O2: { name: "Artistic Interests", domain: "O" }, O3: { name: "Emotionality", domain: "O" },
  O4: { name: "Adventurousness", domain: "O" }, O5: { name: "Intellect", domain: "O" }, O6: { name: "Liberalism", domain: "O" },
  A1: { name: "Trust", domain: "A" }, A2: { name: "Morality", domain: "A" }, A3: { name: "Altruism", domain: "A" },
  A4: { name: "Cooperation", domain: "A" }, A5: { name: "Modesty", domain: "A" }, A6: { name: "Sympathy", domain: "A" },
  C1: { name: "Self-Efficacy", domain: "C" }, C2: { name: "Orderliness", domain: "C" }, C3: { name: "Dutifulness", domain: "C" },
  C4: { name: "Achievement-Striving", domain: "C" }, C5: { name: "Self-Discipline", domain: "C" }, C6: { name: "Cautiousness", domain: "C" },
};

const DOMAIN_COLORS: Record<string, string> = {
  N: "#7C3AED", E: "#D97706", O: "#059669", A: "#DB2777", C: "#2563EB",
};

const VIA_VIRTUE_MAP: Record<string, string> = {
  Creativity: "Wisdom", Curiosity: "Wisdom", Judgment: "Wisdom", "Love of Learning": "Wisdom", Perspective: "Wisdom",
  Bravery: "Courage", Perseverance: "Courage", Honesty: "Courage", Zest: "Courage",
  Love: "Humanity", Kindness: "Humanity", "Social Intelligence": "Humanity",
  Teamwork: "Justice", Fairness: "Justice", Leadership: "Justice",
  Forgiveness: "Temperance", Humility: "Temperance", Prudence: "Temperance", "Self-Regulation": "Temperance",
  "Appreciation of Beauty": "Transcendence", Gratitude: "Transcendence", Hope: "Transcendence", Humor: "Transcendence", Spirituality: "Transcendence",
};

async function renderAnnexPdf(
  clientId: number,
  clientFullName: string,
  viaRanked: Array<{ name: string; score: number; rank: number }>,
  domainScores: Record<string, number>,
  facetScores: Record<string, number>,
  familyBg: { fatherOccupation?: string | null; motherOccupation?: string | null; siblingPosition?: string | null; upbringingLocation?: string | null; familyNarrative?: string | null; significantInfluences?: string | null } | null,
  careerList: Array<{ organisation: string; role?: string | null; yearFrom?: string | null; yearTo?: string | null; keyResponsibilities?: string | null; whyLeft?: string | null; highlights?: string | null }>,
): Promise<Buffer> {
  const pdfmake = _require("pdfmake") as any;
  const RobotoFonts = _require("pdfmake/fonts/Roboto") as any;
  pdfmake.addFonts(RobotoFonts);

  const NAVY = "#0a1628";
  const GOLD = "#c9973a";
  const CREAM = "#f5f0e8";
  const DARK_GREY = "#2c2c2c";
  const MID_GREY = "#666666";
  const LIGHT_GREY = "#aaaaaa";

  const para = (text: string, opts: Record<string, unknown> = {}) => ({
    text, font: "Roboto", fontSize: 10, color: DARK_GREY, lineHeight: 1.45,
    margin: [0, 0, 0, 6] as [number,number,number,number], ...opts,
  });

  const sectionHeading = (text: string) => ({
    text, font: "Roboto", fontSize: 16, bold: true, color: NAVY,
    margin: [0, 24, 0, 4] as [number,number,number,number],
  });

  const goldRule = () => ({
    canvas: [{ type: "line", x1: 0, y1: 0, x2: 483, y2: 0, lineWidth: 1.5, lineColor: GOLD }],
    margin: [0, 0, 0, 12] as [number,number,number,number],
  });

  // Fetch achievements
  const achievementsList = await getAchievements(clientId);

  // ── COVER PAGE ──
  const coverContent: any[] = [
    {
      canvas: [{ type: "rect", x: 0, y: 0, w: 595, h: 841, color: NAVY }],
      absolutePosition: { x: 0, y: 0 },
    },
    // Gold top bar
    { canvas: [{ type: "rect", x: 0, y: 0, w: 595, h: 4, color: GOLD }], absolutePosition: { x: 0, y: 0 } },
    // Gold left bar
    { canvas: [{ type: "rect", x: 0, y: 0, w: 5, h: 841, color: GOLD }], absolutePosition: { x: 0, y: 0 } },
    { text: "PENNINGTON HENNESSY", font: "Roboto", bold: true, fontSize: 10, color: GOLD, characterSpacing: 2, absolutePosition: { x: 56, y: 36 } },
    { canvas: [{ type: "line", x1: 0, y1: 0, x2: 483, y2: 0, lineWidth: 0.5, lineColor: "#555555" }], absolutePosition: { x: 56, y: 54 } },
    { text: "Your Data", font: "Roboto", bold: true, fontSize: 44, color: "#ffffff", absolutePosition: { x: 56, y: 100 } },
    { canvas: [{ type: "rect", x: 0, y: 0, w: 60, h: 2.5, color: GOLD }], absolutePosition: { x: 56, y: 158 } },
    { text: "WOW Report — Annex", font: "Roboto", fontSize: 13, color: "#cccccc", absolutePosition: { x: 56, y: 170 } },
    // Client block
    { canvas: [{ type: "rect", x: 0, y: 0, w: 483, h: 60, color: "#1a2e48", r: 4 }], absolutePosition: { x: 56, y: 230 } },
    { text: "PREPARED FOR", font: "Roboto", bold: true, fontSize: 8, color: GOLD, characterSpacing: 1.5, absolutePosition: { x: 72, y: 244 } },
    { text: clientFullName, font: "Roboto", bold: true, fontSize: 18, color: "#ffffff", absolutePosition: { x: 72, y: 260 } },
    // Contents
    { text: "CONTENTS", font: "Roboto", bold: true, fontSize: 9, color: LIGHT_GREY, characterSpacing: 1.5, absolutePosition: { x: 56, y: 320 } },
    { canvas: [{ type: "line", x1: 0, y1: 0, x2: 483, y2: 0, lineWidth: 0.5, lineColor: GOLD }], absolutePosition: { x: 56, y: 334 } },
    { text: "B", font: "Roboto", bold: true, fontSize: 11, color: GOLD, absolutePosition: { x: 56, y: 348 } },
    { text: "Biographical Data", font: "Roboto", fontSize: 11, color: "#ffffff", absolutePosition: { x: 80, y: 348 } },
    { text: "C1", font: "Roboto", bold: true, fontSize: 11, color: GOLD, absolutePosition: { x: 56, y: 372 } },
    { text: "Life History Data", font: "Roboto", fontSize: 11, color: "#ffffff", absolutePosition: { x: 80, y: 372 } },
    { text: "C2", font: "Roboto", bold: true, fontSize: 11, color: GOLD, absolutePosition: { x: 56, y: 396 } },
    { text: "VIA Character Strengths", font: "Roboto", fontSize: 11, color: "#ffffff", absolutePosition: { x: 80, y: 396 } },
    { text: "C3", font: "Roboto", bold: true, fontSize: 11, color: GOLD, absolutePosition: { x: 56, y: 420 } },
    { text: "OCEAN Personality Profile", font: "Roboto", fontSize: 11, color: "#ffffff", absolutePosition: { x: 80, y: 420 } },
    // Footer
    { text: "Confidential — prepared by Pennington Hennessy for the named client only.", font: "Roboto", italics: true, fontSize: 8, color: "#666666", absolutePosition: { x: 56, y: 800 } },
    // Force page break after cover
    { text: "", pageBreak: "after" },
  ];

  // ── ANNEX B: BIOGRAPHICAL DATA ──
  const bContent: any[] = [
    sectionHeading("Annex B — Biographical Data"),
    goldRule(),
    para("Family background, educational history, and career history as provided by the client.", { color: MID_GREY, italics: true }),
    { text: "", margin: [0, 8, 0, 0] as [number,number,number,number] },
  ];

  // B1: Family Background
  bContent.push({
    text: "B1 — Family Background",
    font: "Roboto", bold: true, fontSize: 13, color: NAVY,
    margin: [0, 8, 0, 4] as [number,number,number,number],
  });
  bContent.push({ canvas: [{ type: "line", x1: 0, y1: 0, x2: 483, y2: 0, lineWidth: 0.5, lineColor: GOLD }], margin: [0, 0, 0, 10] as [number,number,number,number] });
  if (familyBg) {
    const fbRows: Array<[string, string]> = [];
    if (familyBg.upbringingLocation) fbRows.push(["Location of upbringing", familyBg.upbringingLocation]);
    if (familyBg.fatherOccupation) fbRows.push(["Father's occupation", familyBg.fatherOccupation]);
    if (familyBg.motherOccupation) fbRows.push(["Mother's occupation", familyBg.motherOccupation]);
    if (familyBg.siblingPosition) fbRows.push(["Position among siblings", familyBg.siblingPosition]);
    for (const [label, value] of fbRows) {
      bContent.push({
        columns: [
          { text: label, font: "Roboto", bold: true, fontSize: 9, color: MID_GREY, width: 160 },
          { text: value, font: "Roboto", fontSize: 10, color: DARK_GREY, width: "*" },
        ],
        margin: [0, 3, 0, 3] as [number,number,number,number],
      });
    }
    if (familyBg.familyNarrative) {
      bContent.push({ text: "", margin: [0, 6, 0, 0] as [number,number,number,number] });
      bContent.push(para(familyBg.familyNarrative));
    }
    if (familyBg.significantInfluences) {
      bContent.push({
        text: "Significant influences",
        font: "Roboto", bold: true, fontSize: 10, color: NAVY,
        margin: [0, 8, 0, 4] as [number,number,number,number],
      });
      bContent.push(para(familyBg.significantInfluences));
    }
    const hasAnyFamilyData = !!(familyBg.upbringingLocation || familyBg.fatherOccupation || familyBg.motherOccupation || familyBg.siblingPosition || familyBg.familyNarrative || familyBg.significantInfluences);
    if (!hasAnyFamilyData) {
      bContent.push(para("No family background data provided.", { color: LIGHT_GREY, italics: true }));
    }
  } else {
    bContent.push(para("No family background data provided.", { color: LIGHT_GREY, italics: true }));
  }

  // B2: Career History
  bContent.push({ text: "", margin: [0, 16, 0, 0] as [number,number,number,number] });
  bContent.push({
    text: "B2 — Career History",
    font: "Roboto", bold: true, fontSize: 13, color: NAVY,
    margin: [0, 8, 0, 4] as [number,number,number,number],
  });
  bContent.push({ canvas: [{ type: "line", x1: 0, y1: 0, x2: 483, y2: 0, lineWidth: 0.5, lineColor: GOLD }], margin: [0, 0, 0, 10] as [number,number,number,number] });
  if (careerList.length === 0) {
    bContent.push(para("No career history provided.", { color: LIGHT_GREY, italics: true }));
  } else {
    for (const job of careerList) {
      const years = [job.yearFrom, job.yearTo].filter(Boolean).join("\u2013") || "";
      bContent.push({
        columns: [
          {
            stack: [
              { text: job.organisation, font: "Roboto", bold: true, fontSize: 11, color: NAVY },
              ...(job.role ? [{ text: job.role, font: "Roboto", fontSize: 10, color: DARK_GREY, margin: [0, 1, 0, 0] as [number,number,number,number] }] : []),
              ...(job.keyResponsibilities ? [{ text: job.keyResponsibilities, font: "Roboto", fontSize: 9, color: MID_GREY, margin: [0, 3, 0, 0] as [number,number,number,number] }] : []),
              ...(job.highlights ? [{
                stack: [
                  { text: "Key highlights", font: "Roboto", bold: true, fontSize: 9, color: NAVY, margin: [0, 4, 0, 2] as [number,number,number,number] },
                  { text: job.highlights, font: "Roboto", fontSize: 9, color: DARK_GREY },
                ],
                margin: [0, 2, 0, 0] as [number,number,number,number],
              }] : []),
              ...(job.whyLeft ? [{
                stack: [
                  { text: "Reason for leaving", font: "Roboto", bold: true, fontSize: 9, color: NAVY, margin: [0, 4, 0, 2] as [number,number,number,number] },
                  { text: job.whyLeft, font: "Roboto", fontSize: 9, color: MID_GREY },
                ],
                margin: [0, 2, 0, 0] as [number,number,number,number],
              }] : []),
            ],
            width: "*",
          },
          ...(years ? [{ text: years, font: "Roboto", fontSize: 10, color: MID_GREY, width: 80, alignment: "right" as const }] : [{ text: "", width: 80 }]),
        ],
        margin: [0, 0, 0, 12] as [number,number,number,number],
      });
      bContent.push({ canvas: [{ type: "line", x1: 0, y1: 0, x2: 483, y2: 0, lineWidth: 0.3, lineColor: "#eeeeee" }], margin: [0, 0, 0, 8] as [number,number,number,number] });
    }
  }
  bContent.push({ text: "", pageBreak: "after" });

  // ── A1: LIFE HISTORY ──
  const a1Content: any[] = [
    sectionHeading("A1 — Life History"),
    goldRule(),
    para("The following achievements were recorded during the Sage life history interview. Where Sage asked a follow-up question, the enrichment note is shown in italics beneath the entry."),
    { text: "", margin: [0, 4, 0, 0] as [number,number,number,number] },
  ];

  // Group by decade
  const decadeOrder = ["early_childhood","mid_childhood","late_childhood","childhood","twenties","thirties","forties","fifties","sixties_plus"];
  const byDecade: Record<string, typeof achievementsList> = {};
  for (const a of achievementsList) {
    const dk = a.decade ?? "unknown";
    if (!byDecade[dk]) byDecade[dk] = [];
    byDecade[dk].push(a);
  }
  const allDecadeKeys = [...decadeOrder, ...Object.keys(byDecade)];
  const seen = new Set<string>();
  const sortedDecades = allDecadeKeys.filter(d => { if (seen.has(d)) return false; seen.add(d); return byDecade[d]?.length; });

  for (const dk of sortedDecades) {
    const label = DECADE_LABELS[dk] ?? dk;
    a1Content.push({
      text: label.toUpperCase(), font: "Roboto", bold: true, fontSize: 8,
      color: GOLD, characterSpacing: 1.2,
      margin: [0, 12, 0, 4] as [number,number,number,number],
    });
    a1Content.push({ canvas: [{ type: "line", x1: 0, y1: 0, x2: 483, y2: 0, lineWidth: 0.5, lineColor: "#dddddd" }], margin: [0, 0, 0, 6] as [number,number,number,number] });
    for (const a of byDecade[dk]) {
      const esfColor = a.esf === "enjoyable" ? "#2563EB" : a.esf === "satisfying" ? "#059669" : a.esf === "fulfilling" ? GOLD : MID_GREY;
      a1Content.push({
        columns: [
          { text: a.title ?? "Untitled", font: "Roboto", bold: true, fontSize: 10, color: NAVY, width: "*" },
          { text: `Age ${a.age ?? "?"}`, font: "Roboto", fontSize: 9, color: MID_GREY, width: 40, alignment: "right" },
          { text: (a.esf ?? "").toUpperCase(), font: "Roboto", bold: true, fontSize: 8, color: esfColor, width: 60, alignment: "right" },
        ],
        margin: [0, 4, 0, 2] as [number,number,number,number],
      });
      if (a.description) a1Content.push(para(a.description, { margin: [0, 0, 0, 3] as [number,number,number,number] }));
      if (a.sageEnrichment) a1Content.push(para(a.sageEnrichment, { italics: true, color: MID_GREY, fontSize: 9, margin: [0, 0, 0, 6] as [number,number,number,number] }));
      a1Content.push({ canvas: [{ type: "line", x1: 0, y1: 0, x2: 483, y2: 0, lineWidth: 0.3, lineColor: "#eeeeee" }], margin: [0, 2, 0, 4] as [number,number,number,number] });
    }
  }
  a1Content.push({ text: "", pageBreak: "after" });

  // ── A2: VIA CHARACTER STRENGTHS ──
  const a2Content: any[] = [
    sectionHeading("C2 — VIA Character Strengths"),
    goldRule(),
    para("All 24 character strengths ranked in order of score. Scores are out of 25. Top 5 are highlighted in gold; bottom 5 in grey."),
    { text: "", margin: [0, 4, 0, 0] as [number,number,number,number] },
  ];

  const sortedVia = [...viaRanked].sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99));
  for (const s of sortedVia) {
    const rank = s.rank ?? 0;
    const isTop = rank <= 5;
    const isBottom = rank >= 20;
    const nameColor = isTop ? GOLD : isBottom ? LIGHT_GREY : NAVY;
    const barColor = isTop ? GOLD : isBottom ? LIGHT_GREY : "#4A90D9";
    const pct = Math.round(((s.score ?? 0) / 25) * 100);
    const virtue = VIA_VIRTUE_MAP[s.name] ?? "";
    a2Content.push({
      columns: [
        { text: `${rank}.`, font: "Roboto", bold: true, fontSize: 9, color: MID_GREY, width: 20 },
        { text: s.name, font: "Roboto", bold: isTop, fontSize: 10, color: nameColor, width: 160 },
        { text: virtue, font: "Roboto", fontSize: 9, color: MID_GREY, width: 90, italics: true },
        {
          stack: [
            { canvas: [{ type: "rect", x: 0, y: 2, w: 180, h: 10, color: "#eeeeee", r: 2 }] },
            { canvas: [{ type: "rect", x: 0, y: 2, w: Math.round(pct * 1.8), h: 10, color: barColor, r: 2 }], relativePosition: { x: 0, y: -12 } },
          ],
          width: 185,
        },
        { text: `${s.score ?? 0}/25`, font: "Roboto", fontSize: 9, color: MID_GREY, width: 35, alignment: "right" },
      ],
      margin: [0, 3, 0, 3] as [number,number,number,number],
    });
  }
  a2Content.push({ text: "", pageBreak: "after" });

  // ── A3: OCEAN PERSONALITY PROFILE ──
  const a3Content: any[] = [
    sectionHeading("C3 — OCEAN Personality Profile"),
    goldRule(),
    para("Domain scores and all 30 sub-scale facets. Scores are percentiles (0–100). Scores above 70 are high; below 30 are low."),
    { text: "", margin: [0, 4, 0, 0] as [number,number,number,number] },
  ];

  const domainOrder = ["N", "E", "O", "A", "C"];
  for (const dk of domainOrder) {
    const domainScore = domainScores[dk] ?? null;
    const domainLabel = BIG5_LABELS[dk]?.name ?? dk;
    const domainColor = DOMAIN_COLORS[dk] ?? NAVY;
    if (domainScore === null) continue;
    // Domain header
    a3Content.push({
      columns: [
        { text: domainLabel.toUpperCase(), font: "Roboto", bold: true, fontSize: 11, color: domainColor, width: "*" },
        { text: `${domainScore}th percentile`, font: "Roboto", fontSize: 10, color: MID_GREY, width: 110, alignment: "right" },
      ],
      margin: [0, 14, 0, 2] as [number,number,number,number],
    });
    // Domain bar
    a3Content.push({
      stack: [
        { canvas: [{ type: "rect", x: 0, y: 0, w: 483, h: 8, color: "#eeeeee", r: 2 }] },
        { canvas: [{ type: "rect", x: 0, y: 0, w: Math.round(domainScore * 4.83), h: 8, color: domainColor, r: 2 }], relativePosition: { x: 0, y: -8 } },
      ],
      margin: [0, 0, 0, 8] as [number,number,number,number],
    });
    // Facets
    const facetKeys = ["1","2","3","4","5","6"].map(n => `${dk}${n}`);
    for (const fk of facetKeys) {
      const fScore = facetScores[fk] ?? null;
      if (fScore === null) continue;
      const facetName = FACET_NAMES[fk]?.name ?? fk;
      const fColor = fScore >= 70 ? domainColor : fScore <= 30 ? "#cc3333" : MID_GREY;
      a3Content.push({
        columns: [
          { text: facetName, font: "Roboto", fontSize: 9, color: DARK_GREY, width: 160 },
          {
            stack: [
              { canvas: [{ type: "rect", x: 0, y: 2, w: 280, h: 7, color: "#eeeeee", r: 2 }] },
              { canvas: [{ type: "rect", x: 0, y: 2, w: Math.round(fScore * 2.8), h: 7, color: fColor, r: 2 }], relativePosition: { x: 0, y: -9 } },
            ],
            width: 285,
          },
          { text: `${fScore}`, font: "Roboto", fontSize: 9, color: fColor, bold: fScore >= 70 || fScore <= 30, width: 35, alignment: "right" },
        ],
        margin: [0, 2, 0, 2] as [number,number,number,number],
      });
    }
    a3Content.push({ canvas: [{ type: "line", x1: 0, y1: 0, x2: 483, y2: 0, lineWidth: 0.3, lineColor: "#dddddd" }], margin: [0, 6, 0, 0] as [number,number,number,number] });
  }

  const docDefinition = {
    pageSize: "A4",
    pageMargins: [56, 56, 56, 56] as [number,number,number,number],
    defaultStyle: { font: "Roboto" },
    content: [...coverContent, ...bContent, ...a1Content, ...a2Content, ...a3Content],
    footer: (currentPage: number, pageCount: number) => currentPage === 1 ? {} : ({
      columns: [
        { text: "Your Data — WOW Report Annex", font: "Roboto", fontSize: 7, color: LIGHT_GREY, margin: [56, 8, 0, 0] as [number,number,number,number] },
        { text: `${currentPage}`, font: "Roboto", fontSize: 7, color: LIGHT_GREY, alignment: "right", margin: [0, 8, 56, 0] as [number,number,number,number] },
      ],
    }),
  };

  const pdfDoc = pdfmake.createPdf(docDefinition as any);
  return pdfDoc.getBuffer() as Promise<Buffer>;
}

// ─── Background Job ─────────────────────────────────────────────────────────
// v2: retirement variant prompts active — section titles and content are now variant-aware

async function runGenerationJob(clientId: number, reportType: WowReportType = "standard", writingStyle: WritingStyle = "house"): Promise<void> {
  try {
    // ── Pre-flight completeness check ────────────────────────────────────────
    // Fetch all required data upfront and block generation if anything is missing.
    // This prevents the LLM from fabricating psychometric data or producing a
    // report with large structural gaps.
    const [preProfile, preAchievements, preVia, preIpip] = await Promise.all([
      getClientProfileById(clientId),
      getAchievements(clientId),
      getViaResults(clientId),
      getIpipResults(clientId),
    ]);
    const missing: string[] = [];
    if (!preProfile?.firstName) missing.push("Client name not set");
    if (!preAchievements || preAchievements.length < 3)
      missing.push(`Life History: at least 3 achievements required (${preAchievements?.length ?? 0} recorded)`);
    if (!preVia?.rankedStrengths)
      missing.push("VIA Character Strengths survey not completed");
    if (!preIpip?.domainScores)
      missing.push("IPIP-NEO Personality assessment not completed");
    if (missing.length > 0) {
      const errorMsg = `Cannot generate WOW Report — the following required items are not yet complete:\n\n${missing.map(m => `• ${m}`).join("\n")}`;
      console.warn(`[WOW Report] Pre-flight check failed for client ${clientId}:`, missing);
      const existingForError = await getAnalysisReport(clientId);
      const baseForError = existingForError ?? { clientId, generatedAt: new Date() };
      await upsertAnalysisReport({
        ...baseForError,
        wowReportStatus: "error",
        wowReportError: errorMsg,
      } as Parameters<typeof upsertAnalysisReport>[0]);
      return;
    }
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
    const _traceRunId = crypto.randomUUID();
    const houseSections = await generateWowSections(clientId, reportType, "house", _traceRunId);
    // If Mark style is selected, run the post-processing rewrite stage
    const sections = writingStyle === "mark"
      ? await rewriteSectionsForMark(houseSections, houseSections.clientName)
      : writingStyle === "clive-james"
      ? await rewriteSectionsForCliveJames(houseSections, houseSections.clientName)
      : writingStyle === "michael-lewis"
      ? await rewriteSectionsForMichaelLewis(houseSections, houseSections.clientName)
      : writingStyle === "oliver-sacks"
      ? await rewriteSectionsForOliverSacks(houseSections, houseSections.clientName)
      : writingStyle === "william-zinsser"
      ? await rewriteSectionsForZinsser(houseSections, houseSections.clientName)
      : houseSections;
    // Render main WOW Report PDF
    console.log(`[WOW Report] Rendering PDF for client ${clientId}`);
    const pdfBuffer = await renderWowPdf(sections, writingStyle);
    console.log(`[WOW Report] PDF rendered, size: ${pdfBuffer.length} bytes`);
    // Render Annex PDF and merge
    let combinedBuffer = pdfBuffer;
    try {
      const { PDFDocument } = await import("pdf-lib");
      const [annexFamilyBg, annexCareer] = await Promise.all([
        getFamilyBackground(clientId),
        getCareerHistory(clientId),
      ]);
      const annexBuffer = await renderAnnexPdf(
        clientId,
        sections.clientFullName ?? sections.clientName,
        sections.viaRanked ?? [],
        sections.domainScores ?? {},
        sections.facetScores ?? {},
        annexFamilyBg,
        annexCareer,
      );
      console.log(`[WOW Report] Annex rendered, size: ${annexBuffer.length} bytes`);
      const mainDoc = await PDFDocument.load(pdfBuffer);
      const annexDoc = await PDFDocument.load(annexBuffer);
      const annexPageIndices = annexDoc.getPageIndices();
      const copiedPages = await mainDoc.copyPages(annexDoc, annexPageIndices);
      for (const page of copiedPages) mainDoc.addPage(page);
      const mergedBytes = await mainDoc.save();
      combinedBuffer = Buffer.from(mergedBytes);
      console.log(`[WOW Report] Merged PDF size: ${combinedBuffer.length} bytes`);
    } catch (annexErr) {
      console.warn(`[WOW Report] Annex generation failed (using main report only):`, annexErr);
    }
    // Upload to S3
    const fileKey = `wow-reports/client-${clientId}-${Date.now()}.pdf`;
    const { url: pdfUrl } = await storagePut(fileKey, combinedBuffer, "application/pdf");
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
      wowReportType: reportType,
      wowReportWritingStyle: writingStyle,
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
    .input(z.object({
      clientId: z.number(),
      forceRegenerate: z.boolean().optional().default(false),
      reportType: z.enum(["standard", "student", "career_changer", "job_returner", "retirement"]).optional().default("standard"),
      writingStyle: z.enum(["house", "mark", "clive-james", "michael-lewis", "oliver-sacks", "william-zinsser"]).optional().default("house"),
    }))
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
      void runGenerationJob(input.clientId, input.reportType as WowReportType, (input.writingStyle ?? "house") as WritingStyle);
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
      if (!report) return { exists: false, status: null, pdfUrl: null, generatedAt: null, sections: null, error: null, locked: false };
      const sections = (() => {
        try { return report.wowReportJson ? JSON.parse(report.wowReportJson) : null; }
        catch { return null; }
      })();
      return {
        // exists = true if we have JSON sections OR a PDF URL (JSON is the source of truth)
        exists: !!(report.wowReportJson || report.wowReportPdfUrl),
        status: (report as any).wowReportStatus ?? null,
        pdfUrl: report.wowReportPdfUrl ?? null,
        generatedAt: report.wowReportGeneratedAt ?? null,
        sections,
        error: (report as any).wowReportError ?? null,
        reportType: ((report as any).wowReportType ?? "standard") as WowReportType,
        writingStyle: ((report as any).wowReportWritingStyle ?? "house") as WritingStyle,
        locked: !!((report as any).wowReportLocked),
      };
    }),

  /** Re-render the PDF from stored JSON sections using a (possibly updated) writing style.
   *  Use this when the on-screen sections have changed style but the stored PDF is stale. */
  rebuildPdf: protectedProcedure
    .input(z.object({
      clientId: z.number(),
      writingStyle: z.enum(["house", "mark", "clive-james", "michael-lewis", "oliver-sacks", "william-zinsser"]).optional().default("house"),
    }))
    .mutation(async ({ input }) => {
      const report = await getAnalysisReport(input.clientId);
      if (!report || !report.wowReportJson) {
        throw new TRPCError({ code: "NOT_FOUND", message: "No stored report sections found — generate the report first." });
      }
      let sections: WowReportSections;
      try { sections = JSON.parse(report.wowReportJson); }
      catch { throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Stored report sections are corrupted." }); }
      const writingStyle = (input.writingStyle ?? "house") as WritingStyle;
      const pdfBuffer = await renderWowPdf(sections, writingStyle);
      // Merge annex (same as runGenerationJob)
      let combinedBuffer = pdfBuffer;
      try {
        const { PDFDocument } = await import("pdf-lib");
        const [annexFamilyBg, annexCareer] = await Promise.all([
          getFamilyBackground(input.clientId),
          getCareerHistory(input.clientId),
        ]);
        const annexBuffer = await renderAnnexPdf(
          input.clientId,
          sections.clientFullName ?? sections.clientName ?? "Client",
          sections.viaRanked ?? [],
          sections.domainScores ?? {},
          sections.facetScores ?? {},
          annexFamilyBg,
          annexCareer,
        );
        const mainDoc = await PDFDocument.load(pdfBuffer);
        const annexDoc = await PDFDocument.load(annexBuffer);
        const annexPageIndices = annexDoc.getPageIndices();
        const copiedPages = await mainDoc.copyPages(annexDoc, annexPageIndices);
        for (const page of copiedPages) mainDoc.addPage(page);
        const mergedBytes = await mainDoc.save();
        combinedBuffer = Buffer.from(mergedBytes);
        console.log(`[rebuildPdf] Annex merged, total pages: ${mainDoc.getPageCount()}`);
      } catch (annexErr) {
        console.warn(`[rebuildPdf] Annex generation failed (using main report only):`, annexErr);
      }
      const fileKey = `wow-reports/client-${input.clientId}-${Date.now()}.pdf`;
      const { url: pdfUrl } = await storagePut(fileKey, combinedBuffer, "application/pdf");
      // Update stored PDF URL and writing style via the standard upsert helper
      await upsertAnalysisReport({
        clientId: input.clientId,
        wowReportPdfUrl: pdfUrl,
        wowReportWritingStyle: writingStyle,
        generatedAt: new Date(),
      });
      return { pdfUrl, writingStyle };
    }),

  /** Set or clear the report lock for a client. */
  setLock: counselorProcedure
    .input(z.object({ clientId: z.number(), locked: z.boolean() }))
    .mutation(async ({ input }) => {
      await upsertAnalysisReport({
        clientId: input.clientId,
        wowReportLocked: input.locked,
        generatedAt: new Date(),
      });
      return { locked: input.locked };
    }),

  resetAllPdfUrls: protectedProcedure
    .use(({ ctx, next }: { ctx: any; next: any }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      return next({ ctx });
    })
    .mutation(async () => {
      const cleared = await clearAllWowPdfUrls();
      return { cleared };
    }),

  /** List all generation trace runs for a client (most recent first). */
  getTraceRuns: counselorProcedure
    .input(z.object({ clientId: z.number() }))
    .query(async ({ input }) => {
      return getReportGenerationRuns(input.clientId);
    }),

  /** Get all section logs for a specific trace run. */
  getTraceRun: counselorProcedure
    .input(z.object({ runId: z.string() }))
    .query(async ({ input }) => {
      return getReportGenerationLogsByRunId(input.runId);
    }),
});
