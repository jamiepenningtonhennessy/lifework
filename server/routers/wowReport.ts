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
import { getOrGenerateCanonicalStage1 } from "./canonicalStage1";
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
    const raw = data.choices[0]?.message?.content ?? "";
    return sanitiseMarkdownTables(raw);
  } finally {
    clearTimeout(timer);
  }
}

// ─── Report type variants ────────────────────────────────────────────────────

export type WowReportType = "standard" | "student" | "career_changer" | "job_returner" | "retirement";

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
      directions: `${ctx}\n\nWrite the Career Directions chapter for a client who is at the START of their career — this is their first serious career decision. Write directly to the client using "you" and "your" throughout. Begin IMMEDIATELY with the first direction — no introductory paragraph, no preamble.\n\nWrite 3 career directions. For each:\n- Name it as a ## heading (e.g. ## Strategy and Policy Work in the Public Sector)\n- Write 2 short paragraphs (4-5 lines each):\n  - Paragraph 1: Why this direction fits your specific combination of life history, character strengths, and personality — even though your formal career is just beginning. Reference what you have already shown in education, voluntary work, sports, or early experiences.\n  - Paragraph 2: What it could look like in practice. Name 2-3 concrete entry-level roles or graduate pathways. Be specific about how to get started.\n\nThese should feel tailored and specific — not generic job titles. Each direction should be grounded in what this person has already demonstrated, not in abstract potential.\n\nClose with: "From what you have told us, we can see:" followed by 3 tight bullets naming the key career fit factors.`,

      edge: `${ctx}\n\nWrite the Development Edge chapter for a client at the START of their career. Write directly to the client using "you" and "your" throughout. Begin IMMEDIATELY with the first development area — no introductory paragraph.\n\nWrite 2-3 development edges. For each:\n- Name it precisely as a ## heading (e.g. ## Building Credibility Before You Have a Track Record)\n- Write 2 short paragraphs (4-5 lines each):\n  - Paragraph 1: What the evidence already shows about this pattern — from education, early experiences, or psychometric data.\n  - Paragraph 2: Why this matters specifically at the start of a career, and what to do about it in the first 2-3 years.\n\nFrame these as practical early-career guidance, not criticism. The goal is to help the client build the right habits before they become entrenched.\n\nClose with: "From what you have told us, we can see:" followed by 2-3 tight bullets naming the core development priorities for the first career stage.`,

      conclusions: `${ctx}\n\nWrite the Conclusions chapter for a client who is at the START of their career. Write directly to the client using "you" and "your" throughout. Do NOT write any introductory paragraph. Begin immediately with ## Past.\n\n## Past\n2 short paragraphs (4-5 lines each):\n- Name the 2-3 seed themes already visible in education, childhood, and early experiences\n- Show how these themes already point toward a distinctive professional identity — even before a formal career has begun\n\n## Present\n2 short paragraphs (4-5 lines each):\n- Name the 3 most distinctive character strengths and what makes them powerful in combination\n- State plainly what kind of professional you are already becoming, drawing on personality profile and behavioural style\n\n## Future\n2 short paragraphs (4-5 lines each):\n- Name the 2-3 most compelling career directions and why they fit specifically\n- Name the 1-2 development priorities for the first 3 years that will most accelerate your trajectory\n- End with a forward-looking statement: what does success look like at the end of the first decade?\n\n## Tell Me About Yourself\nIntroduce with exactly this sentence: "The following is a suggested answer to the interview question 'Tell me about yourself' — drawn from everything your Lifework analysis has revealed:"\n\nThen write THREE short paragraphs in the first person (to be spoken by the client):\n\nParagraph 1: Open with "I am fundamentally driven by three things:" then name them precisely — one clause each, separated by semicolons. These must come directly from the evidence.\n\nParagraph 2: Begin with "Even at this early stage, I have already shown..." and name 2-3 specific demonstrated capabilities from the life history.\n\nParagraph 3: A single closing sentence of intent. What kind of career are you building, and why?\n\nThe three paragraphs together should be speakable in under 90 seconds.`,
    },

    career_changer: {
      directions: `${ctx}\n\nWrite the Career Directions chapter for a client who is CHANGING CAREER — moving away from a field where they have lost satisfaction or confidence. Write directly to the client using "you" and "your" throughout. Begin IMMEDIATELY with the first direction — no introductory paragraph, no preamble.\n\nWrite 3 career directions. For each:\n- Name it as a ## heading (e.g. ## Leadership Roles in Mission-Driven Organisations)\n- Write 2 short paragraphs (4-5 lines each):\n  - Paragraph 1: Why this direction fits your specific combination of life history, character strengths, and personality — and why it represents a genuine step toward what you are actually built for, not just an escape from what you are leaving.\n  - Paragraph 2: What it could look like in practice. Name 2-3 concrete role types or sectors. Name the transferable skills from your existing career that give you a real advantage here.\n\nBe direct about the transition: acknowledge what the client is leaving behind and why the new direction is a better fit — not just a change of scenery.\n\nClose with: "From what you have told us, we can see:" followed by 3 tight bullets naming the key career fit factors and the strongest transferable assets.`,

      edge: `${ctx}\n\nWrite the Development Edge chapter for a client who is CHANGING CAREER. Write directly to the client using "you" and "your" throughout. Begin IMMEDIATELY with the first development area — no introductory paragraph.\n\nWrite 2-3 development edges. For each:\n- Name it precisely as a ## heading (e.g. ## The Credibility Gap in a New Field)\n- Write 2 short paragraphs (4-5 lines each):\n  - Paragraph 1: What the evidence shows about this pattern — from the life history, psychometric data, or the pattern of dissatisfaction in the current career.\n  - Paragraph 2: What it costs during a career transition if left unaddressed, and what to do about it specifically.\n\nAt least one edge should address the psychological challenge of transition itself — the identity shift, the temporary loss of status, or the risk of choosing safety over fit.\n\nClose with: "From what you have told us, we can see:" followed by 2-3 tight bullets naming the core development priorities for the transition period.`,

      conclusions: `${ctx}\n\nWrite the Conclusions chapter for a client who is CHANGING CAREER. Write directly to the client using "you" and "your" throughout. Do NOT write any introductory paragraph. Begin immediately with ## Past.\n\n## Past\n2 short paragraphs (4-5 lines each):\n- Name the 2-3 seed themes visible from the earliest experiences\n- Identify the moment or pattern where the current career began to diverge from those themes — when did the work stop fitting the person?\n\n## Present\n2 short paragraphs (4-5 lines each):\n- Name the 3 most distinctive character strengths and what makes them powerful in combination\n- State plainly what kind of professional you are at your best — and contrast this with what the current career has been asking of you\n\n## Future\n2 short paragraphs (4-5 lines each):\n- Name the 2-3 most compelling new directions and why they fit specifically\n- Name the 1-2 development edges that, if addressed, will most accelerate the transition\n- End with a forward-looking statement: what does the right career feel like, and why is this the right moment to move?\n\n## Tell Me About Yourself\nIntroduce with exactly this sentence: "The following is a suggested answer to the interview question 'Tell me about yourself' — drawn from everything your Lifework analysis has revealed:"\n\nThen write THREE short paragraphs in the first person (to be spoken by the client):\n\nParagraph 1: Open with "I am fundamentally driven by three things:" then name them precisely — one clause each, separated by semicolons. These must come directly from the evidence.\n\nParagraph 2: Begin with "My career to date has given me..." and name 2-3 specific transferable capabilities. Then: "But what I am moving toward is..." and name the new direction in one sentence.\n\nParagraph 3: A single closing sentence of intent. Why now, and what are you looking for?\n\nThe three paragraphs together should be speakable in under 90 seconds.`,
    },

    job_returner: {
      directions: `${ctx}\n\nWrite the Career Directions chapter for a client who is RETURNING TO WORK after a career break. Write directly to the client using "you" and "your" throughout. Begin IMMEDIATELY with the first direction — no introductory paragraph, no preamble.\n\nWrite 3 career directions. For each:\n- Name it as a ## heading (e.g. ## Senior Advisory and Consultancy Roles)\n- Write 2 short paragraphs (4-5 lines each):\n  - Paragraph 1: Why this direction fits your specific combination of life history, character strengths, and personality — and why the career break, far from being a gap, may have added something. Be specific.\n  - Paragraph 2: What it could look like in practice. Name 2-3 concrete role types or re-entry pathways. Name the skills and experience that remain fully current and relevant.\n\nAcknowledge the reality of returning: some things will need updating, some things will be stronger than ever. Be honest about both.\n\nClose with: "From what you have told us, we can see:" followed by 3 tight bullets naming the key career fit factors and the strongest assets the client brings back.`,

      edge: `${ctx}\n\nWrite the Development Edge chapter for a client who is RETURNING TO WORK after a career break. Write directly to the client using "you" and "your" throughout. Begin IMMEDIATELY with the first development area — no introductory paragraph.\n\nWrite 2-3 development edges. For each:\n- Name it precisely as a ## heading (e.g. ## Rebuilding Professional Confidence)\n- Write 2 short paragraphs (4-5 lines each):\n  - Paragraph 1: What the evidence shows about this pattern — from the life history, psychometric data, or the specific challenges of returning after time away.\n  - Paragraph 2: What it costs if left unaddressed during re-entry, and what to do about it specifically.\n\nAt least one edge should address the confidence and self-perception challenges that often accompany a return to work — without being patronising. Name the specific pattern this person is likely to face.\n\nClose with: "From what you have told us, we can see:" followed by 2-3 tight bullets naming the core development priorities for the return period.`,

      conclusions: `${ctx}\n\nWrite the Conclusions chapter for a client who is RETURNING TO WORK after a career break. Write directly to the client using "you" and "your" throughout. Do NOT write any introductory paragraph. Begin immediately with ## Past.\n\n## Past\n2 short paragraphs (4-5 lines each):\n- Name the 2-3 seed themes visible from the earliest experiences and through the career before the break\n- Identify what the career break has added — what has been learned, developed, or clarified during the time away\n\n## Present\n2 short paragraphs (4-5 lines each):\n- Name the 3 most distinctive character strengths and what makes them powerful in combination\n- State plainly what kind of professional you are at your best — and what remains fully intact after the break\n\n## Future\n2 short paragraphs (4-5 lines each):\n- Name the 2-3 most compelling directions for re-entry and why they fit specifically\n- Name the 1-2 development priorities that will most accelerate the return\n- End with a forward-looking statement: what does a successful return look like, and what does it make possible?\n\n## Tell Me About Yourself\nIntroduce with exactly this sentence: "The following is a suggested answer to the interview question 'Tell me about yourself' — drawn from everything your Lifework analysis has revealed:"\n\nThen write THREE short paragraphs in the first person (to be spoken by the client):\n\nParagraph 1: Open with "I am fundamentally driven by three things:" then name them precisely — one clause each, separated by semicolons. These must come directly from the evidence.\n\nParagraph 2: Begin with "Before my career break, I built a track record in..." and name 2-3 specific capabilities. Then: "During that time, I also..." and name one thing the break added.\n\nParagraph 3: A single closing sentence of intent. What are you returning to do, and why now?\n\nThe three paragraphs together should be speakable in under 90 seconds.`,
    },

    retirement: {
      directions: `${ctx}\n\nWrite the Career Directions chapter for a client who is PLANNING FOR RETIREMENT — this chapter is titled "What To Do With What You Know" and focuses on how to deploy a lifetime of accumulated capability in the next chapter of life. Write directly to the client using "you" and "your" throughout. Begin IMMEDIATELY with the first direction — no introductory paragraph, no preamble.\n\nWrite 3 directions for this next chapter. For each:\n- Name it as a ## heading (e.g. ## Board and Advisory Roles, ## Mentoring and Teaching, ## Portfolio Work and Consultancy)\n- Write 2 short paragraphs (4-5 lines each):\n  - Paragraph 1: Why this direction is a natural expression of the client's deepest strengths and values — grounded in specific life history evidence. Not what they have done, but what they are built for.\n  - Paragraph 2: What it could look like in practice. Name 2-3 concrete forms this could take. Be specific about how to begin.\n\nThese directions should feel like a genuine next chapter — not a wind-down, not a hobby list, but a purposeful deployment of everything this person has become.\n\nClose with: "From what you have told us, we can see:" followed by 3 tight bullets naming the key fit factors for this next chapter.`,

      edge: `${ctx}\n\nWrite the Development Edge chapter for a client who is PLANNING FOR RETIREMENT. Reframe this chapter as "What To Watch" — the patterns and tendencies that, if unexamined, could limit the quality of the next chapter. Write directly to the client using "you" and "your" throughout. Begin IMMEDIATELY with the first area — no introductory paragraph.\n\nWrite 2-3 areas to watch. For each:\n- Name it precisely as a ## heading (e.g. ## The Risk of Losing Structure, ## Giving Without Receiving, ## Staying Relevant Without Needing to Be Central)\n- Write 2 short paragraphs (4-5 lines each):\n  - Paragraph 1: What the evidence shows about this pattern — from the life history, psychometric data, or the specific challenges of the transition from full-time work.\n  - Paragraph 2: What it costs in the retirement chapter if left unexamined, and what to do about it specifically.\n\nFrame these as wisdom, not criticism. The goal is to help the client enter this chapter with clear eyes.\n\nClose with: "From what you have told us, we can see:" followed by 2-3 tight bullets naming the key things to watch in this transition.`,

      conclusions: `${ctx}\n\nWrite the Conclusions chapter for a client who is PLANNING FOR RETIREMENT. The frame for this chapter is: what has a life of work revealed about who this person is, and what does that mean for the next chapter? Write directly to the client using "you" and "your" throughout. Do NOT write any introductory paragraph. Begin immediately with ## Past.\n\n## Past\n2 short paragraphs (4-5 lines each):\n- Name the 2-3 seed themes present from the earliest recorded experiences\n- Show how these themes have reproduced and deepened across the decades. What has a lifetime of work confirmed about who you are?\n\n## Present\n2 short paragraphs (4-5 lines each):\n- Name the 3 most distinctive character strengths and what makes them powerful in combination\n- State plainly what kind of person you are at your best — not just as a professional, but as a human being. What do you bring to any room you enter?\n\n## Future\n2 short paragraphs (4-5 lines each):\n- Name the 2-3 most compelling directions for the next chapter and why they fit specifically\n- Name the 1-2 things to watch that, if addressed, will make the transition richer\n- End with a forward-looking statement: what does a life well-lived look like from here, and what does this next chapter make possible?\n\n## Tell Me About Yourself\nIntroduce with exactly this sentence: "The following is a suggested answer to the question 'What are you doing now?' — drawn from everything your Lifework analysis has revealed:"\n\nThen write THREE short paragraphs in the first person (to be spoken by the client):\n\nParagraph 1: Open with "I have spent my career driven by three things:" then name them precisely — one clause each, separated by semicolons. These must come directly from the evidence.\n\nParagraph 2: Begin with "That career has given me..." and name 2-3 specific capabilities or insights that are now available to deploy differently. Then: "What I am doing now is..." and name the next chapter in one sentence.\n\nParagraph 3: A single closing sentence of purpose. Not what you are leaving, but what you are moving toward.\n\nThe three paragraphs together should be speakable in under 90 seconds.`,
    },
  };

  const v = variantInstructions[type];
  return {
    careerDirectionsPrompt: v.directions || null,
    developmentEdgePrompt: v.edge || null,
    conclusionsPrompt: v.conclusions || null,
  };
}

