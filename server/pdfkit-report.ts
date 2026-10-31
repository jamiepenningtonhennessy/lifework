/**
 * pdfkit-report.ts
 * Pure Node.js PDF renderer for the WOW report using PDFKit.
 * No system dependencies — works in any Node.js environment.
 */
import PDFDocument from "pdfkit";

// ─── Colours ──────────────────────────────────────────────────────────────────
const NAVY = "#1a2744";
const GOLD = "#c9a84c";
const WARM_BG = "#f9f5ef";
const MID_GREY = "#666666";
const LIGHT_GREY = "#cccccc";
const WHITE = "#ffffff";
const BLACK = "#111111";

// ─── Page geometry ────────────────────────────────────────────────────────────
const PAGE_W = 595.28; // A4 width in points
const PAGE_H = 841.89; // A4 height in points
const MARGIN = 50;
const CONTENT_W = PAGE_W - MARGIN * 2;
// Keep a clear gutter above the footer. PDFKit otherwise begins an implicit
// page break in the middle of a block without a branded continuation header.
const CONTENT_BOTTOM = PAGE_H - 64;

// ─── Fonts (PDFKit built-ins — always available) ──────────────────────────────
const SERIF = "Times-Roman";
const SERIF_BOLD = "Times-Bold";
const SERIF_ITALIC = "Times-Italic";
const SANS = "Helvetica";
const SANS_BOLD = "Helvetica-Bold";

// ─── OCEAN pole labels ───────────────────────────────────────────────────────
const OCEAN_POLES: Record<string, [string, string]> = {
  Openness:          ["Conventional", "Open"],
  Conscientiousness: ["Flexible", "Disciplined"],
  Extraversion:      ["Introverted", "Extraverted"],
  Agreeableness:     ["Challenging", "Agreeable"],
  Neuroticism:       ["Stable", "Reactive"],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function s(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v);
}
function arr<T>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : [];
}
function obj(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}
/** Safely coerce a value to a finite number; returns fallback (default 0) if NaN/undefined. */
function num(v: unknown, fallback = 0): number {
  const n = Number(v);
  return isFinite(n) ? n : fallback;
}

