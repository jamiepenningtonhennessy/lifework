/**
 * Tests for the PDF export markdown-to-HTML conversion.
 *
 * These tests verify that the markdownToHTML helper (embedded in buildReportHTML)
 * correctly converts markdown pipe tables to HTML <table> elements, and that
 * standard markdown elements (headings, bold, italic, lists) still render correctly
 * alongside tables.
 *
 * Because markdownToHTML is a private closure inside buildReportHTML, we replicate
 * the exact same logic here for unit-testing purposes.
 */

import { describe, expect, it } from "vitest";

// -----------------------------------------------------------------------
// Replicate the markdownToHTML closure from server/pdf-export.ts
// Any change to the production function must be mirrored here.
// -----------------------------------------------------------------------
function markdownToHTML(md: string): string {
  if (!md) return "";

  // 1. Extract and replace markdown tables before any other processing
  const tablePlaceholders: string[] = [];
  const withTablesReplaced = md.replace(
    /^(\|.+\|\s*\n)(\|[-:| ]+\|\s*\n)((?:\|.+\|\s*\n?)*)/gm,
    (_match: string, headerRow: string, separatorRow: string, bodyRows: string) => {
      const headers = headerRow
        .split("|")
        .slice(1, -1)
        .map((h: string) => h.trim());

      const alignments = separatorRow
        .split("|")
        .slice(1, -1)
        .map((s: string) => {
          const t = s.trim();
          if (t.startsWith(":") && t.endsWith(":")) return "center";
          if (t.endsWith(":")) return "right";
          return "left";
        });

      const rows = bodyRows
        .trim()
        .split("\n")
        .filter((r: string) => r.trim().length > 0)
        .map((r: string) =>
          r
            .split("|")
            .slice(1, -1)
            .map((c: string) => c.trim())
        );

      const headerHTML = headers
        .map(
          (h: string, i: number) =>
            `<th style="text-align:${alignments[i] ?? "left"};padding:7px 10px;background:#0f1f35;color:#fff;font-size:12px;font-weight:600;white-space:nowrap;">${h}</th>`
        )
        .join("");

      const bodyHTML = rows
        .map(
          (cells: string[], ri: number) =>
            `<tr style="background:${ri % 2 === 0 ? "#fdf9f3" : "#f5ede0"};">${cells
              .map(
                (c: string, i: number) =>
                  `<td style="text-align:${alignments[i] ?? "left"};padding:6px 10px;font-size:12px;color:#1a1008;border-bottom:1px solid #e8e0d8;">${c.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/\*(.+?)\*/g, "<em>$1</em>")}</td>`
              )
              .join("")}</tr>`
        )
        .join("");

      const tableHTML = `<div style="overflow-x:auto;margin:16px 0;"><table style="width:100%;border-collapse:collapse;border:1px solid rgba(201,151,58,0.4);"><thead><tr>${headerHTML}</tr></thead><tbody>${bodyHTML}</tbody></table></div>`;

      const idx = tablePlaceholders.length;
      tablePlaceholders.push(tableHTML);
      return `%%TABLE_${idx}%%`;
    }
  );

  // 2. Apply standard markdown transformations
  let html = withTablesReplaced
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/^- (.+)$/gm, "<li>$1</li>")
    .replace(/(<li>.*<\/li>\n?)+/g, "<ul>$&</ul>")
    .replace(/\n\n/g, "</p><p>")
    .replace(/^(?!<[h|u|l|p%])(.+)$/gm, "<p>$1</p>");

  // 3. Restore table placeholders
  tablePlaceholders.forEach((tableHTML, idx) => {
    html = html.replace(`%%TABLE_${idx}%%`, tableHTML);
  });

  return html;
}

// -----------------------------------------------------------------------
// Tests
// -----------------------------------------------------------------------

describe("markdownToHTML — markdown table rendering", () => {
  it("converts a simple 3-column markdown table to an HTML <table>", () => {
    const md = `| Strength | Rank | Frequency |
|---|---|---|
| Curiosity | 1 | 5 |
| Kindness | 2 | 3 |`;

    const html = markdownToHTML(md);

    expect(html).toContain("<table");
    expect(html).toContain("<thead>");
    expect(html).toContain("<tbody>");
    expect(html).toContain("<th");
    expect(html).toContain("Strength");
    expect(html).toContain("Rank");
    expect(html).toContain("Frequency");
    expect(html).toContain("Curiosity");
    expect(html).toContain("Kindness");
    // Must NOT contain raw pipe characters in the output
    expect(html).not.toContain("| Strength |");
    expect(html).not.toContain("| Curiosity |");
  });

  it("renders the VIA Evidence Table with 6 columns correctly", () => {
    const md = `| Strength | Survey Rank | Freq (of 8) | Identity Salience | Achievements with evidence | VIA Definition |
|---|:---:|:---:|---|---|---|
| Curiosity | 1 | 6/8 | High | Built a telescope; explored caves | A love of novelty and challenge |
| Kindness | 2 | 4/8 | Medium | Volunteered at shelter | Doing favours and good deeds |`;

    const html = markdownToHTML(md);

    expect(html).toContain("<table");
    expect(html).toContain("Survey Rank");
    expect(html).toContain("Freq (of 8)");
    expect(html).toContain("Identity Salience");
    expect(html).toContain("VIA Definition");
    expect(html).toContain("6/8");
    expect(html).toContain("A love of novelty and challenge");
    // No raw pipe characters
    expect(html).not.toMatch(/\| Curiosity \|/);
  });

  it("handles bold text inside table cells", () => {
    const md = `| Strength | Notes |
|---|---|
| **Curiosity** | Core strength |`;

    const html = markdownToHTML(md);
    expect(html).toContain("<strong>Curiosity</strong>");
  });

  it("preserves text before and after the table", () => {
    const md = `## Key Findings

Some introductory text.

| Strength | Rank |
|---|---|
| Curiosity | 1 |

Some concluding text.`;

    const html = markdownToHTML(md);
    expect(html).toContain("<h2>Key Findings</h2>");
    expect(html).toContain("Some introductory text");
    expect(html).toContain("<table");
    expect(html).toContain("Curiosity");
    expect(html).toContain("Some concluding text");
  });

  it("handles multiple tables in the same document", () => {
    const md = `| A | B |
|---|---|
| 1 | 2 |

Some text between tables.

| X | Y |
|---|---|
| 3 | 4 |`;

    const html = markdownToHTML(md);
    const tableCount = (html.match(/<table/g) ?? []).length;
    expect(tableCount).toBe(2);
    expect(html).toContain("Some text between tables");
  });
});

describe("markdownToHTML — standard markdown elements", () => {
  it("converts headings correctly", () => {
    const html = markdownToHTML("# H1\n## H2\n### H3");
    expect(html).toContain("<h1>H1</h1>");
    expect(html).toContain("<h2>H2</h2>");
    expect(html).toContain("<h3>H3</h3>");
  });

  it("converts bold and italic text", () => {
    const html = markdownToHTML("**bold** and *italic*");
    expect(html).toContain("<strong>bold</strong>");
    expect(html).toContain("<em>italic</em>");
  });

  it("converts unordered lists", () => {
    const html = markdownToHTML("- Item one\n- Item two");
    expect(html).toContain("<li>Item one</li>");
    expect(html).toContain("<li>Item two</li>");
    expect(html).toContain("<ul>");
  });

  it("returns empty string for empty input", () => {
    expect(markdownToHTML("")).toBe("");
  });
});
