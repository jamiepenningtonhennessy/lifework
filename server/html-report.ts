/**
 * html-report.ts
 *
 * Express route: GET /api/report/html/:clientId
 *
 * Renders the Lifework WOW Report as a fully-styled HTML page using the
 * lifework-template.html design system.  The CSS is inlined (not loaded from
 * CDN) so it renders correctly when the browser's print dialog is used.
 *
 * CDN URLs (uploaded via manus-upload-file --webdev):
 *   Tangram: https://d2xsxph8kpxj0f.cloudfront.net/107696804/kFbbE6kqNApXGDFpQJUGV7/ph-tangram_8a2cd166.jpg
 */

import { Request, Response } from "express";
import { buildClaudeExportJson } from "./routers/claudeExport.js";
import { sdk } from "./_core/sdk.js";

// ─── CDN constants ────────────────────────────────────────────────────────────

const CDN_TANGRAM = "https://d2xsxph8kpxj0f.cloudfront.net/107696804/kFbbE6kqNApXGDFpQJUGV7/ph-tangram_8a2cd166.jpg";

// ─── Markdown stripper ────────────────────────────────────────────────────────
/**
 * Strip markdown syntax from a string so it renders as plain prose in HTML.
 * Handles: **bold**, *italic*, __bold__, _italic_, ### headings, ` code `,
 * pipe-table lines, and leading bullet markers.
 */
