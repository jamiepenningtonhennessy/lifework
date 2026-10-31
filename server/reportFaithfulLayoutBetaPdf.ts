import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createRequire } from "node:module";
import { generateWheelPng } from "./routers/insightsWheelPng.js";
import type { FaithfulLayoutBetaSnapshot, FaithfulLayoutReportSource } from "../shared/faithfulLayoutBeta";

const require = createRequire(import.meta.url);
const NAVY = "#0a1628";
const GOLD = "#c9973a";
const CREAM = "#f5f0e8";
const MID_GREY = "#666666";
const DARK_GREY = "#2c2c2c";

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

const BIG5_LABELS: Record<string, string> = {
  N: "Neuroticism",
  E: "Extraversion",
  O: "Openness",
  A: "Agreeableness",
  C: "Conscientiousness",
};

const FACET_NAMES: Record<string, string> = {
  N1: "Anxiety", N2: "Anger", N3: "Depression", N4: "Self-Consciousness", N5: "Immoderation", N6: "Vulnerability",
  E1: "Friendliness", E2: "Gregariousness", E3: "Assertiveness", E4: "Activity Level", E5: "Excitement-Seeking", E6: "Cheerfulness",
  O1: "Imagination", O2: "Artistic Interests", O3: "Emotionality", O4: "Adventurousness", O5: "Intellect", O6: "Liberalism",
  A1: "Trust", A2: "Morality", A3: "Altruism", A4: "Cooperation", A5: "Modesty", A6: "Sympathy",
  C1: "Self-Efficacy", C2: "Orderliness", C3: "Dutifulness", C4: "Achievement-Striving", C5: "Self-Discipline", C6: "Cautiousness",
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

const INSIGHTS_COLOURS: Record<string, { hex: string; strengths: string[]; challenges: string[]; careerFit: string }> = {
  "Cool Blue": { hex: "#3E7CB1", strengths: ["Analytical", "Precise", "Systematic", "Thorough", "Objective"], challenges: ["Can appear cold or detached", "May over-analyse", "Dislikes ambiguity"], careerFit: "Roles requiring analysis, precision, and systematic thinking — finance, engineering, research, IT, quality assurance, law." },
  "Fiery Red": { hex: "#A93226", strengths: ["Decisive", "Determined", "Strong-willed", "Purposeful", "Results-focused"], challenges: ["May appear insensitive", "Can be impatient", "Dislikes indecision in others"], careerFit: "Roles requiring leadership, accountability, and the ability to drive change — management, entrepreneurship, law, surgery, strategy." },
  "Earth Green": { hex: "#6E9B1E", strengths: ["Empathetic", "Patient", "Reliable", "Supportive", "Values-driven"], challenges: ["Can avoid necessary conflict", "May be indecisive", "Dislikes rapid change"], careerFit: "Roles requiring empathy, support, and long-term relationship management — counselling, HR, nursing, social work, community roles." },
  "Sunshine Yellow": { hex: "#E8B84B", strengths: ["Enthusiastic", "Persuasive", "Creative", "Optimistic", "Collaborative"], challenges: ["Can be disorganised", "May over-promise", "Dislikes routine and detail"], careerFit: "Roles requiring communication, creativity, and relationship-building — sales, marketing, PR, teaching, facilitation, consulting." },
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function inlineMarkdown(value: string): string {
  return escapeHtml(value)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>");
}

function markdownToHtml(source: string): string {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const html: string[] = [];
  let paragraph: string[] = [];
  let list: string[] = [];
  let ordered = false;
  let table: string[][] = [];

  const flushParagraph = () => {
    if (paragraph.length) html.push(`<p>${inlineMarkdown(paragraph.join(" "))}</p>`);
    paragraph = [];
  };
  const flushList = () => {
    if (!list.length) return;
    const tag = ordered ? "ol" : "ul";
    html.push(`<${tag}>${list.map((item) => `<li>${inlineMarkdown(item)}</li>`).join("")}</${tag}>`);
    list = [];
  };
  const flushTable = () => {
    if (!table.length) return;
    const rows = table.filter((row) => !row.every((cell) => /^\s*:?-{2,}:?\s*$/.test(cell)));
    if (rows.length) {
      const [header, ...body] = rows;
      html.push(`<div class="markdown-table"><table><thead><tr>${header.map((cell) => `<th>${inlineMarkdown(cell)}</th>`).join("")}</tr></thead><tbody>${body.map((row) => `<tr>${row.map((cell) => `<td>${inlineMarkdown(cell)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`);
    }
    table = [];
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    const isPipeRow = /^\|.*\|$/.test(line);
    if (isPipeRow) {
      flushParagraph();
      flushList();
      table.push(line.slice(1, -1).split("|").map((cell) => cell.trim()));
      continue;
    }
    flushTable();
    if (!line) {
      flushParagraph();
      flushList();
      continue;
    }
    const heading = line.match(/^#{1,3}\s+(.+)$/);
    if (heading) {
      flushParagraph();
      flushList();
      html.push(`<h3>${inlineMarkdown(heading[1])}</h3>`);
      continue;
    }
    const bullet = line.match(/^[-•]\s+(.+)$/);
    const numbered = line.match(/^\d+\.\s+(.+)$/);
    if (bullet || numbered) {
      flushParagraph();
      const isOrdered = Boolean(numbered);
      if (list.length && ordered !== isOrdered) flushList();
      ordered = isOrdered;
      list.push((bullet ?? numbered)![1]);
      continue;
    }
    flushList();
    paragraph.push(line);
  }
  flushTable();
  flushParagraph();
  flushList();
  return html.join("\n");
}

function chapterTitle(source: FaithfulLayoutReportSource, chapter: 6 | 8): string {
  if (chapter === 6) {
    if (source.reportType === "retirement") return "6. What To Watch";
    if (source.reportType === "student") return "6. What To Build First";
    if (source.reportType === "job_returner") return "6. What To Rebuild";
    return "6. Development Edge";
  }
  if (source.reportType === "retirement") return "8. What To Do With What You Know";
  if (source.reportType === "student") return "8. Where You Are Headed";
  if (source.reportType === "job_returner") return "8. What You Bring Back";
  return "8. Career Directions";
}

function chapterHtml(title: string, body: string): string {
  return `<section class="chapter"><div class="chapter-kicker">Lifework Career Analysis</div><h1>${escapeHtml(title)}</h1><div class="gold-rule"></div><div class="report-prose">${markdownToHtml(body)}</div></section>`;
}

function bar(value: number, colour = GOLD): string {
  const width = Math.max(1, Math.min(100, value));
  return `<span class="bar"><span style="width:${width}%;background:${colour}"></span></span>`;
}

function viaRankingHtml(source: FaithfulLayoutReportSource): string {
  const rows = source.viaRanked.slice(0, 10).map((strength, index) => `<tr><td class="rank">${index + 1}</td><td><strong>${escapeHtml(strength.name)}</strong></td><td>${bar((strength.score / 25) * 100, index < 3 ? GOLD : "#d6c092")}</td><td class="score">${strength.score}</td></tr>`).join("");
  if (!rows) return "";
  return `<h3>Strength Rankings</h3><div class="score-table"><table><tbody>${rows}</tbody></table></div>`;
}

function bigFiveHtml(source: FaithfulLayoutReportSource): string {
  const rows = ["N", "E", "O", "A", "C"].filter((key) => typeof source.domainScores[key] === "number").map((key) => `<tr><td><strong>${BIG5_LABELS[key]}</strong></td><td>${bar(source.domainScores[key], NAVY)}</td><td class="score">${source.domainScores[key]}th</td></tr>`).join("");
  if (!rows) return "";
  return `<h3>Big Five Personality Dimensions</h3><div class="score-table"><table><tbody>${rows}</tbody></table></div>`;
}

function insightsHtml(source: FaithfulLayoutReportSource, wheelDataUrl: string | null): string {
  const primary = INSIGHTS_COLOURS[source.primaryColour] ?? INSIGHTS_COLOURS["Cool Blue"];
  const eScore = source.domainScores.E ?? 50;
  const aScore = source.domainScores.A ?? 50;
  const oScore = source.domainScores.O ?? 50;
  const cScore = source.domainScores.C ?? 50;
  const eLabel = eScore >= 65 ? "Highly Extraverted" : eScore >= 50 ? "Moderately Extraverted" : eScore >= 35 ? "Moderately Introverted" : "Highly Introverted";
  const aLabel = aScore >= 65 ? "Highly Feeling" : aScore >= 50 ? "Moderately Feeling" : aScore >= 35 ? "Moderately Thinking" : "Highly Thinking";
  const oLabel = oScore >= 50 ? "Intuiting (N)" : "Sensing (S)";
  const cLabel = cScore >= 50 ? "Judging (J)" : "Perceiving (P)";

  return `<div class="insights-wrap">
    ${wheelDataUrl ? `<figure class="wheel"><img src="${wheelDataUrl}" alt="Insights wheel based on extraversion and agreeableness scores" /></figure>` : ""}
    <div class="energy-cards">
      <div class="energy-card"><span>Primary Energy</span><strong style="color:${primary.hex}">${escapeHtml(source.primaryColour)}</strong></div>
      <div class="energy-card"><span>Secondary Energy</span><strong>${escapeHtml(source.secondaryColour)}</strong></div>
      ${source.jungianType ? `<div class="energy-card"><span>Jungian Type</span><strong>${escapeHtml(source.jungianType)}</strong></div>` : ""}
    </div>
  </div>
  <div class="axis-grid">
    <div><span>Jungian Type</span><strong>${escapeHtml(source.jungianType)}</strong><small>Approx. MBTI equivalent</small></div>
    <div><span>E / I Axis</span><strong>${eLabel}</strong><small>Extraversion: ${eScore}</small></div>
    <div><span>T / F Axis</span><strong>${aLabel}</strong><small>Agreeableness: ${aScore}</small></div>
    <div><span>S / N + J / P</span><strong>${oLabel} · ${cLabel}</strong><small>Openness &amp; Conscientiousness</small></div>
  </div>
  <div class="insights-detail-grid">
    <div><span>Strengths</span><ul>${primary.strengths.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></div>
    <div><span>Watch-outs</span><ul>${primary.challenges.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></div>
    <div><span>Career Environment Fit</span><p>${escapeHtml(primary.careerFit)}</p></div>
  </div>`;
}

function appendixHtml(source: FaithfulLayoutReportSource): string {
  const variantLabels: Record<string, string> = {
    standard: "Standard Edition",
    student: "First Career Edition",
    career_changer: "Career Change Edition",
    job_returner: "Returning to Work Edition",
    retirement: "Retirement & Legacy Edition",
  };
  const currentLabel = variantLabels[source.reportType] ?? "Standard Edition";
  const rows = [
    ["student", "First Career", "First career seekers", "“Who am I, and where do I start?”"],
    ["career_changer", "Career Change", "Dissatisfied or confidence-depleted professionals", "“What is wrong with where I am, and what would be right?”"],
    ["job_returner", "Returning to Work", "People re-entering after a career break", "“What do I still have, and how do I re-establish it?”"],
    ["retirement", "Retirement & Legacy", "People actively planning their post-career chapter", "“What do I do with everything I am and everything I know?”"],
  ].map(([key, label, target, question]) => `<tr class="${source.reportType === key ? "current-variant" : ""}"><td>${label}</td><td>${target}</td><td>${question}</td></tr>`).join("");
  return `<section class="chapter appendix"><div class="chapter-kicker">Lifework Career Analysis</div><h1>Appendix: The Four Report Variants</h1><div class="gold-rule"></div><div class="report-prose"><p>This report is the ${escapeHtml(currentLabel)}. The Lifework WOW Report is produced in four variants, each calibrated to a different life stage and set of questions. Chapters 1–5 (Summary, Life History, Character Strengths, Personality Profile, and Behavioural Style) are substantially the same across all four variants — the data does not change. Chapters 6, 7, and 8 (Development Edge, Career Directions, and Conclusions) are rewritten for each variant to address the specific questions and challenges of that life stage.</p></div><div class="variant-table"><table><thead><tr><th>Variant</th><th>For</th><th>The Central Question</th></tr></thead><tbody>${rows}</tbody></table></div><div class="confidential-bar">This report is confidential and prepared exclusively for the named individual.</div></section>`;
}

function annexHtml(snapshot: FaithfulLayoutBetaSnapshot): string {
  const { source, annex } = snapshot;
  const byDecade: Record<string, typeof annex.achievements> = {};
  for (const achievement of annex.achievements) {
    const decade = achievement.decade ?? "unknown";
    (byDecade[decade] ??= []).push(achievement);
  }
  const decadeOrder = ["early_childhood", "mid_childhood", "late_childhood", "childhood", "twenties", "thirties", "forties", "fifties", "sixties_plus"];
  const remaining = Object.keys(byDecade).filter((key) => !decadeOrder.includes(key));
  const lifeHistory = [...decadeOrder, ...remaining].filter((key) => byDecade[key]?.length).map((key) => `<section class="annex-decade"><h3>${escapeHtml(DECADE_LABELS[key] ?? key)}</h3>${byDecade[key].map((achievement) => `<article><div class="achievement-meta"><strong>${escapeHtml(achievement.title ?? "Untitled")}</strong><span>Age ${achievement.age ?? "?"}</span><span class="esf">${escapeHtml((achievement.esf ?? "").toUpperCase())}</span></div>${achievement.description ? `<p>${inlineMarkdown(achievement.description)}</p>` : ""}${achievement.sageEnrichment ? `<p class="enrichment">${inlineMarkdown(achievement.sageEnrichment)}</p>` : ""}</article>`).join("")}</section>`).join("");
  const familyRows = [
    ["Location of upbringing", annex.family.upbringingLocation],
    ["Father's occupation", annex.family.fatherOccupation],
    ["Mother's occupation", annex.family.motherOccupation],
    ["Position among siblings", annex.family.siblingPosition],
  ].filter(([, value]) => Boolean(value)).map(([label, value]) => `<div class="data-row"><strong>${label}</strong><span>${escapeHtml(value ?? "")}</span></div>`).join("");
  const careers = annex.careers.length ? annex.careers.map((career) => `<article class="career-row"><div><strong>${escapeHtml(career.organisation)}</strong>${career.role ? `<span>${escapeHtml(career.role)}</span>` : ""}</div><span>${escapeHtml([career.yearFrom, career.yearTo].filter(Boolean).join("–"))}</span>${career.keyResponsibilities ? `<p>${escapeHtml(career.keyResponsibilities)}</p>` : ""}${career.highlights ? `<p><strong>Key highlights</strong><br />${escapeHtml(career.highlights)}</p>` : ""}${career.whyLeft ? `<p><strong>Reason for leaving</strong><br />${escapeHtml(career.whyLeft)}</p>` : ""}</article>`).join("") : "<p class=\"empty-note\">No career history provided.</p>";
  const viaRows = [...source.viaRanked].sort((a, b) => a.rank - b.rank).map((strength) => `<tr class="${strength.rank <= 5 ? "top" : strength.rank >= 20 ? "bottom" : ""}"><td>${strength.rank}.</td><td>${escapeHtml(strength.name)}</td><td>${escapeHtml(VIA_VIRTUE_MAP[strength.name] ?? "")}</td><td>${bar((strength.score / 25) * 100, strength.rank <= 5 ? GOLD : "#4A90D9")}</td><td>${strength.score}/25</td></tr>`).join("");
  const ocean = ["N", "E", "O", "A", "C"].filter((key) => typeof source.domainScores[key] === "number").map((domain) => `<section class="ocean-domain"><div class="domain-heading"><strong>${BIG5_LABELS[domain].toUpperCase()}</strong><span>${source.domainScores[domain]}th percentile</span></div>${bar(source.domainScores[domain], DOMAIN_COLORS[domain])}<div class="facet-list">${[1, 2, 3, 4, 5, 6].map((index) => `${domain}${index}`).filter((facet) => typeof source.facetScores[facet] === "number").map((facet) => `<div><span>${FACET_NAMES[facet]}</span>${bar(source.facetScores[facet], source.facetScores[facet] >= 70 ? DOMAIN_COLORS[domain] : source.facetScores[facet] <= 30 ? "#cc3333" : MID_GREY)}<strong>${source.facetScores[facet]}</strong></div>`).join("")}</div></section>`).join("");

  return `<section class="annex-cover"><div><p class="annex-brand">Lifework</p><span>Your Data</span><div class="gold-rule"></div><p>WOW Report — Annex</p></div><div><p class="annex-small">Prepared for</p><h2>${escapeHtml(source.clientFullName)}</h2><p class="annex-small contents">Contents</p><ol><li>Biographical Data</li><li>Life History Data</li><li>VIA Character Strengths</li><li>OCEAN Personality Profile</li></ol></div></section>
  <section class="annex-section"><div class="chapter-kicker">Your Data — WOW Report Annex</div><h1>Annex B — Biographical Data</h1><div class="gold-rule"></div><p class="annex-intro">Family background, educational history, and career history as provided by the client.</p><h2>B1 — Family Background</h2>${familyRows || "<p class=\"empty-note\">No family background data provided.</p>"}${annex.family.familyNarrative ? `<p>${inlineMarkdown(annex.family.familyNarrative)}</p>` : ""}${annex.family.significantInfluences ? `<h3>Significant influences</h3><p>${inlineMarkdown(annex.family.significantInfluences)}</p>` : ""}<h2>B2 — Career History</h2>${careers}</section>
  <section class="annex-section"><div class="chapter-kicker">Your Data — WOW Report Annex</div><h1>C1 — Life History</h1><div class="gold-rule"></div><p class="annex-intro">The following achievements were recorded during the Sage life history interview. Where Sage asked a follow-up question, the enrichment note is shown in italics beneath the entry.</p>${lifeHistory || "<p class=\"empty-note\">No life history data provided.</p>"}</section>
  <section class="annex-section"><div class="chapter-kicker">Your Data — WOW Report Annex</div><h1>C2 — VIA Character Strengths</h1><div class="gold-rule"></div><p class="annex-intro">All 24 character strengths ranked in order of score. Scores are out of 25. Top 5 are highlighted in gold; bottom 5 in grey.</p><div class="annex-score-table"><table><tbody>${viaRows}</tbody></table></div></section>
  <section class="annex-section"><div class="chapter-kicker">Your Data — WOW Report Annex</div><h1>C3 — OCEAN Personality Profile</h1><div class="gold-rule"></div><p class="annex-intro">Domain scores and all 30 sub-scale facets. Scores are percentiles (0–100). Scores above 70 are high; below 30 are low.</p>${ocean}</section>`;
}

function findChromiumExecutable(): string | undefined {
  const candidates = [process.env.PUPPETEER_EXECUTABLE_PATH, "/usr/bin/chromium-browser", "/usr/bin/chromium", "/usr/bin/google-chrome", "/usr/bin/google-chrome-stable"].filter((value): value is string => Boolean(value));
  for (const candidate of candidates) {
    try {
      require("node:fs").accessSync(candidate);
      return candidate;
    } catch {
      // Puppeteer will use its managed browser as a final fallback.
    }
  }
  return undefined;
}

async function renderFaithfulLayoutBetaHtml(snapshot: FaithfulLayoutBetaSnapshot): Promise<string> {
  const source = snapshot.source;
  let wheelDataUrl: string | null = null;
  try {
    const wheel = await generateWheelPng(source.domainScores.E ?? 50, source.domainScores.A ?? 50, 420);
    wheelDataUrl = `data:image/png;base64,${wheel.toString("base64")}`;
  } catch (error) {
    console.warn("[faithful-layout-beta] Insights wheel unavailable; continuing with source report content.", error instanceof Error ? error.name : "unknown");
  }

  const viaChapter = `<section class="chapter"><div class="chapter-kicker">Lifework Career Analysis</div><h1>3. Character Strengths</h1><div class="gold-rule"></div><div class="report-prose"><p>The VIA framework identifies 24 character strengths organised under six virtues. Central to its application is the idea of signature strengths — those you are most drawn to use and that give you energy. Research shows that deploying signature strengths improves wellbeing, engagement, and resilience.</p>${viaRankingHtml(source)}${markdownToHtml(source.viaSection)}</div></section>`;
  const personalityChapter = `<section class="chapter"><div class="chapter-kicker">Lifework Career Analysis</div><h1>4. Personality Profile</h1><div class="gold-rule"></div><div class="report-prose"><p>The Big Five identifies five core personality dimensions: Openness, Conscientiousness, Extraversion, Agreeableness, and Emotional Stability. Unlike type-based assessments, it measures traits as continuous spectrums — there are no good or bad scores. It offers a vocabulary for patterns you may already sense in how you work and lead.</p>${bigFiveHtml(source)}${markdownToHtml(source.personalitySection)}</div></section>`;
  const behaviourChapter = `<section class="chapter"><div class="chapter-kicker">Lifework Career Analysis</div><h1>5. Behavioural Style</h1><div class="gold-rule"></div><div class="report-prose"><p>The behavioural style described in this chapter is not drawn from a separate questionnaire. It has been extrapolated from your Big Five personality profile, using a mapping between personality dimensions and the four broad orientations that shape how people typically engage with others, lead, and respond to challenge.</p><p>In our experience, this extrapolation tends to be accurate — most clients find it a recognisable portrait. We ask you to hold it lightly, however: treat it as a prompt for reflection and conversation rather than a fixed description of who you are. The most useful question to bring to this chapter is not “Is this right?” but “What does this tell me about how I show up — and where might I want to show up differently?”</p>${insightsHtml(source, wheelDataUrl)}${markdownToHtml(source.behaviouralStyle)}</div></section>`;

  return `<!doctype html>
<html lang="en-GB">
<head>
  <meta charset="utf-8" />
  <title>Lifework Career Analysis — ${escapeHtml(source.clientFullName)}</title>
  <style>
    @page { size: A4; margin: 24mm 18mm 22mm; }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; background: ${CREAM}; color: ${DARK_GREY}; }
    body { font-family: Georgia, "Times New Roman", serif; font-size: 10.5pt; line-height: 1.55; }
    p { margin: 0 0 5mm; }
    h1, h2, h3 { color: ${NAVY}; font-weight: 400; }
    .cover-letter { min-height: 248mm; padding-top: 12mm; display: flex; flex-direction: column; justify-content: center; page-break-after: always; }
    .cover-letter p, .cover-letter li { max-width: 145mm; font-size: 11pt; line-height: 1.6; }
    .cover-letter ul { max-width: 145mm; margin: -1mm 0 5mm; padding-left: 7mm; }
    .cover-letter .signoff { margin-top: 9mm; color: ${NAVY}; font-weight: 700; }
    .cover-letter .email { color: ${GOLD}; }
    .title-cover { min-height: 248mm; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; page-break-after: always; }
    .title-cover h1 { font-size: 40pt; line-height: 1.08; letter-spacing: -.04em; margin: 0; }
    .title-cover p { margin-top: 4mm; color: ${MID_GREY}; font-size: 11pt; }
    .title-cover .brand { position: absolute; right: 18mm; bottom: 28mm; color: ${NAVY}; font-size: 20pt; letter-spacing: -.04em; }
    .title-cover .brand em { color: ${GOLD}; font-style: normal; }
    .chapter, .annex-section { break-before: page; page-break-before: always; }
    .chapter { min-height: 220mm; padding-bottom: 12mm; }
    .chapter-kicker { color: ${GOLD}; font-family: Arial, sans-serif; font-size: 7.5pt; font-weight: 700; letter-spacing: .17em; text-transform: uppercase; }
    .chapter h1, .annex-section > h1 { margin: 5mm 0 0; font-size: 28pt; line-height: 1.1; letter-spacing: -.035em; }
    .gold-rule { width: 22mm; height: 1.4pt; margin: 5mm 0 7mm; background: ${GOLD}; }
    .report-prose { max-width: 158mm; }
    .report-prose p { widows: 3; orphans: 3; break-inside: avoid; page-break-inside: avoid; }
    .report-prose h3 { margin: 9mm 0 3mm; font-family: Arial, sans-serif; font-size: 9pt; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; break-after: avoid-page; page-break-after: avoid; }
    .report-prose ul, .report-prose ol { margin: 0 0 6mm; padding-left: 6mm; }
    .report-prose li { margin-bottom: 2mm; break-inside: avoid; page-break-inside: avoid; }
    .report-prose strong { color: ${NAVY}; }
    .report-prose em { color: #6d5b35; }
    .markdown-table, .score-table, .variant-table, .annex-score-table { margin: 4mm 0 7mm; overflow: hidden; border: .5pt solid #ddd5c8; }
    table { width: 100%; border-collapse: collapse; }
    th { background: ${NAVY}; color: #fff; font-family: Arial, sans-serif; font-size: 8pt; letter-spacing: .05em; text-align: left; }
    th, td { padding: 2.4mm 2.8mm; vertical-align: top; border-bottom: .5pt solid #e7e0d5; }
    td { font-size: 9.2pt; }
    tbody tr:nth-child(even) { background: #faf7f0; }
    .score-table td { vertical-align: middle; }
    .score-table td:nth-child(1) { width: 8mm; color: ${MID_GREY}; }
    .score-table td:nth-child(2) { width: 42mm; }
    .score-table td:nth-child(3) { width: auto; }
    .score-table .score { width: 14mm; color: ${MID_GREY}; text-align: right; }
    .bar { display: block; height: 2.7mm; overflow: hidden; border-radius: 10px; background: #e8e0d4; }
    .bar > span { display: block; height: 100%; border-radius: inherit; }
    .insights-wrap { display: grid; grid-template-columns: 70mm 1fr; gap: 8mm; align-items: center; margin: 8mm 0; break-inside: avoid; page-break-inside: avoid; }
    .wheel { margin: 0; text-align: center; }
    .wheel img { max-width: 63mm; width: 100%; height: auto; }
    .energy-cards { display: grid; gap: 3mm; }
    .energy-card, .axis-grid > div, .insights-detail-grid > div { background: #f1ece2; padding: 4mm; }
    .energy-card span, .axis-grid span, .insights-detail-grid > div > span { display: block; color: ${GOLD}; font-family: Arial, sans-serif; font-size: 7pt; font-weight: 700; letter-spacing: .11em; text-transform: uppercase; }
    .energy-card strong { display: block; margin-top: 1.5mm; color: ${NAVY}; font-size: 15pt; font-weight: 400; }
    .axis-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 3mm; margin: 5mm 0; break-inside: avoid; page-break-inside: avoid; }
    .axis-grid strong { display: block; margin-top: 1.5mm; color: ${NAVY}; font-size: 10pt; }
    .axis-grid small { display: block; margin-top: 1mm; color: ${MID_GREY}; font: 7.5pt/1.3 Arial, sans-serif; }
    .insights-detail-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 3mm; margin: 5mm 0 8mm; break-inside: avoid; page-break-inside: avoid; }
    .insights-detail-grid ul { margin: 3mm 0 0; padding-left: 4.5mm; font-size: 8.5pt; }
    .insights-detail-grid p { margin: 3mm 0 0; font-size: 8.5pt; line-height: 1.42; }
    .variant-table .current-variant { background: #f0e6cc; font-weight: 700; }
    .confidential-bar { margin-top: 9mm; padding: 5mm; background: ${NAVY}; color: ${CREAM}; font: 8.5pt/1.4 Arial, sans-serif; text-align: center; }
    .annex-cover { min-height: 248mm; padding: 22mm; display: flex; flex-direction: column; justify-content: space-between; background: ${NAVY}; color: #fff; page-break-before: always; page-break-after: always; }
    .annex-cover .annex-brand { color: ${GOLD}; font-size: 14pt; letter-spacing: .03em; margin: 0 0 42mm; }
    .annex-cover span { display: block; font-size: 42pt; line-height: 1.02; }
    .annex-cover .gold-rule { margin: 8mm 0 5mm; }
    .annex-cover h2 { margin: 1mm 0 9mm; color: #fff; font-size: 21pt; }
    .annex-cover .annex-small { margin: 0; color: ${GOLD}; font: 700 8pt/1.2 Arial, sans-serif; letter-spacing: .14em; text-transform: uppercase; }
    .annex-cover .contents { margin-top: 15mm; }
    .annex-cover ol { margin: 5mm 0 0; padding-left: 6mm; color: #f5f0e8; }
    .annex-cover li { margin-bottom: 3mm; }
    .annex-section { min-height: 220mm; padding-bottom: 10mm; }
    .annex-section > h1 { font-size: 25pt; }
    .annex-section > h2 { margin: 9mm 0 3mm; font-family: Arial, sans-serif; font-size: 11pt; font-weight: 700; letter-spacing: .06em; }
    .annex-section > h3 { margin: 7mm 0 3mm; font-family: Arial, sans-serif; font-size: 9pt; letter-spacing: .06em; }
    .annex-intro, .empty-note { color: ${MID_GREY}; font-style: italic; }
    .data-row { display: grid; grid-template-columns: 52mm 1fr; gap: 6mm; padding: 2.5mm 0; border-bottom: .5pt solid #ded6ca; }
    .data-row strong { color: ${MID_GREY}; font: 700 8.5pt Arial, sans-serif; }
    .career-row, .annex-decade article { break-inside: avoid; page-break-inside: avoid; border-bottom: .5pt solid #ded6ca; padding: 4mm 0; }
    .career-row > div, .achievement-meta, .domain-heading { display: flex; justify-content: space-between; gap: 5mm; }
    .career-row strong, .achievement-meta strong { color: ${NAVY}; }
    .career-row > div span, .achievement-meta span { color: ${MID_GREY}; font-size: 9pt; }
    .career-row > p { margin: 3mm 0 0; font-size: 9pt; }
    .annex-decade h3 { margin: 9mm 0 3mm; color: ${GOLD}; font: 700 8pt Arial, sans-serif; letter-spacing: .13em; text-transform: uppercase; }
    .achievement-meta .esf { color: ${GOLD}; font-weight: 700; font-size: 7.5pt; letter-spacing: .08em; }
    .annex-decade article p { margin: 2mm 0 0; font-size: 9pt; }
    .annex-decade .enrichment { color: ${MID_GREY}; font-style: italic; }
    .annex-score-table .top td { color: ${GOLD}; font-weight: 700; }
    .annex-score-table .bottom td { color: #999; }
    .annex-score-table td:nth-child(1) { width: 12mm; }
    .annex-score-table td:nth-child(2) { width: 54mm; }
    .annex-score-table td:nth-child(3) { width: 38mm; }
    .annex-score-table td:nth-child(4) { width: auto; }
    .annex-score-table td:nth-child(5) { width: 19mm; text-align: right; }
    .ocean-domain { margin: 8mm 0; break-inside: avoid; page-break-inside: avoid; }
    .domain-heading { align-items: baseline; margin-bottom: 2.5mm; }
    .domain-heading strong { color: ${NAVY}; font-family: Arial, sans-serif; font-size: 10pt; letter-spacing: .06em; }
    .domain-heading span { color: ${MID_GREY}; font-size: 9pt; }
    .facet-list { margin-top: 3mm; }
    .facet-list > div { display: grid; grid-template-columns: 46mm 1fr 11mm; gap: 4mm; align-items: center; padding: 1.4mm 0; }
    .facet-list span { font-size: 8.5pt; }
    .facet-list strong { color: ${MID_GREY}; font: 700 8.5pt Arial, sans-serif; text-align: right; }
    @media print { .chapter, .annex-section { break-before: page; page-break-before: always; } }
  </style>
</head>
<body>
  <main>
    <section class="cover-letter">
      <p>Hi ${escapeHtml(source.clientName)}</p>
      <p>So here’s your Lifework report.</p>
      <p>It’s me – Jamie – the creator of the Lifework process – writing this cover note, not the very clever AI Alistair – the Analyst. (He would probably write it better than me. Not that I’m jealous)</p>
      <p>You’ve put a lot of work into giving me the information necessary to do what we set out to achieve – to understand yourself, and what makes you, “you”</p>
      <p>So your report is a big read.</p>
      <ul><li>If you’re naturally impatient it’s OK to start with Chapter 7 – Conclusions. It’s here we summarise what we believe to be true, and give you a suggested reply to that dreaded interview question “So, tell me about yourself”.</li><li>If you’re more patient, the report builds your analysis from your early years life history, step-by-step, so you can see how the analysis unfolds.</li></ul>
      <p>One really important thing. Your report is the basis for reflecting, thinking and discussing. It’s built on the information you told us and the psychometric instruments that you engaged with. It’s therefore OK to disagree with anything we’ve written. Alistair may be able to help you unpack why we believe it to be true, but you remain the expert on you. If you – plus your friends and colleagues (always worth checking in with) – see something we’ve missed, Great. The overall aim is to help you know you, in the context of “what’s next?”</p>
      <p>If you have any concerns about what has been raised in this report, feel free to email me.</p>
      <p class="signoff">Jamie Pennington</p><p class="email">Jamie@penningtonhennessy.com</p>
    </section>
    <section class="title-cover"><h1>${escapeHtml(source.clientFullName)}</h1><p>${escapeHtml(source.generatedAt)}</p><p class="brand">Life<em>work</em></p></section>
    ${chapterHtml("1. Lifework Summary", source.summary)}
    ${chapterHtml("2. Life History Pattern", source.lifeHistoryPattern)}
    ${chapterHtml("2b. 4 Pillars of Fulfilment", source.fourPillars)}
    ${viaChapter}
    ${personalityChapter}
    ${behaviourChapter}
    ${chapterHtml(chapterTitle(source, 6), source.developmentEdge)}
    ${chapterHtml("7. Conclusions", source.coachingQuestions)}
    ${chapterHtml(chapterTitle(source, 8), source.careerDirections)}
    ${appendixHtml(source)}
    ${annexHtml(snapshot)}
  </main>
</body>
</html>`;
}

export async function renderFaithfulLayoutBetaPdf(input: { snapshot: FaithfulLayoutBetaSnapshot }): Promise<Buffer> {
  const puppeteer = (await import("puppeteer")).default;
  const directory = await mkdtemp(join(tmpdir(), "lifework-faithful-layout-beta-"));
  const htmlPath = join(directory, "report.html");
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: findChromiumExecutable(),
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
  });
  try {
    await writeFile(htmlPath, await renderFaithfulLayoutBetaHtml(input.snapshot), "utf8");
    const page = await browser.newPage();
    await page.goto(`file://${htmlPath}`, { waitUntil: "networkidle0" });
    await page.emulateMediaType("print");
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
      displayHeaderFooter: true,
      headerTemplate: `<div style="width:100%;padding:0 18mm;color:${MID_GREY};font-family:Arial,sans-serif;font-size:7pt;letter-spacing:.1em;text-transform:uppercase;display:flex;justify-content:space-between;"><span>Lifework Career Analysis</span><span>${escapeHtml(input.snapshot.source.clientFullName)}</span></div>`,
      footerTemplate: `<div style="width:100%;padding:0 18mm;color:${MID_GREY};font-family:Arial,sans-serif;font-size:7pt;letter-spacing:.07em;text-transform:uppercase;display:flex;justify-content:space-between;"><span>Lifework</span><span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>`,
      margin: { top: "24mm", right: "18mm", bottom: "22mm", left: "18mm" },
    });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
    await rm(directory, { recursive: true, force: true });
  }
}

export async function renderFaithfulLayoutBetaHtmlForTest(snapshot: FaithfulLayoutBetaSnapshot): Promise<string> {
  return renderFaithfulLayoutBetaHtml(snapshot);
}
