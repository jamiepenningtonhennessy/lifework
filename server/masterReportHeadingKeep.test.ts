import { execFileSync } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { renderHtmlReport } from "./html-report";
import { withMasterReportBrowser } from "./masterReportBrowser";
import {
  generateMasterReportPdf,
  resolveChromiumPath,
} from "./masterReportPdf";

// All content is fictional. No DB, routes, live model calls, external fonts or
// browser MCP. The real master CSS supplies typography; fixture-only dimensions
// make the cut boundary deterministic independently of local font availability.
const masterCss = renderHtmlReport({}).match(/<style>([\s\S]*?)<\/style>/)?.[1];
if (!masterCss)
  throw new Error("The approved master stylesheet was not found.");

function fixture(content: string): string {
  return `<!doctype html><html><head><meta charset="utf-8"><style>${masterCss}
    @page { size: A4 portrait; margin: 0; }
    html, body { margin: 0; padding: 0; display: block; }
    .page { width: 210mm; min-height: 297mm; height: 297mm;
      margin: 0; box-shadow: none; break-after: page; flex-shrink: 0; }
    .page:last-child { break-after: auto; page-break-after: auto; }
    .band, .foot { box-sizing: border-box; height: 64px; min-height: 64px; }
    .body { display: block; padding: 44px 74px 22px; }
    .main { display: flow-root; }
    .main > .fixture-heading { box-sizing: border-box; height: 40px; margin: 0; padding: 0; }
    .main > h2.fixture-heading { height: 48px; }
    .fixture-block { box-sizing: border-box; margin: 0; padding: 0;
      display: flex; flex-direction: column; justify-content: space-between; }
    .fixture-paragraph, .fixture-card { height: 120px; }
    .fixture-table { height: 120px; width: 100%; border-spacing: 0; margin: 0; }
    .fixture-table td { padding: 0; vertical-align: top; }
    .fixture-table tr:last-child td { vertical-align: bottom; }
  </style></head><body><section class="page">
    <div class="band"><span class="wm">Lifework</span><span>Fictional heading fixture</span></div>
    <div class="body"><main class="main">${content}</main></div>
    <div class="foot"><span>Fictional footer</span><span class="cur">12</span></div>
  </section></body></html>`;
}

function spacer(height: number, marker: string): string {
  return `<div class="fixture-block" style="height:${height}px"><span>${marker}</span></div>`;
}

function heading(marker: string, tag: "h2" | "h3" = "h3"): string {
  const approvedClass =
    tag === "h2" ? "chap-title section-title" : "section-h sub-head";
  return `<${tag} class="${approvedClass} fixture-heading" data-fixture-heading>${marker}</${tag}>`;
}

function paragraph(start: string, end: string, height = 120): string {
  return `<p class="fixture-block fixture-paragraph" data-fixture-substantive style="height:${height}px"><span>${start}</span><span>${end}</span></p>`;
}

function table(start: string, end: string): string {
  return `<table class="fixture-table evidence" data-fixture-substantive><tbody><tr><td>${start}</td></tr><tr><td>${end}</td></tr></tbody></table>`;
}

function card(start: string, end: string): string {
  return `<div class="fixture-block fixture-card keyfind" data-fixture-substantive><span>${start}</span><span>${end}</span></div>`;
}

const normalise = (text: string) => text.replace(/\s+/g, " ").trim();

