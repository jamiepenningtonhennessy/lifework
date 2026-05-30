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
    // Process {{#IF}} blocks iteratively, handling nesting correctly via depth tracking.
    // The old regex approach (non-greedy) failed on nested {{#IF}} blocks because the
    // inner {{/IF}} was consumed before the outer one, leaving the outer {{#IF}} tag
    // unprocessed and visible as raw text in the rendered output.
    let result = tmpl;
    let safety = 0;
    while (safety++ < 500) {
      const openRe = /\{\{#IF ([^}]+)\}\}/;
      const openMatch = openRe.exec(result);
      if (!openMatch) break;
      const valuePath = openMatch[1];
      const openTag = openMatch[0];
      const openStart = openMatch.index;
      const afterOpen = openStart + openTag.length;
      // Find matching {{/IF}} by tracking nesting depth
      const anyOpenRe = /\{\{#IF [^}]+\}\}/g;
      let depth = 1;
      let searchFrom = afterOpen;
      let closeIdx = -1;
      while (depth > 0) {
        anyOpenRe.lastIndex = searchFrom;
        const anyOpenMatch = anyOpenRe.exec(result);
        const nextOpen = anyOpenMatch ? anyOpenMatch.index : -1;
        const nextClose = result.indexOf("{{/IF}}", searchFrom);
        if (nextClose === -1) break;
        if (nextOpen !== -1 && nextOpen < nextClose) {
          depth++;
          searchFrom = nextOpen + anyOpenMatch!.length;
        } else {
          depth--;
          if (depth === 0) { closeIdx = nextClose; break; }
          searchFrom = nextClose + "{{/IF}}".length;
        }
      }
      if (closeIdx === -1) break;
      const block = result.slice(afterOpen, closeIdx);
      const val = resolvePath(ctx, valuePath.trim());
      const truthy = val !== "" && val !== false && val !== null && val !== undefined && val !== 0;
      const replacement = truthy ? block : "";
      result = result.slice(0, openStart) + replacement + result.slice(closeIdx + "{{/IF}}".length);
    }
    return result;
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
p.pillar-learning { font-family: var(--serif); font-style: italic; font-size: 16px; color: var(--navy-soft); margin: 0 0 12px; }
p.pillar-learning strong { font-style: normal; font-weight: 700; color: var(--navy); }
blockquote.pillar-synthesis { border-left: 3px solid var(--gold); margin: 20px 0 16px; padding: 10px 0 10px 20px; font-family: var(--serif); font-style: italic; font-size: 16px; color: var(--navy-soft); }
p.pillar-citation { font-size: 12px; color: var(--ink-muted); margin-top: 20px; }
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
.page.letter .ph-body { display: flex; flex-direction: column; padding-top: 28px; }
.letter h1.display { font-size: 44px; }
.letter .sig { margin-top: 28px; font-family: var(--serif); font-style: italic; font-size: 18px; color: var(--navy); }
.letter .sig .name { font-style: normal; font-weight: 600; display: block; margin-top: 8px; }
.letter .sig .mail { font-family: var(--sans); font-style: normal; font-size: 12px; color: var(--ink-muted); letter-spacing: 0.04em; }
.page.title-page { justify-content: space-between; padding-top: 60px; padding-bottom: 88px; position: relative; overflow: hidden; }
.page.title-page::after { content: ""; position: absolute; right: -180px; top: -180px; width: 620px; height: 620px; border: 1px solid var(--gold); border-radius: 50%; opacity: 0.35; }
.page.title-page::before { content: ""; position: absolute; left: 60px; bottom: -220px; width: 360px; height: 360px; border: 1px solid var(--gold); border-radius: 50%; opacity: 0.22; }
.title-page .brand { display: flex; align-items: center; gap: 14px; font-family: var(--serif); font-weight: 600; font-size: 28px; color: var(--navy); letter-spacing: 0.005em; position: relative; z-index: 1; }
.title-page .brand .mark { width: 44px; height: 44px; flex-shrink: 0; }
.title-page .series { font-family: var(--sans); font-size: 11px; letter-spacing: 0.48em; text-transform: uppercase; color: var(--gold); margin-top: 14px; position: relative; z-index: 1; }
.title-page .t-main { position: relative; z-index: 1; margin-top: auto; margin-bottom: 28px; }
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
/* ── Insights wheel layout ── */
.insights-body { display: grid; grid-template-columns: 260px 1fr; gap: 28px; margin-top: 22px; align-items: start; }
/* Jungian type box */
.jungian-box { border: 1px solid var(--navy); padding: 16px 22px; display: grid; grid-template-columns: 1fr 1fr; gap: 0; margin-bottom: 20px; }
.jungian-box .jb-left { border-right: 1px solid var(--navy); padding-right: 20px; }
.jungian-box .jb-label { font-family: var(--sans); font-size: 9px; letter-spacing: 0.36em; text-transform: uppercase; color: var(--ink-muted); margin-bottom: 2px; }
.jungian-box .jb-type { font-family: var(--serif); font-size: 48px; font-weight: 700; color: var(--navy); line-height: 1; letter-spacing: 0.04em; }
.jungian-box .jb-right { padding-left: 20px; display: flex; flex-direction: column; justify-content: space-between; }
.jungian-box .jb-mbti { display: flex; flex-direction: column; gap: 2px; }
.jungian-box .jb-mbti-label { font-family: var(--sans); font-size: 9px; letter-spacing: 0.36em; text-transform: uppercase; color: var(--ink-muted); }
.jungian-box .jb-mbti-val { font-family: var(--serif); font-size: 13px; color: var(--navy); font-weight: 500; }
.jungian-box .jb-spelt { font-family: var(--serif); font-style: italic; font-size: 12px; color: var(--ink-muted); line-height: 1.4; text-align: right; align-self: flex-end; }
/* Axis cards */
.axis-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 20px; }
.axis-card { border-top: 3px solid var(--gold); padding: 10px 14px 12px; background: rgba(26,39,68,0.03); }
.axis-card .ac-label { font-family: var(--sans); font-size: 8.5px; letter-spacing: 0.36em; text-transform: uppercase; color: var(--ink-muted); margin-bottom: 4px; }
.axis-card .ac-value { font-family: var(--serif); font-size: 15px; color: var(--navy); font-weight: 500; line-height: 1.2; }
.axis-card .ac-note { font-family: var(--sans); font-size: 9.5px; color: var(--ink-muted); margin-top: 3px; }
.insights-wheel-wrap { display: flex; align-items: center; justify-content: center; }
.insights-cards { display: flex; flex-direction: column; gap: 16px; }
.icard { border-radius: 3px; overflow: hidden; }
.icard-head { padding: 14px 18px; display: flex; align-items: center; gap: 14px; }
.icard-head.green  { background: #7A9A5E; }
.icard-head.blue   { background: #3C6E8F; }
.icard-head.red    { background: #A93226; }
.icard-head.yellow { background: #C9973A; }
.icard-badge { width: 28px; height: 28px; border-radius: 50%; background: rgba(255,255,255,0.25); display: flex; align-items: center; justify-content: center; font-family: var(--sans); font-weight: 700; font-size: 13px; color: #fff; flex-shrink: 0; }
.icard-title { display: flex; flex-direction: column; gap: 2px; }
.icard-title .icard-name { font-family: var(--serif); font-weight: 600; font-size: 18px; color: #fff; line-height: 1.1; }
.icard-title .icard-sub  { font-family: var(--sans); font-size: 10px; color: rgba(255,255,255,0.82); letter-spacing: 0.02em; }
.icard-body { padding: 12px 18px; background: rgba(26,39,68,0.05); border: 1px solid rgba(26,39,68,0.1); border-top: none; }
.icard-body p { font-family: var(--serif); font-size: 13.5px; line-height: 1.5; color: var(--ink); margin: 0; }
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

    <div style="margin-top:10mm;">
      {{#EACH COVER_LETTER.PARAGRAPHS}}
      <p>{{.}}</p>
      {{/EACH}}
    </div>

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

<!-- ════════ PAGE 5b · CH 2B 4 PILLARS OF FULFILMENT ════════ -->
{{#IF CH2B.HAS_CONTENT}}
<section class="page">
  <header class="ph-top">
    <span class="lockup"><span class="mark"></span>Lifework</span>
    <span>Chapter 2b · 4 Pillars of Fulfilment</span>
  </header>
  <div class="ph-body">
    <span class="kicker">Chapter 02b</span>
    <h2 class="chap-title">4 Pillars of <em>Fulfilment.</em></h2>
    {{#EACH CH2B.PILLARS}}
    <h3 class="section-h">{{.HEADING}}</h3>
    {{#IF .LEARNING}}<p class="pillar-learning"><strong>Learning:</strong> {{.LEARNING}}</p>{{/IF}}
    {{#EACH .EXAMPLES}}
    <p>{{.}}</p>
    {{/EACH}}
    {{/EACH}}
    {{#IF CH2B.COMBINATION_SYNTHESIS}}
    <h3 class="section-h">The Combination</h3>
    <blockquote class="pillar-synthesis">{{CH2B.COMBINATION_SYNTHESIS}}</blockquote>
    {{#IF CH2B.COMBINATION_QUESTION}}<p>{{CH2B.COMBINATION_QUESTION}}</p>{{/IF}}
    {{/IF}}
    {{#IF CH2B.CITATION}}<p class="pillar-citation"><em>{{CH2B.CITATION}}</em></p>{{/IF}}
  </div>
  <footer class="ph-bot">
    <span class="who">{{CLIENT.NAME}}</span>
    <span class="pageno">{{BRAND.COMPANY}} · <span class="cur">05b</span></span>
  </footer>
</section>
{{/IF}}

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
    <p class="lede">The following is an <em>approximation</em> derived by mapping your Big Five scores onto the Insights Discovery colour-energy framework, using the academic consensus correlations between OCEAN and the Jungian dimensions. It is a coaching tool, not a clinical assessment. For a validated Insights profile, contact an accredited Insights practitioner.</p>
    <div class="insights-body">
      <div class="insights-wheel-wrap">
        <svg width="240" height="240" viewBox="0 0 240 240" xmlns="http://www.w3.org/2000/svg">
          <!-- four solid quadrant segments -->
          <!-- top-right: Fiery Red -->
          <path d="M120,120 L120,8 A112,112 0 0,1 232,120 Z" fill="#A93226"/>
          <!-- bottom-right: Sunshine Yellow -->
          <path d="M120,120 L232,120 A112,112 0 0,1 120,232 Z" fill="#C9973A"/>
          <!-- bottom-left: Earth Green -->
          <path d="M120,120 L120,232 A112,112 0 0,1 8,120 Z" fill="#7A9A5E"/>
          <!-- top-left: Cool Blue -->
          <path d="M120,120 L8,120 A112,112 0 0,1 120,8 Z" fill="#3C6E8F"/>
          <!-- client dot -->
          <circle cx="{{CH5.WHEEL.X}}" cy="{{CH5.WHEEL.Y}}" r="7" fill="#fff" stroke="#C9973A" stroke-width="2.5"/>
          <circle cx="{{CH5.WHEEL.X}}" cy="{{CH5.WHEEL.Y}}" r="3.5" fill="#C9973A"/>
        </svg>
      </div>
      <div class="insights-cards">
        <div class="icard">
          <div class="icard-head {{CH5.PRIMARY.cssClass}}">
            <div class="icard-badge">1</div>
            <div class="icard-title">
              <div class="icard-name">{{CH5.PRIMARY.fullName}}</div>
              <div class="icard-sub">Primary energy &middot; {{CH5.PRIMARY.jungian}}</div>
            </div>
          </div>
          <div class="icard-body"><p>{{CH5.PRIMARY.description}}</p></div>
        </div>
        <div class="icard">
          <div class="icard-head {{CH5.SECONDARY.cssClass}}">
            <div class="icard-badge">2</div>
            <div class="icard-title">
              <div class="icard-name">{{CH5.SECONDARY.fullName}}</div>
              <div class="icard-sub">Secondary energy &middot; {{CH5.SECONDARY.jungian}}</div>
            </div>
          </div>
          <div class="icard-body"><p>{{CH5.SECONDARY.description}}</p></div>
        </div>
      </div>
    </div>
    <!-- Jungian type box -->
    <div class="jungian-box">
      <div class="jb-left">
        <div class="jb-label">Jungian Type</div>
        <div class="jb-type">{{CH5.JUNGIAN_TYPE}}</div>
      </div>
      <div class="jb-right">
        <div class="jb-mbti">
          <div class="jb-mbti-label">Approx. MBTI Equivalent</div>
          <div class="jb-mbti-val">{{CH5.JUNGIAN_TYPE}}</div>
        </div>
        <div class="jb-spelt">{{CH5.JUNGIAN_SPELT}}</div>
      </div>
    </div>
    <!-- Axis cards -->
    <div class="axis-row">
      {{#EACH CH5.AXES}}
      <div class="axis-card">
        <div class="ac-label">{{.label}}</div>
        <div class="ac-value">{{.value}}</div>
        <div class="ac-note">{{.note}}</div>
      </div>
      {{/EACH}}
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

<!-- ════════ PAGE 12b · CH 6 DEVELOPMENT EDGE (OVERFLOW) ════════ -->
{{#IF CH6.HAS_OVERFLOW}}
<section class="page">
  <header class="ph-top">
    <span class="lockup"><span class="mark"></span>Lifework</span>
    <span>Chapter 6 · Development Edge (continued)</span>
  </header>
  <div class="ph-body">
    {{#EACH CH6.OVERFLOW_SECTIONS}}
    {{#IF .heading}}<h3 class="section-h">{{.heading}}</h3>{{/IF}}
    {{#EACH .paragraphs}}
    <p>{{.}}</p>
    {{/EACH}}
    {{/EACH}}
  </div>
  <footer class="ph-bot">
    <span class="who">{{CLIENT.NAME}}</span>
    <span class="pageno">{{BRAND.COMPANY}} · <span class="cur">12b</span></span>
  </footer>
</section>
{{/IF}}
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
        <p style="margin:12px 0 4px;">I am fundamentally driven by:</p>
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
    {{#IF .heading}}<h3 class="section-h">{{.heading}}</h3>{{/IF}}
    {{#EACH .paragraphs}}
    <p>{{.}}</p>
    {{/EACH}}
    {{/EACH}}
    {{#IF CH8.NO_OVERFLOW}}<p class="lede" style="margin-top:22px;text-align:center;">{{CH8.CLOSING}}</p>{{/IF}}
  </div>
  <footer class="ph-bot">
    <span class="who">{{CLIENT.NAME}}</span>
    <span class="pageno">{{BRAND.COMPANY}} · <span class="cur">15</span></span>
  </footer>
</section>

<!-- ════════ PAGE 15b · CH 8 CAREER DIRECTIONS (OVERFLOW) ════════ -->
{{#IF CH8.HAS_OVERFLOW}}
<section class="page">
  <header class="ph-top">
    <span class="lockup"><span class="mark"></span>Lifework</span>
    <span>Chapter 8 · Career Directions (continued)</span>
  </header>
  <div class="ph-body">
    {{#EACH CH8.OVERFLOW_DIRECTIONS}}
    {{#IF .heading}}<h3 class="section-h">{{.heading}}</h3>{{/IF}}
    {{#EACH .paragraphs}}
    <p>{{.}}</p>
    {{/EACH}}
    {{/EACH}}
    <p class="lede" style="margin-top:22px;text-align:center;">{{CH8.CLOSING}}</p>
  </div>
  <footer class="ph-bot">
    <span class="who">{{CLIENT.NAME}}</span>
    <span class="pageno">{{BRAND.COMPANY}} · <span class="cur">15b</span></span>
  </footer>
</section>
{{/IF}}

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
      <div class="row"><span class="ix">A</span><span class="lb">Life History Data</span></div>
      <div class="row"><span class="ix">B</span><span class="lb">Biographical Data</span></div>
      <div class="row"><span class="ix">C</span><span class="lb">VIA Character Strengths — all 24</span></div>
      <div class="row"><span class="ix">D</span><span class="lb">OCEAN Personality Profile — with facets</span></div>
    </div>
  </div>
  <div style="position:relative;z-index:1;font-family:var(--sans);font-size:10px;letter-spacing:0.28em;text-transform:uppercase;color:var(--ink-muted);">
    Prepared for {{CLIENT.NAME}} · {{REPORT.DATE}}
  </div>
</section>

<!-- ════════ ANNEX A · LIFE HISTORY ════════ -->
{{#EACH LIFE_HISTORY.PAGES}}
<section class="page">
  <header class="ph-top">
    <span class="lockup"><span class="mark"></span>Lifework</span>
    <span>A · Life History</span>
  </header>
  <div class="ph-body">
    {{#IF .showKicker}}
    <span class="kicker">Annex A</span>
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

<!-- ════════ ANNEX B · BIOGRAPHICAL DATA ════════ -->
<section class="page">
  <header class="ph-top">
    <span class="lockup"><span class="mark"></span>Lifework</span>
    <span>B · Biographical Data</span>
  </header>
  <div class="ph-body">
    <span class="kicker">Annex B</span>
    <h2 class="chap-title">Biographical <em>data.</em></h2>
    <p style="font-family:var(--serif);font-style:italic;font-size:15px;color:var(--ink-muted);">Family background, educational history, and career history as provided by the client.</p>

    <!-- B1: Family Background -->
    <div style="margin-top:24px;">
      <div style="font-family:var(--sans);font-size:10px;letter-spacing:0.42em;text-transform:uppercase;color:var(--gold);display:inline-flex;align-items:center;gap:14px;margin-bottom:10px;"><span style="width:32px;height:1px;background:var(--gold);display:inline-block;"></span>B1 — Family Background</div>
      {{#IF BIOGRAPHICAL.FAMILY.HAS_DATA}}
      <table style="width:100%;border-collapse:collapse;font-size:13px;font-family:var(--sans);margin-bottom:10px;">
        {{#IF BIOGRAPHICAL.FAMILY.upbringingLocation}}<tr><td style="color:var(--ink-muted);padding:4px 0;width:200px;vertical-align:top;">Location of upbringing</td><td style="padding:4px 0;color:var(--ink);">{{BIOGRAPHICAL.FAMILY.upbringingLocation}}</td></tr>{{/IF}}
        {{#IF BIOGRAPHICAL.FAMILY.fatherOccupation}}<tr><td style="color:var(--ink-muted);padding:4px 0;vertical-align:top;">Father's occupation</td><td style="padding:4px 0;color:var(--ink);">{{BIOGRAPHICAL.FAMILY.fatherOccupation}}</td></tr>{{/IF}}
        {{#IF BIOGRAPHICAL.FAMILY.motherOccupation}}<tr><td style="color:var(--ink-muted);padding:4px 0;vertical-align:top;">Mother's occupation</td><td style="padding:4px 0;color:var(--ink);">{{BIOGRAPHICAL.FAMILY.motherOccupation}}</td></tr>{{/IF}}
        {{#IF BIOGRAPHICAL.FAMILY.siblingPosition}}<tr><td style="color:var(--ink-muted);padding:4px 0;vertical-align:top;">Position among siblings</td><td style="padding:4px 0;color:var(--ink);">{{BIOGRAPHICAL.FAMILY.siblingPosition}}</td></tr>{{/IF}}
      </table>
      {{#IF BIOGRAPHICAL.FAMILY.familyNarrative}}<p style="font-size:13px;font-family:var(--serif);color:var(--ink);line-height:1.6;margin:0 0 8px;">{{BIOGRAPHICAL.FAMILY.familyNarrative}}</p>{{/IF}}
      {{#IF BIOGRAPHICAL.FAMILY.significantInfluences}}
      <p style="font-size:11px;font-family:var(--sans);color:var(--ink-muted);letter-spacing:0.1em;text-transform:uppercase;margin:8px 0 4px;">Significant influences</p>
      <p style="font-size:13px;font-family:var(--serif);color:var(--ink);line-height:1.6;margin:0;">{{BIOGRAPHICAL.FAMILY.significantInfluences}}</p>
      {{/IF}}
      {{/IF}}
    </div>

    <!-- B2: Educational History -->
    <div style="margin-top:24px;">
      <div style="font-family:var(--sans);font-size:10px;letter-spacing:0.42em;text-transform:uppercase;color:var(--gold);display:inline-flex;align-items:center;gap:14px;margin-bottom:10px;"><span style="width:32px;height:1px;background:var(--gold);display:inline-block;"></span>B2 — Educational History</div>
      {{#IF BIOGRAPHICAL.HAS_EDUCATION}}
      {{#EACH BIOGRAPHICAL.EDUCATION}}
      <div style="padding:8px 0;border-bottom:1px solid var(--rule);">
        <div style="font-family:var(--serif);font-size:15px;font-weight:500;color:var(--navy);">{{.institution}}</div>
        <div style="font-family:var(--sans);font-size:12px;color:var(--ink-muted);margin-top:2px;">{{.qualification}}{{#IF .subject}} · {{.subject}}{{/IF}}{{#IF .yearFrom}} · {{.yearFrom}}–{{.yearTo}}{{/IF}}</div>
        {{#IF .highlights}}<div style="font-family:var(--serif);font-style:italic;font-size:13px;color:var(--ink);margin-top:4px;line-height:1.5;">{{.highlights}}</div>{{/IF}}
      </div>
      {{/EACH}}
      {{/IF}}
    </div>
  </div>
  <footer class="ph-bot">
    <span class="who">{{CLIENT.NAME}}</span>
    <span class="pageno">{{BRAND.COMPANY}} · Annex B</span>
  </footer>
</section>

<!-- ════════ ANNEX B (cont.) · CAREER HISTORY ════════ -->
<section class="page">
  <header class="ph-top">
    <span class="lockup"><span class="mark"></span>Lifework</span>
    <span>B · Biographical Data</span>
  </header>
  <div class="ph-body">
    <span class="kicker">Annex B (continued)</span>
    <h2 class="chap-title">Career <em>history.</em></h2>
    <p style="font-family:var(--serif);font-style:italic;font-size:13px;color:var(--ink-muted);margin-bottom:4px;">B3 — Career history as provided by the client.</p>
    {{#IF BIOGRAPHICAL.HAS_CAREER}}
    {{#EACH BIOGRAPHICAL.CAREER}}
    <div style="padding:7px 0;border-bottom:1px solid var(--rule);">
      <div style="display:flex;justify-content:space-between;align-items:baseline;">
        <div style="font-family:var(--serif);font-size:13px;font-weight:500;color:var(--navy);">{{.organisation}}</div>
        {{#IF .yearFrom}}<div style="font-family:var(--sans);font-size:10px;color:var(--ink-muted);">{{.yearFrom}}–{{.yearTo}}</div>{{/IF}}
      </div>
      {{#IF .role}}<div style="font-family:var(--sans);font-size:11px;color:var(--gold);margin-top:1px;letter-spacing:0.04em;">{{.role}}</div>{{/IF}}
      {{#IF .keyResponsibilities}}<div style="font-family:var(--serif);font-size:12px;color:var(--ink);margin-top:3px;line-height:1.4;">{{.keyResponsibilities}}</div>{{/IF}}
      {{#IF .highlights}}<div style="font-family:var(--serif);font-style:italic;font-size:11px;color:var(--ink-muted);margin-top:2px;line-height:1.35;">{{.highlights}}</div>{{/IF}}
      {{#IF .whyLeft}}<div style="font-family:var(--sans);font-size:10px;color:var(--ink-muted);margin-top:2px;"><em>Why left:</em> {{.whyLeft}}</div>{{/IF}}
    </div>
    {{/EACH}}
    {{/IF}}
  </div>
  <footer class="ph-bot">
    <span class="who">{{CLIENT.NAME}}</span>
    <span class="pageno">{{BRAND.COMPANY}} · Annex B</span>
  </footer>
</section>

<!-- ════════ ANNEX C · VIA FULL 24 ════════ -->
<section class="page">
  <header class="ph-top">
    <span class="lockup"><span class="mark"></span>Lifework</span>
    <span>C · VIA Character Strengths</span>
  </header>
  <div class="ph-body">
    <span class="kicker">Annex C</span>
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

<!-- ════════ ANNEX C (cont.) · VIA DEFINITIONS ════════ -->
<section class="page">
  <header class="ph-top">
    <span class="lockup"><span class="mark"></span>Lifework</span>
    <span>C · VIA Character Strengths — Definitions</span>
  </header>
  <div class="ph-body" style="font-size:10.5px;">
    <span class="kicker">Annex C (continued)</span>
    <h2 class="chap-title" style="margin-bottom:10px;">VIA <em>definitions.</em></h2>
    <p style="font-family:var(--serif);font-style:italic;font-size:11px;color:var(--ink-muted);margin-bottom:8px;">The 24 character strengths, grouped by the six core virtues. Definitions are drawn from the VIA Classification (Peterson &amp; Seligman, 2004).</p>

    <div style="columns:2;column-gap:20px;">

      <!-- WISDOM -->
      <div style="break-inside:avoid;margin-bottom:7px;">
        <div style="font-family:var(--sans);font-size:9px;letter-spacing:0.42em;text-transform:uppercase;color:var(--gold);display:flex;align-items:center;gap:10px;margin-bottom:5px;"><span style="width:24px;height:1px;background:var(--gold);display:inline-block;"></span>Wisdom</div>
        <div style="border-left:2px solid var(--rule);padding-left:10px;">
          <div style="margin-bottom:3px;"><span style="font-family:var(--serif);font-weight:600;font-size:10.5px;color:var(--navy);">Creativity</span><br><span style="font-family:var(--serif);font-size:10px;color:var(--ink);line-height:1.35;">Thinking of novel and productive ways to conceptualise and do things; includes artistic achievement but is not limited to it.</span></div>
          <div style="margin-bottom:3px;"><span style="font-family:var(--serif);font-weight:600;font-size:10.5px;color:var(--navy);">Curiosity</span><br><span style="font-family:var(--serif);font-size:10px;color:var(--ink);line-height:1.35;">Taking an interest in ongoing experience for its own sake; finding subjects and topics fascinating; exploring and discovering.</span></div>
          <div style="margin-bottom:3px;"><span style="font-family:var(--serif);font-weight:600;font-size:10.5px;color:var(--navy);">Judgement</span><br><span style="font-family:var(--serif);font-size:10px;color:var(--ink);line-height:1.35;">Thinking things through and examining them from all sides; not jumping to conclusions; being able to change one's mind in light of evidence.</span></div>
          <div style="margin-bottom:3px;"><span style="font-family:var(--serif);font-weight:600;font-size:10.5px;color:var(--navy);">Love of Learning</span><br><span style="font-family:var(--serif);font-size:10px;color:var(--ink);line-height:1.35;">Mastering new skills, topics, and bodies of knowledge, whether on one's own or formally; related to curiosity but goes beyond it.</span></div>
          <div><span style="font-family:var(--serif);font-weight:600;font-size:10.5px;color:var(--navy);">Perspective</span><br><span style="font-family:var(--serif);font-size:10px;color:var(--ink);line-height:1.35;">Being able to provide wise counsel to others; having ways of looking at the world that make sense to oneself and to other people.</span></div>
        </div>
      </div>

      <!-- COURAGE -->
      <div style="break-inside:avoid;margin-bottom:7px;">
        <div style="font-family:var(--sans);font-size:9px;letter-spacing:0.42em;text-transform:uppercase;color:var(--gold);display:flex;align-items:center;gap:10px;margin-bottom:5px;"><span style="width:24px;height:1px;background:var(--gold);display:inline-block;"></span>Courage</div>
        <div style="border-left:2px solid var(--rule);padding-left:10px;">
          <div style="margin-bottom:3px;"><span style="font-family:var(--serif);font-weight:600;font-size:10.5px;color:var(--navy);">Bravery</span><br><span style="font-family:var(--serif);font-size:10px;color:var(--ink);line-height:1.35;">Not shrinking from threat, challenge, difficulty, or pain; speaking up for what is right even if there is opposition.</span></div>
          <div style="margin-bottom:3px;"><span style="font-family:var(--serif);font-weight:600;font-size:10.5px;color:var(--navy);">Perseverance</span><br><span style="font-family:var(--serif);font-size:10px;color:var(--ink);line-height:1.35;">Finishing what one starts; persisting in a course of action in spite of obstacles; taking pleasure in completing tasks.</span></div>
          <div style="margin-bottom:3px;"><span style="font-family:var(--serif);font-weight:600;font-size:10.5px;color:var(--navy);">Honesty</span><br><span style="font-family:var(--serif);font-size:10px;color:var(--ink);line-height:1.35;">Speaking the truth but more broadly presenting oneself in a genuine way and acting without pretence; taking responsibility for one's feelings and actions.</span></div>
          <div><span style="font-family:var(--serif);font-weight:600;font-size:10.5px;color:var(--navy);">Zest</span><br><span style="font-family:var(--serif);font-size:10px;color:var(--ink);line-height:1.35;">Approaching life with excitement and energy; not doing things halfway or half-heartedly; living life as an adventure; feeling alive and activated.</span></div>
        </div>
      </div>

      <!-- HUMANITY -->
      <div style="break-inside:avoid;margin-bottom:7px;">
        <div style="font-family:var(--sans);font-size:9px;letter-spacing:0.42em;text-transform:uppercase;color:var(--gold);display:flex;align-items:center;gap:10px;margin-bottom:5px;"><span style="width:24px;height:1px;background:var(--gold);display:inline-block;"></span>Humanity</div>
        <div style="border-left:2px solid var(--rule);padding-left:10px;">
          <div style="margin-bottom:3px;"><span style="font-family:var(--serif);font-weight:600;font-size:10.5px;color:var(--navy);">Love</span><br><span style="font-family:var(--serif);font-size:10px;color:var(--ink);line-height:1.35;">Valuing close relations with others, in particular those in which sharing and caring are reciprocated; being close to people.</span></div>
          <div style="margin-bottom:3px;"><span style="font-family:var(--serif);font-weight:600;font-size:10.5px;color:var(--navy);">Kindness</span><br><span style="font-family:var(--serif);font-size:10px;color:var(--ink);line-height:1.35;">Doing favours and good deeds for others; helping them; taking care of them.</span></div>
          <div><span style="font-family:var(--serif);font-weight:600;font-size:10.5px;color:var(--navy);">Social Intelligence</span><br><span style="font-family:var(--serif);font-size:10px;color:var(--ink);line-height:1.35;">Being aware of the motives and feelings of other people and oneself; knowing what to do to fit into different social situations.</span></div>
        </div>
      </div>

      <!-- JUSTICE -->
      <div style="break-inside:avoid;margin-bottom:7px;">
        <div style="font-family:var(--sans);font-size:9px;letter-spacing:0.42em;text-transform:uppercase;color:var(--gold);display:flex;align-items:center;gap:10px;margin-bottom:5px;"><span style="width:24px;height:1px;background:var(--gold);display:inline-block;"></span>Justice</div>
        <div style="border-left:2px solid var(--rule);padding-left:10px;">
          <div style="margin-bottom:3px;"><span style="font-family:var(--serif);font-weight:600;font-size:10.5px;color:var(--navy);">Teamwork</span><br><span style="font-family:var(--serif);font-size:10px;color:var(--ink);line-height:1.35;">Working well as a member of a group or team; being loyal to the group; doing one's share.</span></div>
          <div style="margin-bottom:3px;"><span style="font-family:var(--serif);font-weight:600;font-size:10.5px;color:var(--navy);">Fairness</span><br><span style="font-family:var(--serif);font-size:10px;color:var(--ink);line-height:1.35;">Treating all people the same according to notions of fairness and justice; not letting personal feelings bias decisions about others.</span></div>
          <div><span style="font-family:var(--serif);font-weight:600;font-size:10.5px;color:var(--navy);">Leadership</span><br><span style="font-family:var(--serif);font-size:10px;color:var(--ink);line-height:1.35;">Encouraging a group of which one is a member to get things done and at the same time maintain good relations within the group.</span></div>
        </div>
      </div>

      <!-- TEMPERANCE -->
      <div style="break-inside:avoid;margin-bottom:7px;">
        <div style="font-family:var(--sans);font-size:9px;letter-spacing:0.42em;text-transform:uppercase;color:var(--gold);display:flex;align-items:center;gap:10px;margin-bottom:5px;"><span style="width:24px;height:1px;background:var(--gold);display:inline-block;"></span>Temperance</div>
        <div style="border-left:2px solid var(--rule);padding-left:10px;">
          <div style="margin-bottom:3px;"><span style="font-family:var(--serif);font-weight:600;font-size:10.5px;color:var(--navy);">Forgiveness</span><br><span style="font-family:var(--serif);font-size:10px;color:var(--ink);line-height:1.35;">Forgiving those who have done wrong; accepting the shortcomings of others; giving people a second chance; not being vengeful.</span></div>
          <div style="margin-bottom:3px;"><span style="font-family:var(--serif);font-weight:600;font-size:10.5px;color:var(--navy);">Humility</span><br><span style="font-family:var(--serif);font-size:10px;color:var(--ink);line-height:1.35;">Letting one's accomplishments speak for themselves; not regarding oneself as more special than one is.</span></div>
          <div style="margin-bottom:3px;"><span style="font-family:var(--serif);font-weight:600;font-size:10.5px;color:var(--navy);">Prudence</span><br><span style="font-family:var(--serif);font-size:10px;color:var(--ink);line-height:1.35;">Being careful about one's choices; not taking undue risks; not saying or doing things that might later be regretted.</span></div>
          <div><span style="font-family:var(--serif);font-weight:600;font-size:10.5px;color:var(--navy);">Self-Regulation</span><br><span style="font-family:var(--serif);font-size:10px;color:var(--ink);line-height:1.35;">Regulating what one feels and does; being disciplined; controlling one's appetites and emotions.</span></div>
        </div>
      </div>

      <!-- TRANSCENDENCE -->
      <div style="break-inside:avoid;margin-bottom:7px;">
        <div style="font-family:var(--sans);font-size:9px;letter-spacing:0.42em;text-transform:uppercase;color:var(--gold);display:flex;align-items:center;gap:10px;margin-bottom:5px;"><span style="width:24px;height:1px;background:var(--gold);display:inline-block;"></span>Transcendence</div>
        <div style="border-left:2px solid var(--rule);padding-left:10px;">
          <div style="margin-bottom:3px;"><span style="font-family:var(--serif);font-weight:600;font-size:10.5px;color:var(--navy);">Appreciation of Beauty</span><br><span style="font-family:var(--serif);font-size:10px;color:var(--ink);line-height:1.35;">Noticing and appreciating beauty, excellence, and/or skilled performance in various domains of life.</span></div>
          <div style="margin-bottom:3px;"><span style="font-family:var(--serif);font-weight:600;font-size:10.5px;color:var(--navy);">Gratitude</span><br><span style="font-family:var(--serif);font-size:10px;color:var(--ink);line-height:1.35;">Being aware of and thankful for the good things that happen; taking time to express thanks.</span></div>
          <div style="margin-bottom:3px;"><span style="font-family:var(--serif);font-weight:600;font-size:10.5px;color:var(--navy);">Hope</span><br><span style="font-family:var(--serif);font-size:10px;color:var(--ink);line-height:1.35;">Expecting the best in the future and working to achieve it; believing that a good future is something that can be brought about.</span></div>
          <div style="margin-bottom:3px;"><span style="font-family:var(--serif);font-weight:600;font-size:10.5px;color:var(--navy);">Humour</span><br><span style="font-family:var(--serif);font-size:10px;color:var(--ink);line-height:1.35;">Liking to laugh and tease; bringing smiles to other people; seeing the light side; making (not necessarily telling) jokes.</span></div>
          <div><span style="font-family:var(--serif);font-weight:600;font-size:10.5px;color:var(--navy);">Spirituality</span><br><span style="font-family:var(--serif);font-size:10px;color:var(--ink);line-height:1.35;">Having coherent beliefs about the higher purpose and meaning of the universe; knowing where one fits within the larger scheme; having beliefs that shape conduct and provide comfort.</span></div>
        </div>
      </div>

    </div>
  </div>
  <footer class="ph-bot">
    <span class="who">{{CLIENT.NAME}}</span>
    <span class="pageno">{{BRAND.COMPANY}} · Annex C</span>
  </footer>
</section>

<!-- ════════ ANNEX D · OCEAN FACETS (1/2) ════════ -->
<section class="page">
  <header class="ph-top">
    <span class="lockup"><span class="mark"></span>Lifework</span>
    <span>D · OCEAN Personality Profile</span>
  </header>
  <div class="ph-body">
    <span class="kicker">Annex D</span>
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

<!-- ════════ ANNEX D · OCEAN FACETS (2/2) ════════ -->
<section class="page">
  <header class="ph-top">
    <span class="lockup"><span class="mark"></span>Lifework</span>
    <span>D · OCEAN Personality Profile</span>
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

<!-- ════════ ANNEX D (cont.) · OCEAN DEFINITIONS ════════ -->
<section class="page">
  <header class="ph-top">
    <span class="lockup"><span class="mark"></span>Lifework</span>
    <span>D · OCEAN Personality Profile — Sub-scale Definitions</span>
  </header>
  <div class="ph-body" style="font-size:12px;">
    <span class="kicker">Annex D (continued)</span>
    <h2 class="chap-title" style="margin-bottom:16px;">OCEAN <em>sub-scales.</em></h2>
    <p style="font-family:var(--serif);font-style:italic;font-size:13px;color:var(--ink-muted);margin-bottom:18px;">The 30 facets of the NEO Personality Inventory, grouped by the five broad domains. Definitions are drawn from Costa &amp; McCrae (1992).</p>

    <div style="columns:2;column-gap:40px;">

      <!-- OPENNESS -->
      <div style="break-inside:avoid;margin-bottom:9px;">
        <div style="font-family:var(--sans);font-size:9px;letter-spacing:0.42em;text-transform:uppercase;color:var(--gold);display:flex;align-items:center;gap:10px;margin-bottom:5px;"><span style="width:24px;height:1px;background:var(--gold);display:inline-block;"></span>Openness to Experience</div>
        <div style="border-left:2px solid var(--rule);padding-left:10px;">
          <div style="margin-bottom:4px;"><span style="font-family:var(--serif);font-weight:600;font-size:10.5px;color:var(--navy);">Imagination</span><br><span style="font-family:var(--serif);font-size:10px;color:var(--ink);line-height:1.35;">A vivid imagination and a tendency to create a rich inner world of fantasy; daydreaming as a creative outlet.</span></div>
          <div style="margin-bottom:4px;"><span style="font-family:var(--serif);font-weight:600;font-size:10.5px;color:var(--navy);">Artistic Interests</span><br><span style="font-family:var(--serif);font-size:10px;color:var(--ink);line-height:1.35;">Deep appreciation for art, music, and poetry; moved by beauty in nature and the arts.</span></div>
          <div style="margin-bottom:4px;"><span style="font-family:var(--serif);font-weight:600;font-size:10.5px;color:var(--navy);">Emotionality</span><br><span style="font-family:var(--serif);font-size:10px;color:var(--ink);line-height:1.35;">Receptivity to one's own inner feelings and emotions; valuing emotional experience as an important part of life.</span></div>
          <div style="margin-bottom:4px;"><span style="font-family:var(--serif);font-weight:600;font-size:10.5px;color:var(--navy);">Adventurousness</span><br><span style="font-family:var(--serif);font-size:10px;color:var(--ink);line-height:1.35;">Eagerness to try new activities, travel to new places, and experience variety; discomfort with the familiar and routine.</span></div>
          <div style="margin-bottom:4px;"><span style="font-family:var(--serif);font-weight:600;font-size:10.5px;color:var(--navy);">Intellect</span><br><span style="font-family:var(--serif);font-size:10px;color:var(--ink);line-height:1.35;">Intellectual curiosity and a love of ideas; enjoying philosophical discussion and abstract thinking for its own sake.</span></div>
          <div><span style="font-family:var(--serif);font-weight:600;font-size:10.5px;color:var(--navy);">Liberalism</span><br><span style="font-family:var(--serif);font-size:10px;color:var(--ink);line-height:1.35;">Readiness to challenge authority, convention, and traditional values; comfort with moral and social ambiguity.</span></div>
        </div>
      </div>

      <!-- CONSCIENTIOUSNESS -->
      <div style="break-inside:avoid;margin-bottom:9px;">
        <div style="font-family:var(--sans);font-size:9px;letter-spacing:0.42em;text-transform:uppercase;color:var(--gold);display:flex;align-items:center;gap:10px;margin-bottom:5px;"><span style="width:24px;height:1px;background:var(--gold);display:inline-block;"></span>Conscientiousness</div>
        <div style="border-left:2px solid var(--rule);padding-left:10px;">
          <div style="margin-bottom:4px;"><span style="font-family:var(--serif);font-weight:600;font-size:10.5px;color:var(--navy);">Self-Efficacy</span><br><span style="font-family:var(--serif);font-size:10px;color:var(--ink);line-height:1.35;">Confidence in one's own ability to accomplish things; a sense of competence and readiness to handle life's demands.</span></div>
          <div style="margin-bottom:4px;"><span style="font-family:var(--serif);font-weight:600;font-size:10.5px;color:var(--navy);">Orderliness</span><br><span style="font-family:var(--serif);font-size:10px;color:var(--ink);line-height:1.35;">Being tidy, well-organised, and methodical; keeping belongings neat and following a regular schedule.</span></div>
          <div style="margin-bottom:4px;"><span style="font-family:var(--serif);font-weight:600;font-size:10.5px;color:var(--navy);">Dutifulness</span><br><span style="font-family:var(--serif);font-size:10px;color:var(--ink);line-height:1.35;">A strong sense of moral obligation; scrupulous adherence to ethical principles and fulfilment of commitments.</span></div>
          <div style="margin-bottom:4px;"><span style="font-family:var(--serif);font-weight:600;font-size:10.5px;color:var(--navy);">Achievement-Striving</span><br><span style="font-family:var(--serif);font-size:10px;color:var(--ink);line-height:1.35;">High aspirations and hard work to reach goals; a sense of direction and purposefulness in life.</span></div>
          <div style="margin-bottom:4px;"><span style="font-family:var(--serif);font-weight:600;font-size:10.5px;color:var(--navy);">Self-Discipline</span><br><span style="font-family:var(--serif);font-size:10px;color:var(--ink);line-height:1.35;">The capacity to begin tasks and carry them through to completion despite boredom or distraction.</span></div>
          <div><span style="font-family:var(--serif);font-weight:600;font-size:10.5px;color:var(--navy);">Cautiousness</span><br><span style="font-family:var(--serif);font-size:10px;color:var(--ink);line-height:1.35;">Thinking carefully before acting or speaking; deliberateness and avoidance of impulsive decisions.</span></div>
        </div>
      </div>

      <!-- EXTRAVERSION -->
      <div style="break-inside:avoid;margin-bottom:9px;">
        <div style="font-family:var(--sans);font-size:9px;letter-spacing:0.42em;text-transform:uppercase;color:var(--gold);display:flex;align-items:center;gap:10px;margin-bottom:5px;"><span style="width:24px;height:1px;background:var(--gold);display:inline-block;"></span>Extraversion</div>
        <div style="border-left:2px solid var(--rule);padding-left:10px;">
          <div style="margin-bottom:4px;"><span style="font-family:var(--serif);font-weight:600;font-size:10.5px;color:var(--navy);">Friendliness</span><br><span style="font-family:var(--serif);font-size:10px;color:var(--ink);line-height:1.35;">Genuine liking for other people and a tendency to form close, warm attachments; easy to get along with.</span></div>
          <div style="margin-bottom:4px;"><span style="font-family:var(--serif);font-weight:600;font-size:10.5px;color:var(--navy);">Gregariousness</span><br><span style="font-family:var(--serif);font-size:10px;color:var(--ink);line-height:1.35;">Preference for the company of others; enjoyment of crowds and social gatherings.</span></div>
          <div style="margin-bottom:4px;"><span style="font-family:var(--serif);font-weight:600;font-size:10.5px;color:var(--navy);">Assertiveness</span><br><span style="font-family:var(--serif);font-size:10px;color:var(--ink);line-height:1.35;">Dominance, forcefulness, and social ascendance; speaking up without hesitation and taking charge of situations.</span></div>
          <div style="margin-bottom:4px;"><span style="font-family:var(--serif);font-weight:600;font-size:10.5px;color:var(--navy);">Activity Level</span><br><span style="font-family:var(--serif);font-size:10px;color:var(--ink);line-height:1.35;">A fast tempo, vigorous movement, and a sense of being busy and energetic; preference for a hectic pace of life.</span></div>
          <div style="margin-bottom:4px;"><span style="font-family:var(--serif);font-weight:600;font-size:10.5px;color:var(--navy);">Excitement-Seeking</span><br><span style="font-family:var(--serif);font-size:10px;color:var(--ink);line-height:1.35;">Craving for stimulation and excitement; enjoyment of bright colours, noisy environments, and risk-taking.</span></div>
          <div><span style="font-family:var(--serif);font-weight:600;font-size:10.5px;color:var(--navy);">Cheerfulness</span><br><span style="font-family:var(--serif);font-size:10px;color:var(--ink);line-height:1.35;">Tendency to experience positive emotions such as joy, happiness, love, and excitement; an optimistic outlook.</span></div>
        </div>
      </div>

      <!-- AGREEABLENESS -->
      <div style="break-inside:avoid;margin-bottom:9px;">
        <div style="font-family:var(--sans);font-size:9px;letter-spacing:0.42em;text-transform:uppercase;color:var(--gold);display:flex;align-items:center;gap:10px;margin-bottom:5px;"><span style="width:24px;height:1px;background:var(--gold);display:inline-block;"></span>Agreeableness</div>
        <div style="border-left:2px solid var(--rule);padding-left:10px;">
          <div style="margin-bottom:4px;"><span style="font-family:var(--serif);font-weight:600;font-size:10.5px;color:var(--navy);">Trust</span><br><span style="font-family:var(--serif);font-size:10px;color:var(--ink);line-height:1.35;">A disposition to believe that others are honest and well-intentioned; assuming good faith in people's motives.</span></div>
          <div style="margin-bottom:4px;"><span style="font-family:var(--serif);font-weight:600;font-size:10.5px;color:var(--navy);">Morality</span><br><span style="font-family:var(--serif);font-size:10px;color:var(--ink);line-height:1.35;">Frankness and sincerity in dealing with others; discomfort with manipulation or deception, even when socially convenient.</span></div>
          <div style="margin-bottom:4px;"><span style="font-family:var(--serif);font-weight:600;font-size:10.5px;color:var(--navy);">Altruism</span><br><span style="font-family:var(--serif);font-size:10px;color:var(--ink);line-height:1.35;">Active concern for the welfare of others; generosity and a willingness to assist those in need.</span></div>
          <div style="margin-bottom:4px;"><span style="font-family:var(--serif);font-weight:600;font-size:10.5px;color:var(--navy);">Cooperation</span><br><span style="font-family:var(--serif);font-size:10px;color:var(--ink);line-height:1.35;">Dislike of confrontation; willingness to compromise and suppress one's own needs to get along with others.</span></div>
          <div style="margin-bottom:4px;"><span style="font-family:var(--serif);font-weight:600;font-size:10.5px;color:var(--navy);">Modesty</span><br><span style="font-family:var(--serif);font-size:10px;color:var(--ink);line-height:1.35;">Humbleness and self-effacement; reluctance to claim superiority over others even when entitled to do so.</span></div>
          <div><span style="font-family:var(--serif);font-weight:600;font-size:10.5px;color:var(--navy);">Sympathy</span><br><span style="font-family:var(--serif);font-size:10px;color:var(--ink);line-height:1.35;">Being moved by others' needs; a tender-minded attitude and concern for the less fortunate.</span></div>
        </div>
      </div>

      <!-- NEUROTICISM -->
      <div style="break-inside:avoid;margin-bottom:9px;">
        <div style="font-family:var(--sans);font-size:9px;letter-spacing:0.42em;text-transform:uppercase;color:var(--gold);display:flex;align-items:center;gap:10px;margin-bottom:5px;"><span style="width:24px;height:1px;background:var(--gold);display:inline-block;"></span>Neuroticism (Emotional Range)</div>
        <div style="border-left:2px solid var(--rule);padding-left:10px;">
          <div style="margin-bottom:4px;"><span style="font-family:var(--serif);font-weight:600;font-size:10.5px;color:var(--navy);">Anxiety</span><br><span style="font-family:var(--serif);font-size:10px;color:var(--ink);line-height:1.35;">Tendency to experience worry, fear, and apprehension; a nervous, tense disposition that anticipates trouble.</span></div>
          <div style="margin-bottom:4px;"><span style="font-family:var(--serif);font-weight:600;font-size:10.5px;color:var(--navy);">Anger</span><br><span style="font-family:var(--serif);font-size:10px;color:var(--ink);line-height:1.35;">Tendency to experience frustration, bitterness, and anger when things do not go as desired.</span></div>
          <div style="margin-bottom:4px;"><span style="font-family:var(--serif);font-weight:600;font-size:10.5px;color:var(--navy);">Depression</span><br><span style="font-family:var(--serif);font-size:10px;color:var(--ink);line-height:1.35;">Proneness to feelings of guilt, sadness, despondency, and loneliness; a tendency to feel discouraged.</span></div>
          <div style="margin-bottom:4px;"><span style="font-family:var(--serif);font-weight:600;font-size:10.5px;color:var(--navy);">Self-Consciousness</span><br><span style="font-family:var(--serif);font-size:10px;color:var(--ink);line-height:1.35;">Shyness and social anxiety; discomfort around others and sensitivity to ridicule or embarrassment.</span></div>
          <div style="margin-bottom:4px;"><span style="font-family:var(--serif);font-weight:600;font-size:10.5px;color:var(--navy);">Immoderation</span><br><span style="font-family:var(--serif);font-size:10px;color:var(--ink);line-height:1.35;">Difficulty resisting cravings and urges; a tendency to pursue short-term pleasures despite longer-term costs.</span></div>
          <div><span style="font-family:var(--serif);font-weight:600;font-size:10.5px;color:var(--navy);">Vulnerability</span><br><span style="font-family:var(--serif);font-size:10px;color:var(--ink);line-height:1.35;">Susceptibility to stress; difficulty coping with pressure, panic, or feelings of being overwhelmed in difficult situations.</span></div>
        </div>
      </div>

    </div>
  </div>
  <footer class="ph-bot">
    <span class="who">{{CLIENT.NAME}}</span>
    <span class="pageno">{{BRAND.COMPANY}} · Annex D</span>
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
