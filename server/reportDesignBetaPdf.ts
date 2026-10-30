import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createRequire } from "node:module";
import type { ReportDesignBetaSnapshot, ReportDesignSectionKey } from "../shared/wowReportDesignBeta";
import { DESIGN_BETA_SECTION_LABELS } from "../shared/wowReportDesignBeta";

const require = createRequire(import.meta.url);

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function markdownToHtml(source: string): string {
  const escaped = escapeHtml(source).trim();
  if (!escaped) return "";

  const lines = escaped.split(/\r?\n/);
  const html: string[] = [];
  let paragraphs: string[] = [];
  let listItems: string[] = [];

  const flushParagraphs = () => {
    if (paragraphs.length) {
      html.push(`<p>${paragraphs.join(" ")}</p>`);
      paragraphs = [];
    }
  };
  const flushList = () => {
    if (listItems.length) {
      html.push(`<ul>${listItems.map((item) => `<li>${item}</li>`).join("")}</ul>`);
      listItems = [];
    }
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      flushParagraphs();
      flushList();
      continue;
    }
    const heading = trimmed.match(/^###?\s+(.+)$/);
    if (heading) {
      flushParagraphs();
      flushList();
      html.push(`<h3>${heading[1]}</h3>`);
      continue;
    }
    const bullet = trimmed.match(/^[-•]\s+(.+)$/);
    if (bullet) {
      flushParagraphs();
      listItems.push(bullet[1]);
      continue;
    }
    flushList();
    paragraphs.push(trimmed);
  }
  flushParagraphs();
  flushList();

  return html.join("\n")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>");
}

function sectionHtml(snapshot: ReportDesignBetaSnapshot, key: ReportDesignSectionKey): string {
  const plan = snapshot.layoutPlan.sections.find((section) => section.key === key);
  const text = snapshot.sourceSections[key]?.trim();
  if (!plan || !text) return "";
  const labels = DESIGN_BETA_SECTION_LABELS[key];
  const classes = [
    "report-section",
    `treatment-${plan.treatment}`,
    `emphasis-${plan.emphasis}`,
    plan.breakBefore ? "break-before" : "",
  ].filter(Boolean).join(" ");

  return `
    <section class="${classes}">
      <div class="section-topline">
        <span>${escapeHtml(labels.eyebrow)}</span>
        <span>${escapeHtml(labels.sourceLabel)}</span>
      </div>
      <h2>${escapeHtml(labels.title)}</h2>
      <div class="gold-rule"></div>
      <div class="report-prose">${markdownToHtml(text)}</div>
    </section>`;
}

