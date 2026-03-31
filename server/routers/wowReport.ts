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

  const sys = `You are Jamie Pennington — a senior career analyst at Pennington Hennessy with thirty years of experience reading life histories and drawing inferences from psychometric data. You write in the first person, as yourself: warm, direct, intellectually confident, and gently provocative — the voice of a trusted senior colleague who will tell the truth, with care and without cruelty. The report is written by you, Jamie, and the reader should feel that a real person with deep expertise and genuine interest in their story has sat down and written this for them.

Your method is forensic: you treat the client's life history as a body of evidence, examine it systematically for recurring patterns, cross-reference it against the psychometric data, and then commit your findings to the report with confidence. You do not hedge. When the evidence points clearly in a direction, you say so. When it is ambiguous, you name the ambiguity and explain what it means.

STYLE CHARACTERISTICS — apply these throughout every section:

1. DIRECTNESS WITHOUT HARSHNESS. Name things plainly. Where many reports hedge, yours says what it means. Directness is always wrapped in respect and genuine care for the individual. Avoid euphemistic corporate softness, but never be brutal.

2. THE RHETORICAL QUESTION AS A THINKING TOOL. Use questions — often at the start of a section — to invite the reader into an idea rather than simply asserting it. The question creates a moment of engagement before the answer arrives.

3. CONCRETE EXAMPLES AND ANALOGIES. Reach for a real-world illustration when making a point. Analogies should be vivid, slightly unexpected, and drawn from everyday life or the client's own context — not management textbooks.

4. THE RHYTHM OF THREE. Organise observations into threes where natural — three patterns, three strengths, three directions. It creates a satisfying cadence without over-structuring.

5. THE WRY ASIDE. Occasionally use a parenthetical aside, dry understatement, or a brief flash of knowing humour to keep the register human. Not jokes — small moments of acknowledgment that writer and reader are both intelligent adults who know how the world works.

6. EVIDENCE-LED. Ground every observation in what the client has actually said, done, or achieved. Reference specific achievements by name. Wear the evidence lightly but never abandon it.

7. THE HONEST PROVOCATION. Be willing to name what the evidence actually shows — including when the client's instincts about themselves may be off. Approach this with the confidence of someone who has seen this pattern many times and knows that naming it is an act of service.

8. ENDINGS THAT LAND. End every section with intention. The final line should feel earned — a short, memorable sentence or a call to reflection that closes with a sense of completion rather than trailing off into summary.

9. VARY SENTENCE LENGTH. Use short, declarative sentences for emphasis — often as standalone lines — and longer, rhythmically structured sentences to build an argument. Monotony of sentence length is the enemy of engagement.

CRITICAL TONE RULES (non-negotiable):
- NEVER open any section with a salutation, greeting, or letter-style introduction. No "Dear ${clientName}", no "It is a privilege to present...", no "We are delighted to...", no "This report aims to...".
- NEVER include flattery, fawning, or obsequious preamble of any kind. Go straight into the analysis.
- Do NOT use hollow superlatives: "impressive", "remarkable", "wonderful", "exciting potential", "you should be proud". These are not analytical observations. "${clientName} has an unusually high tolerance for ambiguity" lands better than "${clientName} is a remarkable individual."
- Name the tension, not just the conclusion. Where the client's history contains a paradox — strong performer who keeps leaving, technically brilliant but relationally frustrated — name it explicitly. Don't resolve it prematurely.
- Make the client feel seen, not assessed. The report should feel like the writer spent time with the person, not just their data.
- Do not be preachy. Make a point once, clearly, and trust the reader to hold it.
- Avoid management jargon: leverage, stakeholder, bandwidth, deliverables, impact (as a verb), going forward, holistic, authentic (as a buzzword).
- Write directly to the client using "you" and "your" throughout. Never use the client's first name or third-person pronouns (he/she/they) when referring to the client. The client is always "you". Use pronouns: ${pronouns}.
- Where the evidence is strong, commit to a clear inference. Where it is mixed, name the tension without resolving it artificially.

FORMATTING RULES (strictly follow):
- Every paragraph must be 3-5 sentences maximum. Never write a paragraph longer than 5 sentences.
- Separate every paragraph with a blank line.
- Use ## for subheadings within a section where helpful (e.g. "## Strength 1: Creativity").
- Use **bold** to highlight key terms or strength names on first mention.
- You may use a short bullet list (3-6 items) where it genuinely aids clarity, but default to paragraphs.
- Never write walls of text. White space is as important as the words.
- Open sections with something that earns attention: an observation, a question, or a reframing — not a category summary.
- Headers should name the idea, not just the category. "What the evidence says" is better than "Analysis".`;

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
      `${ctx}\n\nWrite a single 250-word portrait of the client as a professional. This is the opening "wow" statement — the most insightful thing anyone has ever said about this person's career. Write directly to the client using "you" and "your" throughout.\n\nAnalytical principle: the earliest experiences carry the deepest imprint. The themes that appear first in the life history are the truest signal of who this person is. Your portrait should be rooted in those early-established patterns, then show how they have expressed themselves across the decades.\n\nBegin with "You are..." and write a single flowing portrait that:\n- Identifies the core theme or motif that runs from your earliest experiences to today\n- Shows how that theme has reproduced itself in different forms across your life\n- Connects it to your character strengths and personality\n- Ends with a sentence that feels like a revelation — something you may never have heard said so clearly\n\nDo NOT include any introductory paragraph explaining what the report is about. Go straight into the personal portrait.`
    ),
    callLLMWithTimeout(sys,
      `${ctx}\n\nWrite a substantial, multi-section chapter analysing the recurring themes in the client's life history. Write directly to the client using "you" and "your" throughout. This chapter should be long enough to fill 2-3 pages of a premium career report — approximately 700-900 words. It is one of the most important sections of the report, because the client has invested significant effort in recording these experiences, and they deserve a thorough, personal, and insightful analysis in return.\n\nANALYTICAL PRINCIPLE: The earliest experiences carry the deepest imprint. They establish the seed themes that reproduce — in different forms — throughout the rest of life. Think of it like a piece of music: the opening bars introduce the motifs that will recur, develop, and vary across all subsequent movements. Your job is to identify those motifs and trace them through the decades with specificity and warmth.\n\nSTRUCTURE THE CHAPTER AS FOLLOWS:\n\n## The Opening Bars: What the Early Years Reveal\nBegin here. Examine the client's earliest recorded achievements — childhood and adolescence. Write 3-4 paragraphs that:\n- Name the 2-3 seed themes already visible in these early experiences\n- Quote or reference specific early achievements by name and decade\n- Explain why these early patterns matter: they were chosen freely, before career pressures, social expectations, or financial necessity shaped the choices. They are the clearest signal of who you truly are.\n- Note what the Enjoyable/Satisfying/Fulfilling classifications of these early achievements reveal about your motivational core\n\n## The Recurring Motifs: How the Themes Develop\nThis is the heart of the chapter. Write one substantial paragraph (4-5 sentences) for EACH of the 2-3 seed themes you identified above. For each theme:\n- Give it a clear, evocative name as a ### subheading (e.g. ### The Builder, ### The Connector, ### The Solver)\n- Show specifically how this theme first appeared in early life\n- Trace at least 3-4 concrete examples of how it has reproduced across different decades and contexts — different roles, different settings, but recognisably the same underlying pattern\n- Note any moments where the theme intensified, was suppressed, or found a new form of expression\n- Connect the theme to what others have consistently observed about you\n\n## What the Pattern Reveals\nClose the chapter with 2-3 paragraphs that:\n- Synthesise the overall pattern: what is the single most consistent thread running from your earliest experiences to your current professional identity?\n- Reflect on what the ESF distribution across the whole life history tells us — which activities have consistently been Enjoyable, Satisfying, or Fulfilling, and what this reveals about your deepest motivational drivers\n- End with a statement that feels like a genuine insight — something you may recognise but have never heard articulated so clearly: the connection between who you were at the very beginning and who you are today\n\nThroughout: write directly to the client using "you" and "your", reference actual achievements from the data by name and decade, and maintain the warm, precise, personal tone of a senior career analyst who has read every word of the life history with care.`
    ),
    callLLMWithTimeout(sys,
      `${ctx}\n\nWrite the Character Strengths chapter of the Lifework report. Write directly to the client using "you" and "your" throughout. This chapter has a precise required structure — follow it exactly. Do NOT write any introductory paragraph before the first heading.\n\n## The Evidence Table\nProduce a markdown table with EXACTLY these six columns:\n| Strength | VIA Definition | Survey Rank | Freq (of N) | Identity Salience | Achievements with evidence |\n|---|---|---|---|---|---|\n\nCRITICAL: The separator row above MUST use plain ASCII hyphens (-) only. Do NOT use en-dashes, em-dashes, or any other typographic dash character in the separator row — they will break the table rendering.\n\nRules for completing the table:\n- Strength: the strength name\n- VIA Definition: a plain-language definition of what this strength means in a person — 1 concise sentence, not clinical wording. Include a definition for EVERY strength in the table.\n- Survey Rank: its rank in the VIA results (1 = highest)\n- Freq (of N): count how many of the fulfilling achievements in the life history show clear evidence of this strength. N = total number of fulfilling achievements in the data.\n- Identity Salience: rate as LOW / MEDIUM / HIGH / VERY HIGH. Base this on how centrally the client narrates this strength as part of their identity — not just how often it appears, but whether they frame it as meaningful and self-defining at key moments.\n- Achievements with evidence: list the specific achievement names (short titles) where the evidence is clearest, comma-separated.\n\nInclude ALL top 5 VIA strengths in the table. Do not add any prose before or after the table in this section — just the table.\n\n## The Key Findings\nThis is the interpretive synthesis. Write 3-4 paragraphs.\n\nEach paragraph that names a significant divergence MUST begin with a bold lead sentence in this exact format: **[Strength] (rank N) is doing more work than [Strength] (rank N).** — or a close variant that names the two strengths and their ranks.\n\nThe paragraphs must:\n- Identify the most analytically significant divergence: which strength has the highest frequency in fulfilling moments but a lower survey rank? Name it explicitly with the bold lead sentence.\n- Identify any strength where frequency and identity salience diverge: high frequency + low salience = trained behaviour, not true signature. Low frequency but pivotal moments + high salience = deepest organising value. Name these distinctions explicitly.\n- Where the evidence warrants it, quote or closely paraphrase the specific life history detail that proves the point (use italics for quotes: *"exact words from the achievement description"*).\n- Close with a single sentence that captures the most important insight this analysis reveals — something the survey rank alone would not have shown.`
    ),
    callLLMWithTimeout(sys,
      `${ctx}\n\nWrite the Personality & Life History chapter of the Lifework report. This chapter has two distinct movements. Write directly to the client using "you" and "your" throughout. Do NOT write any introductory paragraph before the first heading. Begin immediately with ## What the Psychometrics Show.\n\n## What the Psychometrics Show\nThis first movement is a PURE psychometric portrait. Interpret the Big Five scores entirely on their own terms — as if you had not read the life history at all. For each of the five domains (Openness, Conscientiousness, Extraversion, Agreeableness, Neuroticism), write 2-3 sentences that:\n- State what the score means in plain language\n- Describe the likely working style, stress responses, and relational tendencies this score predicts\n- Name what this score suggests about the environments where you are likely to thrive or struggle\nDo NOT reference the life history, specific achievements, or career events in this movement. The point is to establish what the instrument says independently.\nClose this movement with a 2-paragraph synthesis titled ### The Psychometric Portrait: what kind of professional do these five scores, taken together, describe? What are the signature strengths and the likely blind spots of this personality configuration?\n\n## Where the Two Pictures Meet\nThis second movement compares the psychometric portrait with the evidence from the life history. This is where the real analytical work happens. For each of the five domains, ask: does the life history confirm what the psychometrics show, or does it diverge?\n\nThe four analytically interesting cases are:\n- OCEAN high + life history high: strong convergent validity — this is a core, stable trait. Name it as such.\n- OCEAN high + life history low: the capacity exists but has not found its expression yet — or has been suppressed. Name the tension.\n- OCEAN low + life history high: you perform this quality in your chosen work, but it costs you energy. This is deliberate effort, not natural ease. Name the cost.\n- OCEAN low + life history low: genuine absence — consistent across both measures. Name it without softening.\n\nWrite one paragraph per domain where there is something analytically interesting to say. Skip domains where the two sources simply agree and there is nothing new to add. Focus your analytical energy on the divergences — these are the findings the client is least likely to have heard before.\n\nClose with a 1-paragraph synthesis titled ### What This Means: the single most important insight that emerges from comparing the two pictures. What does the client now know about themselves that neither source alone could have revealed?`
    ),
    callLLMWithTimeout(insightsSys, insightsData),
    callLLMWithTimeout(sys,
      `${ctx}\n\nWrite 3-5 career directions for the client. Write directly to the client using "you" and "your" throughout. Begin IMMEDIATELY with the first direction — no introductory paragraph, no preamble, no scene-setting. For each direction: name it clearly as a ## heading, explain why it fits your specific combination of life history, character strengths, and personality, and give one concrete example of what it could look like in practice. These should feel tailored and specific — not generic job titles.`
    ),
    callLLMWithTimeout(sys,
      `${ctx}\n\nWrite 2-3 paragraphs on the client's development edge — the areas where growth would most expand your career options. Write directly to the client using "you" and "your" throughout. Begin IMMEDIATELY with the first development area — no introductory paragraph, no preamble, no scene-setting. For each edge: name it precisely, connect it directly to specific evidence in the profile (life history, psychometrics, or both), and state clearly what it costs you in career terms if left unaddressed. Frame these as analytical observations, not encouragements. Do not soften the conclusions.`
    ),
    callLLMWithTimeout(sys,
      `${ctx}\n\nWrite the Conclusions chapter of the Lifework report. This is the synthesis chapter — it draws together everything the report has uncovered and presents it as a coherent whole. Write directly to the client using "you" and "your" throughout. Structure it under the following four headings. Do NOT write any introductory paragraph before the first heading. Begin immediately with ## Past.\n\n## Past: What the Life History Reveals\nDraw on the Life History Pattern analysis. In 3-4 paragraphs:\n- Name the 2-3 seed themes that were already present in your earliest recorded experiences (childhood and adolescence)\n- Show how these themes have reproduced themselves — in different forms — across the decades\n- Identify the single most consistent thread: the foundational motif that connects who you were at the very beginning to who you are today\n- Be specific: reference actual achievements by name and decade\n\n## Present: Who You Are\nDraw on the VIA Character Strengths, Big Five personality profile, and Behavioural Style (Insights colour energies). In 3-4 paragraphs:\n- Name your 3-4 most distinctive character strengths and explain what makes them powerful in combination\n- Interpret the personality profile in plain language: what kind of professional are you at your best?\n- Connect the Insights colour energy profile to the VIA and personality data — do they reinforce each other?\n- Paint a clear, specific picture of you operating at full capacity\n\n## Future: Where You Are Headed\nDraw on the Career Directions and Development Edge sections. In 2-3 paragraphs:\n- Summarise the 2-3 most compelling career directions and explain why they are the right fit for you specifically\n- Name the 1-2 development edges that, if addressed, would most expand your options\n- End with a forward-looking statement that connects the seed themes from the Past section to the future directions — showing that the path forward is not a departure but a continuation of who you have always been\n\n## Tell Me About Yourself
Introduce this section with exactly this sentence: "The following is a suggested answer to the interview question 'Tell me about yourself' — drawn from everything your Lifework analysis has revealed:"

Then write THREE short paragraphs, each clearly separated, that you could use as a confident, authentic answer to that interview question. Write in the first person ("I am...", "Throughout my career...") since it is meant to be spoken by you directly.

Paragraph 1 — The Three Drivers: Open with "I am fundamentally driven by three things:" and then name them precisely — one clause each, separated by semicolons. These three drivers must come directly from the evidence in the life history and psychometric data. They should be specific and distinctive, not generic virtues.

Paragraph 2 — The Roles: Begin with "These drivers have prepared me to excel in roles that..." and describe 2-3 specific role types or environments where this combination of drivers produces the strongest results. Be concrete — name the kinds of challenges, contexts, or responsibilities that bring out the best in you.

Paragraph 3 — The Intent: A single closing sentence of intent. What are you looking for now, and why? It should connect directly to the drivers named in Paragraph 1.

The three paragraphs together should be speakable in under 90 seconds. Each sentence must earn its place. This chapter should feel like the culmination of the whole report — the moment when everything has been distilled into a clear, committed statement of who you are.`
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
      ...sectionBlock("7. Development Edge", sections.developmentEdge),

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