async function pdfPages(html: string): Promise<string[]> {
  const directory = await mkdtemp(join(tmpdir(), "master-heading-keep-"));
  try {
    const path = join(directory, "fictional.pdf");
    await writeFile(path, await generateMasterReportPdf(html));
    const text = execFileSync("pdftotext", ["-layout", path, "-"], {
      encoding: "utf8",
    });
    // Poppler emits a final form-feed; discard only that terminator, not any
    // interior empty page (which must fail the retention/page-count checks).
    const pages = text.split("\f");
    if (pages.at(-1)?.trim() === "") pages.pop();
    return pages.map(normalise);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

/** Assert the actual PDF retains each content marker exactly once, in order. */
function expectRetention(pages: string[], markers: string[]): void {
  const text = pages.join("\n");
  let previous = -1;
  for (const marker of markers) {
    const position = text.indexOf(marker);
    expect(
      position,
      `Missing or reordered PDF content: ${marker}`
    ).toBeGreaterThan(previous);
    expect(
      text.indexOf(marker, position + marker.length),
      `Duplicated PDF content: ${marker}`
    ).toBe(-1);
    previous = position;
  }
  for (const [index, page] of pages.entries()) {
    expect(
      markers.some(marker => page.includes(marker)),
      `Spurious empty/header-only PDF page ${index + 1}`
    ).toBe(true);
    expect(page).toContain("Lifework");
    expect(page.toUpperCase()).toContain("FICTIONAL FOOTER");
  }
}

function expectSamePage(
  pages: string[],
  markers: string[],
  expectedPage: number
): void {
  for (const marker of markers) {
    const placements = pages.flatMap((page, index) =>
      page.includes(marker) ? [index + 1] : []
    );
    expect(placements, `PDF page placement for ${marker}`).toEqual([
      expectedPage,
    ]);
  }
}

/** Prove this is the orphaning boundary, not merely a naturally fitting group. */
async function expectHeadingFitsButContentDoesNot(html: string): Promise<void> {
  const executablePath = await resolveChromiumPath();
  const bounds = await withMasterReportBrowser(
    executablePath,
    async browser => {
      const context = await browser.createBrowserContext();
      try {
        const page = await context.newPage();
        await page.setContent(html, { waitUntil: "domcontentloaded" });
        await page.evaluate(() => document.fonts.ready);
        return await page.evaluate(() => {
          const footer = document.querySelector(".foot")!;
          const headings = Array.from(
            document.querySelectorAll("[data-fixture-heading]")
          );
          const substantive = document.querySelector(
            "[data-fixture-substantive]"
          )!;
          return {
            safeBottom: footer.getBoundingClientRect().top - 22,
            headingBottom:
              headings[headings.length - 1].getBoundingClientRect().bottom,
            substantiveBottom: substantive.getBoundingClientRect().bottom,
          };
        });
      } finally {
        await context.close();
      }
    }
  );
  expect(
    bounds.headingBottom,
    "Fixture headings must fit before the footer guard"
  ).toBeLessThan(bounds.safeBottom - 10);
  expect(
    bounds.substantiveBottom,
    "First substantive sibling must cross the footer guard"
  ).toBeGreaterThan(bounds.safeBottom + 40);
}

describe("Quiet Authority heading keep — actual Chromium PDF pages", () => {
  it("moves a standalone h3.sub-head with its first complete paragraph", async () => {
    const markers = [
      "FictionalLeadA",
      "HeadingAnchorA",
      "BodyStartA",
      "BodyEndA",
    ];
    const html = fixture(
      spacer(860, markers[0]) +
        heading(markers[1]) +
        paragraph(markers[2], markers[3])
    );
    await expectHeadingFitsButContentDoesNot(html);
    const pages = await pdfPages(html);
    expectRetention(pages, markers);
    expect(pages).toHaveLength(2);
    expectSamePage(pages, [markers[0]], 1);
    expectSamePage(pages, markers.slice(1), 2);
  }, 60_000);

  it("keeps consecutive h2.section-title and h3.sub-head with the first paragraph", async () => {
    const markers = [
      "FictionalLeadB",
      "SectionAnchorB",
      "SubheadingAnchorB",
      "BodyStartB",
      "BodyEndB",
    ];
    const html = fixture(
      spacer(820, markers[0]) +
        heading(markers[1], "h2") +
        heading(markers[2]) +
        paragraph(markers[3], markers[4])
    );
    await expectHeadingFitsButContentDoesNot(html);
    const pages = await pdfPages(html);
    expectRetention(pages, markers);
    expect(pages).toHaveLength(2);
    expectSamePage(pages, markers.slice(1), 2);
  }, 60_000);

  it.each([
    { kind: "table", substantive: table },
    { kind: "card", substantive: card },
  ])(
    "moves introductory headings with their first $kind",
    async ({ kind, substantive }) => {
      const markers = [
        `FictionalLead${kind}`,
        `SectionAnchor${kind}`,
        `SubheadingAnchor${kind}`,
        `ContentStart${kind}`,
        `ContentEnd${kind}`,
      ];
      const html = fixture(
        spacer(820, markers[0]) +
          heading(markers[1], "h2") +
          heading(markers[2]) +
          substantive(markers[3], markers[4])
      );
      await expectHeadingFitsButContentDoesNot(html);
      const pages = await pdfPages(html);
      expectRetention(pages, markers);
      expect(pages).toHaveLength(2);
      expectSamePage(pages, markers.slice(1), 2);
    },
    60_000
  );

  it("repeats heading keeps on successive continuations without dropping or reordering content", async () => {
    const markers = ["FictionalLeadRepeat"];
    let content = spacer(860, markers[0]);
    for (let index = 1; index <= 3; index += 1) {
      const group = [
        `RepeatHeading${index}`,
        `RepeatBodyStart${index}`,
        `RepeatBodyEnd${index}`,
      ];
      markers.push(...group);
      content += heading(group[0]) + paragraph(group[1], group[2]);
      if (index < 3) {
        const filler = `RepeatFiller${index}`;
        markers.push(filler);
        content += spacer(700, filler);
      }
    }
    const pages = await pdfPages(fixture(content));
    expectRetention(pages, markers);
    expect(pages).toHaveLength(4);
    expectSamePage(pages, [markers[0]], 1);
    for (let index = 1; index <= 3; index += 1) {
      expectSamePage(
        pages,
        [
          `RepeatHeading${index}`,
          `RepeatBodyStart${index}`,
          `RepeatBodyEnd${index}`,
        ],
        index + 1
      );
    }
  }, 60_000);

  it("keeps only the first substantive sibling, not an entire paragraph chain", async () => {
    const markers = [
      "FictionalLeadChain",
      "HeadingAnchorChain",
      "FirstBodyStartChain",
      "FirstBodyEndChain",
      "LaterBodyStartChain",
      "LaterBodyEndChain",
    ];
    const html = fixture(
      spacer(860, markers[0]) +
        heading(markers[1]) +
        paragraph(markers[2], markers[3]) +
        paragraph(markers[4], markers[5], 800)
    );
    await expectHeadingFitsButContentDoesNot(html);
    const pages = await pdfPages(html);
    expectRetention(pages, markers);
    expect(pages).toHaveLength(3);
    expectSamePage(pages, markers.slice(1, 4), 2);
    expectSamePage(pages, markers.slice(4), 3);
  }, 60_000);

  it.each([0, 100])(
    "rejects an oversized heading/content unit after a %ipx lead without a spurious continuation",
    async leadHeight => {
      const content =
        (leadHeight ? spacer(leadHeight, "OversizedLead") : "") +
        heading("PrivateFictionalHeadingSentinel") +
        paragraph(
          "PrivateFictionalStartSentinel",
          "PrivateFictionalEndSentinel",
          1000
        );
      let failure: unknown;
      try {
        await generateMasterReportPdf(fixture(content));
      } catch (error) {
        failure = error;
      }
      expect(
        failure,
        "Oversized groups must fail rather than return a PDF with blank/overflow pages"
      ).toBeInstanceOf(Error);
      const message = (failure as Error).message;
      expect(message).toMatch(/heading\/content unit taller/i);
      expect(message).not.toContain("PrivateFictional");

      // A rejected render must release its context/busy guard. A subsequent normal
      // render must contain precisely one real page, not an abandoned continuation.
      const markers = [
        "RecoveryHeading",
        "RecoveryBodyStart",
        "RecoveryBodyEnd",
      ];
      const pages = await pdfPages(
        fixture(heading(markers[0]) + paragraph(markers[1], markers[2]))
      );
      expectRetention(pages, markers);
      expect(pages).toHaveLength(1);
      expectSamePage(pages, markers, 1);
    },
    60_000
  );
});
