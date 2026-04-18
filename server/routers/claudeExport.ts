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
import {
  getClientProfileById,
  getAchievements,
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
 * Splits a markdown section into an array of paragraph strings.
 * Strips leading ## headings and blank lines.
 * Returns at least one paragraph.
 */
function splitParagraphs(text: string): string[] {
  if (!text) return [""];
  const lines = text.split("\n");
  const paras: string[] = [];
  let current: string[] = [];

  for (const line of lines) {
    if (line.startsWith("## ") || line.startsWith("# ")) {
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

  return paras.filter(p => p.length > 0);
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
    if (line.startsWith("## ") || line.startsWith("# ")) {
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
    if (line.startsWith("## ") || line.startsWith("# ")) {
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

function buildLifeHistoryPages(achievementsList: Achievement[]): Array<{
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

  // Distribute stages across exactly 5 pages (pages 17–21)
  // Page 17 gets showKicker: true; the rest get false
  const pages: Array<{
    pageNum: string;
    showKicker: boolean;
    stages: typeof stages;
  }> = [
    { pageNum: "17", showKicker: true,  stages: [] },
    { pageNum: "18", showKicker: false, stages: [] },
    { pageNum: "19", showKicker: false, stages: [] },
    { pageNum: "20", showKicker: false, stages: [] },
    { pageNum: "21", showKicker: false, stages: [] },
  ];

  if (stages.length === 0) return pages;

  // Simple distribution: spread stages across pages
  // Aim for ~2 stages per page; overflow to next page
  let pageIdx = 0;
  for (const stage of stages) {
    if (pageIdx < 4 && pages[pageIdx].stages.length >= 2) pageIdx++;
    pages[Math.min(pageIdx, 4)].stages.push(stage);
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

  // Build evidence for top 10 strengths
  const top10 = viaRanked.slice(0, 10);
  return top10.map((s, i) => {
    const row = tableRows[s.name];
    const freq = row?.freq ?? fulfillingTitles.length > 0 ? Math.max(1, Math.floor(fulfillingTitles.length * (10 - i) / 10)) : 0;
    const salience = row?.salience ?? (i < 3 ? "High" : i < 6 ? "Medium" : "Low");
    const salienceClass = salience.toLowerCase().includes("high") ? "" : "med";
    const achievsText = row?.achievements ?? fulfillingTitles.slice(0, 3).map(t => `<em>${t}</em>`).join(" · ");

    return {
      name: s.name,
      definition: VIA_DEFINITIONS[s.name] ?? "",
      rank: String(s.rank ?? i + 1).padStart(2, "0"),
      freq: typeof freq === "number" ? freq : 0,
      salience: salience.includes("HIGH") || salience.includes("High") ? "High" : salience.includes("MEDIUM") || salience.includes("Medium") ? "Medium" : "Low",
      salienceClass,
      achievements: achievsText,
    };
  });
}

// ─── Main export builder ──────────────────────────────────────────────────────

export async function buildClaudeExportJson(clientId: number): Promise<Record<string, unknown>> {
  const [profile, achievementsList, via, ipip, report] = await Promise.all([
    getClientProfileById(clientId),
    getAchievements(clientId),
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
    viaRanked: Array<{ name: string; score: number; rank: number }>;
    domainScores: Record<string, number>;
    facetScores: Record<string, number>;
    reportType: string;
  };

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
  const summaryParas = splitParagraphs(sections.summary ?? "");
  const ch1Hero = summaryParas[0] ?? "";
  const ch1Paras = summaryParas.slice(1);

  // CH2 — Life History Pattern
  const lhSections = extractAllSections(sections.lifeHistoryPattern ?? "");
  const ch2Page1Paras = lhSections[0]?.paragraphs ?? splitParagraphs(sections.lifeHistoryPattern ?? "").slice(0, 2);
  const ch2Page1SectionH = lhSections[1]?.heading ?? "";
  const ch2Page1SectionParas = lhSections[1]?.paragraphs ?? [];
  const ch2Page2SectionH = lhSections[2]?.heading ?? "";
  const ch2Page2Paras = lhSections[2]?.paragraphs ?? lhSections[3]?.paragraphs ?? [];
  const ch2KeyFindings = extractKeyFindings(sections.lifeHistoryPattern ?? "");

  // CH3 — VIA
  const viaAllSections = extractAllSections(sections.viaSection ?? "");
  const ch3KeyFindings = extractKeyFindings(sections.viaSection ?? "");
  const ch3Lede = "The VIA framework identifies 24 character strengths organised under six virtues. Central to its application is the idea of signature strengths — those you are most drawn to use and that give you energy.";
  const ch3Pullquote = extractPullquote(sections.viaSection ?? "");

  // VIA evidence
  const viaEvidence = buildViaEvidence(sortedVia, achievementsList as Achievement[], sections.viaSection ?? "");

  // CH4 — Personality
  const ch4Sections = extractAllSections(sections.personalitySection ?? "");
  const psychometricsSectionParas = ch4Sections.find(s => s.heading.toLowerCase().includes("psychometric"))?.paragraphs ?? splitParagraphs(sections.personalitySection ?? "").slice(0, 3);
  const synthesisSectionParas = ch4Sections.find(s => s.heading.toLowerCase().includes("meet") || s.heading.toLowerCase().includes("two picture"))?.paragraphs ?? [];
  const ch4KeyFindTitle = ch4Sections.find(s => s.heading.toLowerCase().includes("what this means"))?.heading ?? "What this means";
  const ch4KeyFindBody = ch4Sections.find(s => s.heading.toLowerCase().includes("what this means"))?.paragraphs?.[0] ?? extractPullquote(sections.personalitySection ?? "");

  // CH5 — Behavioural Style
  const ch5Sections = extractAllSections(sections.behaviouralStyle ?? "");
  const ch5Lede = "This style is extrapolated from your Big Five profile, using a mapping between personality dimensions and the four broad orientations that shape how people typically engage with others, lead, and respond to challenge.";

  // CH6 — Development Edge (in the WOW report this is "Development Edge")
  const ch6Sections = extractAllSections(sections.developmentEdge ?? "");
  const ch6Pullquote = extractPullquote(sections.developmentEdge ?? "");

  // CH7 — Conclusions (Past / Present / Future / Tell Me About Yourself)
  const ch7Past    = extractSection(sections.coachingQuestions ?? "", "Past");
  const ch7Present = extractSection(sections.coachingQuestions ?? "", "Present");
  const ch7Future  = extractSection(sections.coachingQuestions ?? "", "Future");
  const ch7TmayParas = extractSection(sections.coachingQuestions ?? "", "Tell Me About Yourself");
  const ch7PresentPullquote = ch7Present[0] ?? "";

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

  // CH8 — Career Directions
  const ch8Sections = extractAllSections(sections.careerDirections ?? "");
  const ch8Closing = extractPullquote(sections.careerDirections ?? "");

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
      COVER_TITLE_LINE2: "how you work.",
      ANALYST: "Jamie Pennington, with Sage",
    },
    COVER_LETTER: {
      PARAGRAPHS: [
        "It\u2019s me \u2014 Jamie \u2014 the creator of the Lifework process \u2014 writing this cover note, not the very clever AI Sage.",
        "You\u2019ve put a lot of work into giving me the information necessary to do what we set out to achieve \u2014 to understand yourself, and what makes you, <em>you</em>. So your report is a big read.",
        "If you\u2019re naturally impatient, it\u2019s OK to start with <strong>Chapter 7 \u2014 Conclusions</strong>. It\u2019s here we summarise what we believe to be true, and give you a suggested reply to that dreaded interview question \u201cSo, tell me about yourself\u201d.",
        "One really important thing. Your report is the basis for reflecting, thinking and discussing. It\u2019s built on the information you told us and the psychometric instruments that you engaged with. It\u2019s therefore OK to disagree with anything we\u2019ve written. Sage may be able to help you unpack why we believe it to be true, but you remain the expert on you.",
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
      PAGE1_PARAGRAPHS: ch2Page1Paras.slice(1),
      PAGE1_SECTION_H: ch2Page1SectionH,
      PAGE1_SECTION_PARAS: ch2Page1SectionParas,
      PAGE2_SECTION_H: ch2Page2SectionH,
      PAGE2_PARAGRAPHS: ch2Page2Paras,
      KEYFIND: {
        TITLE: "Your ESF distribution",
        PARAGRAPHS: ch2KeyFindings.length > 0 ? ch2KeyFindings : ["Your life history reveals a clear pattern of recurring themes."],
      },
    },
    CH3: {
      LEDE: ch3Lede,
      KEY_FINDINGS: ch3KeyFindings.length > 0 ? ch3KeyFindings : viaAllSections.slice(0, 2).map(s => s.paragraphs[0] ?? ""),
      PULLQUOTE: ch3Pullquote,
    },
    VIA: {
      TOP10: top10.map(s => ({ name: s.name, score: s.score ?? 0 })),
      ALL24: all24,
      EVIDENCE: viaEvidence,
      VIRTUES_NOTE: "VIA virtues: Wisdom · Courage · Humanity · Justice · Temperance · Transcendence.",
    },
    CH4: {
      LEDE: "The Big Five identifies five core personality dimensions: Openness, Conscientiousness, Extraversion, Agreeableness, and Emotional Stability. Unlike type-based assessments, it measures traits as continuous spectrums \u2014 there are no good or bad scores.",
      PSYCHOMETRICS_PARAS: psychometricsSectionParas.length > 0 ? psychometricsSectionParas : splitParagraphs(sections.personalitySection ?? "").slice(0, 3),
      SYNTHESIS_PARAS: synthesisSectionParas.length > 0 ? synthesisSectionParas : splitParagraphs(sections.personalitySection ?? "").slice(3, 6),
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
      LEDE: ch5Lede,
      PRIMARY: {
        name: primaryColour.replace(" ", "<br/>"),
        traits: (COLOUR_STRENGTHS[primaryColour] ?? []).join(" · "),
        cssClass: COLOUR_CSS[primaryColour] ?? "blue",
      },
      SECONDARY: {
        name: secondaryColour.replace(" ", "<br/>"),
        traits: (COLOUR_STRENGTHS[secondaryColour] ?? []).join(" · "),
        cssClass: COLOUR_CSS[secondaryColour] ?? "green",
      },
      JUNGIAN: {
        code: jungianType,
        spelt: jungianSpelt,
      },
      AXES: deriveInsightsAxes(domainScores),
      STRENGTHS: COLOUR_STRENGTHS[primaryColour] ?? [],
      WATCHOUTS: COLOUR_WATCHOUTS[primaryColour] ?? [],
      FIT: COLOUR_FIT[primaryColour] ?? "",
    },
    CH6: {
      SECTIONS: ch6Sections.length > 0
        ? ch6Sections.map(s => ({ heading: s.heading, paragraphs: s.paragraphs }))
        : [{ heading: "Development Edge", paragraphs: splitParagraphs(sections.developmentEdge ?? "") }],
      PULLQUOTE: ch6Pullquote,
    },
    CH7: {
      PAST:    ch7Past.length > 0 ? ch7Past : splitParagraphs(sections.coachingQuestions ?? "").slice(0, 2),
      PRESENT: ch7Present.length > 0 ? ch7Present : splitParagraphs(sections.coachingQuestions ?? "").slice(2, 4),
      PRESENT_PULLQUOTE: ch7PresentPullquote,
      FUTURE:  ch7Future.length > 0 ? ch7Future : splitParagraphs(sections.coachingQuestions ?? "").slice(4, 6),
      DRIVES:  ch7Drives.length > 0 ? ch7Drives : top10.slice(0, 3).map(s => s.name),
      TMAY_PARAS: ch7TmayParas.length > 0 ? ch7TmayParas : [],
    },
    CH8: {
      DIRECTIONS: ch8Sections.length > 0
        ? ch8Sections.map(s => ({ heading: s.heading, paragraphs: s.paragraphs }))
        : [{ heading: "Career Direction", paragraphs: splitParagraphs(sections.careerDirections ?? "") }],
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
  };

  return payload;
}

// ─── tRPC router ──────────────────────────────────────────────────────────────

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
