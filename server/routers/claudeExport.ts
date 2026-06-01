/**
 * claudeExport.ts
 *
 * Exports a client's full WOW report data as a JSON payload shaped to
 * Claude's handoff schema (handoff/data.example.json).
 *
 * The export is a tRPC query that returns the JSON object.
 * An Express download route at /api/claude-export/:clientId serves it as
 * a downloadable .json file.
 *
 * Schema reference: https://github.com/jamiepenningtonhennessy/lifework/tree/report-template/handoff
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../_core/trpc.js";
import { invokeLLM } from "../_core/llm.js";
import {
  getClientProfileById,
  getAchievements,
  getFamilyBackground,
  getEducationHistory,
  getCareerHistory,
  getViaResults,
  getIpipResults,
  getAnalysisReport,
} from "../db.js";

// ─── Facet name map (matches wowReport.ts) ───────────────────────────────────

const FACET_NAMES: Record<string, { name: string; domain: string }> = {
  N1: { name: "Anxiety",              domain: "N" }, N2: { name: "Anger",                domain: "N" },
  N3: { name: "Depression",           domain: "N" }, N4: { name: "Self-Consciousness",   domain: "N" },
  N5: { name: "Immoderation",         domain: "N" }, N6: { name: "Vulnerability",        domain: "N" },
  E1: { name: "Friendliness",         domain: "E" }, E2: { name: "Gregariousness",       domain: "E" },
  E3: { name: "Assertiveness",        domain: "E" }, E4: { name: "Activity Level",       domain: "E" },
  E5: { name: "Excitement-Seeking",   domain: "E" }, E6: { name: "Cheerfulness",         domain: "E" },
  O1: { name: "Imagination",          domain: "O" }, O2: { name: "Artistic Interests",   domain: "O" },
  O3: { name: "Emotionality",         domain: "O" }, O4: { name: "Adventurousness",      domain: "O" },
  O5: { name: "Intellect",            domain: "O" }, O6: { name: "Liberalism",           domain: "O" },
  A1: { name: "Trust",                domain: "A" }, A2: { name: "Morality",             domain: "A" },
  A3: { name: "Altruism",             domain: "A" }, A4: { name: "Cooperation",          domain: "A" },
  A5: { name: "Modesty",              domain: "A" }, A6: { name: "Sympathy",             domain: "A" },
  C1: { name: "Self-Efficacy",        domain: "C" }, C2: { name: "Orderliness",          domain: "C" },
  C3: { name: "Dutifulness",          domain: "C" }, C4: { name: "Achievement-Striving", domain: "C" },
  C5: { name: "Self-Discipline",      domain: "C" }, C6: { name: "Cautiousness",         domain: "C" },
};

const DOMAIN_ORDER = ["O", "C", "E", "A", "N"] as const;
const DOMAIN_NAMES: Record<string, string> = {
  O: "Openness", C: "Conscientiousness", E: "Extraversion", A: "Agreeableness", N: "Neuroticism",
};

// ─── VIA definitions (matches wowReport.ts) ───────────────────────────────────

const VIA_DEFINITIONS: Record<string, string> = {
  Creativity:              "Thinking of novel and productive ways to conceptualise and do things.",
  Curiosity:               "Taking an interest in ongoing experience for its own sake; finding subjects and topics fascinating.",
  Judgment:                "Thinking things through and examining them from all sides; not jumping to conclusions.",
  "Love of Learning":      "Mastering new skills, topics, and bodies of knowledge, whether on one's own or formally.",
  Perspective:             "Being able to provide wise counsel to others; having ways of looking at the world that make sense to oneself and to other people.",
  Bravery:                 "Not shrinking from threat, challenge, difficulty, or pain; speaking up for what is right.",
  Perseverance:            "Finishing what one starts; persisting in a course of action in spite of obstacles.",
  Honesty:                 "Speaking the truth but more broadly presenting oneself in a genuine way and acting without pretence.",
  Zest:                    "Approaching life with excitement and energy; not doing things halfway or half-heartedly.",
  Love:                    "Valuing close relations with others, in particular those in which sharing and caring are reciprocated.",
  Kindness:                "Doing favours and good deeds for others; helping them; taking care of them.",
  "Social Intelligence":   "Being aware of the motives and feelings of other people and oneself.",
  Teamwork:                "Working well as a member of a group or team; being loyal to the group.",
  Fairness:                "Treating all people the same according to notions of fairness and justice.",
  Leadership:              "Encouraging a group of which one is a member to get things done and at the same time maintain good relations within the group.",
  Forgiveness:             "Forgiving those who have done wrong; accepting the shortcomings of others.",
  Humility:                "Letting one's accomplishments speak for themselves; not regarding oneself as more special than one is.",
  Prudence:                "Being careful about one's choices; not taking undue risks; not saying or doing things that might later be regretted.",
  "Self-Regulation":       "Regulating what one feels and does; being disciplined; controlling one's appetites and emotions.",
  "Appreciation of Beauty":"Noticing and appreciating beauty, excellence, and/or skilled performance in various domains of life.",
  Gratitude:               "Being aware of and thankful for the good things that happen; taking time to express thanks.",
  Hope:                    "Expecting the best in the future and working to achieve it; believing that a good future is something that can be brought about.",
  Humor:                   "Liking to laugh and tease; bringing smiles to other people; seeing the light side.",
  Spirituality:            "Having coherent beliefs about the higher purpose and meaning of the universe.",
};

// ─── Decade → stage title mapping ────────────────────────────────────────────

const DECADE_STAGE_TITLES: Record<string, { title: string; ages: string }> = {
  childhood:    { title: "Childhood · 0–11",  ages: "Ages 0–11" },
  teens:        { title: "Teens · 12–19",     ages: "Ages 12–19" },
  twenties:     { title: "Twenties",           ages: "Ages 20–29" },
  thirties:     { title: "Thirties",           ages: "Ages 30–39" },
  forties:      { title: "Forties",            ages: "Ages 40–49" },
  fifties:      { title: "Fifties",            ages: "Ages 50–59" },
  sixties_plus: { title: "Sixties & Beyond",   ages: "Ages 60+" },
};

// ─── ESF class mapping ────────────────────────────────────────────────────────

const ESF_CLASS: Record<string, string> = {
  satisfying: "sat",
  fulfilling: "ful",
  enjoyable:  "enj",
};

// ─── Colour energy → Insights cssClass ───────────────────────────────────────

const COLOUR_CSS: Record<string, string> = {
  "Fiery Red":       "red",
  "Sunshine Yellow": "yellow",
  "Earth Green":     "green",
  "Cool Blue":       "blue",
};

// ─── Markdown paragraph splitter ─────────────────────────────────────────────
/**
 * Strip markdown syntax from a paragraph string.
 */