async function generateWowSections(clientId: number, reportType: WowReportType = "standard"): Promise<WowReportSections> {
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

  const insightsData = Object.keys(domainScores).length > 0
    ? `Primary colour energy: ${primaryColour}\nSecondary colour energy: ${secondaryColour}\nJungian type approximation: ${jungianType}\nExtraversion: ${eScore}/100\nAgreeableness: ${aScore}/100\nOpenness: ${oScore}/100\nConscientiousness: ${cScore}/100`
    : "IPIP-NEO data not available — Insights profile cannot be generated.";

  console.log(`[WOW Report] Starting generation for client ${clientId}`);
  // Step 1: Get (or generate) the canonical life history analysis — single source of truth
  const lifeHistoryPattern = await getOrGenerateCanonicalStage1(clientId);
  console.log(`[WOW Report] Canonical Stage 1 ready for client ${clientId}`);
  // Step 2: Run remaining 7 sections in parallel — each with its own 90s timeout
  const [
    summary,
    viaSection,
    personalitySection,
    behaviouralStyle,
    careerDirections,
    developmentEdge,
    coachingQuestions,
  ] = await Promise.all([
    callLLMWithTimeout(sys,
      `${ctx}\n\nWrite the Lifework Summary — the opening portrait of this client. This is the most important paragraph in the report: the first thing they read, and the statement that should make them feel immediately and precisely seen.\n\nSTRUCTURE:\n\nParagraph 1 (4-5 lines): Begin with "You are..." and write a single direct, evidence-grounded portrait. Name the core theme that runs from the earliest experiences to today. Reference 2-3 specific achievements or moments from the life history. Name the 2-3 character strengths that are most active in the evidence. End with a sentence that captures the single most distinctive thing about this person as a professional.\n\nThen write: "From what you have told us, we can see:"\n\nThen 5-6 tight bullet points, each one a specific, evidence-grounded observation about this person's pattern, motivation, or working style. Each bullet should be one complete sentence. No generalities — every bullet should be something that could only be written about this specific person.\n\nDo NOT include any introductory paragraph. Begin immediately with "You are...". Do NOT use hollow superlatives. Do NOT write more than one opening paragraph before the bullets.`
    ),
    callLLMWithTimeout(sys,
      `${ctx}\n\nWrite the Character Strengths chapter of the Lifework report. Write directly to the client using "you" and "your" throughout. Do NOT write any introductory paragraph before the first heading.\n\n## The Evidence Table\nProduce a markdown table with EXACTLY these six columns:\n| Strength | VIA Definition | Survey Rank | Freq (of N) | Identity Salience | Achievements with evidence |\n|---|---|---|---|---|---|\n\nCRITICAL: The separator row MUST use plain ASCII hyphens (-) only. No en-dashes, em-dashes, or other typographic characters in the separator row.\n\nRules:\n- Strength: the strength name\n- VIA Definition: a plain-language definition — 1 concise sentence, not clinical wording\n- Survey Rank: its rank in the VIA results (1 = highest)\n- Freq (of N): count of fulfilling achievements in the life history showing clear evidence of this strength\n- Identity Salience: LOW / MEDIUM / HIGH / VERY HIGH based on how centrally the client narrates this strength\n- Achievements with evidence: specific achievement names where the evidence is clearest, comma-separated\n\nInclude ALL top 5 VIA strengths. No prose before or after the table in this section.\n\n## The Key Findings\nWrite 3 short paragraphs (4-5 lines each). Each paragraph that names a divergence MUST begin with a bold lead sentence: **[Strength] (rank N) is doing more work than [Strength] (rank N).**\n\nThe paragraphs must:\n- Name the most analytically significant divergence: which strength has the highest frequency in fulfilling moments but a lower survey rank?\n- Identify any strength where frequency and identity salience diverge: high frequency + low salience = trained behaviour. Low frequency but pivotal moments + high salience = deepest organising value.\n- Where the evidence warrants it, quote the specific life history detail that proves the point (use italics: *"exact words"*).\n\nClose with: "From what you have told us, we can see:" followed by 3-4 tight bullets naming the key strength findings.\n\nFinal line: one sentence that captures the most important insight this analysis reveals — something the survey rank alone would not have shown.`
    ),
    callLLMWithTimeout(sys,
      `${ctx}\n\nWrite the Personality Profile chapter of the Lifework report. Write directly to the client using "you" and "your" throughout. Do NOT write any introductory paragraph before the first heading. Begin immediately with ## What the Psychometrics Show.\n\n## What the Psychometrics Show\nA PURE psychometric portrait. Interpret the Big Five scores on their own terms — as if you had not read the life history. For each of the five domains (Openness, Conscientiousness, Extraversion, Agreeableness, Neuroticism), write 2 sentences that:\n- State what the score means in plain language\n- Name what this score predicts about working style, stress responses, and environments where you thrive or struggle\n\nDo NOT reference the life history in this section.\n\nClose with: "From what you have told us, we can see:" followed by 3-4 tight bullets summarising the psychometric portrait.\n\n## Where the Two Pictures Meet\nCompare the psychometric portrait with the life history evidence. For each domain where there is a divergence, write one short paragraph (4-5 lines) that:\n- Names the divergence type: high score + low life history evidence (capacity not yet expressed), or low score + high life history evidence (deliberate effort, not natural ease)\n- States plainly what this means in career terms\n\nSkip domains where the two sources simply agree. Focus on divergences.\n\n## What This Means\nOne short paragraph (4-5 lines): the single most important insight that emerges from comparing the two pictures. What does the client now know about themselves that neither source alone could have revealed?`
    ),
    callLLMWithTimeout(insightsSys, insightsData),
(() => {
      const { careerDirectionsPrompt } = getVariantPrompts(reportType, ctx, sys);
      return callLLMWithTimeout(sys,
        careerDirectionsPrompt ??
        `${ctx}\n\nWrite the Career Directions chapter. Write directly to the client using "you" and "your" throughout. Begin IMMEDIATELY with the first direction — no introductory paragraph, no preamble.\n\nWrite 3 career directions. For each:\n- Name it as a ## heading (e.g. ## Strategic Leadership in Complex Organisations)\n- Write 2 short paragraphs (4-5 lines each):\n  - Paragraph 1: Why this direction fits your specific combination of life history, character strengths, and personality. Name specific evidence.\n  - Paragraph 2: What it could look like in practice. Name 2-3 concrete role types or environments.\n\nThese should feel tailored and specific — not generic job titles. Each direction should be something that could only be written for this person.\n\nClose with: "From what you have told us, we can see:" followed by 3 tight bullets naming the key career fit factors.`
      );
    })(),
    (() => {
      const { developmentEdgePrompt } = getVariantPrompts(reportType, ctx, sys);
      return callLLMWithTimeout(sys,
        developmentEdgePrompt ??
        `${ctx}\n\nWrite the Development Edge chapter. Write directly to the client using "you" and "your" throughout. Begin IMMEDIATELY with the first development area — no introductory paragraph.\n\nWrite 2-3 development edges. For each:\n- Name it precisely as a ## heading (e.g. ## The Visibility Gap)\n- Write 2 short paragraphs (4-5 lines each):\n  - Paragraph 1: What the evidence shows. Connect it directly to specific life history moments, psychometric scores, or both.\n  - Paragraph 2: What it costs in career terms if left unaddressed. Be direct. Do not soften.\n\nFrame these as analytical observations, not encouragements. The goal is to name the gap clearly enough that the client recognises it and understands why it matters.\n\nClose with: "From what you have told us, we can see:" followed by 2-3 tight bullets naming the core development findings.`
      );
    })(),
    (() => {
      const { conclusionsPrompt } = getVariantPrompts(reportType, ctx, sys);
      return callLLMWithTimeout(sys,
        conclusionsPrompt ??
        `${ctx}\n\nWrite the Conclusions chapter. This is the synthesis chapter — it draws together everything the report has uncovered. Write directly to the client using "you" and "your" throughout. Do NOT write any introductory paragraph. Begin immediately with ## Past.\n\n## Past\n2 short paragraphs (4-5 lines each):\n- Name the 2-3 seed themes present in the earliest recorded experiences\n- Show how these themes have reproduced across the decades. Reference specific achievements by name.\n- Identify the single most consistent thread from earliest experiences to today\n\n## Present\n2 short paragraphs (4-5 lines each):\n- Name the 3 most distinctive character strengths and what makes them powerful in combination\n- State plainly what kind of professional you are at your best, drawing on personality profile and behavioural style\n\n## Future\n2 short paragraphs (4-5 lines each):\n- Name the 2-3 most compelling career directions and why they fit specifically\n- Name the 1-2 development edges that, if addressed, would most expand your options\n- End with a forward-looking statement connecting the seed themes from Past to the future directions\n\n## Tell Me About Yourself\nIntroduce with exactly this sentence: "The following is a suggested answer to the interview question 'Tell me about yourself' — drawn from everything your Lifework analysis has revealed:"\n\nThen write THREE short paragraphs in the first person (to be spoken by the client):\n\nParagraph 1: Open with "I am fundamentally driven by three things:" then name them precisely — one clause each, separated by semicolons. These must come directly from the evidence. Specific and distinctive, not generic virtues.\n\nParagraph 2: Begin with "These drivers have prepared me to excel in roles that..." and describe 2-3 specific role types or environments. Be concrete.\n\nParagraph 3: A single closing sentence of intent. What are you looking for now, and why?\n\nThe three paragraphs together should be speakable in under 90 seconds. Each sentence must earn its place.`
      );
    })(),
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
    reportType,
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
        text: "It\u2019s me \u2013 Jamie \u2013 the creator of the Lifework process \u2013 writing this cover note, not the very clever AI Sage. (She would probably write it better than me. Not that I\u2019m jealous)",
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
          "If you\u2019re naturally impatient it\u2019s OK to start with Chapter 8 \u2013 Conclusions. It\u2019s here we summarise what we believe to be true, and give you a suggested reply to that dreaded interview question \u201cSo, tell me about yourself\u201d.",
          "If you\u2019re more patient, the report builds your analysis from your early years life history, step-by-step, so you can see how the analysis unfolds.",
        ],
        font: "Roboto",
        fontSize: 11,
        color: DARK_GREY,
        lineHeight: 1.6,
        margin: [0, 0, 0, 14] as [number, number, number, number],
      },
      {
        text: "One really important thing. Your report is the basis for reflecting, thinking and discussing. It\u2019s built on the information you told us and the psychometric instruments that you engaged with. It\u2019s therefore OK to disagree with anything we\u2019ve written. Sage may be able to help you unpack why we believe it to be true, but you remain the expert on you. If you \u2013 plus your friends and colleagues (always worth checking in with) \u2013 see something we\u2019ve missed, Great. The overall aim is to help you know you, in the context of \u201cwhat\u2019s next?\u201d",
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

      // ── Section 3: VIA Character Strengths ──
      { text: "", pageBreak: "before" },
      heading("3. Character Strengths"),
      divider(),
      // VIA framework overview
      para("The VIA Character Strengths framework set out to create a rigorous, empirically grounded classification of what is best in people. The result was the VIA Classification of Character Strengths and Virtues, identifying 24 strengths organised under six broad virtues: Wisdom, Courage, Humanity, Justice, Temperance, and Transcendence."),
      para("Underpinning the framework is a simple but profound conviction: that understanding and deploying what is genuinely strong in us is at least as important to human flourishing as addressing what is broken."),
      para("Central to the practical application of VIA is the concept of signature strengths — those top strengths that feel most authentically and energetically you. Research suggests that signature strengths are not simply what you do well, but what you are drawn to use, what gives you a sense of vitality when expressed, and what others tend to recognise in you over time."),
      para("When people find ways to deploy their signature strengths in their work and relationships, studies consistently show improvements in wellbeing, engagement, and resilience. The invitation in what follows is not to treat your results as a fixed label, but as a lens — a starting point for reflection on where you are already thriving, and where deliberate attention to your strengths might open new possibilities."),
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
      heading("4. Personality Profile"),
      divider(),
      // Big Five / OCEAN framework overview
      para("The five-factor model of personality — often referred to as the \"Big Five\" — represents one of the most robust and extensively replicated findings in psychological science. Emerging from decades of factor-analytic research across cultures and languages, it identifies five broad dimensions that reliably capture the core architecture of human personality: Openness to Experience, Conscientiousness, Extraversion, Agreeableness, and Neuroticism (sometimes reframed as Emotional Stability)."),
      para("Unlike some psychological assessments that assign people to fixed types or categories, the Big Five measures traits as dimensions — continuous spectrums on which each of us sits at a particular point, shaped by both temperament and life experience. There are no good or bad scores. A high score on Conscientiousness and a low one tell us something meaningfully different about how a person operates, but neither is inherently preferable — context, role, and self-awareness matter far more than position on any single scale."),
      para("What the profile offers is a coherent, evidence-based picture of your characteristic tendencies: how you typically engage with ideas, with other people, with structure, and with emotional experience. Used well, it is less a verdict and more a vocabulary — a way of naming patterns you may already have sensed, and exploring what they mean for how you work and lead."),
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

      // ── Section 6: Career Directions (variant-aware title) ──
      ...sectionBlock(
        sections.reportType === "retirement" ? "6. What To Do With What You Know"
          : sections.reportType === "student" ? "6. Where You Are Headed"
          : sections.reportType === "job_returner" ? "6. What You Bring Back"
          : "6. Career Directions",
        sections.careerDirections
      ),

      // ── Section 7: Development Edge (variant-aware title) ──
      ...sectionBlock(
        sections.reportType === "retirement" ? "7. What To Watch"
          : sections.reportType === "student" ? "7. What To Build First"
          : sections.reportType === "job_returner" ? "7. What To Rebuild"
          : "7. Development Edge",
        sections.developmentEdge
      ),

      // ── Section 8: Conclusions ──
      { text: "", pageBreak: "before" },
      heading("8. Conclusions"),
      divider(),
      ...markdownToPdfContent(sections.coachingQuestions),

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
          return `This report is the ${currentLabel}. The Lifework WOW Report is produced in four variants, each calibrated to a different life stage and set of questions. Chapters 1–5 (Summary, Life History, Character Strengths, Personality Profile, and Behavioural Style) are substantially the same across all four variants — the data does not change. Chapters 6, 7, and 8 (Directions, Development Edge, and Conclusions) are rewritten for each variant to address the specific questions and challenges of that life stage.`;
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

// ─── Background Job ─────────────────────────────────────────────────────────
// v2: retirement variant prompts active — section titles and content are now variant-aware

async function runGenerationJob(clientId: number, reportType: WowReportType = "standard"): Promise<void> {
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
    const sections = await generateWowSections(clientId, reportType);
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
      wowReportType: reportType,
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
      void runGenerationJob(input.clientId, input.reportType as WowReportType);
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
        reportType: ((report as any).wowReportType ?? "standard") as WowReportType,
      };
    }),
});