// Strip HTML tags from text. Historical survey rows can omit an optional label,
// so formatting must never turn an absent display value into a report failure.
function stripHtml(text: unknown): string {
  return String(text ?? "").replace(/<[^>]*>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ").replace(/&#8212;/g, "—").replace(/&#8211;/g, "–").replace(/&#8216;/g, "'").replace(/&#8217;/g, "'").replace(/&#8220;/g, '"').replace(/&#8221;/g, '"');
}

// ─── Chapter header band ──────────────────────────────────────────────────────
function chapterHeader(
  doc: PDFKit.PDFDocument,
  chapterNum: string,
  chapterTitle: string,
  warm = false
) {
  // Background
  if (warm) {
    doc.rect(0, 0, PAGE_W, PAGE_H).fill(WARM_BG);
  }
  // Navy top band
  doc.rect(0, 0, PAGE_W, 72).fill(NAVY);
  // Chapter kicker
  doc.font(SANS).fontSize(9).fillColor(GOLD).text(`Chapter ${chapterNum}`, MARGIN, 22, { width: CONTENT_W });
  // Chapter title
  doc.font(SANS_BOLD).fontSize(16).fillColor(WHITE).text(chapterTitle, MARGIN, 38, { width: CONTENT_W });
  // Gold rule
  doc.rect(MARGIN, 70, CONTENT_W, 2).fill(GOLD);
  doc.y = 90;
}

// ─── Section heading ──────────────────────────────────────────────────────────
function sectionHeading(doc: PDFKit.PDFDocument, text: string) {
  doc.moveDown(0.5);
  doc.font(SANS_BOLD).fontSize(13).fillColor(NAVY).text(stripHtml(text), MARGIN, doc.y, { width: CONTENT_W });
  doc.moveDown(0.3);
}

// ─── Body paragraph ───────────────────────────────────────────────────────────
function bodyPara(doc: PDFKit.PDFDocument, text: string, indent = 0) {
  if (!text || !text.trim()) return;
  doc.font(SERIF).fontSize(10.5).fillColor(BLACK).text(stripHtml(text), MARGIN + indent, doc.y, {
    width: CONTENT_W - indent,
    align: "justify",
    lineGap: 2,
  });
  doc.moveDown(0.6);
}

type ChapterFlow = {
  before: (height: number) => void;
  paragraph: (text: string, indent?: number) => void;
  section: (text: string, followingHeight?: number) => void;
  bullet: (text: string) => void;
  quote: (text: string) => void;
  paragraphHeight: (text: string, indent?: number) => number;
  bulletHeight: (text: string) => number;
};

/**
 * Keeps complete report blocks within the printable area. Without this guard,
 * PDFKit can start a page mid-sentence and omit the chapter continuation header.
 */
function createChapterFlow(
  doc: PDFKit.PDFDocument,
  chapterNumber: string,
  chapterTitle: string,
  clientName: string,
  warm = false,
): ChapterFlow {
  const startContinuation = () => {
    pageFooter(doc, clientName);
    doc.addPage();
    chapterHeader(doc, chapterNumber, `${chapterTitle} (continued)`, warm);
  };

  const ensureSpace = (height: number) => {
    if (doc.y + height > CONTENT_BOTTOM) startContinuation();
  };

  const paragraphHeight = (text: string, indent = 0) => {
    if (!text || !text.trim()) return 0;
    doc.font(SERIF).fontSize(10.5);
    return doc.heightOfString(stripHtml(text), {
      width: CONTENT_W - indent,
      align: "justify",
      lineGap: 2,
    }) + 10;
  };

  const bulletHeight = (text: string) => {
    doc.font(SERIF_ITALIC).fontSize(10.5);
    return doc.heightOfString(`• ${stripHtml(text)}`, {
      width: CONTENT_W - 10,
      lineGap: 2,
    }) + 7;
  };

  return {
    before: ensureSpace,
    paragraphHeight,
    bulletHeight,
    paragraph: (text, indent = 0) => {
      if (!text || !text.trim()) return;
      ensureSpace(paragraphHeight(text, indent));
      bodyPara(doc, text, indent);
    },
    section: (text, followingHeight = 0) => {
      if (!text || !text.trim()) return;
      doc.font(SANS_BOLD).fontSize(13);
      const headingHeight = doc.heightOfString(stripHtml(text), { width: CONTENT_W }) + 18;
      ensureSpace(headingHeight + followingHeight);
      sectionHeading(doc, text);
    },
    bullet: (text) => {
      if (!text || !text.trim()) return;
      ensureSpace(bulletHeight(text));
      doc.font(SERIF_ITALIC).fontSize(10.5).fillColor(NAVY).text(`• ${stripHtml(text)}`, MARGIN + 10, doc.y, {
        width: CONTENT_W - 10,
        lineGap: 2,
      });
      doc.moveDown(0.3);
    },
    quote: (text) => {
      if (!text || !text.trim()) return;
      doc.font(SERIF_ITALIC).fontSize(12);
      const quoteHeight = Math.max(
        40,
        doc.heightOfString(`"${stripHtml(text)}"`, { width: CONTENT_W - 12, lineGap: 3 }),
      ) + 25;
      ensureSpace(quoteHeight);
      pullQuote(doc, text);
    },
  };
}

// ─── Pull-quote ───────────────────────────────────────────────────────────────
function pullQuote(doc: PDFKit.PDFDocument, text: string) {
  if (!text || !text.trim()) return;
  doc.moveDown(0.5);
  doc.rect(MARGIN, doc.y, 3, 40).fill(GOLD);
  doc.font(SERIF_ITALIC).fontSize(12).fillColor(NAVY).text(
    `"${stripHtml(text)}"`,
    MARGIN + 12,
    doc.y,
    { width: CONTENT_W - 12, lineGap: 3 }
  );
  doc.moveDown(0.8);
}

// ─── Horizontal bar chart ─────────────────────────────────────────────────────
function barChart(
  doc: PDFKit.PDFDocument,
  items: Array<{ label: string; value: number; maxValue?: number }>,
  options: { barColor?: string; labelWidth?: number; barHeight?: number } = {}
) {
  const barColor = options.barColor ?? NAVY;
  const labelWidth = options.labelWidth ?? 160;
  const barHeight = options.barHeight ?? 14;
  const barAreaWidth = CONTENT_W - labelWidth - 50;
  const gap = 6;

  for (const item of items) {
    const maxVal = item.maxValue ?? 100;
    const pct = Math.min(num(item.value) / Math.max(num(maxVal, 100), 1), 1);
    const barWidth = Math.max(pct * barAreaWidth, 2);
    const y = doc.y;

    // Label
    doc.font(SANS).fontSize(9).fillColor(BLACK).text(
      stripHtml(item.label),
      MARGIN,
      y + 2,
      { width: labelWidth, ellipsis: true }
    );
    // Background track
    doc.rect(MARGIN + labelWidth, y, barAreaWidth, barHeight).fill("#e8e8e8");
    // Filled bar
    doc.rect(MARGIN + labelWidth, y, barWidth, barHeight).fill(barColor);
    // Score label
    doc.font(SANS).fontSize(8).fillColor(MID_GREY).text(
      String(num(item.value)),
      MARGIN + labelWidth + barAreaWidth + 4,
      y + 2,
      { width: 40 }
    );
    doc.y = y + barHeight + gap;
  }
  doc.moveDown(0.5);
}

// ─── OCEAN domain bar (bidirectional, centred at 50) ─────────────────────────
function oceanBar(
  doc: PDFKit.PDFDocument,
  label: string,
  score: number,
  leftLabel: string,
  rightLabel: string
) {
  const y = doc.y;
  const trackW = CONTENT_W - 20;
  const trackX = MARGIN + 10;
  const midX = trackX + trackW / 2;
  const pct = Math.min(Math.max(num(score, 50) / 100, 0), 1);
  const barX = pct < 0.5 ? midX + (pct - 0.5) * trackW : midX;
  const barW = Math.abs(pct - 0.5) * trackW;

  // Domain label
  doc.font(SANS_BOLD).fontSize(10).fillColor(NAVY).text(label, MARGIN, y, { width: CONTENT_W });
  const y2 = doc.y + 2;

  // Pole labels
  doc.font(SANS).fontSize(8).fillColor(MID_GREY).text(leftLabel, trackX, y2, { width: 80 });
  doc.font(SANS).fontSize(8).fillColor(MID_GREY).text(rightLabel, trackX + trackW - 80, y2, { width: 80, align: "right" });
  const y3 = y2 + 12;

  // Track
  doc.rect(trackX, y3, trackW, 12).fill("#e8e8e8");
  // Bar
  doc.rect(barX, y3, barW, 12).fill(NAVY);
  // Centre line
  doc.rect(midX - 1, y3, 2, 12).fill(GOLD);
  // Score
  doc.font(SANS).fontSize(8).fillColor(MID_GREY).text(`${score}`, midX + (pct - 0.5) * trackW + (pct >= 0.5 ? 4 : -20), y3 + 1, { width: 20 });

  doc.y = y3 + 18;
  doc.moveDown(0.3);
}

// ─── Evidence table ───────────────────────────────────────────────────────────
function evidenceTable(
  doc: PDFKit.PDFDocument,
  rows: Array<{ name: string; definition: string; rank: number; frequency: string; achievements: string }>
) {
  const cols = [90, 150, 40, 60, 155];
  const headers = ["Strength", "VIA Definition", "Rank", "Freq", "Achievements"];
  const colX = [MARGIN, MARGIN + cols[0], MARGIN + cols[0] + cols[1], MARGIN + cols[0] + cols[1] + cols[2], MARGIN + cols[0] + cols[1] + cols[2] + cols[3]];

  // Header row
  doc.rect(MARGIN, doc.y, CONTENT_W, 16).fill(NAVY);
  headers.forEach((h, i) => {
    doc.font(SANS_BOLD).fontSize(8).fillColor(WHITE).text(h, colX[i] + 2, doc.y - 14, { width: cols[i] - 4 });
  });
  doc.y += 4;

  // Data rows
  rows.forEach((row, idx) => {
    const rowY = doc.y;
    const rowBg = idx % 2 === 0 ? "#f5f0e8" : WHITE;
    const rowHeight = 28;
    doc.rect(MARGIN, rowY, CONTENT_W, rowHeight).fill(rowBg);

    const cells = [
      s(row.name),
      s(row.definition),
      String(row.rank),
      s(row.frequency),
      s(row.achievements),
    ];
    cells.forEach((cell, i) => {
      doc.font(SERIF).fontSize(8).fillColor(BLACK).text(
        stripHtml(cell),
        colX[i] + 2,
        rowY + 4,
        { width: cols[i] - 4, height: rowHeight - 6, ellipsis: true }
      );
    });
    doc.y = rowY + rowHeight;
  });
  doc.moveDown(0.5);
}

// ─── Page footer ──────────────────────────────────────────────────────────────
function pageFooter(doc: PDFKit.PDFDocument, clientName: string) {
  doc.font(SANS).fontSize(8).fillColor(LIGHT_GREY)
    .text(`Lifework · ${clientName}`, MARGIN, PAGE_H - 30, {
      width: CONTENT_W,
      align: "center",
    });
}

// ─── Cover page ───────────────────────────────────────────────────────────────
function renderCoverPage(doc: PDFKit.PDFDocument, data: Record<string, unknown>) {
  const client = obj(data.CLIENT);
  const covering = obj(data.COVERING_LETTER);
  const name = s(client.NAME) || "Client";

  // Full navy background
  doc.rect(0, 0, PAGE_W, PAGE_H).fill(NAVY);

  // Gold accent bar left
  doc.rect(0, 0, 8, PAGE_H).fill(GOLD);

  // "LIFEWORK" wordmark
  doc.font(SANS_BOLD).fontSize(11).fillColor(GOLD).text("LIFEWORK", MARGIN + 10, 60, { characterSpacing: 4 });

  // "WOW Report" title
  doc.font(SERIF_BOLD).fontSize(42).fillColor(WHITE).text("WOW Report", MARGIN + 10, 110, { width: CONTENT_W - 20 });

  // Subtitle
  doc.font(SERIF_ITALIC).fontSize(18).fillColor(GOLD).text("Who You Are · What You Offer · Where You Fit", MARGIN + 10, 165, { width: CONTENT_W - 20 });

  // Gold rule
  doc.rect(MARGIN + 10, 200, 200, 2).fill(GOLD);

  // Client name
  doc.font(SERIF_BOLD).fontSize(28).fillColor(WHITE).text(name, MARGIN + 10, 220, { width: CONTENT_W - 20 });

  // Date
  const dateStr = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  doc.font(SANS).fontSize(11).fillColor(GOLD).text(dateStr, MARGIN + 10, 265, { width: CONTENT_W - 20 });

  // Footer
  doc.font(SANS).fontSize(9).fillColor(GOLD).text("Lifework · lifeworkpath.com", MARGIN + 10, PAGE_H - 50, { width: CONTENT_W - 20 });
}

// ─── Covering letter page ─────────────────────────────────────────────────────
function renderCoveringLetter(doc: PDFKit.PDFDocument, data: Record<string, unknown>) {
  const covering = obj(data.COVERING_LETTER);
  const client = obj(data.CLIENT);
  const name = s(client.NAME) || "Client";

  doc.addPage();
  // Warm background
  doc.rect(0, 0, PAGE_W, PAGE_H).fill(WARM_BG);

  // Navy top band
  doc.rect(0, 0, PAGE_W, 72).fill(NAVY);
  doc.font(SANS_BOLD).fontSize(16).fillColor(WHITE).text("Covering Letter", MARGIN, 38, { width: CONTENT_W });
  doc.rect(MARGIN, 70, CONTENT_W, 2).fill(GOLD);

  doc.y = 95;

  // Salutation
  doc.font(SERIF_BOLD).fontSize(12).fillColor(NAVY).text(`Dear ${name},`, MARGIN, doc.y, { width: CONTENT_W });
  doc.moveDown(0.8);

  // Paragraphs
  const paras = arr<string>(covering.PARAGRAPHS);
  for (const para of paras) {
    bodyPara(doc, para);
  }

  // Sign-off
  doc.moveDown(0.5);
  doc.font(SERIF).fontSize(10.5).fillColor(BLACK).text(s(covering.SIGN_OFF), MARGIN, doc.y, { width: CONTENT_W });
  doc.moveDown(0.3);
  doc.font(SERIF_BOLD).fontSize(10.5).fillColor(NAVY).text(s(covering.AUTHOR_NAME), MARGIN, doc.y, { width: CONTENT_W });
  doc.font(SERIF).fontSize(9).fillColor(MID_GREY).text(s(covering.AUTHOR_EMAIL), MARGIN, doc.y, { width: CONTENT_W });

  pageFooter(doc, name);
}

// ─── Chapter 1: Summary ───────────────────────────────────────────────────────
function renderCh1(doc: PDFKit.PDFDocument, data: Record<string, unknown>) {
  const ch1 = obj(data.CH1);
  const client = obj(data.CLIENT);
  const name = s(client.NAME) || "Client";

  doc.addPage();
  chapterHeader(doc, "01", "Summary");
  const flow = createChapterFlow(doc, "01", "Summary", name);

  const hero = s(ch1.HERO);
  if (hero) {
    doc.font(SERIF_ITALIC).fontSize(14);
    flow.before(doc.heightOfString(stripHtml(hero), { width: CONTENT_W, lineGap: 4 }) + 28);
    doc.font(SERIF_ITALIC).fontSize(14).fillColor(NAVY).text(stripHtml(hero), MARGIN, doc.y, {
      width: CONTENT_W,
      lineGap: 4,
    });
    doc.moveDown(1);
  }

  const paras = arr<string>(ch1.PARAGRAPHS);
  for (const para of paras) {
    flow.paragraph(para);
  }

  pageFooter(doc, name);
}

// ─── Chapter 2: Life History Pattern ─────────────────────────────────────────
function renderCh2(doc: PDFKit.PDFDocument, data: Record<string, unknown>) {
  const ch2 = obj(data.CH2);
  const client = obj(data.CLIENT);
  const name = s(client.NAME) || "Client";

  doc.addPage();
  chapterHeader(doc, "02", "Life History Pattern");
  const firstPageFlow = createChapterFlow(doc, "02", "Life History Pattern", name);

  firstPageFlow.paragraph(s(ch2.LEDE));

  const p1Paras = arr<string>(ch2.PAGE1_PARAGRAPHS);
  for (const para of p1Paras) firstPageFlow.paragraph(para);

  const p1SH = s(ch2.PAGE1_SECTION_H);
  const p1SPars = arr<string>(ch2.PAGE1_SECTION_PARAS);
  if (p1SH) firstPageFlow.section(p1SH, firstPageFlow.paragraphHeight(p1SPars[0] ?? ""));
  for (const para of p1SPars) firstPageFlow.paragraph(para);

  // Page 2 — ESF / key findings
  pageFooter(doc, name);
  doc.addPage();
  chapterHeader(doc, "02", "Life History Pattern", true);
  const secondPageFlow = createChapterFlow(doc, "02", "Life History Pattern", name, true);

  const keyfind = obj(ch2.KEYFIND);
  const kfParas = arr<string>(keyfind.PARAGRAPHS);
  secondPageFlow.section("What the pattern reveals", secondPageFlow.paragraphHeight(kfParas[0] ?? ""));
  for (const para of kfParas) secondPageFlow.paragraph(para);

  const esfPara = s(keyfind.ESF_PARA);
  if (esfPara) {
    secondPageFlow.section("Your ESF distribution", secondPageFlow.paragraphHeight(esfPara));
    secondPageFlow.paragraph(esfPara);
  }

  const p2SH = s(ch2.PAGE2_SECTION_H);
  const p2Paras = arr<string>(ch2.PAGE2_PARAGRAPHS);
  if (p2SH) secondPageFlow.section(p2SH, secondPageFlow.paragraphHeight(p2Paras[0] ?? ""));
  for (const para of p2Paras) secondPageFlow.paragraph(para);

  pageFooter(doc, name);
}

// ─── Chapter 3: Character Strengths (VIA) ────────────────────────────────────
function renderCh3(doc: PDFKit.PDFDocument, data: Record<string, unknown>) {
  const ch3 = obj(data.CH3);
  const via = obj(data.VIA);
  const client = obj(data.CLIENT);
  const name = s(client.NAME) || "Client";

  // Page 1 — VIA ranking bars
  doc.addPage();
  chapterHeader(doc, "03", "Character Strengths · VIA");
  const rankingFlow = createChapterFlow(doc, "03", "Character Strengths · VIA", name);

  rankingFlow.paragraph(s(ch3.LEDE));

  const top10 = arr<{ name: string; score: number }>(via.TOP10);
  if (top10.length > 0) {
    rankingFlow.before(18 + top10.length * 20 + 20);
    sectionHeading(doc, "Your top 10 strengths");
    barChart(doc, top10.map(s => ({ label: s.name, value: s.score, maxValue: 5 })), { barColor: NAVY, labelWidth: 180 });
  }

  // Page 2 — Evidence table
  pageFooter(doc, name);
  doc.addPage();
  chapterHeader(doc, "03", "Character Strengths · Evidence", true);

  sectionHeading(doc, "The evidence table · top 5");
  const evidence = arr<{ name: string; definition: string; rank: number; frequency: string; achievements: string }>(via.EVIDENCE);
  if (evidence.length > 0) {
    evidenceTable(doc, evidence.slice(0, 5));
  }

  doc.font(SANS).fontSize(8).fillColor(MID_GREY).text(s(via.VIRTUES_NOTE), MARGIN, doc.y, { width: CONTENT_W });
  doc.moveDown(0.5);

  // Page 3 — Key findings
  pageFooter(doc, name);
  doc.addPage();
  chapterHeader(doc, "03", "Character Strengths · Key Findings");
  const findingsFlow = createChapterFlow(doc, "03", "Character Strengths · Key Findings", name);

  const kf = arr<string>(ch3.KEY_FINDINGS);
  for (const para of kf) findingsFlow.paragraph(para);

  pageFooter(doc, name);
}

// ─── Chapter 4: Personality Profile (OCEAN) ──────────────────────────────────
function renderCh4(doc: PDFKit.PDFDocument, data: Record<string, unknown>) {
  const ch4 = obj(data.CH4);
  const ocean = obj(data.OCEAN);
  const client = obj(data.CLIENT);
  const name = s(client.NAME) || "Client";

  // Page 1 — OCEAN bars
  doc.addPage();
  chapterHeader(doc, "04", "Personality Profile · OCEAN");
  const oceanFlow = createChapterFlow(doc, "04", "Personality Profile · OCEAN", name);

  oceanFlow.paragraph(s(ch4.LEDE));

  // OCEAN.DOMAINS uses `name` and `pct` (0-100 percentile) from claudeExport
  const domains = arr<{ name?: string; label?: string; pct?: number; score?: number; leftPole?: string; rightPole?: string }>(ocean.DOMAINS);
  oceanFlow.before(domains.length * 44 + 28);
  for (const domain of domains) {
    const domainLabel = s(domain.label ?? domain.name);
    const domainScore = num(domain.score ?? domain.pct, 50);
    const poles = OCEAN_POLES[domainLabel] ?? ["Low", "High"];
    const leftPole = s(domain.leftPole ?? poles[0]);
    const rightPole = s(domain.rightPole ?? poles[1]);
    oceanBar(doc, domainLabel, domainScore, leftPole, rightPole);
  }

  doc.font(SANS).fontSize(8).fillColor(MID_GREY).text(s(ocean.FACET_NOTE), MARGIN, doc.y, { width: CONTENT_W });
  doc.moveDown(0.5);

  // Page 2 — Psychometrics narrative
  pageFooter(doc, name);
  doc.addPage();
  chapterHeader(doc, "04", "Personality Profile · Narrative", true);
  const narrativeFlow = createChapterFlow(doc, "04", "Personality Profile · Narrative", name, true);

  const psychParas = arr<string>(ch4.PSYCHOMETRICS_PARAS);
  narrativeFlow.section("What the psychometrics show", narrativeFlow.paragraphHeight(psychParas[0] ?? ""));
  for (const para of psychParas) narrativeFlow.paragraph(para);

  const synthParas = arr<string>(ch4.SYNTHESIS_PARAS);
  narrativeFlow.section("Where the two pictures meet", narrativeFlow.paragraphHeight(synthParas[0] ?? ""));
  for (const para of synthParas) narrativeFlow.paragraph(para);

  const keyfind = obj(ch4.KEYFIND);
  const kfTitle = s(keyfind.TITLE);
  const kfBody = s(keyfind.BODY);
  if (kfTitle) narrativeFlow.section(kfTitle, narrativeFlow.paragraphHeight(kfBody));
  if (kfBody) narrativeFlow.paragraph(kfBody);

  pageFooter(doc, name);
}

// ─── Chapter 5: Insights Colours ─────────────────────────────────────────────
function renderCh5(doc: PDFKit.PDFDocument, data: Record<string, unknown>) {
  const ch5 = obj(data.CH5);
  const client = obj(data.CLIENT);
  const name = s(client.NAME) || "Client";

  doc.addPage();
  chapterHeader(doc, "05", "Insights Colours");
  const flow = createChapterFlow(doc, "05", "Insights Colours", name);

  flow.paragraph(s(ch5.LEDE));

  const primary = obj(ch5.PRIMARY);
  const secondary = obj(ch5.SECONDARY);

  if (s(primary.name)) {
    const traits = s(primary.traits);
    flow.section(`Primary colour: ${stripHtml(s(primary.name))}`, flow.paragraphHeight(traits));
    doc.font(SERIF).fontSize(10.5).fillColor(BLACK).text(s(primary.traits), MARGIN, doc.y, { width: CONTENT_W });
    doc.moveDown(0.5);
  }

  if (s(secondary.name)) {
    const traits = s(secondary.traits);
    flow.section(`Secondary colour: ${stripHtml(s(secondary.name))}`, flow.paragraphHeight(traits));
    doc.font(SERIF).fontSize(10.5).fillColor(BLACK).text(s(secondary.traits), MARGIN, doc.y, { width: CONTENT_W });
    doc.moveDown(0.5);
  }

  const jungian = obj(ch5.JUNGIAN);
  if (s(jungian.code)) {
    flow.section("Jungian type", 30);
    doc.font(SERIF_BOLD).fontSize(14).fillColor(NAVY).text(`${s(jungian.code)} · ${s(jungian.spelt)}`, MARGIN, doc.y, { width: CONTENT_W });
    doc.moveDown(0.5);
  }

  const strengths = arr<string>(ch5.STRENGTHS);
  if (strengths.length > 0) {
    flow.section("Strengths", flow.paragraphHeight(strengths.join(" · ")));
    doc.font(SERIF).fontSize(10.5).fillColor(BLACK).text(strengths.join(" · "), MARGIN, doc.y, { width: CONTENT_W });
    doc.moveDown(0.5);
  }

  const watchouts = arr<string>(ch5.WATCHOUTS);
  if (watchouts.length > 0) {
    flow.section("Watch-outs", flow.paragraphHeight(watchouts.join(" · ")));
    doc.font(SERIF).fontSize(10.5).fillColor(BLACK).text(watchouts.join(" · "), MARGIN, doc.y, { width: CONTENT_W });
    doc.moveDown(0.5);
  }

  const fit = s(ch5.FIT);
  if (fit) {
    flow.section("Best-fit environments", flow.paragraphHeight(fit));
    flow.paragraph(fit);
  }

  pageFooter(doc, name);
}

// ─── Chapter 6: Development Edge ─────────────────────────────────────────────
function renderCh6(doc: PDFKit.PDFDocument, data: Record<string, unknown>) {
  const ch6 = obj(data.CH6);
  const client = obj(data.CLIENT);
  const name = s(client.NAME) || "Client";

  doc.addPage();
  chapterHeader(doc, "06", "Development Edge");
  const flow = createChapterFlow(doc, "06", "Development Edge", name);

  const sections = arr<{ heading: string; paragraphs: string[] }>(ch6.SECTIONS);
  for (const section of sections) {
    const paragraphs = arr<string>(section.paragraphs);
    if (section.heading) flow.section(section.heading, flow.paragraphHeight(paragraphs[0] ?? ""));
    for (const para of paragraphs) flow.paragraph(para);
  }

  const pullquote = s(ch6.PULLQUOTE);
  if (pullquote) flow.quote(pullquote);

  pageFooter(doc, name);
}

// ─── Chapter 7: Coaching Questions ───────────────────────────────────────────
function renderCh7(doc: PDFKit.PDFDocument, data: Record<string, unknown>) {
  const ch7 = obj(data.CH7);
  const client = obj(data.CLIENT);
  const name = s(client.NAME) || "Client";

  doc.addPage();
  chapterHeader(doc, "07", "Coaching Questions", true);
  const flow = createChapterFlow(doc, "07", "Coaching Questions", name, true);

  const past = arr<string>(ch7.PAST);
  if (past.length > 0) {
    flow.section("Past", flow.bulletHeight(past[0] ?? ""));
    for (const q of past) flow.bullet(q);
  }

  const present = arr<string>(ch7.PRESENT);
  if (present.length > 0) {
    flow.section("Present", flow.bulletHeight(present[0] ?? ""));
    for (const q of present) flow.bullet(q);
  }

  const pq = s(ch7.PRESENT_PULLQUOTE);
  if (pq) flow.quote(pq);

  const future = arr<string>(ch7.FUTURE);
  if (future.length > 0) {
    // Future is the closing coaching section. Keep it together so the reader
    // does not encounter a near-bottom heading or a single orphaned item.
    const futureHeight = future.reduce((total, item) => total + flow.bulletHeight(item), 0);
    flow.section("Future", futureHeight);
    for (const q of future) flow.bullet(q);
  }

  pageFooter(doc, name);
}

// ─── Chapter 8: Career Directions ────────────────────────────────────────────
function renderCh8(doc: PDFKit.PDFDocument, data: Record<string, unknown>) {
  const ch8 = obj(data.CH8);
  const client = obj(data.CLIENT);
  const name = s(client.NAME) || "Client";

  doc.addPage();
  chapterHeader(doc, "08", "Career Directions");
  const flow = createChapterFlow(doc, "08", "Career Directions", name);

  const directions = arr<{ heading: string; paragraphs: string[] }>(ch8.DIRECTIONS);
  for (const dir of directions) {
    const paragraphs = arr<string>(dir.paragraphs);
    if (dir.heading) flow.section(dir.heading, flow.paragraphHeight(paragraphs[0] ?? ""));
    for (const para of paragraphs) flow.paragraph(para);
  }

  const overflow = arr<{ heading: string; paragraphs: string[] }>(ch8.OVERFLOW_DIRECTIONS);
  if (overflow.length > 0) {
    pageFooter(doc, name);
    doc.addPage();
    chapterHeader(doc, "08", "Career Directions (continued)");
    const overflowFlow = createChapterFlow(doc, "08", "Career Directions", name);
    for (const dir of overflow) {
      const paragraphs = arr<string>(dir.paragraphs);
      if (dir.heading) overflowFlow.section(dir.heading, overflowFlow.paragraphHeight(paragraphs[0] ?? ""));
      for (const para of paragraphs) overflowFlow.paragraph(para);
    }
  }

  pageFooter(doc, name);
}

// ─── Appendix: Achievements ───────────────────────────────────────────────────
function renderAppendix(doc: PDFKit.PDFDocument, data: Record<string, unknown>) {
  const appendix = obj(data.APPENDIX);
  const client = obj(data.CLIENT);
  const name = s(client.NAME) || "Client";

  const achievements = arr<{ decade: string; title: string; description: string; sageEnrichment: string }>(appendix.ACHIEVEMENTS);
  if (achievements.length === 0) return;

  doc.addPage();
  chapterHeader(doc, "A", "Appendix · Life History Achievements");

  let currentDecade = "";
  for (const ach of achievements) {
    if (ach.decade !== currentDecade) {
      currentDecade = ach.decade;
      doc.moveDown(0.3);
      doc.font(SANS_BOLD).fontSize(10).fillColor(GOLD).text(currentDecade, MARGIN, doc.y, { width: CONTENT_W });
      doc.moveDown(0.2);
    }
    doc.font(SERIF_BOLD).fontSize(10).fillColor(NAVY).text(stripHtml(ach.title), MARGIN, doc.y, { width: CONTENT_W });
    if (ach.description) {
      doc.font(SERIF).fontSize(9.5).fillColor(BLACK).text(stripHtml(ach.description), MARGIN + 10, doc.y, { width: CONTENT_W - 10, lineGap: 1 });
    }
    if (ach.sageEnrichment) {
      doc.font(SERIF_ITALIC).fontSize(9).fillColor(MID_GREY).text(stripHtml(ach.sageEnrichment), MARGIN + 10, doc.y, { width: CONTENT_W - 10, lineGap: 1 });
    }
    doc.moveDown(0.5);

    // Auto page break
    if (doc.y > PAGE_H - 80) {
      doc.addPage();
      chapterHeader(doc, "A", "Appendix · Life History Achievements (continued)");
    }
  }

  pageFooter(doc, name);
}

// ─── Main export ──────────────────────────────────────────────────────────────
export function generatePdfKitReport(data: Record<string, unknown>): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: "A4",
        margin: 0,
        autoFirstPage: false,
        info: {
          Title: "WOW Report",
          Author: "Lifework",
          Subject: "Lifework WOW Report",
        },
      });

      const chunks: Buffer[] = [];
      doc.on("data", (chunk: Buffer) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      // Add first page manually
      doc.addPage();

      // Render all sections
      renderCoverPage(doc, data);
      renderCoveringLetter(doc, data);
      renderCh1(doc, data);
      renderCh2(doc, data);
      renderCh3(doc, data);
      renderCh4(doc, data);
      renderCh5(doc, data);
      renderCh6(doc, data);
      renderCh7(doc, data);
      renderCh8(doc, data);
      renderAppendix(doc, data);

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