function stripMarkdownInline(text: string): string {
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

/**
 * Splits a markdown section into an array of paragraph strings.
 * Strips leading ## headings, blank lines, and markdown table lines.
 * Returns at least one paragraph.
 */
function splitParagraphs(text: string): string[] {
  if (!text) return [""];
  // Remove markdown table lines (lines starting with |)
  const filtered = text.split("\n").filter(l => !l.trim().startsWith("|")).join("\n");
  const lines = filtered.split("\n");
  const paras: string[] = [];
  let current: string[] = [];

  for (const line of lines) {
    if (line.startsWith("### ") || line.startsWith("## ") || line.startsWith("# ")) {
      if (current.length > 0) {
        paras.push(current.join(" ").trim());
        current = [];
      }
      continue;
    }
    if (line.trim() === "") {
      if (current.length > 0) {
        paras.push(current.join(" ").trim());
        current = [];
      }
    } else {
      current.push(line.trim());
    }
  }
  if (current.length > 0) paras.push(current.join(" ").trim());

  return paras.filter(p => p.length > 0).map(p => stripMarkdownInline(p));
}

/**
 * Extract the first paragraph (hero sentence) from a section.
 */
function extractHero(text: string): string {
  const paras = splitParagraphs(text);
  return paras[0] ?? "";
}

/**
 * Extract the first N paragraphs, skipping the hero.
 */
function extractParagraphsAfterHero(text: string, max = 4): string[] {
  const paras = splitParagraphs(text);
  return paras.slice(1, 1 + max);
}

/**
 * Extract a named section (## Heading) from markdown text.
 * Returns the paragraphs under that heading.
 */
function extractSection(text: string, heading: string): string[] {
  if (!text) return [];
  const lines = text.split("\n");
  let inSection = false;
  const sectionLines: string[] = [];

  for (const line of lines) {
    if (line.startsWith("### ") || line.startsWith("## ") || line.startsWith("# ")) {
      const h = line.replace(/^#+\s*/, "").trim().toLowerCase();
      if (h === heading.toLowerCase()) {
        inSection = true;
        continue;
      } else if (inSection) {
        break; // hit next heading
      }
    }
    if (inSection) sectionLines.push(line);
  }

  return splitParagraphs(sectionLines.join("\n"));
}

/**
 * Extract all ## sections as { heading, paragraphs[] } objects.
 */
function extractAllSections(text: string): Array<{ heading: string; paragraphs: string[] }> {
  if (!text) return [];
  const lines = text.split("\n");
  const sections: Array<{ heading: string; paragraphs: string[] }> = [];
  let currentHeading = "";
  let currentLines: string[] = [];

  for (const line of lines) {
    if (line.startsWith("### ") || line.startsWith("## ") || line.startsWith("# ")) {
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

/**
 * Parse the fourPillars markdown into a structured object for the HTML report.
 * Each pillar section has: heading (full), headingAllcaps (e.g. "PLACES"), headingSubtitle (e.g. "Where Energy Was High"),
 * learning sentence, and example paragraphs.
 * The Combination section has: synthesis and practical_question (both plain paragraphs).
 * Citation is a plain text line.
 */
export function parseFourPillars(text: string): {
  pillars: Array<{ heading: string; headingAllcaps: string; headingSubtitle: string; learning: string; examples: string[] }>;
  combination: { synthesis: string; practical_question: string };
  citation: string;
} {
  if (!text) return { pillars: [], combination: { synthesis: "", practical_question: "" }, citation: "" };

  const lines = text.split("\n");
  const sections: Array<{ heading: string; lines: string[] }> = [];
  let currentHeading = "";
  let currentLines: string[] = [];

  for (const line of lines) {
    if (line.startsWith("## ")) {
      if (currentHeading || currentLines.length > 0) {
        sections.push({ heading: currentHeading, lines: [...currentLines] });
      }
      currentHeading = line.replace(/^##\s*/, "").trim();
      currentLines = [];
    } else {
      currentLines.push(line);
    }
  }
  if (currentHeading || currentLines.length > 0) {
    sections.push({ heading: currentHeading, lines: [...currentLines] });
  }

  const pillars: Array<{ heading: string; headingAllcaps: string; headingSubtitle: string; learning: string; examples: string[] }> = [];
  let combination = { synthesis: "", practical_question: "" };
  let citation = "";

  for (const section of sections) {
    const headingLower = section.heading.toLowerCase();
    if (headingLower === "the combination" || headingLower.includes("combination")) {
      // Combination section: two plain paragraphs (synthesis + practical question)
      const paras = splitParagraphs(section.lines.join("\n"));
      const nonCitation = paras.filter(p => !p.includes("Savickas") && !p.startsWith("Based on"));
      combination = {
        synthesis: stripMarkdownInline((nonCitation[0] ?? "").trim()),
        practical_question: stripMarkdownInline((nonCitation[1] ?? "").trim()),
      };
      // Extract citation
      const citLine = section.lines.find(l => l.includes("Savickas") || l.includes("Based on"));
      if (citLine) citation = stripMarkdownInline(citLine.trim().replace(/^\*|\*$/g, "").trim());
    } else if (section.heading) {
      // Pillar section: split heading into ALLCAPS part and subtitle
      // Expected format: "PLACES — Where Energy Was High" or "Places — Where Energy Was High"
      const dashIdx = section.heading.indexOf("—");
      const headingAllcaps = dashIdx >= 0
        ? section.heading.slice(0, dashIdx).trim().toUpperCase()
        : section.heading.toUpperCase();
      const headingSubtitle = dashIdx >= 0
        ? section.heading.slice(dashIdx + 1).trim()
        : "";

      // Extract Learning sentence and example paragraphs
      const paras = splitParagraphs(section.lines.join("\n"));
      let learning = "";
      const examples: string[] = [];
      for (const para of paras) {
        const stripped = para.trim();
        if (stripped.toLowerCase().startsWith("learning:")) {
          learning = stripMarkdownInline(stripped.replace(/^\*?\*?[Ll]earning:\*?\*?\s*/, "").trim());
        } else if (stripped.length > 0) {
          examples.push(stripMarkdownInline(stripped));
        }
      }
      pillars.push({ heading: section.heading, headingAllcaps, headingSubtitle, learning, examples });
    }
  }

  // If citation not found in Combination, look for it at the end of the text
  if (!citation) {
    const lastLines = text.split("\n").reverse();
    for (const l of lastLines) {
      if (l.includes("Savickas") || l.includes("Based on")) {
        citation = stripMarkdownInline(l.trim().replace(/^\*|\*$/g, "").trim());
        break;
      }
    }
  }

  return { pillars, combination, citation };
}

/**
 * Extract bullet points from a "From what you have told us, we can see:" block.
 */
function extractKeyFindings(text: string): string[] {
  if (!text) return [];
  const marker = "from what you have told us, we can see:";
  const lower = text.toLowerCase();
  const idx = lower.indexOf(marker);
  if (idx === -1) return [];
  const after = text.slice(idx + marker.length);
  const lines = after.split("\n");
  const bullets: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("- ") || trimmed.startsWith("• ") || trimmed.startsWith("* ")) {
      bullets.push(trimmed.replace(/^[-•*]\s*/, "").trim());
    } else if (trimmed.startsWith("**") && trimmed.endsWith("**")) {
      // bold line treated as bullet
      bullets.push(trimmed.replace(/\*\*/g, "").trim());
    } else if (trimmed.length > 0 && bullets.length > 0) {
      // stop at first non-bullet non-empty line after we've found bullets
      break;
    }
  }
  return bullets;
}

/**
 * Extract a pullquote — the last meaningful sentence of a section.
 */
function extractPullquote(text: string): string {
  const paras = splitParagraphs(text);
  // Find the last paragraph that isn't a bullet list
  for (let i = paras.length - 1; i >= 0; i--) {
    const p = paras[i];
    if (!p.startsWith("- ") && !p.startsWith("• ") && p.length > 20) {
      // Return the last sentence of that paragraph
      const sentences = p.split(/(?<=[.!?])\s+/);
      return sentences[sentences.length - 1] ?? p;
    }
  }
  return paras[paras.length - 1] ?? "";
}

// ─── Colour energy → Insights axes derivation ────────────────────────────────

function deriveInsightsAxes(domainScores: Record<string, number>): Array<{ label: string; value: string; note: string }> {
  const e = domainScores["E"] ?? 50;
  const a = domainScores["A"] ?? 50;
  const o = domainScores["O"] ?? 50;
  const c = domainScores["C"] ?? 50;

  return [
    {
      label: "E / I axis",
      value: e >= 60 ? "Moderately Extraverted" : e <= 40 ? "Moderately Introverted" : "Ambivert",
      note: `Extraversion ${e}`,
    },
    {
      label: "T / F axis",
      value: a >= 60 ? "Moderately Feeling" : a <= 40 ? "Moderately Thinking" : "Balanced T/F",
      note: `Agreeableness ${a}`,
    },
    {
      label: "S / N · J / P",
      value: `${o >= 50 ? "Intuiting" : "Sensing"} · ${c >= 50 ? "Judging" : "Perceiving"}`,
      note: "Openness & Conscientiousness",
    },
  ];
}

// ─── Colour energy → strengths/watchouts ─────────────────────────────────────

const COLOUR_STRENGTHS: Record<string, string[]> = {
  "Cool Blue":       ["Analytical", "Precise", "Cautious", "Deliberate", "Thorough"],
  "Fiery Red":       ["Decisive", "Competitive", "Demanding", "Strong-willed", "Purposeful"],
  "Sunshine Yellow": ["Sociable", "Dynamic", "Expressive", "Enthusiastic", "Creative"],
  "Earth Green":     ["Empathetic", "Patient", "Reliable", "Supportive", "Values-driven"],
};

const COLOUR_WATCHOUTS: Record<string, string[]> = {
  "Cool Blue":       ["Can appear cold or detached", "May over-analyse and delay decisions", "Dislikes ambiguity"],
  "Fiery Red":       ["Can appear aggressive or impatient", "May overlook others' feelings", "Dislikes inaction"],
  "Sunshine Yellow": ["Can appear unfocused or over-optimistic", "May talk more than listen", "Dislikes routine"],
  "Earth Green":     ["Can avoid necessary conflict", "May be indecisive under pressure", "Dislikes rapid change"],
};

const COLOUR_FIT: Record<string, string> = {
  "Cool Blue":       "Roles requiring rigorous analysis, quality assurance, and systematic problem-solving.",
  "Fiery Red":       "Roles requiring decisive leadership, competitive drive, and results-focused delivery.",
  "Sunshine Yellow": "Roles requiring relationship-building, creative energy, and inspiring others.",
  "Earth Green":     "Roles requiring empathy, long-term relationship management, and values-led leadership.",
};

// Jungian type label per colour energy
const COLOUR_JUNGIAN: Record<string, string> = {
  "Cool Blue":       "Introverted Thinker (IT)",
  "Fiery Red":       "Extraverted Thinker (ET)",
  "Sunshine Yellow": "Extraverted Feeler (EF)",
  "Earth Green":     "Introverted Feeler (IF)",
};

// Short description per colour energy (shown in the card body)
const COLOUR_DESCRIPTION: Record<string, string> = {
  "Cool Blue":       "Precise, analytical, and thorough. Brings rigour and careful deliberation to decisions. Prefers to gather evidence before acting and values accuracy above speed. Can appear reserved or overly cautious in fast-moving environments.",
  "Fiery Red":       "Driven, purposeful, and results-oriented. Prefers to lead from the front, takes decisive action, and is comfortable with challenge and competition. Can be direct to the point of bluntness.",
  "Sunshine Yellow": "Enthusiastic, persuasive, and sociable. Energised by people and ideas, brings optimism and creativity to groups. Can lose focus on detail and follow-through.",
  "Earth Green":     "Empathetic, patient, and values-driven. Builds deep, lasting relationships and leads with integrity. Prefers consensus and can struggle with rapid or imposed change.",
};

// Derive the wheel dot position from OCEAN domain scores.
// The wheel centre is (120,120) in a 240x240 SVG.
// X axis: Extraversion (E) maps introvert (left) to extravert (right). E=50 -> x=120.
// Y axis: Agreeableness (A) maps feeler (bottom) to thinker (top). A=50 -> y=120.
// Radius is capped at 80px so the dot stays within the coloured quadrant area.
function deriveWheelPosition(domainScores: Record<string, number>): { X: number; Y: number } {
  const e = domainScores["E"] ?? 50;  // 0-100
  const a = domainScores["A"] ?? 50;  // 0-100
  // Normalise to -1..+1
  const ex = (e - 50) / 50;  // positive = extravert (right)
  const ay = (a - 50) / 50;  // positive = agreeable = feeler (down)
  const maxR = 80;
  const cx = 120 + ex * maxR;
  const cy = 120 + ay * maxR;  // feeler is at bottom (higher y)
  return {
    X: Math.round(cx),
    Y: Math.round(cy),
  };
}

// ─── Life history → LIFE_HISTORY.PAGES[] ─────────────────────────────────────

const DECADE_ORDER = [
  "childhood", "teens", "twenties", "thirties", "forties", "fifties", "sixties_plus",
];

type Achievement = {
  id: number;
  decade: string;
  title: string;
  age: number | null;
  description: string | null;
  sageEnrichment: string | null;
  esf: string | null;
  [key: string]: unknown;
};

export function buildLifeHistoryPages(achievementsList: Achievement[]): Array<{
  pageNum: string;
  showKicker: boolean;
  stages: Array<{
    title: string;
    ages: string;
    entries: Array<{
      title: string;
      age: string;
      esf: string;
      esfClass: string;
      body: string;
      note?: string;
    }>;
  }>;
}> {
  // Group by decade
  const byDecade: Record<string, Achievement[]> = {};
  for (const a of achievementsList) {
    const dk = a.decade ?? "childhood";
    if (!byDecade[dk]) byDecade[dk] = [];
    byDecade[dk].push(a);
  }

  // Build stages in decade order
  const stages: Array<{
    title: string;
    ages: string;
    entries: Array<{
      title: string;
      age: string;
      esf: string;
      esfClass: string;
      body: string;
      note?: string;
    }>;
  }> = [];

  for (const dk of DECADE_ORDER) {
    const items = byDecade[dk];
    if (!items || items.length === 0) continue;
    const stageInfo = DECADE_STAGE_TITLES[dk] ?? { title: dk, ages: "" };
    stages.push({
      title: stageInfo.title,
      ages: stageInfo.ages,
      entries: items.map(a => ({
        title: a.title ?? "Untitled",
        age: String(a.age ?? ""),
        esf: a.esf ? (a.esf.charAt(0).toUpperCase() + a.esf.slice(1)) : "Enjoyable",
        esfClass: ESF_CLASS[a.esf ?? "enjoyable"] ?? "enj",
        body: a.description ?? "",
        ...(a.sageEnrichment ? { note: a.sageEnrichment } : {}),
      })),
    });
  }

  // Distribute stages across pages dynamically — only emit pages that have content.
  // Page 1 (page 17) gets showKicker: true; the rest get false.
  // Aim for ~2 stages per page; overflow spills to the next page.
  if (stages.length === 0) return [];

  const pages: Array<{
    pageNum: string;
    showKicker: boolean;
    stages: typeof stages;
  }> = [];

  let pageIdx = 0;
  for (const stage of stages) {
    if (pages[pageIdx] === undefined) {
      pages.push({
        pageNum: String(17 + pageIdx),
        showKicker: pageIdx === 0,
        stages: [],
      });
    }
    if (pages[pageIdx].stages.length >= 2) {
      pageIdx++;
      pages.push({
        pageNum: String(17 + pageIdx),
        showKicker: false,
        stages: [],
      });
    }
    pages[pageIdx].stages.push(stage);
  }

  return pages;
}

// ─── VIA evidence builder ─────────────────────────────────────────────────────

function buildViaEvidence(
  viaRanked: Array<{ name: string; score: number; rank: number }>,
  achievementsList: Achievement[],
  viaSection: string
): Array<{
  name: string;
  definition: string;
  rank: string;
  freq: number;
  salience: string;
  salienceClass: string;
  achievements: string;
}> {
  // Count fulfilling achievements per strength name (rough heuristic)
  const fulfillingTitles = achievementsList
    .filter(a => a.esf === "fulfilling")
    .map(a => a.title ?? "");

  // Try to parse the VIA evidence table from viaSection markdown
  // The LLM generates a table: | Strength | VIA Definition | Survey Rank | Freq (of N) | Identity Salience | Achievements with evidence |
  const tableRows: Record<string, { freq: number; salience: string; achievements: string }> = {};
  if (viaSection) {
    const lines = viaSection.split("\n");
    let inTable = false;
    for (const line of lines) {
      if (line.includes("| Strength") || line.includes("|Strength")) { inTable = true; continue; }
      if (inTable && line.startsWith("|") && !line.includes("---")) {
        const cells = line.split("|").map(c => c.trim()).filter(c => c.length > 0);
        if (cells.length >= 5) {
          const name = cells[0];
          const freq = parseInt(cells[3]) || 0;
          const salience = cells[4] ?? "";
          const achievs = cells[5] ?? "";
          tableRows[name] = { freq, salience, achievements: achievs };
        }
      } else if (inTable && !line.startsWith("|")) {
        inTable = false;
      }
    }
  }

  // Build evidence for top 5 strengths only (table fits 5 rows on the page)
  const top5 = viaRanked.slice(0, 5);
  return top5.map((s, i) => {
    const row = tableRows[s.name];
    const rawFreq = row?.freq ?? (fulfillingTitles.length > 0 ? Math.max(1, Math.floor(fulfillingTitles.length * (5 - i) / 5)) : 0);
    const freq = typeof rawFreq === "number" ? rawFreq : 0;
    const salience = row?.salience ?? (i < 2 ? "High" : i < 4 ? "Medium" : "Low");
    const salienceClass = salience.toLowerCase().includes("high") ? "" : "med";
    // Format achievements as readable prose, not raw caps titles
    const achievsRaw = row?.achievements ?? "";
    const achievsText = achievsRaw
      ? achievsRaw
      : fulfillingTitles.slice(0, 3).map(t => {
          // Convert ALL-CAPS titles to title case
          return t.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
        }).join("; ");

    return {
      name: s.name,
      definition: VIA_DEFINITIONS[s.name] ?? "",
      rank: String(s.rank ?? i + 1).padStart(2, "0"),
      freq,
      salience: salience.toUpperCase().includes("HIGH") ? "High" : salience.toUpperCase().includes("MEDIUM") ? "Medium" : "Low",
      salienceClass,
      achievements: achievsText,
    };
  });
}

// ─── Main export builder ──────────────────────────────────────────────────────

export async function buildClaudeExportJson(clientId: number): Promise<Record<string, unknown>> {
  const [profile, achievementsList, familyBg, educationList, careerList, via, ipip, report] = await Promise.all([
    getClientProfileById(clientId),
    getAchievements(clientId),
    getFamilyBackground(clientId),
    getEducationHistory(clientId),
    getCareerHistory(clientId),
    getViaResults(clientId),
    getIpipResults(clientId),
    getAnalysisReport(clientId),
  ]);

  if (!profile) throw new TRPCError({ code: "NOT_FOUND", message: "Client not found" });
  if (!report?.wowReportJson) throw new TRPCError({ code: "NOT_FOUND", message: "WOW Report not yet generated for this client" });

  const sections = JSON.parse(report.wowReportJson) as {
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
    fourPillars?: string;
    viaRanked: Array<{ name: string; score: number; rank: number }>;
    domainScores: Record<string, number>;
    facetScores: Record<string, number>;
    reportType: string;
  };

  // Normalise any section that may have been stored as a JSON array instead of a plain string.
  // Older reports stored prose sections as string[], not string. Join with double-newline so
  // extractAllSections() can detect ## headings correctly.
  const normSection = (v: unknown): string => {
    if (typeof v === "string") return v;
    if (Array.isArray(v)) return (v as string[]).join("\n\n");
    return String(v ?? "");
  };
  const normSections = {
    ...sections,
    lifeHistoryPattern: normSection(sections.lifeHistoryPattern),
    viaSection: normSection(sections.viaSection),
    personalitySection: normSection(sections.personalitySection),
    behaviouralStyle: normSection(sections.behaviouralStyle),
    careerDirections: normSection(sections.careerDirections),
    developmentEdge: normSection(sections.developmentEdge),
    coachingQuestions: normSection(sections.coachingQuestions),
    summary: normSection(sections.summary),
    fourPillars: normSection(sections.fourPillars),
  };
  // Use normSections for all downstream processing
  Object.assign(sections, normSections);

  const clientFullName = sections.clientFullName ?? [profile.firstName, profile.lastName].filter(Boolean).join(" ") ?? "Client";
  const clientFirstName = profile.firstName ?? clientFullName.split(" ")[0] ?? "Client";

  // ── VIA data ──────────────────────────────────────────────────────────────

  const viaRanked: Array<{ name: string; score: number; rank: number }> = (() => {
    try {
      const r = via?.rankedStrengths;
      if (!r) return sections.viaRanked ?? [];
      const parsed = typeof r === "string" ? JSON.parse(r) : (r as any[]);
      return parsed;
    } catch { return sections.viaRanked ?? []; }
  })();

  const sortedVia = [...viaRanked].sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99));
  const top10 = sortedVia.slice(0, 10);
  const all24 = sortedVia.map((s, i) => ({
    name: s.name,
    score: s.score ?? 0,
    cssClass: i < 5 ? "top5" : i >= sortedVia.length - 5 ? "bot5" : "",
  }));

  // ── OCEAN data ────────────────────────────────────────────────────────────

  const domainScores: Record<string, number> = (() => {
    try {
      const d = ipip?.domainScores;
      if (!d) return sections.domainScores ?? {};
      return typeof d === "string" ? JSON.parse(d) : (d as Record<string, number>);
    } catch { return sections.domainScores ?? {}; }
  })();

  const facetScores: Record<string, number> = (() => {
    try {
      const f = ipip?.facetScores;
      if (!f) return sections.facetScores ?? {};
      return typeof f === "string" ? JSON.parse(f) : (f as Record<string, number>);
    } catch { return sections.facetScores ?? {}; }
  })();

  // Build OCEAN.DOMAINS (all 5 in O, C, E, A, N order)
  const oceanDomains = DOMAIN_ORDER.map(dk => ({
    name: DOMAIN_NAMES[dk],
    pct: domainScores[dk] ?? 50,
  }));

  // PAGE1_DOMAINS: O, C, E
  const page1Domains = (["O", "C", "E"] as const).map(dk => ({
    name: DOMAIN_NAMES[dk],
    pct: domainScores[dk] ?? 50,
    facets: (["1","2","3","4","5","6"] as const).map(n => {
      const fk = `${dk}${n}`;
      return { name: FACET_NAMES[fk]?.name ?? fk, pct: facetScores[fk] ?? 50 };
    }),
  }));

  // PAGE2_DOMAINS: A, N
  const page2Domains = (["A", "N"] as const).map((dk, i) => ({
    name: DOMAIN_NAMES[dk],
    pct: domainScores[dk] ?? 50,
    ...(i === 0 ? { first: true } : {}),
    facets: (["1","2","3","4","5","6"] as const).map(n => {
      const fk = `${dk}${n}`;
      return { name: FACET_NAMES[fk]?.name ?? fk, pct: facetScores[fk] ?? 50 };
    }),
  }));

  // ── Behavioural style ─────────────────────────────────────────────────────

  const primaryColour = sections.primaryColour ?? "Cool Blue";
  const secondaryColour = sections.secondaryColour ?? "Earth Green";
  const jungianType = sections.jungianType ?? "INTJ";
  const jungianSpelt = jungianType.split("").map((c: string) => ({
    I: "Introversion", E: "Extraversion",
    N: "Intuition",    S: "Sensing",
    T: "Thinking",     F: "Feeling",
    J: "Judging",      P: "Perceiving",
  }[c] ?? c)).join(" · ");

  // ── Section parsing ───────────────────────────────────────────────────────

  // CH1 — Lifework Summary
  // Deduplicate: remove any paragraph that is identical to the one immediately
  // before it (LLMs occasionally emit the same paragraph twice when rewriting).
  const rawSummaryParas = splitParagraphs(sections.summary ?? "");
  const summaryParas = rawSummaryParas.filter(
    (p, i) => i === 0 || p.trim() !== rawSummaryParas[i - 1].trim()
  );
  const ch1Hero = summaryParas[0] ?? "";
  const ch1Paras = summaryParas.slice(1);

  // CH2 — Life History Pattern
  const lhSections = extractAllSections(sections.lifeHistoryPattern ?? "");
  // All raw paragraphs — used as fallback when LLM produces flat or single-section output
  const lhAllParas = splitParagraphs(sections.lifeHistoryPattern ?? "");
  // Require at least 3 sections (intro + 2 named sections) for section-based splitting;
  // with fewer sections the paragraphs are just pooled in lhSections[0] and we must split by index.
  const lhHasSections = lhSections.length >= 3;
  // Page 1: first named section paragraphs (or first half of flat paragraphs)
  const ch2Page1Paras = lhHasSections
    ? (lhSections[0]?.paragraphs ?? [])
    : lhAllParas.slice(0, Math.ceil(lhAllParas.length / 2));
  // Detect whether the LLM used a two-level heading structure:
  //   ## Recurring Motifs  (no direct paragraphs — dropped by extractAllSections)
  //   ### The Logic That Feels Like Play  (paragraphs here)
  //   ### The Systems You Build for Others
  //   ...
  // In that case lhSections[1] is the first ### subsection, not the ## group heading.
  // We collect ALL sibling ### subsections as the "Recurring themes" content.
  // Stop collecting when we hit a "What the pattern reveals" / "ESF" section.
  const _isSubsectionStructure = lhHasSections &&
    // heuristic: if lhSections has 4+ entries and none of them is named "recurring"
    // it's likely the ## group heading was dropped (had no direct paragraphs)
    lhSections.length >= 4 &&
    !lhSections.some(s => s.heading.toLowerCase().includes("recurring"));

  const ch2Page1SectionH = lhHasSections ? "Recurring themes" : "";
  const ch2Page1SectionParas: string[] = (() => {
    if (!lhHasSections) return [];
    if (_isSubsectionStructure) {
      // Collect all subsection paragraphs until we hit a "reveals" / "ESF" section
      const all: string[] = [];
      for (let i = 1; i < lhSections.length; i++) {
        const h = lhSections[i].heading.toLowerCase();
        if (h.includes("pattern reveals") || h.includes("what the pattern") ||
            h.includes("reveals") || h.includes("esf") || h.includes("findings")) break;
        all.push(...lhSections[i].paragraphs);
      }
      return all;
    }
    // Normal structure: lhSections[1] is the ## Recurring Motifs section.
    // Collect its direct paragraphs (if any) PLUS all following subsection paragraphs
    // (### sub-headings under ## Recurring Motifs) until we hit a terminal section.
    const recurringSection = lhSections[1];
    if (!recurringSection) return [];
    const all: string[] = [...recurringSection.paragraphs];
    for (let i = 2; i < lhSections.length; i++) {
      const h = lhSections[i].heading.toLowerCase();
      if (h.includes("pattern reveals") || h.includes("what the pattern") ||
          h.includes("reveals") || h.includes("esf") || h.includes("findings")) break;
      all.push(...lhSections[i].paragraphs);
    }
    return all;
  })();

  // Page 2: second named section (or second half of flat paragraphs — strictly non-overlapping)
  // When subsection structure was used, page 2 paragraphs are already included in page 1 section.
  const ch2Page2SectionH = _isSubsectionStructure ? "" : (
    lhHasSections ? (lhSections[2]?.heading ?? "Recurring themes") : "Recurring themes"
  );
  const _ch2Page2ParasRaw = _isSubsectionStructure
    ? [] // all recurring content already on page 1
    : lhHasSections
      ? (
          lhSections[2]?.paragraphs?.length ? lhSections[2].paragraphs :
          lhSections[3]?.paragraphs?.length ? lhSections[3].paragraphs :
          lhAllParas.slice(Math.ceil(lhAllParas.length / 2))
        )
      : lhAllParas.slice(Math.ceil(lhAllParas.length / 2));
  // Final deduplication guard: strip any paragraph that already appeared on page 1
  const _ch2Page1Set = new Set([...ch2Page1Paras, ...ch2Page1SectionParas]);
  const ch2Page2Paras = _ch2Page2ParasRaw.filter(p => !_ch2Page1Set.has(p));
  // Use the "What the Pattern Reveals" section paragraphs directly.
  // Fallback chain (most specific → most general):
  //  1. A section whose heading contains "pattern reveals" or "what the pattern"
  //  2. A section whose heading contains "reveals", "findings", or "key"
  //  3. extractKeyFindings (bullet list after "From what you have told us")
  //  4. The last named section — BUT only if its paragraphs differ from ch2Page1SectionParas
  //     (deduplication guard: prevents repeating Recurring Motifs verbatim on page 5)
  //  5. The last 3 raw paragraphs of the text
  const ch2WhatRevealsSec =
    lhSections.find(s => s.heading.toLowerCase().includes("pattern reveals") || s.heading.toLowerCase().includes("what the pattern")) ??
    lhSections.find(s => s.heading.toLowerCase().includes("reveals") || s.heading.toLowerCase().includes("findings") || s.heading.toLowerCase().includes("key"));
  const ch2KeyFindingsFromBullets = extractKeyFindings(sections.lifeHistoryPattern ?? "");
  const ch2AllParas = splitParagraphs(sections.lifeHistoryPattern ?? "");
  // Deduplication guard: check if the last section is the same as what's already on page 1
  const lastSection = lhSections.length > 0 ? lhSections[lhSections.length - 1] : null;
  const lastSectionIsDuplicate =
    lastSection !== null &&
    lastSection.paragraphs.length > 0 &&
    ch2Page1SectionParas.length > 0 &&
    lastSection.paragraphs[0] === ch2Page1SectionParas[0];
  const ch2KeyFindings =
    ch2WhatRevealsSec?.paragraphs?.length ? ch2WhatRevealsSec.paragraphs :
    ch2KeyFindingsFromBullets.length > 0 ? ch2KeyFindingsFromBullets :
    (lastSection && !lastSectionIsDuplicate) ? (lastSection.paragraphs ?? []) :
    ch2AllParas.slice(-3);

  // CH3 — VIA
  const viaAllSections = extractAllSections(sections.viaSection ?? "");
  // CH3 key findings — use the "Key Findings" section paragraphs directly
  const ch3KeyFindingsSec = viaAllSections.find(s => s.heading.toLowerCase().includes("key finding") || s.heading.toLowerCase().includes("findings"));
  const ch3KeyFindings = ch3KeyFindingsSec?.paragraphs
    ?? extractKeyFindings(sections.viaSection ?? "").filter(f => !f.includes("|") && !f.startsWith("---"));
  const ch3Lede = "The VIA framework identifies 24 character strengths organised under six virtues. Central to its application is the idea of signature strengths — those you are most drawn to use and that give you energy.";

  // VIA evidence
  const viaEvidence = buildViaEvidence(sortedVia, achievementsList as Achievement[], sections.viaSection ?? "");

  // CH4 — Personality
  const ch4Sections = extractAllSections(sections.personalitySection ?? "");
  const psychometricsSectionParas = ch4Sections.find(s => s.heading.toLowerCase().includes("psychometric"))?.paragraphs ?? splitParagraphs(sections.personalitySection ?? "").slice(0, 3);
  const synthesisSectionParas = ch4Sections.find(s => s.heading.toLowerCase().includes("meet") || s.heading.toLowerCase().includes("two picture"))?.paragraphs ?? [];
  const ch4KeyFindTitle = ch4Sections.find(s => s.heading.toLowerCase().includes("what this means"))?.heading ?? "What this means";
  const ch4KeyFindBody = ch4Sections.find(s => s.heading.toLowerCase().includes("what this means"))?.paragraphs?.[0] ?? extractPullquote(sections.personalitySection ?? "");

  // CH6 — Development Edge (in the WOW report this is "Development Edge")
  const ch6AllSections = extractAllSections(sections.developmentEdge ?? "");
  const ch6AllParas = splitParagraphs(sections.developmentEdge ?? "");
  const CH6_PAGE1_MAX_SECTIONS = 2; // max named sections on the first Development Edge page
  const CH6_PAGE1_MAX_PARAS = 4;    // max paragraphs on page 1 when no named sections exist
  const ch6Sections = ch6AllSections.length > 0 ? ch6AllSections.slice(0, CH6_PAGE1_MAX_SECTIONS) : [];
  const ch6OverflowSections = ch6AllSections.length > CH6_PAGE1_MAX_SECTIONS ? ch6AllSections.slice(CH6_PAGE1_MAX_SECTIONS) : [];
  const ch6FallbackPage1 = ch6AllParas.slice(0, CH6_PAGE1_MAX_PARAS);
  const ch6FallbackOverflow = ch6AllParas.slice(CH6_PAGE1_MAX_PARAS);
  const ch6HasOverflow = ch6OverflowSections.length > 0 || ch6FallbackOverflow.length > 0;
  const ch6Pullquote = extractPullquote(sections.developmentEdge ?? "");

  // CH7 — Conclusions (Past / Present / Future / Tell Me About Yourself)
  const ch7Past    = extractSection(sections.coachingQuestions ?? "", "Past");
  const ch7Present = extractSection(sections.coachingQuestions ?? "", "Present");
  const ch7Future  = extractSection(sections.coachingQuestions ?? "", "Future");
  const ch7TmayParas = extractSection(sections.coachingQuestions ?? "", "Tell Me About Yourself");
  // Generate a punchy pull quote from the Conclusions section using the LLM.
  // The old approach (ch7Present[0]) just repeated the first Present paragraph verbatim.
  const ch7PresentPullquote = await (async () => {
    const pastText  = ch7Past.join(" ");
    const presText  = ch7Present.join(" ");
    if (!pastText && !presText) return "";
    try {
      const resp = await invokeLLM({
        messages: [
          {
            role: "system",
            content:
              "You are a gifted editor for a premium career analysis report. " +
              "Your task is to write a single pull-quote sentence (max 25 words) that distils the " +
              "essence of the client's Past and Present narrative into something punchy, personal, " +
              "and memorable — the kind of line that makes the reader pause and think 'yes, that's exactly me.' " +
              "Write in second person (\"You\"). Do NOT repeat any sentence from the source text verbatim. " +
              "Return ONLY the sentence, with no quotation marks, no prefix, no explanation.",
          },
          {
            role: "user",
            content: `Past:\n${pastText}\n\nPresent:\n${presText}`,
          },
        ],
      });
      const content = resp.choices?.[0]?.message?.content;
      const raw = (typeof content === "string" ? content : "").trim();
      // Strip any accidental surrounding quotes
      return raw.replace(/^"|"$/g, "").trim();
    } catch {
      // Fallback: last sentence of the last Present paragraph
      const lastPara = ch7Present[ch7Present.length - 1] ?? "";
      const sentences = lastPara.split(/(?<=[.!?])\s+/);
      return sentences[sentences.length - 1] ?? lastPara;
    }
  })();

  // Drives — from the Tell Me About Yourself section
  const ch7Drives: string[] = (() => {
    const tmay = sections.coachingQuestions ?? "";
    const drivesMarker = "fundamentally driven by";
    const lower = tmay.toLowerCase();
    const idx = lower.indexOf(drivesMarker);
    if (idx === -1) return [];
    const after = tmay.slice(idx + drivesMarker.length);
    // Try to extract a colon-separated list or bullet list
    const colonIdx = after.indexOf(":");
    if (colonIdx !== -1) {
      const rest = after.slice(colonIdx + 1);
      const bullets = rest.split("\n").map(l => l.trim()).filter(l => l.startsWith("- ") || l.startsWith("• ") || l.startsWith("* "));
      if (bullets.length > 0) return bullets.map(b => b.replace(/^[-•*]\s*/, "").trim()).slice(0, 3);
    }
    return [];
  })();

  // TMAY paragraphs — everything AFTER the drives block
  // (skip the "I am fundamentally driven by:" line and the bullet lines, since those are in DRIVES)
  const ch7TmayAfterDrives: string[] = (() => {
    const tmay = sections.coachingQuestions ?? "";
    const drivesMarker = "fundamentally driven by";
    const lower = tmay.toLowerCase();
    const idx = lower.indexOf(drivesMarker);
    if (idx === -1) return ch7TmayParas; // no drives found, return as-is
    const after = tmay.slice(idx + drivesMarker.length);
    const colonIdx = after.indexOf(":");
    if (colonIdx === -1) return ch7TmayParas;
    const rest = after.slice(colonIdx + 1);
    const lines = rest.split("\n");
    // Skip bullet lines, then collect remaining non-empty lines as paragraphs
    let pastBullets = false;
    const remainingLines: string[] = [];
    for (const line of lines) {
      const trimmed = line.trim();
      if (!pastBullets && (trimmed.startsWith("- ") || trimmed.startsWith("• ") || trimmed.startsWith("* "))) {
        continue; // skip bullet lines
      }
      if (!pastBullets && trimmed === "") continue; // skip blank lines before content
      pastBullets = true;
      remainingLines.push(line);
    }
    const result = splitParagraphs(remainingLines.join("\n"));
    return result.length > 0 ? result : ch7TmayParas;
  })();

  // CH8 — Career Directions
  // Split into page-1 (first 2 sections) and overflow page-2 (remaining sections).
  // This ensures the section is never truncated — it simply spills onto a second page.
  const ch8AllSections = extractAllSections(sections.careerDirections ?? "");
  const ch8Closing = extractPullquote(sections.careerDirections ?? "");
  const CH8_PAGE1_MAX_SECTIONS = 2; // max named sections on the first Career Directions page
  const CH8_PAGE1_MAX_PARAS = 5;    // max paragraphs on page 1 when no named sections exist
  // Named-section path
  const ch8Sections = ch8AllSections.length > 0 ? ch8AllSections.slice(0, CH8_PAGE1_MAX_SECTIONS) : [];
  const ch8OverflowSections = ch8AllSections.length > CH8_PAGE1_MAX_SECTIONS ? ch8AllSections.slice(CH8_PAGE1_MAX_SECTIONS) : [];
  // Flat-paragraph fallback path (no headings in AI output)
  const ch8AllParas = ch8AllSections.length === 0 ? splitParagraphs(sections.careerDirections ?? "") : [];
  const ch8FallbackPage1 = ch8AllParas.slice(0, CH8_PAGE1_MAX_PARAS);
  const ch8FallbackOverflow = ch8AllParas.slice(CH8_PAGE1_MAX_PARAS);
  const ch8HasOverflow = ch8OverflowSections.length > 0 || ch8FallbackOverflow.length > 0;

  // ── Report metadata ───────────────────────────────────────────────────────

  const reportType = (sections.reportType ?? "standard") as string;
  const editionLabel = {
    standard:       "Career Analysis · Standard Edition",
    student:        "Career Analysis · First Career Edition",
    career_changer: "Career Analysis · Career Change Edition",
    job_returner:   "Career Analysis · Return to Work Edition",
    retirement:     "Career Analysis · Retirement & Legacy Edition",
  }[reportType] ?? "Career Analysis · Standard Edition";

  // ── Assemble final payload ────────────────────────────────────────────────

  const payload: Record<string, unknown> = {
    BRAND: {
      COMPANY: "Pennington Hennessy",
    },
    CLIENT: {
      NAME: clientFullName,
      FIRST_NAME: clientFirstName,
    },
    REPORT: {
      DATE: sections.generatedAt ?? new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }),
      EDITION_LABEL: editionLabel,
      COVER_TITLE_LINE1: "A portrait of",
      COVER_TITLE_LINE2: "who you are.",
      ANALYST: "Jamie Pennington",
    },
    COVER_LETTER: {
      PARAGRAPHS: [
        "It’s me — Jamie — the creator of the Lifework process — writing this cover note, not the very clever AI Alistair — the Analyst.",
        "You\u2019ve put a lot of work into giving me the information necessary to do what we set out to achieve \u2014 to understand yourself, and what makes you, <em>you</em>. So your report is a big read.",
        "If you\u2019re naturally impatient, it\u2019s OK to start with <strong>Chapter 7 \u2014 Conclusions</strong>. It\u2019s here we summarise what we believe to be true, and give you a suggested reply to that dreaded interview question \u201cSo, tell me about yourself\u201d.",
        "One really important thing. Your report is the basis for reflecting, thinking and discussing. It’s built on the information you told us and the psychometric instruments that you engaged with. It’s therefore OK to disagree with anything we’ve written. Alistair may be able to help you unpack why we believe it to be true, but you remain the expert on you.",
      ],
      SIGN_OFF: "With warmth,",
      AUTHOR_NAME: "Jamie Pennington",
      AUTHOR_EMAIL: "jamie@penningtonhennessy.com",
    },
    CH1: {
      HERO: ch1Hero,
      PARAGRAPHS: ch1Paras.length > 0 ? ch1Paras : [sections.summary ?? ""],
    },
    CH2: {
      LEDE: ch2Page1Paras[0] ?? "",
      PAGE1_PARAGRAPHS: ch2Page1Paras.slice(1, 4),
      PAGE1_SECTION_H: ch2Page1SectionH,
      PAGE1_SECTION_PARAS: ch2Page1SectionParas.slice(0, 6),
      PAGE2_SECTION_H: ch2Page2SectionH,
      PAGE2_PARAGRAPHS: ch2Page2Paras,
      KEYFIND: {
        TITLE: "Your ESF distribution",
        // All paragraphs of the "What the Pattern Reveals" section except the last
        PARAGRAPHS: ch2KeyFindings.length > 1 ? ch2KeyFindings.slice(0, -1) : ch2KeyFindings,
        // Last paragraph is the ESF distribution sentence
        ESF_PARA: ch2KeyFindings.length > 1 ? ch2KeyFindings[ch2KeyFindings.length - 1] : (ch2KeyFindings[0] ?? ""),
      },
    },
    CH2B: (() => {
      const fp = parseFourPillars(sections.fourPillars ?? "");
      // Build a lookup by the canonical pillar keyword (PLACES, PEOPLE, PROBLEMS, PROCEDURES)
      const pillarMap: Record<string, typeof fp.pillars[0] | undefined> = {};
      for (const p of fp.pillars) {
        const key = p.headingAllcaps.split(/\s+/)[0].toUpperCase();
        pillarMap[key] = p;
      }
      const mapPillar = (p: typeof fp.pillars[0] | undefined) =>
        p
          ? { HEADING_ALLCAPS: p.headingAllcaps, HEADING_SUBTITLE: p.headingSubtitle, LEARNING: p.learning, EXAMPLES: p.examples }
          : undefined;
      return {
        // Named per-pillar keys for the two-page split template
        PILLAR_PLACES:     mapPillar(pillarMap["PLACES"]),
        PILLAR_PEOPLE:     mapPillar(pillarMap["PEOPLE"]),
        PILLAR_PROBLEMS:   mapPillar(pillarMap["PROBLEMS"]),
        PILLAR_PROCEDURES: mapPillar(pillarMap["PROCEDURES"]),
        // Legacy array kept for backward compatibility
        PILLARS: fp.pillars.map(p => ({
          HEADING: p.heading,
          HEADING_ALLCAPS: p.headingAllcaps,
          HEADING_SUBTITLE: p.headingSubtitle,
          LEARNING: p.learning,
          EXAMPLES: p.examples,
        })),
        COMBINATION_SYNTHESIS: fp.combination.synthesis,
        COMBINATION_QUESTION: fp.combination.practical_question,
        CITATION: fp.citation || "Based on Savickas, M.L. (2011). Career Counseling. APA.",
        // Guard for IF check
        HAS_CONTENT: fp.pillars.length > 0,
      };
    })(),
    CH3: {
      LEDE: ch3Lede,
      // KEY_FINDINGS = all paragraphs (pull-quote removed from template)
      KEY_FINDINGS: ch3KeyFindings.length > 0
        ? ch3KeyFindings
        : viaAllSections.slice(0, 2).map(s => s.paragraphs[0] ?? ""),
    },
    VIA: {
      TOP10: top10.map(s => ({ name: s.name, score: s.score ?? 0 })),
      ALL24: all24,
      EVIDENCE: viaEvidence,
      VIRTUES_NOTE: "VIA virtues: Wisdom · Courage · Humanity · Justice · Temperance · Transcendence.",
    },
    CH4: {
      LEDE: "The Big Five identifies five core personality dimensions: Openness, Conscientiousness, Extraversion, Agreeableness, and Emotional Stability. Unlike type-based assessments, it measures traits as continuous spectrums \u2014 there are no good or bad scores.",
      PSYCHOMETRICS_PARAS: (psychometricsSectionParas.length > 0 ? psychometricsSectionParas : splitParagraphs(sections.personalitySection ?? "").slice(0, 3)).slice(0, 3),
      SYNTHESIS_PARAS: (synthesisSectionParas.length > 0 ? synthesisSectionParas : splitParagraphs(sections.personalitySection ?? "").slice(3, 6)).slice(0, 3),
      KEYFIND: {
        TITLE: ch4KeyFindTitle,
        BODY: ch4KeyFindBody,
      },
    },
    OCEAN: {
      DOMAINS: oceanDomains,
      PAGE1_DOMAINS: page1Domains,
      PAGE2_DOMAINS: page2Domains,
      FACET_NOTE: "Facet scores help explain paradoxes in the domain score. A moderate domain score can mask very high and very low facets pulling in opposite directions.",
    },
    CH5: {
      WHEEL: deriveWheelPosition(domainScores),
      JUNGIAN_TYPE: jungianType,
      JUNGIAN_SPELT: jungianSpelt,
      AXES: deriveInsightsAxes(domainScores),
      PRIMARY: {
        fullName: primaryColour,
        cssClass: COLOUR_CSS[primaryColour] ?? "blue",
        jungian: COLOUR_JUNGIAN[primaryColour] ?? "",
        description: COLOUR_DESCRIPTION[primaryColour] ?? "",
      },
      SECONDARY: {
        fullName: secondaryColour,
        cssClass: COLOUR_CSS[secondaryColour] ?? "green",
        jungian: COLOUR_JUNGIAN[secondaryColour] ?? "",
        description: COLOUR_DESCRIPTION[secondaryColour] ?? "",
      },
    },
    CH6: {
      SECTIONS: ch6Sections.length > 0
        ? ch6Sections.map(s => ({ heading: s.heading, paragraphs: s.paragraphs }))
        : [{ heading: "Development Edge", paragraphs: ch6FallbackPage1 }],
      OVERFLOW_SECTIONS: ch6OverflowSections.length > 0
        ? ch6OverflowSections.map(s => ({ heading: s.heading, paragraphs: s.paragraphs }))
        : ch6FallbackOverflow.length > 0
          ? [{ heading: "", paragraphs: ch6FallbackOverflow }]
          : [],
      HAS_OVERFLOW: ch6HasOverflow,
      NO_OVERFLOW: !ch6HasOverflow,
      PULLQUOTE: ch6Pullquote,
    },
    CH7: {
      PAST:    ch7Past.length > 0 ? ch7Past : splitParagraphs(sections.coachingQuestions ?? "").slice(0, 2),
      PRESENT: ch7Present.length > 0 ? ch7Present : splitParagraphs(sections.coachingQuestions ?? "").slice(2, 4),
      PRESENT_PULLQUOTE: ch7PresentPullquote,
      FUTURE:  ch7Future.length > 0 ? ch7Future : splitParagraphs(sections.coachingQuestions ?? "").slice(4, 6),
      DRIVES:  ch7Drives.length > 0 ? ch7Drives : top10.slice(0, 3).map(s => s.name),
      TMAY_PARAS: ch7TmayAfterDrives.length > 0 ? ch7TmayAfterDrives : [],
    },
    CH8: {
      // Page 1: named sections (up to 2) OR flat paragraphs (up to 5)
      DIRECTIONS: ch8Sections.length > 0
        ? ch8Sections.map(s => ({ heading: s.heading, paragraphs: s.paragraphs }))
        : [{ heading: "", paragraphs: ch8FallbackPage1 }],
      // Page 2 (overflow): remaining named sections OR remaining flat paragraphs
      OVERFLOW_DIRECTIONS: ch8OverflowSections.length > 0
        ? ch8OverflowSections.map(s => ({ heading: s.heading, paragraphs: s.paragraphs }))
        : ch8FallbackOverflow.length > 0
          ? [{ heading: "", paragraphs: ch8FallbackOverflow }]
          : [],
      HAS_OVERFLOW: ch8HasOverflow,
      NO_OVERFLOW: !ch8HasOverflow,
      CLOSING: ch8Closing,
    },
    APPENDIX: {
      LEDE: `This report is the ${editionLabel.split("·")[1]?.trim() ?? "Standard Edition"}. Other editions are available for different career stages and situations.`,
      VARIANTS: [
        { name: "First Career",        for: "First career seekers",                              question: "\"Who am I, and where do I start?\"" },
        { name: "Career Change",       for: "Dissatisfied or confidence-depleted professionals", question: "\"What is wrong with where I am, and what would be right?\"" },
        { name: "Returning to Work",   for: "People re-entering after a career break",           question: "\"What do I still have, and how do I re-establish it?\"" },
        { name: "Retirement & Legacy", for: "People actively planning their post-career chapter",question: "\"What do I do with everything I am and everything I know?\"" },
      ],
    },
    LIFE_HISTORY: {
      PAGES: buildLifeHistoryPages(achievementsList as Achievement[]),
    },
    BIOGRAPHICAL: {
      FAMILY: familyBg ? {
        upbringingLocation: familyBg.upbringingLocation ?? null,
        fatherOccupation: familyBg.fatherOccupation ?? null,
        motherOccupation: familyBg.motherOccupation ?? null,
        siblingPosition: familyBg.siblingPosition ?? null,
        familyNarrative: familyBg.familyNarrative ?? null,
        significantInfluences: familyBg.significantInfluences ?? null,
        HAS_DATA: !!(familyBg.upbringingLocation || familyBg.fatherOccupation || familyBg.motherOccupation || familyBg.siblingPosition || familyBg.familyNarrative || familyBg.significantInfluences),
      } : { HAS_DATA: false },
      EDUCATION: educationList.map(e => ({
        institution: e.institution,
        qualification: e.qualification ?? null,
        subject: e.subject ?? null,
        yearFrom: e.yearFrom ?? null,
        yearTo: e.yearTo ?? null,
        highlights: e.highlights ?? null,
      })),
      HAS_EDUCATION: educationList.length > 0,
      CAREER: careerList.map(c => ({
        organisation: c.organisation,
        role: c.role ?? null,
        yearFrom: c.yearFrom ?? null,
        yearTo: c.yearTo ?? null,
        keyResponsibilities: c.keyResponsibilities ?? null,
        highlights: c.highlights ?? null,
        whyLeft: c.whyLeft ?? null,
      })),
      HAS_CAREER: careerList.length > 0,
    },
  };
  return payload;
}
// ─── tRPC router ───────────────────────────────────────────────────────────────

const counselorProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Counselor access required" });
  }
  return next({ ctx });
});

export const claudeExportRouter = router({
  /**
   * Returns the Claude handoff JSON payload for a client.
   * Counsellor-only.
   */
  getJson: counselorProcedure
    .input(z.object({ clientId: z.number() }))
    .query(async ({ input }) => {
      const payload = await buildClaudeExportJson(input.clientId);
      return { payload };
    }),
});