function renderDesignBetaHtml(snapshot: ReportDesignBetaSnapshot, clientName: string): string {
  const sections = snapshot.layoutPlan.sourceOrder
    .map((key) => sectionHtml(snapshot, key))
    .filter(Boolean)
    .join("\n");

  return `<!doctype html>
<html lang="en-GB">
<head>
  <meta charset="utf-8" />
  <title>Lifework Report Design Beta — ${escapeHtml(clientName)}</title>
  <style>
    @page { size: A4; margin: 22mm 18mm 21mm 18mm; }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; background: #f5f0e8; color: #1A2744; }
    body { font-family: Georgia, 'Times New Roman', serif; font-size: 10.4pt; line-height: 1.55; }
    .cover { min-height: 254mm; display: flex; flex-direction: column; justify-content: space-between; page-break-after: always; }
    .cover-mark, .section-topline { display: flex; justify-content: space-between; gap: 8mm; font-family: Arial, sans-serif; font-weight: 700; font-size: 7.5pt; letter-spacing: .17em; text-transform: uppercase; color: #B8862F; }
    .cover-brand { font-family: Georgia, serif; font-size: 22pt; letter-spacing: -.04em; color: #1A2744; }
    .cover-brand em { color: #B8862F; font-weight: normal; }
    .cover-main { padding: 32mm 0 22mm; }
    .cover-main h1 { max-width: 125mm; margin: 0; font-size: 38pt; line-height: 1.03; font-weight: 400; letter-spacing: -.04em; }
    .cover-main h1 em { color: #B8862F; font-weight: 400; }
    .cover-main p { max-width: 118mm; margin: 11mm 0 0; font-size: 14pt; line-height: 1.5; color: #3d4a64; }
    .cover-meta { border-top: 1pt solid #B8862F; padding-top: 6mm; display: grid; grid-template-columns: repeat(2, 1fr); gap: 5mm 12mm; font-family: Arial, sans-serif; font-size: 8.5pt; color: #4e596c; }
    .cover-meta b { display: block; margin-bottom: 1.5mm; color: #1A2744; font-size: 7pt; letter-spacing: .12em; text-transform: uppercase; }
    .intro { margin: 0 0 12mm; padding: 0 0 8mm; border-bottom: 1pt solid #d9cdbd; }
    .intro p { max-width: 138mm; margin: 4mm 0 0; font-size: 13pt; line-height: 1.5; color: #3d4a64; }
    .report-section { margin: 0 0 12mm; padding: 0 0 12mm; border-bottom: .5pt solid #ded6ca; break-inside: auto; page-break-inside: auto; }
    .report-section.break-before { margin-top: 16mm; }
    .report-section h2 { max-width: 138mm; margin: 3mm 0 0; color: #1A2744; font-size: 22pt; line-height: 1.12; font-weight: 400; letter-spacing: -.025em; break-after: avoid-page; page-break-after: avoid; }
    .gold-rule { width: 18mm; height: 1.2pt; margin: 4mm 0 6mm; background: #B8862F; }
    .report-prose { color: #26354e; }
    .report-prose p { margin: 0 0 4.5mm; widows: 3; orphans: 3; break-inside: avoid; page-break-inside: avoid; }
    .report-prose h3 { margin: 7mm 0 3mm; color: #1A2744; font-family: Arial, sans-serif; font-size: 9pt; letter-spacing: .09em; text-transform: uppercase; break-after: avoid-page; page-break-after: avoid; }
    .report-prose ul { margin: 0 0 5mm; padding-left: 6mm; }
    .report-prose li { margin: 0 0 2.4mm; break-inside: avoid; page-break-inside: avoid; }
    .report-prose strong { color: #1A2744; }
    .report-prose em { color: #6d5b35; }
    .treatment-opening h2, .treatment-direction h2, .treatment-closing h2 { font-size: 26pt; }
    .emphasis-featured { background: #fbfaf7; border-left: 2pt solid #B8862F; padding: 8mm 9mm 9mm; }
    .emphasis-featured .section-topline { margin-top: 0; }
    .treatment-evidence .report-prose, .treatment-lens .report-prose { font-size: 9.8pt; }
    .beta-note { margin-top: 12mm; border-top: 1pt solid #B8862F; padding-top: 5mm; font-family: Arial, sans-serif; font-size: 8pt; line-height: 1.5; color: #667085; }
  </style>
</head>
<body>
  <main>
    <section class="cover">
      <div class="cover-mark"><span class="cover-brand">Life<em>work</em></span><span>Report Design Beta 1</span></div>
      <div class="cover-main">
        <div class="cover-mark"><span>Reader-first edition</span><span>Internal counsellor review</span></div>
        <h1>A report that gives <em>the evidence</em> room to breathe.</h1>
        <p>This is an editorial format experiment built from the completed report. The analysis is unchanged; the reading experience is being tested.</p>
      </div>
      <div class="cover-meta">
        <div><b>Prepared for review</b>${escapeHtml(clientName)}</div>
        <div><b>Source</b>Completed Lifework WOW Report</div>
        <div><b>Design principle</b>Flowing pages, not fixed-height panels</div>
        <div><b>Release status</b>Not client-facing</div>
      </div>
    </section>
    <section class="intro">
      <div class="section-topline"><span>Lifework</span><span>Editorial test</span></div>
      <p>Begin with recognition, move into the evidence and lenses, and close with the choices and questions that matter next.</p>
    </section>
    ${sections}
    <p class="beta-note">This protected design beta retains the frozen source report prose. It is for internal review only and does not replace, amend or release the production report.</p>
  </main>
</body>
</html>`;
}

function findChromiumExecutable(): string | undefined {
  const candidates = [
    process.env.PUPPETEER_EXECUTABLE_PATH,
    "/usr/bin/chromium-browser",
    "/usr/bin/chromium",
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
  ].filter((value): value is string => Boolean(value));

  for (const candidate of candidates) {
    try {
      require("node:fs").accessSync(candidate);
      return candidate;
    } catch {
      // Continue through candidates; Puppeteer will use its managed browser last.
    }
  }
  return undefined;
}

export async function renderReportDesignBetaPdf(input: {
  snapshot: ReportDesignBetaSnapshot;
  clientName: string;
}): Promise<Buffer> {
  const puppeteer = (await import("puppeteer")).default;
  const directory = await mkdtemp(join(tmpdir(), "lifework-design-beta-"));
  const htmlPath = join(directory, "report.html");
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: findChromiumExecutable(),
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
  });

  try {
    await writeFile(htmlPath, renderDesignBetaHtml(input.snapshot, input.clientName), "utf8");
    const page = await browser.newPage();
    await page.goto(`file://${htmlPath}`, { waitUntil: "networkidle0" });
    await page.emulateMediaType("print");
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
      displayHeaderFooter: true,
      headerTemplate: `<div style="width:100%;padding:0 18mm;color:#B8862F;font-family:Arial,sans-serif;font-size:7pt;font-weight:700;letter-spacing:.14em;text-transform:uppercase;display:flex;justify-content:space-between;"><span>Lifework · Report Design Beta 1</span><span>Internal counsellor review</span></div>`,
      footerTemplate: `<div style="width:100%;padding:0 18mm;color:#667085;font-family:Arial,sans-serif;font-size:7.5pt;letter-spacing:.07em;text-transform:uppercase;display:flex;justify-content:space-between;"><span>Lifework · Report Design Beta 1 · Internal review</span><span>Confidential · Page <span class="pageNumber"></span> of <span class="totalPages"></span></span></div>`,
      margin: { top: "22mm", right: "18mm", bottom: "21mm", left: "18mm" },
    });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
    await rm(directory, { recursive: true, force: true });
  }
}

export function renderReportDesignBetaHtmlForTest(snapshot: ReportDesignBetaSnapshot, clientName = "Fictional Client") {
  return renderDesignBetaHtml(snapshot, clientName);
}