function stripMarkdown(text: string): string {
  if (!text) return "";
  return text
    // Remove markdown table lines entirely (lines starting with |)
    .split("\n")
    .filter(line => !line.trim().startsWith("|"))
    .join("\n")
    // Remove heading markers
    .replace(/^#{1,6}\s+/gm, "")
    // Remove bold/italic markers
    .replace(/\*\*\*(.+?)\*\*\*/g, "$1")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/___(.+?)___/g, "$1")
    .replace(/__(.+?)__/g, "$1")
    .replace(/_(.+?)_/g, "$1")
    // Remove inline code
    .replace(/`(.+?)`/g, "$1")
    // Remove leading bullet markers
    .replace(/^[-*•]\s+/gm, "")
    // Collapse multiple blank lines
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Strip markdown from a single paragraph string (no newlines expected).
 */
function stripMd(text: string): string {
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

// ─── Template renderer ────────────────────────────────────────────────────────

/**
 * Resolve a dotted path like "CLIENT.FIRST_NAME" against a data object.
 * Handles dot-prefixed paths like ".paragraphs" (used inside EACH blocks)
 * by treating them as top-level keys on the data object.
 * Returns "" for missing paths.
 */
function resolvePath(data: Record<string, unknown>, path: string): unknown {
  const trimmed = path.trim();
  // Dot-prefixed path like ".paragraphs" — resolve directly on data
  if (trimmed.startsWith(".")) {
    const key = trimmed.slice(1);
    if (key === "") return data;
    return (data as Record<string, unknown>)[key] ?? "";
  }
  const parts = trimmed.split(".");
  let cur: unknown = data;
  for (const p of parts) {
    if (cur == null || typeof cur !== "object") return "";
    cur = (cur as Record<string, unknown>)[p];
  }
  return cur ?? "";
}

/**
 * Render a single {{TOKEN}} substitution.
 * If the value is an array, join with ", ".
 */
function renderToken(data: Record<string, unknown>, token: string): string {
  const val = resolvePath(data, token.trim());
  if (Array.isArray(val)) return val.join(", ");
  if (val == null) return "";
  return stripMd(String(val));
}

/**
 * Main template renderer.
 * Handles:
 *   {{PATH.TO.VALUE}}
 *   {{#EACH ARRAY}} ... {{.field}} ... {{/EACH}}
 *   {{#IF VALUE}} ... {{/IF}}
 *   {{INDEX}} inside EACH (1-based)
 */
export function renderTemplate(template: string, data: Record<string, unknown>): string {
  function processIf(tmpl: string, ctx: Record<string, unknown>): string {
    return tmpl.replace(
      /\{\{#IF ([^}]+)\}\}([\s\S]*?)\{\{\/IF\}\}/g,
      (_match, valuePath: string, block: string) => {
        const val = resolvePath(ctx, valuePath.trim());
        const truthy = val !== "" && val !== false && val !== null && val !== undefined && val !== 0;
        return truthy ? block : "";
      }
    );
  }

  function processEach(tmpl: string, ctx: Record<string, unknown>): string {
    // Find only TOP-LEVEL EACH tags by scanning character by character and tracking depth.
    // This prevents inner {{#EACH .paragraphs}} blocks from being consumed before the outer
    // {{#EACH1 CH6.SECTIONS}} loop has had a chance to run.
    const openTagRe = /\{\{#(EACH\d*) ([^}]+)\}\}/;
    let result = tmpl;
    let safety = 0;
    while (safety++ < 200) {
      // Find the first opening EACH tag
      const openMatch = openTagRe.exec(result);
      if (!openMatch) break;
      const tagName = openMatch[1];
      const arrayPath = openMatch[2];
      const openTag = openMatch[0];
      const closeTag = `{{/${tagName}}}`;
      const openStart = openMatch.index;
      const afterOpen = openStart + openTag.length;

      // Find the matching close tag accounting for nesting.
      // We must count ANY open tag with the same tag-name (e.g. {{#EACH ...}} matches {{/EACH}})
      // because inner loops may use the same tag name with a different array path.
      const anyOpenRe = new RegExp(`\\{\\{#${tagName}\\s[^}]+\\}\\}`, "g");
      let depth = 1;
      let searchFrom = afterOpen;
      let closeIdx = -1;
      while (depth > 0) {
        // Find next open of same tag-name (any array path)
        anyOpenRe.lastIndex = searchFrom;
        const anyOpenMatch = anyOpenRe.exec(result);
        const nextOpen = anyOpenMatch ? anyOpenMatch.index : -1;
        const nextClose = result.indexOf(closeTag, searchFrom);
        if (nextClose === -1) break;
        if (nextOpen !== -1 && nextOpen < nextClose) {
          depth++;
          searchFrom = nextOpen + anyOpenMatch!.length;
        } else {
          depth--;
          if (depth === 0) { closeIdx = nextClose; break; }
          searchFrom = nextClose + closeTag.length;
        }
      }
      if (closeIdx === -1) break;

      const block = result.slice(afterOpen, closeIdx);
      const arr = resolvePath(ctx, arrayPath.trim());
      let replacement = "";
      if (Array.isArray(arr)) {
        replacement = arr
          .map((item, idx) => {
            const itemCtx: Record<string, unknown> =
              item !== null && typeof item === "object"
                ? { ...(item as Record<string, unknown>), INDEX: idx + 1 }
                : { ".": item, INDEX: idx + 1 };
            const mergedCtx = { ...ctx, ...itemCtx };
            let rendered = block;
            // Recursively process nested EACH/IF blocks with the merged context
            rendered = processEach(rendered, mergedCtx);
            rendered = processIf(rendered, mergedCtx);
            // Handle {{.field}} and {{.}} tokens
            rendered = rendered.replace(/\{\{\.([^}]*)\}\}/g, (_m, field: string) => {
              const f = field.trim();
              if (f === "") return item != null ? stripMd(String(item)) : "";
              const v = (itemCtx as Record<string, unknown>)[f];
              if (v == null) return "";
              if (Array.isArray(v)) return v.join(", ");
              const noStrip = ["cssClass", "esfClass", "salienceClass"].includes(f);
              return noStrip ? String(v) : stripMd(String(v));
            });
            rendered = rendered.replace(/\{\{INDEX\}\}/g, String(idx + 1));
            // Handle {{TOKEN}} — check item context first, then fall back to outer ctx
            rendered = rendered.replace(/\{\{([^#/][^}]*)\}\}/g, (_m, path: string) => {
              const itemVal = (itemCtx as Record<string, unknown>)[path.trim()];
              if (itemVal !== undefined && itemVal !== null) {
                return Array.isArray(itemVal) ? itemVal.join(", ") : stripMd(String(itemVal));
              }
              return renderToken(ctx, path);
            });
            return rendered;
          })
          .join("");
      }
      result = result.slice(0, openStart) + replacement + result.slice(closeIdx + closeTag.length);
    }
    return result;
  }

  let out = template;
  out = processEach(out, data);
  out = processIf(out, data);
  out = out.replace(/\{\{([^#/][^}]*)\}\}/g, (_m, path: string) => {
    return renderToken(data, path);
  });
  return out;
}

// ─── Inlined CSS ──────────────────────────────────────────────────────────────
// The CSS is inlined so it renders correctly in the browser AND when printed.
// External stylesheets are not guaranteed to load before the print dialog opens.

const INLINED_CSS = `
:root {
  --navy:       #1A2744;
  --navy-soft:  #2A3A5E;
  --navy-mist:  #8A9BBF;
  --gold:       #C9973A;
  --gold-soft:  #E0B866;
  --cream:      #F5F0E8;
  --cream-warm: #EFE6D6;
  --ink:        #0E1628;
  --ink-muted:  #5a6278;
  --rule:       rgba(26, 39, 68, 0.14);
  --rule-strong:rgba(26, 39, 68, 0.28);
  --serif: "Cormorant Garamond", Georgia, "Times New Roman", serif;
  --sans:  "Inter", -apple-system, "Helvetica Neue", Arial, sans-serif;
  --page-w: 794px;
  --page-h: 1123px;
  --pad-x:  88px;
  --pad-y:  72px;
}
html, body { margin: 0; padding: 0; background: #d8d2c6; color: var(--ink); font-family: var(--serif); font-size: 16px; line-height: 1.55; }
body { display: flex; flex-direction: column; align-items: center; padding: 48px 0 96px; gap: 24px; }
.page { width: var(--page-w); min-height: var(--page-h); background: var(--cream); color: var(--ink); padding: var(--pad-y) var(--pad-x); box-sizing: border-box; position: relative; overflow: visible; box-shadow: 0 12px 32px rgba(0,0,0,0.15), 0 2px 6px rgba(0,0,0,0.08); display: flex; flex-direction: column; }
.page.warm { background: var(--cream-warm); }
h1, h2, h3, h4 { font-family: var(--serif); font-weight: 500; color: var(--navy); letter-spacing: -0.005em; }
h1.display { font-size: 56px; line-height: 1.05; margin: 0; }
h1.display em { color: var(--gold); font-style: italic; }
h2.chap-title { font-size: 40px; line-height: 1.1; margin: 14px 0 0; }
h2.chap-title em { color: var(--gold); font-style: italic; }
h3.section-h { font-size: 22px; font-weight: 600; margin: 28px 0 10px; color: var(--navy); }
h4.sub-h { font-size: 14px; font-weight: 600; font-family: var(--sans); letter-spacing: 0.22em; text-transform: uppercase; color: var(--ink-muted); margin: 24px 0 10px; }
p { margin: 0 0 14px; font-size: 15.5px; line-height: 1.58; color: var(--ink); }
p.lede { font-family: var(--serif); font-style: italic; font-size: 20px; line-height: 1.4; color: var(--navy-soft); margin: 0 0 22px; }
.kicker { font-family: var(--sans); font-weight: 500; font-size: 12px; letter-spacing: 0.42em; text-transform: uppercase; color: var(--gold); display: inline-flex; align-items: center; gap: 14px; }
.kicker::before { content: ""; width: 32px; height: 1px; background: var(--gold); }
.ph-top { display: flex; justify-content: space-between; align-items: baseline; padding-bottom: 16px; border-bottom: 1px solid var(--rule); margin-bottom: 34px; font-family: var(--sans); font-size: 10px; letter-spacing: 0.28em; text-transform: uppercase; color: var(--ink-muted); flex-shrink: 0; }
.ph-top .lockup { display: inline-flex; align-items: center; gap: 10px; font-family: var(--serif); font-weight: 600; font-size: 18px; letter-spacing: 0.005em; color: var(--navy); text-transform: none; }
.ph-top .lockup .mark { width: 20px; height: 20px; display: inline-block; vertical-align: middle; flex-shrink: 0; }
.ph-bot { margin-top: auto; padding-top: 22px; border-top: 1px solid var(--rule); display: flex; justify-content: space-between; align-items: baseline; font-family: var(--sans); font-size: 10px; letter-spacing: 0.24em; text-transform: uppercase; color: var(--ink-muted); flex-shrink: 0; }
.ph-bot .who { font-family: var(--serif); font-style: italic; font-size: 14px; letter-spacing: 0.01em; text-transform: none; color: var(--ink-muted); }
.ph-bot .pageno { font-variant-numeric: tabular-nums; }
.ph-bot .pageno .cur { color: var(--gold); font-weight: 600; }
.ph-body { flex: 1; min-height: 0; overflow: hidden; }
.page.letter .ph-body { display: flex; flex-direction: column; }
.letter h1.display { font-size: 44px; }
.letter .sig { margin-top: 28px; font-family: var(--serif); font-style: italic; font-size: 18px; color: var(--navy); }
.letter .sig .name { font-style: normal; font-weight: 600; display: block; margin-top: 8px; }
.letter .sig .mail { font-family: var(--sans); font-style: normal; font-size: 12px; color: var(--ink-muted); letter-spacing: 0.04em; }
.page.title-page { justify-content: space-between; padding-top: 96px; padding-bottom: 88px; position: relative; overflow: hidden; }
.page.title-page::after { content: ""; position: absolute; right: -180px; top: -180px; width: 620px; height: 620px; border: 1px solid var(--gold); border-radius: 50%; opacity: 0.35; }
.page.title-page::before { content: ""; position: absolute; left: 60px; bottom: -220px; width: 360px; height: 360px; border: 1px solid var(--gold); border-radius: 50%; opacity: 0.22; }
.title-page .brand { display: flex; align-items: center; gap: 14px; font-family: var(--serif); font-weight: 600; font-size: 28px; color: var(--navy); letter-spacing: 0.005em; position: relative; z-index: 1; }
.title-page .brand .mark { width: 44px; height: 44px; flex-shrink: 0; }
.title-page .series { font-family: var(--sans); font-size: 11px; letter-spacing: 0.48em; text-transform: uppercase; color: var(--gold); margin-top: 14px; position: relative; z-index: 1; }
.title-page .t-main { position: relative; z-index: 1; margin-top: auto; }
.title-page h1.cover-title { font-family: var(--serif); font-weight: 500; font-size: 64px; line-height: 0.98; margin: 0; color: var(--navy); letter-spacing: -0.01em; }
.title-page h1.cover-title em { color: var(--gold); font-style: italic; }
.title-page .t-meta { margin-top: 40px; display: grid; grid-template-columns: auto 1fr; row-gap: 16px; column-gap: 32px; align-items: baseline; position: relative; z-index: 1; }
.title-page .t-meta .lab { font-family: var(--sans); font-size: 10px; letter-spacing: 0.38em; text-transform: uppercase; color: var(--ink-muted); }
.title-page .t-meta .val { font-family: var(--serif); font-style: italic; font-size: 24px; color: var(--navy); letter-spacing: 0.005em; }
.title-page .t-footer { font-family: var(--sans); font-size: 10px; letter-spacing: 0.28em; text-transform: uppercase; color: var(--ink-muted); position: relative; z-index: 1; }
.summary-hero { font-family: var(--serif); font-style: italic; font-weight: 500; font-size: 30px; line-height: 1.25; color: var(--navy); margin: 18px 0 24px; }
.summary-hero em { color: var(--gold); font-style: italic; }
table.t-evidence { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 11.5px; line-height: 1.45; font-family: var(--sans); }
table.t-evidence thead th { text-align: left; font-weight: 600; font-size: 10px; letter-spacing: 0.22em; text-transform: uppercase; color: var(--ink-muted); padding: 10px 10px 10px 0; border-bottom: 1px solid var(--rule-strong); }
table.t-evidence tbody td { padding: 12px 10px 12px 0; border-bottom: 1px solid var(--rule); vertical-align: top; color: var(--ink); }
table.t-evidence tbody td.name { font-family: var(--serif); font-size: 16px; font-weight: 500; color: var(--navy); width: 120px; }
table.t-evidence tbody td.rank { font-family: var(--serif); font-style: italic; font-size: 18px; color: var(--gold); text-align: center; width: 40px; }
table.t-evidence tbody td.salience .pill { display: inline-block; padding: 2px 8px; font-family: var(--sans); font-size: 9px; letter-spacing: 0.18em; text-transform: uppercase; border-radius: 2px; font-weight: 600; background: rgba(201,151,58,0.18); color: #8a6718; }
table.t-evidence tbody td.salience .pill.med { background: rgba(26,39,68,0.08); color: var(--navy-soft); }
ol.rank-list { list-style: none; padding: 0; margin: 0; counter-reset: rl; columns: 2; column-gap: 40px; }
ol.rank-list li { counter-increment: rl; display: grid; grid-template-columns: 30px 1fr auto; gap: 12px; align-items: baseline; padding: 9px 0; border-bottom: 1px solid var(--rule); break-inside: avoid; font-family: var(--sans); font-size: 13px; }
ol.rank-list li::before { content: counter(rl, decimal-leading-zero); font-family: var(--serif); font-style: italic; font-size: 17px; color: var(--gold); font-variant-numeric: tabular-nums; }
ol.rank-list li .nm { font-family: var(--serif); font-size: 17px; font-weight: 500; color: var(--navy); }
ol.rank-list li .sc { font-variant-numeric: tabular-nums; color: var(--navy); font-weight: 600; }
ol.rank-list li .sc .of { color: var(--ink-muted); font-weight: 400; font-size: 10px; letter-spacing: 0.1em; margin-left: 2px; }
ol.rank-list.full li.top5 .nm { color: var(--gold); }
ol.rank-list.full li.bot5 .nm { color: var(--ink-muted); font-style: italic; }
ol.rank-list.full li.bot5 .sc { color: var(--ink-muted); }
.ocean-list { display: flex; flex-direction: column; gap: 22px; margin-top: 10px; }
.trait { display: grid; grid-template-columns: 180px 1fr 60px; gap: 24px; align-items: center; }
.trait .name { font-family: var(--serif); font-size: 20px; font-weight: 500; color: var(--navy); }
.trait .bar { position: relative; height: 28px; display: flex; flex-direction: column; justify-content: center; }
.trait .bar .track { height: 6px; background: rgba(26,39,68,0.1); border-radius: 999px; overflow: hidden; position: relative; }
.trait .bar .fill { height: 100%; background: var(--gold); border-radius: 999px; }
.trait .bar .ends { display: flex; justify-content: space-between; font-family: var(--sans); font-size: 9px; letter-spacing: 0.22em; text-transform: uppercase; color: var(--ink-muted); margin-top: 8px; }
.trait .score { font-family: var(--serif); font-style: italic; font-size: 30px; color: var(--gold); text-align: right; font-variant-numeric: tabular-nums; line-height: 1; }
.trait .score .pct { font-family: var(--sans); font-style: normal; font-size: 9px; letter-spacing: 0.2em; text-transform: uppercase; color: var(--ink-muted); display: block; margin-top: 2px; }
.facet-group { margin-top: 14px; break-inside: avoid; }
.facet-group .fg-head { display: flex; justify-content: space-between; align-items: baseline; padding-bottom: 8px; border-bottom: 1px solid var(--rule-strong); }
.facet-group .fg-name { font-family: var(--serif); font-size: 18px; font-weight: 500; color: var(--navy); }
.facet-group .fg-score { font-family: var(--serif); font-style: italic; font-size: 22px; color: var(--gold); font-variant-numeric: tabular-nums; }
.facet-group .fg-score .pct { font-family: var(--sans); font-style: normal; font-size: 9px; letter-spacing: 0.18em; text-transform: uppercase; color: var(--ink-muted); margin-left: 4px; }
.facet-group .facets { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px 32px; margin-top: 10px; }
.facet-group .facet { display: grid; grid-template-columns: 1fr 50px 30px; gap: 10px; align-items: center; font-family: var(--sans); font-size: 11.5px; padding: 4px 0; }
.facet-group .facet .fnm { color: var(--ink); }
.facet-group .facet .fbar { height: 3px; background: rgba(26,39,68,0.1); border-radius: 999px; overflow: hidden; position: relative; }
.facet-group .facet .ff { height: 100%; background: var(--gold); }
.facet-group .facet .fsc { font-variant-numeric: tabular-nums; color: var(--navy); font-weight: 600; text-align: right; font-size: 11px; }
.behav-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 14px; }
.behav-card { padding: 24px 24px; position: relative; display: flex; flex-direction: column; gap: 12px; min-height: 180px; }
.behav-card.green { background: #7A9A5E; color: #fff; }
.behav-card.blue  { background: #3C6E8F; color: #fff; }
.behav-card.red   { background: #C0392B; color: #fff; }
.behav-card.yellow{ background: #D4A017; color: #fff; }
.behav-card .role { font-family: var(--sans); font-weight: 600; font-size: 10px; letter-spacing: 0.38em; text-transform: uppercase; opacity: 0.82; }
.behav-card .pname { font-family: var(--serif); font-weight: 500; font-size: 32px; line-height: 1; margin: 0; }
.behav-card .traits { margin-top: auto; font-family: var(--serif); font-style: italic; font-size: 14.5px; line-height: 1.4; }
.jungian-strip { margin-top: 20px; border: 1px solid var(--rule-strong); padding: 20px 26px; display: grid; grid-template-columns: auto 1fr auto; gap: 32px; align-items: center; }
.jungian-strip .jlab { font-family: var(--sans); font-weight: 500; font-size: 10px; letter-spacing: 0.38em; text-transform: uppercase; color: var(--ink-muted); }
.jungian-strip .jtype { font-family: var(--serif); font-weight: 500; font-size: 42px; color: var(--navy); letter-spacing: 0.04em; line-height: 1; }
.jungian-strip .jspell { font-family: var(--serif); font-style: italic; font-size: 14px; color: var(--ink-muted); text-align: right; max-width: 200px; line-height: 1.3; }
.axes { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin-top: 18px; }
.axis { padding: 14px 16px; background: rgba(26,39,68,0.04); border-top: 2px solid var(--gold); }
.axis .ax-lab { font-family: var(--sans); font-weight: 500; font-size: 9px; letter-spacing: 0.38em; text-transform: uppercase; color: var(--ink-muted); }
.axis .ax-val { font-family: var(--serif); font-weight: 500; font-size: 16px; color: var(--navy); margin: 4px 0 6px; }
.axis .ax-note { font-family: var(--sans); font-size: 10.5px; color: var(--ink-muted); letter-spacing: 0.02em; }
.swot { display: grid; grid-template-columns: 1fr 1fr 1.4fr; gap: 20px; margin-top: 22px; }
.swot .col h5 { font-family: var(--sans); font-weight: 600; font-size: 10px; letter-spacing: 0.38em; text-transform: uppercase; color: var(--gold); margin: 0 0 12px; }
.swot .col ul { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 6px; }
.swot .col ul li { font-family: var(--serif); font-size: 15px; color: var(--navy); line-height: 1.35; padding-left: 16px; position: relative; }
.swot .col ul li::before { content: ""; width: 6px; height: 6px; border-radius: 50%; background: var(--gold); position: absolute; left: 0; top: 9px; }
.swot .col.fit p { font-family: var(--serif); font-style: italic; font-size: 15px; line-height: 1.45; color: var(--ink); }
table.variants { width: 100%; border-collapse: collapse; margin-top: 16px; font-family: var(--sans); font-size: 12px; }
table.variants thead th { text-align: left; font-weight: 600; font-size: 10px; letter-spacing: 0.28em; text-transform: uppercase; color: var(--ink-muted); padding: 12px 12px 10px 0; border-bottom: 1px solid var(--rule-strong); }
table.variants tbody td { padding: 16px 12px 16px 0; border-bottom: 1px solid var(--rule); vertical-align: top; }
table.variants tbody td.var { font-family: var(--serif); font-size: 18px; color: var(--navy); font-weight: 500; width: 160px; }
table.variants tbody td.q { font-family: var(--serif); font-style: italic; font-size: 14.5px; color: var(--ink); }
.annex-cover { padding: 88px 88px; justify-content: space-between; position: relative; overflow: hidden; }
.annex-cover::after { content: ""; position: absolute; left: -160px; bottom: -160px; width: 560px; height: 560px; border: 1px solid var(--gold); border-radius: 50%; opacity: 0.3; }
.annex-cover .series { font-family: var(--sans); font-size: 11px; letter-spacing: 0.5em; text-transform: uppercase; color: var(--gold); }
.annex-cover h1.display { font-size: 76px; margin-top: 20px; line-height: 0.96; max-width: 600px; }
.annex-cover .contents { margin-top: 36px; display: flex; flex-direction: column; gap: 6px; }
.annex-cover .contents .row { display: grid; grid-template-columns: 60px 1fr; gap: 24px; align-items: baseline; border-bottom: 1px solid var(--rule); padding: 10px 0; }
.annex-cover .contents .row .ix { font-family: var(--serif); font-style: italic; font-size: 22px; color: var(--gold); }
.annex-cover .contents .row .lb { font-family: var(--serif); font-size: 24px; color: var(--navy); }
.stage-head { display: flex; align-items: baseline; justify-content: space-between; border-bottom: 1px solid var(--rule-strong); padding-bottom: 8px; margin: 22px 0 14px; }
.stage-head .sh-title { font-family: var(--sans); font-weight: 600; font-size: 11px; letter-spacing: 0.42em; text-transform: uppercase; color: var(--gold); }
.stage-head .sh-age { font-family: var(--serif); font-style: italic; color: var(--ink-muted); font-size: 13px; }
.lh-entry { margin-bottom: 18px; break-inside: avoid; }
.lh-entry .lh-top { display: flex; align-items: baseline; justify-content: space-between; gap: 16px; border-bottom: 1px dashed var(--rule); padding-bottom: 4px; margin-bottom: 8px; }
.lh-entry .lh-title { font-family: var(--serif); font-weight: 500; font-size: 17px; color: var(--navy); }
.lh-entry .lh-meta { font-family: var(--sans); font-size: 9.5px; letter-spacing: 0.24em; text-transform: uppercase; color: var(--ink-muted); display: inline-flex; gap: 14px; align-items: center; white-space: nowrap; }
.lh-entry .lh-meta .esf { padding: 2px 8px; border-radius: 2px; font-weight: 600; }
.lh-entry .lh-meta .esf.sat { background: rgba(201,151,58,0.22); color: #8a6718; }
.lh-entry .lh-meta .esf.ful { background: rgba(26,39,68,0.1); color: var(--navy); }
.lh-entry .lh-meta .esf.enj { background: rgba(138,155,191,0.25); color: var(--navy-soft); }
.lh-entry .lh-body { font-family: var(--serif); font-size: 13.5px; line-height: 1.5; color: var(--ink); }
.lh-entry .lh-note { margin-top: 8px; border-left: 2px solid var(--gold); padding: 4px 0 4px 12px; font-family: var(--serif); font-style: italic; font-size: 12.5px; line-height: 1.5; color: var(--navy-soft); }
.lh-entry .lh-note::before { content: "Sage follow-up · "; font-family: var(--sans); font-style: normal; font-weight: 600; font-size: 8.5px; letter-spacing: 0.24em; text-transform: uppercase; color: var(--gold); }
.keyfind { background: var(--cream-warm); border-left: 3px solid var(--gold); padding: 20px 24px; margin-top: 16px; }
.keyfind h3 { margin-top: 0; }
.tmay { background: var(--cream-warm); padding: 28px 32px; margin-top: 16px; position: relative; }
.tmay::before { content: ""; position: absolute; left: 0; top: 24px; bottom: 24px; width: 3px; background: var(--gold); }
.tmay .q-kicker { font-family: var(--sans); font-weight: 500; font-size: 10px; letter-spacing: 0.42em; text-transform: uppercase; color: var(--ink-muted); }
.tmay .q-body { font-family: var(--serif); font-style: italic; font-size: 16px; line-height: 1.45; color: var(--navy); margin-top: 10px; }
.tmay .q-body p { font-size: 16px; line-height: 1.45; margin-bottom: 10px; color: var(--navy); font-style: italic; }
.tmay ul.drives { font-family: var(--serif); font-size: 16px; list-style: none; padding: 0; margin: 8px 0 14px; line-height: 1.45; }
.tmay ul.drives li { padding-left: 16px; position: relative; }
.tmay ul.drives li::before { content: "—"; color: var(--gold); position: absolute; left: 0; }
.mono-caps { font-family: var(--sans); font-weight: 500; font-size: 10px; letter-spacing: 0.32em; text-transform: uppercase; color: var(--ink-muted); }
.mark svg { width: 100%; height: 100%; display: block; }
.twocol { column-count: 2; column-gap: 32px; font-size: 14px; line-height: 1.55; }
.twocol p { font-size: 14px; line-height: 1.55; margin-bottom: 10px; }
@media print {
  html, body { background: #fff; padding: 0; margin: 0; }
  body { display: block; padding: 0; }
  .page {
    box-shadow: none;
    margin: 0;
    width: 210mm;
    min-height: 297mm;
    height: 297mm;
    padding: 18mm 22mm;
    page-break-after: always;
    break-after: page;
    overflow: hidden;
  }
  .page:last-child { page-break-after: auto; break-after: auto; }
  @page {
    size: A4 portrait;
    margin: 0;
  }
  * {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
    color-adjust: exact !important;
  }
  /* Sharper font rendering for print */
  body {
    -webkit-font-smoothing: antialiased;
    text-rendering: optimizeLegibility;
    font-size: 10pt;
  }
  p { font-size: 10pt; line-height: 1.55; }
  p.lede { font-size: 13pt; }
  h1.display { font-size: 36pt; }
  h2.chap-title { font-size: 26pt; }
  h1.cover-title { font-size: 42pt; }
  .summary-hero { font-size: 19pt; }
  #lw-print-bar { display: none !important; }
}
`;

// ─── Public render helper ───────────────────────────────────────────────────
/**
 * Render the full HTML report from a Claude export JSON payload.
 * Exported so Puppeteer PDF route can reuse the same logic.
 */
export function renderHtmlReport(payload: Record<string, unknown>): string {
  return renderTemplate(TEMPLATE, payload);
}

// ─── HTML template (embedded) ─────────────────────────────────────────────────

const TEMPLATE = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Lifework WOW Report — {{CLIENT.NAME}}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400;1,500;1,600&display=swap" rel="stylesheet">
<style>${INLINED_CSS}</style>
<style>
  #lw-print-bar {
    position: fixed; bottom: 0; left: 0; right: 0; z-index: 9999;
    background: #1A2744; color: #fff;
    display: flex; align-items: center; justify-content: space-between;
    padding: 12px 32px;
    font-family: "Inter", sans-serif; font-size: 13px;
    box-shadow: 0 -4px 16px rgba(0,0,0,0.25);
  }
  #lw-print-bar span { opacity: 0.6; font-size: 11px; letter-spacing: 0.18em; text-transform: uppercase; }
  #lw-print-bar button {
    background: #C9973A; color: #1A2744; border: none; cursor: pointer;
    font-family: "Inter", sans-serif; font-weight: 700; font-size: 12px;
    letter-spacing: 0.22em; text-transform: uppercase;
    padding: 10px 28px; border-radius: 2px;
  }
  #lw-print-bar button:hover { background: #E0B866; }
</style>
</head>
<body>

<!-- ════════ PAGE 1 · COVER LETTER ════════ -->
<section class="page letter">
  <header class="ph-top">
    <span class="lockup"><span class="mark"></span>Lifework</span>
    <span>Cover Letter · Confidential</span>
  </header>
  <div class="ph-body">
    <span class="kicker">A personal note</span>
    <h1 class="display">Hi {{CLIENT.FIRST_NAME}} — here's<br/>your <em>Lifework</em> report.</h1>

    {{#EACH COVER_LETTER.PARAGRAPHS}}
    <p>{{.}}</p>
    {{/EACH}}

    <div class="sig">
      {{COVER_LETTER.SIGN_OFF}}
      <span class="name">{{COVER_LETTER.AUTHOR_NAME}}</span>
      <span class="mail">{{COVER_LETTER.AUTHOR_EMAIL}}</span>
    </div>
  </div>
  <footer class="ph-bot">
    <span class="who">{{BRAND.COMPANY}} · Lifework</span>
    <span class="pageno"><span class="cur">01</span></span>
  </footer>
</section>

<!-- ════════ PAGE 2 · TITLE PAGE ════════ -->
<section class="page title-page">
  <div>
    <span class="brand"><span class="mark"></span>Lifework</span>
    <div class="series">{{REPORT.EDITION_LABEL}}</div>
  </div>
  <div class="t-main">
    <h1 class="cover-title">{{REPORT.COVER_TITLE_LINE1}}<br/><em>{{REPORT.COVER_TITLE_LINE2}}</em></h1>
    <div class="t-meta">
      <span class="lab">Prepared for</span><span class="val">{{CLIENT.NAME}}</span>
      <span class="lab">Date</span><span class="val">{{REPORT.DATE}}</span>
      <span class="lab">Prepared by</span><span class="val">{{BRAND.COMPANY}}</span>
      <span class="lab">Analyst</span><span class="val">{{REPORT.ANALYST}}</span>
    </div>
  </div>
  <div class="t-footer">Confidential · Prepared exclusively for the named individual</div>
</section>

<!-- ════════ PAGE 3 · CH 1 SUMMARY ════════ -->
<section class="page">
  <header class="ph-top">
    <span class="lockup"><span class="mark"></span>Lifework</span>
    <span>Chapter 1 · Summary</span>
  </header>
  <div class="ph-body">
    <span class="kicker">Chapter 01</span>
    <h2 class="chap-title">Lifework <em>summary.</em></h2>
    <p class="summary-hero">{{CH1.HERO}}</p>
    {{#EACH CH1.PARAGRAPHS}}
    <p>{{.}}</p>
    {{/EACH}}
  </div>
  <footer class="ph-bot">
    <span class="who">{{CLIENT.NAME}}</span>
    <span class="pageno">{{BRAND.COMPANY}} · <span class="cur">03</span></span>
  </footer>
</section>

<!-- ════════ PAGE 4 · CH 2 LIFE HISTORY (1/2) ════════ -->
<section class="page">
  <header class="ph-top">
    <span class="lockup"><span class="mark"></span>Lifework</span>
    <span>Chapter 2 · Life History Pattern</span>
  </header>
  <div class="ph-body">
    <span class="kicker">Chapter 02</span>
    <h2 class="chap-title">Life history — <em>the pattern.</em></h2>
    <p class="lede">{{CH2.LEDE}}</p>
    {{#EACH CH2.PAGE1_PARAGRAPHS}}
    <p>{{.}}</p>
    {{/EACH}}
    {{#IF CH2.PAGE1_SECTION_H}}<h3 class="section-h">Recurring themes</h3>{{/IF}}
    {{#EACH CH2.PAGE1_SECTION_PARAS}}
    <p>{{.}}</p>
    {{/EACH}}
  </div>
  <footer class="ph-bot">
    <span class="who">{{CLIENT.NAME}}</span>
    <span class="pageno">{{BRAND.COMPANY}} · <span class="cur">04</span></span>
  </footer>
</section>

<!-- ════════ PAGE 5 · CH 2 LIFE HISTORY (2/2) ════════ -->
<section class="page warm">
  <header class="ph-top">
    <span class="lockup"><span class="mark"></span>Lifework</span>
    <span>Chapter 2 · Life History Pattern</span>
  </header>
  <div class="ph-body">
    <h3 class="section-h" style="margin-top:0;">What the pattern reveals</h3>
    {{#EACH CH2.KEYFIND.PARAGRAPHS}}
    <p>{{.}}</p>
    {{/EACH}}
    <h3 class="section-h" style="margin-top:24px;">Your ESF distribution</h3>
    <p>{{CH2.KEYFIND.ESF_PARA}}</p>
  </div>
  <footer class="ph-bot">
    <span class="who">{{CLIENT.NAME}}</span>
    <span class="pageno">{{BRAND.COMPANY}} · <span class="cur">05</span></span>
  </footer>
</section>

<!-- ════════ PAGE 6 · CH 3 VIA — RANKING ════════ -->
<section class="page">
  <header class="ph-top">
    <span class="lockup"><span class="mark"></span>Lifework</span>
    <span>Chapter 3 · Character Strengths</span>
  </header>
  <div class="ph-body">
    <span class="kicker">Chapter 03 · VIA</span>
    <h2 class="chap-title">Character <em>strengths.</em></h2>
    <p class="lede">{{CH3.LEDE}}</p>
    <h4 class="sub-h">Strength rankings · top 10</h4>
    <ol class="rank-list">
      {{#EACH VIA.TOP10}}
      <li><span class="nm">{{.name}}</span><span class="sc">{{.score}}<span class="of">/25</span></span></li>
      {{/EACH}}
    </ol>
  </div>
  <footer class="ph-bot">
    <span class="who">{{CLIENT.NAME}}</span>
    <span class="pageno">{{BRAND.COMPANY}} · <span class="cur">06</span></span>
  </footer>
</section>

<!-- ════════ PAGE 7 · CH 3 VIA — EVIDENCE TABLE ════════ -->
<section class="page warm">
  <header class="ph-top">
    <span class="lockup"><span class="mark"></span>Lifework</span>
    <span>Chapter 3 · Character Strengths</span>
  </header>
  <div class="ph-body">
    <h3 class="section-h" style="margin-top:0;">The evidence table · top 5</h3>
    <p style="font-family:var(--serif);font-style:italic;color:var(--ink-muted);font-size:14px;">For each top-ranked strength, Sage cross-references it with moments from your life history where that strength was in action.</p>
    <table class="t-evidence">
      <thead>
        <tr>
          <th style="width:120px;">Strength</th>
          <th>VIA definition</th>
          <th style="width:40px;">Rank</th>
          <th style="width:40px;">Freq</th>
          <th style="width:90px;">Salience</th>
          <th>Achievements</th>
        </tr>
      </thead>
      <tbody>
        {{#EACH VIA.EVIDENCE}}
        <tr>
          <td class="name">{{.name}}</td>
          <td>{{.definition}}</td>
          <td class="rank">{{.rank}}</td>
          <td>{{.freq}}</td>
          <td class="salience"><span class="pill {{.salienceClass}}">{{.salience}}</span></td>
          <td>{{.achievements}}</td>
        </tr>
        {{/EACH}}
      </tbody>
    </table>
  </div>
  <footer class="ph-bot">
    <span class="who">{{CLIENT.NAME}}</span>
    <span class="pageno">{{BRAND.COMPANY}} · <span class="cur">07</span></span>
  </footer>
</section>

<!-- ════════ PAGE 8 · CH 3 KEY FINDINGS ════════ -->
<section class="page">
  <header class="ph-top">
    <span class="lockup"><span class="mark"></span>Lifework</span>
    <span>Chapter 3 · Character Strengths</span>
  </header>
  <div class="ph-body">
    <h3 class="section-h" style="margin-top:0;">Key findings</h3>
    {{#EACH CH3.KEY_FINDINGS}}
    <p>{{.}}</p>
    {{/EACH}}
  </div>
  <footer class="ph-bot">
    <span class="who">{{CLIENT.NAME}}</span>
    <span class="pageno">{{BRAND.COMPANY}} · <span class="cur">08</span></span>
  </footer>
</section>

<!-- ════════ PAGE 9 · CH 4 OCEAN BARS ════════ -->
<section class="page">
  <header class="ph-top">
    <span class="lockup"><span class="mark"></span>Lifework</span>
    <span>Chapter 4 · Personality Profile</span>
  </header>
  <div class="ph-body">
    <span class="kicker">Chapter 04 · OCEAN</span>
    <h2 class="chap-title">Personality <em>profile.</em></h2>
    <p class="lede">{{CH4.LEDE}}</p>
    <div class="ocean-list">
      {{#EACH OCEAN.DOMAINS}}
      <div class="trait">
        <span class="name">{{.name}}</span>
        <div class="bar">
          <div class="track"><div class="fill" style="width:{{.pct}}%"></div></div>
          <div class="ends"><span>Low</span><span>High</span></div>
        </div>
        <div class="score">{{.pct}}<span class="pct">percentile</span></div>
      </div>
      {{/EACH}}
    </div>
    <h3 class="section-h">What the psychometrics show</h3>
    {{#EACH CH4.PSYCHOMETRICS_PARAS}}
    <p>{{.}}</p>
    {{/EACH}}
  </div>
  <footer class="ph-bot">
    <span class="who">{{CLIENT.NAME}}</span>
    <span class="pageno">{{BRAND.COMPANY}} · <span class="cur">09</span></span>
  </footer>
</section>

<!-- ════════ PAGE 10 · CH 4 TWO PICTURES ════════ -->
<section class="page warm">
  <header class="ph-top">
    <span class="lockup"><span class="mark"></span>Lifework</span>
    <span>Chapter 4 · Personality Profile</span>
  </header>
  <div class="ph-body">
    <h3 class="section-h" style="margin-top:0;">Where the two pictures meet</h3>
    {{#EACH CH4.SYNTHESIS_PARAS}}
    <p>{{.}}</p>
    {{/EACH}}
    <div class="keyfind">
      <h3 class="section-h" style="margin:0 0 8px;">{{CH4.KEYFIND.TITLE}}</h3>
      <p style="margin:0;">{{CH4.KEYFIND.BODY}}</p>
    </div>
  </div>
  <footer class="ph-bot">
    <span class="who">{{CLIENT.NAME}}</span>
    <span class="pageno">{{BRAND.COMPANY}} · <span class="cur">10</span></span>
  </footer>
</section>

<!-- ════════ PAGE 11 · CH 5 BEHAVIOURAL STYLE ════════ -->
<section class="page">
  <header class="ph-top">
    <span class="lockup"><span class="mark"></span>Lifework</span>
    <span>Chapter 5 · Behavioural Style</span>
  </header>
  <div class="ph-body">
    <span class="kicker">Chapter 05 · Insights</span>
    <h2 class="chap-title">Behavioural <em>style.</em></h2>
    <p class="lede">{{CH5.LEDE}}</p>
    <div class="behav-grid">
      <div class="behav-card {{CH5.PRIMARY.cssClass}}">
        <div class="role">Primary energy</div>
        <div class="pname">{{CH5.PRIMARY.name}}</div>
        <div class="traits">{{CH5.PRIMARY.traits}}</div>
      </div>
      <div class="behav-card {{CH5.SECONDARY.cssClass}}">
        <div class="role">Secondary energy</div>
        <div class="pname">{{CH5.SECONDARY.name}}</div>
        <div class="traits">{{CH5.SECONDARY.traits}}</div>
      </div>
    </div>
    <div class="jungian-strip">
      <div>
        <div class="jlab">Jungian type</div>
        <div class="jtype">{{CH5.JUNGIAN.code}}</div>
      </div>
      <div class="mono-caps" style="font-size:10px;">Approx. MBTI equivalent</div>
      <div class="jspell"><em>{{CH5.JUNGIAN.spelt}}</em></div>
    </div>
    <div class="axes">
      {{#EACH CH5.AXES}}
      <div class="axis"><div class="ax-lab">{{.label}}</div><div class="ax-val">{{.value}}</div><div class="ax-note">{{.note}}</div></div>
      {{/EACH}}
    </div>
    <div class="swot">
      <div class="col"><h5>Strengths</h5><ul>
        {{#EACH CH5.STRENGTHS}}<li>{{.}}</li>{{/EACH}}
      </ul></div>
      <div class="col"><h5>Watch-outs</h5><ul>
        {{#EACH CH5.WATCHOUTS}}<li>{{.}}</li>{{/EACH}}
      </ul></div>
      <div class="col fit"><h5>Career environment fit</h5>
        <p>{{CH5.FIT}}</p>
      </div>
    </div>
  </div>
  <footer class="ph-bot">
    <span class="who">{{CLIENT.NAME}}</span>
    <span class="pageno">{{BRAND.COMPANY}} · <span class="cur">11</span></span>
  </footer>
</section>

<!-- ════════ PAGE 12 · CH 6 DEVELOPMENT EDGE ════════ -->
<section class="page">
  <header class="ph-top">
    <span class="lockup"><span class="mark"></span>Lifework</span>
    <span>Chapter 6 · Development Edge</span>
  </header>
  <div class="ph-body">
    <span class="kicker">Chapter 06</span>
    <h2 class="chap-title">Development <em>edge.</em></h2>
    {{#EACH CH6.SECTIONS}}
    <h3 class="section-h">{{.heading}}</h3>
    {{#EACH .paragraphs}}
    <p>{{.}}</p>
    {{/EACH}}
    {{/EACH}}
  </div>
  <footer class="ph-bot">
    <span class="who">{{CLIENT.NAME}}</span>
    <span class="pageno">{{BRAND.COMPANY}} · <span class="cur">12</span></span>
  </footer>
</section>

<!-- ════════ PAGE 13 · CH 7 CONCLUSIONS (past/present) ════════ -->
<section class="page">
  <header class="ph-top">
    <span class="lockup"><span class="mark"></span>Lifework</span>
    <span>Chapter 7 · Conclusions</span>
  </header>
  <div class="ph-body">
    <span class="kicker">Chapter 07</span>
    <h2 class="chap-title"><em>Conclusions.</em></h2>
    <h3 class="section-h">Past</h3>
    {{#EACH CH7.PAST}}
    <p>{{.}}</p>
    {{/EACH}}
    <h3 class="section-h">Present</h3>
    {{#EACH CH7.PRESENT}}
    <p>{{.}}</p>
    {{/EACH}}
    <p class="lede" style="margin-top:18px;">{{CH7.PRESENT_PULLQUOTE}}</p>
  </div>
  <footer class="ph-bot">
    <span class="who">{{CLIENT.NAME}}</span>
    <span class="pageno">{{BRAND.COMPANY}} · <span class="cur">13</span></span>
  </footer>
</section>

<!-- ════════ PAGE 14 · CH 7 FUTURE + TELL-ME-ABOUT ════════ -->
<section class="page">
  <header class="ph-top">
    <span class="lockup"><span class="mark"></span>Lifework</span>
    <span>Chapter 7 · Conclusions</span>
  </header>
  <div class="ph-body">
    <h3 class="section-h" style="margin-top:0;">Future</h3>
    {{#EACH CH7.FUTURE}}
    <p>{{.}}</p>
    {{/EACH}}
    <div class="tmay">
      <div class="q-kicker">Tell me about yourself · a suggested answer</div>
      <div class="q-body">
        <p style="margin:12px 0 6px;font-family:var(--sans);font-style:normal;font-size:11px;letter-spacing:0.28em;text-transform:uppercase;color:var(--ink-muted);">You are fundamentally driven by —</p>
        <ul class="drives">
          {{#EACH CH7.DRIVES}}<li>{{.}}</li>{{/EACH}}
        </ul>
        {{#EACH CH7.TMAY_PARAS}}
        <p>{{.}}</p>
        {{/EACH}}
      </div>
    </div>
  </div>
  <footer class="ph-bot">
    <span class="who">{{CLIENT.NAME}}</span>
    <span class="pageno">{{BRAND.COMPANY}} · <span class="cur">14</span></span>
  </footer>
</section>

<!-- ════════ PAGE 15 · CH 8 CAREER DIRECTIONS ════════ -->
<section class="page">
  <header class="ph-top">
    <span class="lockup"><span class="mark"></span>Lifework</span>
    <span>Chapter 8 · Career Directions</span>
  </header>
  <div class="ph-body">
    <span class="kicker">Chapter 08</span>
    <h2 class="chap-title">Career <em>directions.</em></h2>
    {{#EACH CH8.DIRECTIONS}}
    <h3 class="section-h">{{.heading}}</h3>
    {{#EACH .paragraphs}}
    <p>{{.}}</p>
    {{/EACH}}
    {{/EACH}}
    <p class="lede" style="margin-top:22px;text-align:center;">{{CH8.CLOSING}}</p>
  </div>
  <footer class="ph-bot">
    <span class="who">{{CLIENT.NAME}}</span>
    <span class="pageno">{{BRAND.COMPANY}} · <span class="cur">15</span></span>
  </footer>
</section>

<!-- ════════ PAGE 16 · APPENDIX — FOUR VARIANTS ════════ -->
<section class="page warm">
  <header class="ph-top">
    <span class="lockup"><span class="mark"></span>Lifework</span>
    <span>Appendix</span>
  </header>
  <div class="ph-body">
    <span class="kicker">Appendix</span>
    <h2 class="chap-title">The four report <em>variants.</em></h2>
    <p class="lede">{{APPENDIX.LEDE}}</p>
    <table class="variants">
      <thead>
        <tr><th style="width:160px;">Variant</th><th style="width:220px;">For</th><th>The central question</th></tr>
      </thead>
      <tbody>
        {{#EACH APPENDIX.VARIANTS}}
        <tr><td class="var">{{.name}}</td><td>{{.for}}</td><td class="q">{{.question}}</td></tr>
        {{/EACH}}
      </tbody>
    </table>
    <p style="margin-top:36px;font-family:var(--sans);font-size:11px;letter-spacing:0.12em;color:var(--ink-muted);">This report is confidential and prepared exclusively for the named individual.</p>
  </div>
  <footer class="ph-bot">
    <span class="who">{{CLIENT.NAME}}</span>
    <span class="pageno">{{BRAND.COMPANY}} · <span class="cur">16</span></span>
  </footer>
</section>

<!-- ════════ PAGE 17 · ANNEX COVER ════════ -->
<section class="page annex-cover">
  <div style="position:relative;z-index:1;">
    <span class="brand" style="display:inline-flex;align-items:center;gap:14px;font-family:var(--serif);font-weight:600;font-size:26px;color:var(--navy);">
      <span class="mark" style="width:40px;height:40px;display:inline-block;"></span>Lifework
    </span>
    <div class="series" style="margin-top:18px;">{{BRAND.COMPANY}} · WOW Report</div>
    <h1 class="display" style="margin-top:24px;font-size:80px;line-height:0.96;">Your <em>data.</em></h1>
    <p class="lede" style="margin-top:24px;max-width:540px;">The underlying information that Sage used to build your report — recorded exactly as you gave it, and as the instruments scored it.</p>
    <div class="contents">
      <div class="row"><span class="ix">A1</span><span class="lb">Life History Data</span></div>
      <div class="row"><span class="ix">A2</span><span class="lb">VIA Character Strengths — all 24</span></div>
      <div class="row"><span class="ix">A3</span><span class="lb">OCEAN Personality Profile — with facets</span></div>
    </div>
  </div>
  <div style="position:relative;z-index:1;font-family:var(--sans);font-size:10px;letter-spacing:0.28em;text-transform:uppercase;color:var(--ink-muted);">
    Prepared for {{CLIENT.NAME}} · {{REPORT.DATE}}
  </div>
</section>

<!-- ════════ PAGES 18–21 · A1 LIFE HISTORY ════════ -->
{{#EACH LIFE_HISTORY.PAGES}}
<section class="page">
  <header class="ph-top">
    <span class="lockup"><span class="mark"></span>Lifework</span>
    <span>A1 · Life History</span>
  </header>
  <div class="ph-body">
    {{#IF .showKicker}}
    <span class="kicker">Annex A1</span>
    <h2 class="chap-title">Life <em>history.</em></h2>
    <p style="font-family:var(--serif);font-style:italic;font-size:15px;color:var(--ink-muted);">Achievements recorded during the Sage life history interview. Where Sage asked a follow-up, the enrichment note is shown beneath.</p>
    {{/IF}}
    {{#EACH .stages}}
    <div class="stage-head"><span class="sh-title">{{.title}}</span><span class="sh-age">{{.ages}}</span></div>
    {{#EACH .entries}}
    <div class="lh-entry">
      <div class="lh-top"><span class="lh-title">{{.title}}</span><span class="lh-meta">Age {{.age}}<span class="esf {{.esfClass}}">{{.esf}}</span></span></div>
      <div class="lh-body">{{.body}}</div>
      {{#IF .note}}<div class="lh-note">{{.note}}</div>{{/IF}}
    </div>
    {{/EACH}}
    {{/EACH}}
  </div>
  <footer class="ph-bot">
    <span class="who">{{CLIENT.NAME}}</span>
    <span class="pageno">{{BRAND.COMPANY}} · <span class="cur">{{.pageNum}}</span></span>
  </footer>
</section>
{{/EACH}}

<!-- ════════ PAGE 22 · A2 VIA FULL 24 ════════ -->
<section class="page">
  <header class="ph-top">
    <span class="lockup"><span class="mark"></span>Lifework</span>
    <span>A2 · VIA Character Strengths</span>
  </header>
  <div class="ph-body">
    <span class="kicker">Annex A2</span>
    <h2 class="chap-title">VIA character <em>strengths.</em></h2>
    <p style="font-family:var(--serif);font-style:italic;font-size:15px;color:var(--ink-muted);">All 24 strengths ranked by score out of 25. Top 5 highlighted in gold; bottom 5 in muted.</p>
    <ol class="rank-list full" style="columns:2;column-gap:56px;margin-top:8px;">
      {{#EACH VIA.ALL24}}
      <li class="{{.cssClass}}"><span class="nm">{{.name}}</span><span class="sc">{{.score}}<span class="of">/25</span></span></li>
      {{/EACH}}
    </ol>
    <p style="margin-top:36px;font-family:var(--serif);font-style:italic;color:var(--ink-muted);font-size:13px;">{{VIA.VIRTUES_NOTE}}</p>
  </div>
  <footer class="ph-bot">
    <span class="who">{{CLIENT.NAME}}</span>
    <span class="pageno">{{BRAND.COMPANY}} · <span class="cur">22</span></span>
  </footer>
</section>

<!-- ════════ PAGE 23 · A3 OCEAN FACETS (1/2) ════════ -->
<section class="page">
  <header class="ph-top">
    <span class="lockup"><span class="mark"></span>Lifework</span>
    <span>A3 · OCEAN Personality Profile</span>
  </header>
  <div class="ph-body">
    <span class="kicker">Annex A3</span>
    <h2 class="chap-title">OCEAN <em>personality profile.</em></h2>
    <p style="font-family:var(--serif);font-style:italic;font-size:15px;color:var(--ink-muted);">Five domain scores and 30 sub-scale facets. Scores are percentiles (0–100). Above 70 is high; below 30 is low.</p>
    {{#EACH OCEAN.PAGE1_DOMAINS}}
    <div class="facet-group">
      <div class="fg-head"><span class="fg-name">{{.name}}</span><span class="fg-score">{{.pct}}<span class="pct">%ile</span></span></div>
      <div class="facets">
        {{#EACH .facets}}
        <div class="facet"><span class="fnm">{{.name}}</span><span class="fbar"><span class="ff" style="width:{{.pct}}%;display:block;height:100%;background:var(--gold)"></span></span><span class="fsc">{{.pct}}</span></div>
        {{/EACH}}
      </div>
    </div>
    {{/EACH}}
  </div>
  <footer class="ph-bot">
    <span class="who">{{CLIENT.NAME}}</span>
    <span class="pageno">{{BRAND.COMPANY}} · <span class="cur">23</span></span>
  </footer>
</section>

<!-- ════════ PAGE 24 · A3 OCEAN FACETS (2/2) ════════ -->
<section class="page">
  <header class="ph-top">
    <span class="lockup"><span class="mark"></span>Lifework</span>
    <span>A3 · OCEAN Personality Profile</span>
  </header>
  <div class="ph-body">
    {{#EACH OCEAN.PAGE2_DOMAINS}}
    <div class="facet-group" {{#IF .first}}style="margin-top:0;"{{/IF}}>
      <div class="fg-head"><span class="fg-name">{{.name}}</span><span class="fg-score">{{.pct}}<span class="pct">%ile</span></span></div>
      <div class="facets">
        {{#EACH .facets}}
        <div class="facet"><span class="fnm">{{.name}}</span><span class="fbar"><span class="ff" style="width:{{.pct}}%;display:block;height:100%;background:var(--gold)"></span></span><span class="fsc">{{.pct}}</span></div>
        {{/EACH}}
      </div>
    </div>
    {{/EACH}}
    <p style="margin-top:48px;font-family:var(--serif);font-style:italic;font-size:15px;color:var(--ink-muted);line-height:1.5;">{{OCEAN.FACET_NOTE}}</p>
    <p style="margin-top:24px;font-family:var(--sans);font-size:11px;letter-spacing:0.12em;color:var(--ink-muted);">Confidential — prepared by {{BRAND.COMPANY}} for the named client only.</p>
  </div>
  <footer class="ph-bot">
    <span class="who">{{CLIENT.NAME}}</span>
    <span class="pageno">{{BRAND.COMPANY}} · <span class="cur">24</span></span>
  </footer>
</section>

<div id="lw-print-bar">
  <span>Lifework WOW Report · {{CLIENT.NAME}} · {{REPORT.DATE}}</span>
  <button onclick="window.print()">Print / Save as PDF</button>
</div>

<script>
  // Inject the PH tangram logo ONLY into .mark elements inside .lockup or .brand spans
  // (header logo marks only — NOT standalone decorative .mark divs)
  document.querySelectorAll('.lockup .mark, .brand .mark').forEach(function(el) {
    if (!el.innerHTML.trim()) {
      el.innerHTML = '<img src="${CDN_TANGRAM}" alt="" style="width:100%;height:100%;display:block;object-fit:contain;"/>';
    }
  });
</script>
</body>
</html>`;

// ─── Express handler ──────────────────────────────────────────────────────────

export async function htmlReportHandler(req: Request, res: Response): Promise<void> {
  try {
    // Auth check — must be a counsellor (admin)
    let user: { role?: string } | null = null;
    try {
      user = await sdk.authenticateRequest(req);
    } catch {
      res.status(401).send("Unauthorised");
      return;
    }
    if (!user || user.role !== "admin") {
      res.status(403).send("Forbidden — counsellor access required");
      return;
    }

    const clientId = parseInt(req.params.clientId ?? "0", 10);
    if (!clientId || isNaN(clientId)) {
      res.status(400).send("Invalid client ID");
      return;
    }

    // Build the Claude export JSON (same function used by the download route)
    const payload = await buildClaudeExportJson(clientId) as Record<string, unknown>;

    // Render the template
    const html = renderTemplate(TEMPLATE, payload);

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.send(html);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[html-report] Error:", message);
    res.status(500).send(`<pre>Error generating report: ${message}</pre>`);
  }
}
