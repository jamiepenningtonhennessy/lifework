/**
 * html-report.ts  —  "MODERN COUNSEL" EDITION
 *
 * Drop-in replacement for the Lifework WOW Report renderer.
 * Express route: GET /api/report/html/:clientId
 *
 * WHAT CHANGED vs the previous version:
 *   • INLINED_CSS  — new "Modern Counsel" design system (Libre Franklin +
 *     IBM Plex Mono, navy bands, structural rail, measured data bars).
 *   • TEMPLATE     — re-laid-out markup for the new look.
 *   • Fonts        — now loads Libre Franklin + IBM Plex Mono (was Cormorant
 *     Garamond + Inter).
 *
 * WHAT DID NOT CHANGE (so live data keeps flowing in unchanged):
 *   • The template engine (renderTemplate / processIf / processEach / …).
 *   • Every {{TOKEN}}, {{#EACH}} and {{#IF}} binding — identical names.
 *   • buildClaudeExportJson, the auth check, and the Express handler.
 *   • The report structure, section order, and page sequence.
 */

import { Request, Response } from "express";
import { buildClaudeExportJson } from "./routers/claudeExport.js";
import { sdk } from "./_core/sdk.js";

// ─── CDN constants ────────────────────────────────────────────────────────────

const CDN_TANGRAM = "https://d2xsxph8kpxj0f.cloudfront.net/107696804/kFbbE6kqNApXGDFpQJUGV7/ph-tangram_8a2cd166.jpg";

// ─── Markdown stripper ────────────────────────────────────────────────────────
function stripMarkdown(text: string): string {
  if (!text) return "";
  return text
    .split("\n")
    .filter(line => !line.trim().startsWith("|"))
    .join("\n")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*\*\*(.+?)\*\*\*/g, "$1")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/___(.+?)___/g, "$1")
    .replace(/__(.+?)__/g, "$1")
    .replace(/_(.+?)_/g, "$1")
    .replace(/`(.+?)`/g, "$1")
    .replace(/^[-*•]\s+/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

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

function resolvePath(data: Record<string, unknown>, path: string): unknown {
  const trimmed = path.trim();
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

function renderToken(data: Record<string, unknown>, token: string): string {
  const val = resolvePath(data, token.trim());
  if (Array.isArray(val)) return val.join(", ");
  if (val == null) return "";
  return stripMd(String(val));
}

export function renderTemplate(template: string, data: Record<string, unknown>): string {
  function processIf(tmpl: string, ctx: Record<string, unknown>): string {
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
    const openTagRe = /\{\{#(EACH\d*) ([^}]+)\}\}/;
    let result = tmpl;
    let safety = 0;
    while (safety++ < 200) {
      const openMatch = openTagRe.exec(result);
      if (!openMatch) break;
      const tagName = openMatch[1];
      const arrayPath = openMatch[2];
      const openTag = openMatch[0];
      const closeTag = `{{/${tagName}}}`;
      const openStart = openMatch.index;
      const afterOpen = openStart + openTag.length;
      const anyOpenRe = new RegExp(`\\{\\{#${tagName}\\s[^}]+\\}\\}`, "g");
      let depth = 1;
      let searchFrom = afterOpen;
      let closeIdx = -1;
      while (depth > 0) {
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
            rendered = processEach(rendered, mergedCtx);
            rendered = processIf(rendered, mergedCtx);
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

// ─── Inlined CSS · "MODERN COUNSEL" ───────────────────────────────────────────
const INLINED_CSS = `
:root{
  --navy:#16233F; --navy-2:#1E3052; --navy-soft:#33425F; --navy-mist:#8A99B8;
  --gold:#C0892F; --gold-soft:#DDB36A; --gold-deep:#8A6118;
  --paper:#F7F4EC; --paper-2:#EFEBE0; --ink:#222a3a; --ink-muted:#6a7186;
  --rule:rgba(22,35,63,0.14); --rule-strong:rgba(22,35,63,0.30);
  --sans:"Libre Franklin",system-ui,-apple-system,"Helvetica Neue",Arial,sans-serif;
  --mono:"IBM Plex Mono",ui-monospace,SFMono-Regular,Menlo,monospace;
  --green:#5E7F4E; --blue:#3C6E8F; --red:#A2402F; --yellow:#C0892F;
  --page-w:794px; --page-h:1123px;
}
html,body{ margin:0; padding:0; background:#d7d3c8; color:var(--ink);
  font-family:var(--sans); font-size:16px; -webkit-font-smoothing:antialiased; text-rendering:optimizeLegibility; }
body{ display:flex; flex-direction:column; align-items:center; gap:30px; padding:48px 0 110px; }

.page{ width:var(--page-w); min-height:var(--page-h); height:var(--page-h); background:var(--paper); color:var(--ink);
  box-sizing:border-box; display:flex; flex-direction:column; position:relative; overflow:hidden;
  box-shadow:0 14px 36px rgba(0,0,0,0.16), 0 2px 6px rgba(0,0,0,0.08); }

/* running header / footer bands */
.band{ background:var(--navy); color:#EDE7DA; display:flex; justify-content:space-between; align-items:center;
  padding:15px 74px; font-family:var(--mono); font-size:10px; letter-spacing:0.14em; text-transform:uppercase; flex-shrink:0; }
.band .wm{ font-family:var(--sans); font-weight:700; letter-spacing:0.02em; text-transform:none; font-size:16px; color:#fff; }
.band .wm b{ color:var(--gold-soft); font-weight:700; }
.foot{ margin-top:auto; display:flex; justify-content:space-between; align-items:center; padding:14px 74px;
  border-top:1px solid var(--rule); font-family:var(--mono); font-size:9.5px; letter-spacing:0.14em;
  text-transform:uppercase; color:var(--ink-muted); flex-shrink:0; }
.foot .cur{ color:var(--gold); font-weight:600; }

/* body containers */
.body{ flex:1; min-height:0; padding:44px 74px 22px; }
.body.grid{ display:grid; grid-template-columns:120px 1fr; gap:0 38px; }
.rail{ border-right:1px solid var(--rule); padding-right:22px; }
.rail .num{ font-family:var(--sans); font-weight:700; font-size:58px; line-height:0.82; color:var(--gold); letter-spacing:-0.03em; }
.rail .lab{ font-family:var(--mono); font-size:9.5px; letter-spacing:0.18em; text-transform:uppercase; color:var(--navy); margin-top:14px; font-weight:600; }
.rail .sub{ font-family:var(--mono); font-size:9px; letter-spacing:0.1em; text-transform:uppercase; color:var(--ink-muted); margin-top:6px; line-height:1.5; }
.main{ min-width:0; }

/* eyebrow + titles */
.eyebrow{ font-family:var(--mono); font-size:10px; font-weight:600; letter-spacing:0.2em; text-transform:uppercase;
  color:var(--gold); display:inline-flex; align-items:center; gap:10px; margin-bottom:14px; }
.eyebrow::before{ content:""; width:22px; height:2px; background:var(--gold); }
h2.chap-title{ font-family:var(--sans); font-weight:700; font-size:36px; line-height:1.04; margin:0 0 6px; color:var(--navy); letter-spacing:-0.02em; }
h2.chap-title em{ color:var(--gold); font-style:normal; }
.hr-gold{ width:38px; height:3px; background:var(--gold); margin:16px 0 20px; }

/* text */
p{ font-family:var(--sans); font-size:12.5px; line-height:1.66; color:var(--ink); margin:0 0 13px; font-weight:400; }
.hero{ font-family:var(--sans); font-weight:500; font-size:18px; line-height:1.46; color:var(--navy); margin:0 0 20px; letter-spacing:-0.01em; }
p.lede{ font-size:13.5px; line-height:1.62; color:var(--navy-soft); margin:0 0 22px; max-width:62ch; }
h3.section-h{ font-family:var(--mono); font-size:10.5px; font-weight:600; letter-spacing:0.18em; text-transform:uppercase;
  color:var(--navy); margin:26px 0 13px; padding-bottom:7px; border-bottom:1px solid var(--rule-strong); }
h3.section-h:first-child{ margin-top:0; }

/* title page */
.title-page .tband{ background:var(--navy); color:#fff; padding:28px 74px; display:flex; justify-content:space-between; align-items:baseline; flex-shrink:0; }
.title-page .tband .wm{ font-family:var(--sans); font-weight:700; font-size:23px; letter-spacing:0.01em; }
.title-page .tband .wm b{ color:var(--gold-soft); }
.title-page .tband .ed{ font-family:var(--mono); font-size:10px; letter-spacing:0.16em; text-transform:uppercase; color:#B9C2D6; }
.title-page .tbody{ flex:1; padding:0 74px; display:flex; flex-direction:column; justify-content:center; }
.title-page h1{ font-family:var(--sans); font-weight:700; font-size:74px; line-height:0.96; margin:0; color:var(--navy); letter-spacing:-0.035em; }
.title-page h1 em{ color:var(--gold); font-style:normal; }
.title-page .hr-gold{ width:54px; height:4px; margin:0 0 28px; }
.title-page .meta{ margin-top:46px; border-top:1px solid var(--rule-strong); max-width:520px; }
.title-page .row{ display:grid; grid-template-columns:150px 1fr; gap:24px; align-items:baseline; padding:12px 0; border-bottom:1px solid var(--rule); }
.title-page .row .lab{ font-family:var(--mono); font-size:9.5px; letter-spacing:0.16em; text-transform:uppercase; color:var(--ink-muted); }
.title-page .row .val{ font-family:var(--sans); font-weight:600; font-size:17px; color:var(--navy); }
.title-page .tfoot{ background:var(--paper-2); padding:15px 74px; font-family:var(--mono); font-size:9px; letter-spacing:0.18em; text-transform:uppercase; color:var(--ink-muted); flex-shrink:0; }

/* cover letter */
.letter .body{ display:flex; flex-direction:column; }
.letter h1{ font-family:var(--sans); font-weight:700; font-size:40px; line-height:1.06; color:var(--navy); margin:0 0 6px; letter-spacing:-0.025em; }
.letter h1 em{ color:var(--gold); font-style:normal; }
.letter .lead-rule{ width:46px; height:3px; background:var(--gold); margin:18px 0 24px; }
.letter p{ font-size:13.5px; line-height:1.72; max-width:62ch; }
.letter .sig{ margin-top:26px; font-family:var(--sans); font-size:14px; color:var(--ink); }
.letter .sig .nm{ font-weight:700; font-size:16px; color:var(--navy); display:block; margin-top:8px; }
.letter .sig .ml{ font-family:var(--mono); font-size:11px; color:var(--gold-deep); letter-spacing:0.02em; margin-top:3px; display:block; }

/* OCEAN bars */
.ocean{ margin:6px 0 4px; }
.axis{ display:grid; grid-template-columns:164px 1fr 46px; gap:18px; align-items:center; font-family:var(--mono); font-size:8.5px; letter-spacing:0.08em; color:var(--ink-muted); margin-bottom:8px; }
.axis .ticks{ display:flex; justify-content:space-between; }
.trait{ display:grid; grid-template-columns:164px 1fr 46px; gap:18px; align-items:center; padding:8px 0; border-top:1px solid var(--rule); }
.trait .nm{ font-family:var(--sans); font-weight:600; font-size:14px; color:var(--navy); }
.trait .track{ position:relative; height:9px; background:rgba(22,35,63,0.07); }
.trait .track .q{ position:absolute; top:0; bottom:0; width:1px; background:rgba(22,35,63,0.12); }
.trait .fill{ position:absolute; top:0; bottom:0; left:0; background:var(--gold); }
.trait .sc{ font-family:var(--mono); font-weight:600; font-size:16px; color:var(--navy); text-align:right; font-variant-numeric:tabular-nums; }

/* VIA rank list */
ol.rank{ list-style:none; padding:0; margin:6px 0 0; display:grid; grid-auto-flow:column; grid-template-columns:1fr 1fr; column-gap:44px; }
ol.rank li{ display:grid; grid-template-columns:26px 1fr auto; gap:12px; align-items:baseline; padding:8px 0; border-bottom:1px solid var(--rule); }
ol.rank li .ix{ font-family:var(--mono); font-size:11px; color:var(--gold); font-weight:600; font-variant-numeric:tabular-nums; }
ol.rank li .nm{ font-family:var(--sans); font-size:14px; font-weight:500; color:var(--navy); }
ol.rank li .sc{ font-family:var(--mono); font-size:12px; font-weight:600; color:var(--navy); font-variant-numeric:tabular-nums; }
ol.rank li .sc .of{ color:var(--ink-muted); font-weight:400; font-size:9px; margin-left:2px; }
ol.rank.full li.top5 .nm{ color:var(--gold-deep); font-weight:600; }
ol.rank.full li.bot5 .nm, ol.rank.full li.bot5 .sc{ color:var(--ink-muted); }
.virtues-note{ font-family:var(--mono); font-size:9px; letter-spacing:0.14em; text-transform:uppercase; color:var(--ink-muted); margin-top:16px; padding-top:12px; border-top:1px solid var(--rule); }

/* evidence table */
table.evidence{ width:100%; border-collapse:collapse; margin-top:8px; font-family:var(--sans); font-size:11px; line-height:1.45; }
table.evidence thead th{ text-align:left; font-family:var(--mono); font-weight:600; font-size:8.5px; letter-spacing:0.14em; text-transform:uppercase; color:var(--ink-muted); padding:8px 10px 8px 0; border-bottom:1px solid var(--rule-strong); }
table.evidence tbody td{ padding:11px 10px 11px 0; border-bottom:1px solid var(--rule); vertical-align:top; color:var(--ink); }
table.evidence td.nm{ font-family:var(--sans); font-weight:600; font-size:14px; color:var(--navy); }
table.evidence td.rk{ font-family:var(--mono); font-size:13px; color:var(--gold); text-align:center; font-variant-numeric:tabular-nums; }
table.evidence td.fq{ font-family:var(--mono); text-align:center; font-variant-numeric:tabular-nums; color:var(--navy); }
.pill{ display:inline-block; padding:2px 8px; font-family:var(--mono); font-size:8px; letter-spacing:0.12em; text-transform:uppercase; font-weight:600; }
.pill.high{ background:rgba(192,137,47,0.18); color:var(--gold-deep); }
.pill.med{ background:rgba(22,35,63,0.10); color:var(--navy-soft); }
.pill.low{ background:rgba(22,35,63,0.08); color:var(--navy-soft); }

/* pillars (four conditions) */
.pillar{ margin-top:18px; }
.pillar:first-of-type{ margin-top:6px; }
.pillar .ph{ display:flex; align-items:baseline; gap:12px; border-bottom:1px solid var(--rule-strong); padding-bottom:6px; }
.pillar .ph .pn{ font-family:var(--mono); font-weight:600; font-size:12px; letter-spacing:0.2em; text-transform:uppercase; color:var(--navy); }
.pillar .ph .ps{ font-family:var(--sans); font-size:12px; color:var(--ink-muted); }
.pillar .learn{ font-family:var(--sans); font-size:12.5px; line-height:1.5; color:var(--navy-soft); margin:9px 0; }
.pillar .learn b{ color:var(--navy); font-weight:700; }
.combo{ margin-top:22px; }
.combo .synth{ font-family:var(--sans); font-weight:500; font-size:14.5px; line-height:1.5; color:var(--navy); margin:0 0 12px; }
.citation{ font-family:var(--mono); font-size:9px; color:var(--ink-muted); margin-top:14px; letter-spacing:0.04em; }

/* insights (ch5) */
.insights{ display:grid; grid-template-columns:230px 1fr; gap:26px; margin-top:16px; align-items:start; }
.wheel-wrap{ display:flex; flex-direction:column; align-items:center; gap:14px; }
.wheel-wrap .wnote{ font-family:var(--mono); font-size:8.5px; letter-spacing:0.14em; text-transform:uppercase; color:var(--ink-muted); }
.icards{ display:flex; flex-direction:column; gap:14px; }
.icard{ border:1px solid var(--rule); }
.icard .ihead{ display:flex; align-items:center; gap:12px; padding:12px 16px; color:#fff; }
.icard .ihead.yellow{ background:var(--yellow); } .icard .ihead.red{ background:var(--red); }
.icard .ihead.blue{ background:var(--blue); } .icard .ihead.green{ background:var(--green); }
.icard .badge{ width:26px; height:26px; border-radius:50%; background:rgba(255,255,255,0.25); display:flex; align-items:center; justify-content:center; font-family:var(--mono); font-weight:600; font-size:12px; flex-shrink:0; }
.icard .iname{ font-family:var(--sans); font-weight:700; font-size:16px; line-height:1.1; }
.icard .isub{ font-family:var(--mono); font-size:9px; letter-spacing:0.06em; color:rgba(255,255,255,0.85); margin-top:2px; }
.icard .ibody{ padding:11px 16px; background:rgba(22,35,63,0.04); }
.icard .ibody p{ font-size:12px; line-height:1.5; margin:0; }
.jbox{ border:1px solid var(--navy); display:grid; grid-template-columns:1fr 1fr; margin-top:18px; }
.jbox .jl{ border-right:1px solid var(--navy); padding:14px 18px; }
.jbox .jlab{ font-family:var(--mono); font-size:8.5px; letter-spacing:0.2em; text-transform:uppercase; color:var(--ink-muted); }
.jbox .jtype{ font-family:var(--sans); font-weight:700; font-size:40px; color:var(--navy); line-height:1; letter-spacing:0.02em; margin-top:4px; }
.jbox .jr{ padding:14px 18px; display:flex; flex-direction:column; justify-content:space-between; gap:10px; }
.jbox .jval{ font-family:var(--sans); font-weight:600; font-size:13px; color:var(--navy); margin-top:3px; }
.jbox .jspelt{ font-family:var(--mono); font-size:9.5px; letter-spacing:0.06em; color:var(--ink-muted); }
.axisrow{ display:grid; grid-template-columns:repeat(3,1fr); gap:12px; margin-top:16px; }
.axiscard{ border-top:3px solid var(--gold); padding:10px 12px; background:rgba(22,35,63,0.03); }
.axiscard .al{ font-family:var(--mono); font-size:8px; letter-spacing:0.18em; text-transform:uppercase; color:var(--ink-muted); }
.axiscard .av{ font-family:var(--sans); font-weight:600; font-size:13px; color:var(--navy); margin-top:4px; line-height:1.2; }
.axiscard .an{ font-family:var(--mono); font-size:9px; color:var(--ink-muted); margin-top:3px; }

/* keyfind / pull / tmay */
.keyfind{ background:var(--navy); color:#EDE7DA; padding:20px 24px; margin-top:18px; }
.keyfind .kt{ font-family:var(--mono); font-size:10px; font-weight:600; letter-spacing:0.18em; text-transform:uppercase; color:var(--gold-soft); margin:0 0 8px; }
.keyfind p{ color:#EDE7DA; font-size:13px; line-height:1.6; margin:0; }
.pull{ font-family:var(--sans); font-weight:600; font-size:18px; line-height:1.4; color:var(--navy); border-left:3px solid var(--gold); padding:4px 0 4px 18px; margin:18px 0 0; letter-spacing:-0.01em; }
.tmay{ background:var(--paper-2); border-left:3px solid var(--gold); padding:22px 26px; margin-top:18px; }
.tmay .tk{ font-family:var(--mono); font-size:9.5px; font-weight:600; letter-spacing:0.2em; text-transform:uppercase; color:var(--gold-deep); }
.tmay .ti{ font-family:var(--sans); font-weight:600; font-size:14px; color:var(--navy); margin:10px 0 8px; }
.tmay ul.drives{ list-style:none; padding:0; margin:0 0 12px; }
.tmay ul.drives li{ font-family:var(--sans); font-weight:600; font-size:14px; color:var(--navy); padding:5px 0 5px 18px; position:relative; border-bottom:1px solid var(--rule); }
.tmay ul.drives li::before{ content:""; position:absolute; left:0; top:13px; width:8px; height:2px; background:var(--gold); }
.tmay p{ font-size:12.5px; line-height:1.6; }

/* variants table */
table.variants{ width:100%; border-collapse:collapse; margin-top:14px; font-family:var(--sans); }
table.variants thead th{ text-align:left; font-family:var(--mono); font-weight:600; font-size:9px; letter-spacing:0.16em; text-transform:uppercase; color:var(--ink-muted); padding:10px 12px 10px 0; border-bottom:1px solid var(--rule-strong); }
table.variants tbody td{ padding:15px 12px 15px 0; border-bottom:1px solid var(--rule); vertical-align:top; }
table.variants td.vr{ font-family:var(--sans); font-weight:700; font-size:16px; color:var(--navy); width:165px; }
table.variants td.wh{ font-size:12px; color:var(--ink); width:210px; line-height:1.5; }
table.variants td.q{ font-family:var(--sans); font-weight:500; font-size:13.5px; color:var(--navy-soft); line-height:1.45; }

/* data divider (navy full page) */
.divider{ background:var(--navy); color:#EDE7DA; }
.divider .dband{ display:flex; justify-content:space-between; align-items:center; padding:24px 74px; font-family:var(--mono); font-size:10px; letter-spacing:0.16em; text-transform:uppercase; color:var(--navy-mist); flex-shrink:0; }
.divider .dband .wm{ font-family:var(--sans); font-weight:700; font-size:18px; color:#fff; text-transform:none; letter-spacing:0.01em; }
.divider .dband .wm b{ color:var(--gold-soft); }
.divider .dbody{ flex:1; padding:0 74px; display:flex; flex-direction:column; justify-content:center; }
.divider h1{ font-family:var(--sans); font-weight:700; font-size:76px; color:#fff; margin:0; letter-spacing:-0.035em; }
.divider .di{ font-family:var(--sans); font-size:14px; line-height:1.6; color:var(--navy-mist); max-width:50ch; margin:20px 0 8px; }
.divider .dhr{ width:54px; height:4px; background:var(--gold); margin:14px 0 30px; }
.divider .contents{ margin-top:14px; border-top:1px solid rgba(255,255,255,0.16); }
.divider .contents .crow{ display:grid; grid-template-columns:54px 1fr; gap:24px; align-items:baseline; padding:14px 0; border-bottom:1px solid rgba(255,255,255,0.16); }
.divider .contents .crow .cx{ font-family:var(--mono); font-size:18px; color:var(--gold-soft); font-weight:600; }
.divider .contents .crow .cl{ font-family:var(--sans); font-size:20px; color:#fff; font-weight:500; }
.divider .dfoot{ padding:18px 74px; font-family:var(--mono); font-size:9px; letter-spacing:0.16em; text-transform:uppercase; color:var(--navy-mist); flex-shrink:0; }

/* annex pages */
.annex-title{ font-family:var(--sans); font-weight:700; font-size:34px; color:var(--navy); margin:0 0 6px; letter-spacing:-0.02em; }
.annex-title em{ color:var(--gold); font-style:normal; }
.subhead{ font-family:var(--mono); font-size:10px; font-weight:600; letter-spacing:0.16em; text-transform:uppercase; color:var(--navy); margin:22px 0 12px; padding-bottom:6px; border-bottom:1px solid var(--rule-strong); }
.subhead:first-child{ margin-top:0; }

/* life-history entries */
.stage{ display:flex; align-items:baseline; justify-content:space-between; border-bottom:1px solid var(--rule-strong); padding-bottom:6px; margin:18px 0 12px; }
.stage:first-child{ margin-top:0; }
.stage .st{ font-family:var(--mono); font-weight:600; font-size:11px; letter-spacing:0.22em; text-transform:uppercase; color:var(--gold-deep); }
.stage .sa{ font-family:var(--sans); font-size:12px; color:var(--ink-muted); }
.lh{ margin-bottom:14px; break-inside:avoid; }
.lh .lt{ display:flex; align-items:baseline; justify-content:space-between; gap:14px; padding-bottom:4px; margin-bottom:6px; border-bottom:1px dashed var(--rule); }
.lh .ltitle{ font-family:var(--sans); font-weight:600; font-size:14px; color:var(--navy); }
.lh .lmeta{ font-family:var(--mono); font-size:8.5px; letter-spacing:0.14em; text-transform:uppercase; color:var(--ink-muted); display:inline-flex; gap:12px; align-items:center; white-space:nowrap; }
.lh .lmeta .esf{ padding:2px 7px; font-weight:600; }
.lh .lmeta .esf.sat{ background:rgba(192,137,47,0.2); color:var(--gold-deep); }
.lh .lmeta .esf.ful{ background:rgba(22,35,63,0.1); color:var(--navy); }
.lh .lmeta .esf.enj{ background:rgba(138,153,184,0.25); color:var(--navy-soft); }
.lh .lbody{ font-family:var(--sans); font-size:11.5px; line-height:1.55; color:var(--ink); }
.lh .lnote{ margin-top:6px; border-left:2px solid var(--gold); padding:2px 0 2px 12px; font-family:var(--sans); font-size:11px; line-height:1.5; color:var(--navy-soft); }
.lh .lnote::before{ content:"Sage follow-up — "; font-family:var(--mono); font-weight:600; font-size:8px; letter-spacing:0.12em; text-transform:uppercase; color:var(--gold-deep); }

/* biographical fields */
.bfields{ display:grid; grid-template-columns:1fr 1fr; gap:10px 32px; margin-bottom:14px; }
.bfield{ display:grid; grid-template-columns:auto 1fr; gap:14px; align-items:baseline; border-bottom:1px solid var(--rule); padding:7px 0; }
.bfield .bl{ font-family:var(--mono); font-size:9px; letter-spacing:0.1em; text-transform:uppercase; color:var(--ink-muted); }
.bfield .bv{ font-family:var(--sans); font-weight:600; font-size:13px; color:var(--navy); }
.bnote{ font-family:var(--sans); font-size:11.5px; line-height:1.6; color:var(--ink); margin:0 0 12px; }

/* education / career list */
.edu{ border-bottom:1px solid var(--rule); padding:10px 0; }
.edu .eh{ display:flex; align-items:baseline; justify-content:space-between; gap:14px; }
.edu .es{ font-family:var(--sans); font-weight:600; font-size:13.5px; color:var(--navy); }
.edu .ey{ font-family:var(--mono); font-size:9px; letter-spacing:0.1em; text-transform:uppercase; color:var(--ink-muted); white-space:nowrap; }
.edu .en{ font-family:var(--sans); font-size:11px; line-height:1.5; color:var(--ink); margin-top:4px; }
.career{ border-bottom:1px solid var(--rule); padding:11px 0; break-inside:avoid; }
.career .ch{ display:flex; align-items:baseline; justify-content:space-between; gap:14px; }
.career .co{ font-family:var(--sans); font-weight:700; font-size:14px; color:var(--navy); }
.career .cmeta{ font-family:var(--mono); font-size:9px; letter-spacing:0.1em; text-transform:uppercase; color:var(--ink-muted); white-space:nowrap; }
.career .cr{ font-family:var(--mono); font-size:9px; letter-spacing:0.12em; text-transform:uppercase; color:var(--gold-deep); margin:3px 0 5px; }
.career .cbody{ font-family:var(--sans); font-size:11px; line-height:1.55; color:var(--ink); margin:0 0 5px; }
.career .cmeta-row{ display:grid; grid-template-columns:auto 1fr; gap:10px 12px; font-family:var(--sans); font-size:10.5px; line-height:1.5; }
.career .cmeta-row .mk{ font-family:var(--mono); font-size:8px; letter-spacing:0.12em; text-transform:uppercase; color:var(--ink-muted); padding-top:1px; }
.career .cmeta-row .mv{ color:var(--ink); }

/* definitions grid (VIA / OCEAN) */
.defs{ columns:2; column-gap:34px; margin-top:6px; }
.vgroup{ break-inside:avoid; margin-bottom:12px; }
.vgroup .vg{ font-family:var(--mono); font-size:9px; font-weight:600; letter-spacing:0.18em; text-transform:uppercase; color:var(--gold-deep); padding-bottom:4px; border-bottom:1px solid var(--rule); margin-bottom:7px; }
.def{ margin-bottom:8px; break-inside:avoid; }
.def .dn{ font-family:var(--sans); font-weight:600; font-size:11.5px; color:var(--navy); }
.def .dd{ font-family:var(--sans); font-size:10px; line-height:1.45; color:var(--ink-muted); margin-top:1px; }

/* facet groups (OCEAN annex) */
.fgroup{ margin-bottom:14px; break-inside:avoid; }
.fgroup .fgh{ display:flex; justify-content:space-between; align-items:baseline; padding-bottom:6px; border-bottom:1px solid var(--rule-strong); }
.fgroup .fgn{ font-family:var(--sans); font-weight:700; font-size:15px; color:var(--navy); }
.fgroup .fgs{ font-family:var(--mono); font-size:14px; font-weight:600; color:var(--gold); font-variant-numeric:tabular-nums; }
.fgroup .fgs .pct{ font-size:8px; color:var(--ink-muted); margin-left:3px; letter-spacing:0.1em; }
.facets{ display:grid; grid-template-columns:repeat(2,1fr); gap:6px 30px; margin-top:9px; }
.facet{ display:grid; grid-template-columns:1fr 46px 26px; gap:10px; align-items:center; }
.facet .fn{ font-family:var(--sans); font-size:11px; color:var(--ink); }
.facet .fb{ height:3px; background:rgba(22,35,63,0.1); position:relative; }
.facet .ff{ position:absolute; left:0; top:0; bottom:0; background:var(--gold); }
.facet .fs{ font-family:var(--mono); font-size:10px; font-weight:600; color:var(--navy); text-align:right; font-variant-numeric:tabular-nums; }
.annex-note{ font-family:var(--sans); font-size:11px; line-height:1.55; color:var(--ink-muted); margin-top:16px; padding-top:12px; border-top:1px solid var(--rule); }

/* print bar (screen only) */
#lw-print-bar{ position:fixed; right:22px; bottom:22px; z-index:9999; display:flex; gap:12px; align-items:center;
  background:var(--navy); padding:10px 14px; border-radius:4px; box-shadow:0 8px 24px rgba(0,0,0,0.28); font-family:var(--mono); }
#lw-print-bar span{ color:var(--navy-mist); font-size:10px; letter-spacing:0.12em; text-transform:uppercase; }
#lw-print-bar button{ background:var(--gold); color:var(--navy); border:none; cursor:pointer; font-family:var(--mono);
  font-weight:600; font-size:11px; letter-spacing:0.14em; text-transform:uppercase; padding:9px 18px; border-radius:3px; }
#lw-print-bar button:hover{ background:var(--gold-soft); }

@media print{
  html,body{ background:#fff; margin:0; padding:0; display:block; }
  .page{ box-shadow:none; margin:0; width:210mm; min-height:297mm; height:297mm; page-break-after:always; break-after:page; overflow:hidden; }
  .page:last-child{ page-break-after:auto; break-after:auto; }
  @page{ size:A4 portrait; margin:0; }
  *{ -webkit-print-color-adjust:exact !important; print-color-adjust:exact !important; color-adjust:exact !important; }
  #lw-print-bar{ display:none !important; }
}
`;

// ─── Public render helper ─────────────────────────────────────────────────────
export function renderHtmlReport(payload: Record<string, unknown>): string {
  return renderTemplate(TEMPLATE, payload);
}

// ─── HTML template (embedded) · "MODERN COUNSEL" ──────────────────────────────
const TEMPLATE = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Lifework WOW Report — {{CLIENT.NAME}}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Libre+Franklin:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400;1,500&family=IBM+Plex+Mono:wght@400;500;600&display=swap" rel="stylesheet">
<style>${INLINED_CSS}</style>
</head>
<body>

<!-- ════════ PAGE 1 · COVER LETTER ════════ -->
<section class="page letter">
  <div class="band"><span class="wm">Life<b>work</b></span><span>Cover Letter · Confidential</span></div>
  <div class="body">
    <div class="eyebrow">A personal note</div>
    <h1>Hi {{CLIENT.FIRST_NAME}} — here’s<br/>your <em>Lifework</em> report.</h1>
    <div class="lead-rule"></div>
    {{#EACH COVER_LETTER.PARAGRAPHS}}<p>{{.}}</p>{{/EACH}}
    <div class="sig">{{COVER_LETTER.SIGN_OFF}}<span class="nm">{{COVER_LETTER.AUTHOR_NAME}}</span><span class="ml">{{COVER_LETTER.AUTHOR_EMAIL}}</span></div>
  </div>
  <div class="foot"><span>{{BRAND.COMPANY}}</span><span>{{CLIENT.NAME}} · <span class="cur">01</span></span></div>
</section>

<!-- ════════ PAGE 2 · TITLE ════════ -->
<section class="page title-page">
  <div class="tband"><span class="wm">Life<b>work</b></span><span class="ed">{{REPORT.EDITION_LABEL}}</span></div>
  <div class="tbody">
    <div class="hr-gold"></div>
    <h1>{{REPORT.COVER_TITLE_LINE1}} <em>{{REPORT.COVER_TITLE_LINE2}}</em></h1>
    <div class="meta">
      <div class="row"><span class="lab">Prepared for</span><span class="val">{{CLIENT.NAME}}</span></div>
      <div class="row"><span class="lab">Date</span><span class="val">{{REPORT.DATE}}</span></div>
      <div class="row"><span class="lab">Prepared by</span><span class="val">{{BRAND.COMPANY}}</span></div>
      <div class="row"><span class="lab">Analyst</span><span class="val">{{REPORT.ANALYST}}</span></div>
    </div>
  </div>
  <div class="tfoot">Confidential · Prepared exclusively for the named individual</div>
</section>

<!-- ════════ PAGE 3 · CH 1 SUMMARY ════════ -->
<section class="page">
  <div class="band"><span class="wm">Life<b>work</b></span><span>Chapter 1 · Summary</span></div>
  <div class="body grid">
    <div class="rail"><div class="num">01</div><div class="lab">Summary</div><div class="sub">The portrait in brief</div></div>
    <div class="main">
      <h2 class="chap-title">Lifework <em>summary.</em></h2>
      <div class="hr-gold"></div>
      <p class="hero">{{CH1.HERO}}</p>
      {{#EACH CH1.PARAGRAPHS}}<p>{{.}}</p>{{/EACH}}
    </div>
  </div>
  <div class="foot"><span>{{BRAND.COMPANY}}</span><span>{{CLIENT.NAME}} · <span class="cur">03</span></span></div>
</section>

<!-- ════════ PAGE 4 · CH 2 LIFE HISTORY (1/2) ════════ -->
<section class="page">
  <div class="band"><span class="wm">Life<b>work</b></span><span>Chapter 2 · Life History Pattern</span></div>
  <div class="body grid">
    <div class="rail"><div class="num">02</div><div class="lab">Life History</div><div class="sub">The pattern</div></div>
    <div class="main">
      <h2 class="chap-title">Life history — <em>the pattern.</em></h2>
      <div class="hr-gold"></div>
      <p class="lede">{{CH2.LEDE}}</p>
      {{#EACH CH2.PAGE1_PARAGRAPHS}}<p>{{.}}</p>{{/EACH}}
      {{#IF CH2.PAGE1_SECTION_H}}<h3 class="section-h">Recurring themes</h3>{{/IF}}
      {{#EACH CH2.PAGE1_SECTION_PARAS}}<p>{{.}}</p>{{/EACH}}
    </div>
  </div>
  <div class="foot"><span>{{BRAND.COMPANY}}</span><span>{{CLIENT.NAME}} · <span class="cur">04</span></span></div>
</section>

<!-- ════════ PAGE 5b · CH 2B FOUR CONDITIONS ════════ -->
{{#IF CH2B.HAS_CONTENT}}
<section class="page">
  <div class="band"><span class="wm">Life<b>work</b></span><span>Chapter 2b · Four Conditions of Fulfilment</span></div>
  <div class="body grid">
    <div class="rail"><div class="num">02b</div><div class="lab">Four Conditions</div><div class="sub">Of fulfilment</div></div>
    <div class="main">
      <h2 class="chap-title">Four Conditions of <em>Fulfilment.</em></h2>
      <div class="hr-gold"></div>
      {{#IF CH2B.PILLAR_PLACES}}
      <div class="pillar"><div class="ph"><span class="pn">{{CH2B.PILLAR_PLACES.HEADING_ALLCAPS}}</span>{{#IF CH2B.PILLAR_PLACES.HEADING_SUBTITLE}}<span class="ps">— {{CH2B.PILLAR_PLACES.HEADING_SUBTITLE}}</span>{{/IF}}</div>
      {{#IF CH2B.PILLAR_PLACES.LEARNING}}<p class="learn"><b>Learning:</b> {{CH2B.PILLAR_PLACES.LEARNING}}</p>{{/IF}}
      {{#IF CH2B.PILLAR_PLACES.EXAMPLE1}}<p>{{CH2B.PILLAR_PLACES.EXAMPLE1}}</p>{{/IF}}</div>
      {{/IF}}
      {{#IF CH2B.PILLAR_PEOPLE}}
      <div class="pillar"><div class="ph"><span class="pn">{{CH2B.PILLAR_PEOPLE.HEADING_ALLCAPS}}</span>{{#IF CH2B.PILLAR_PEOPLE.HEADING_SUBTITLE}}<span class="ps">— {{CH2B.PILLAR_PEOPLE.HEADING_SUBTITLE}}</span>{{/IF}}</div>
      {{#IF CH2B.PILLAR_PEOPLE.LEARNING}}<p class="learn"><b>Learning:</b> {{CH2B.PILLAR_PEOPLE.LEARNING}}</p>{{/IF}}
      {{#IF CH2B.PILLAR_PEOPLE.EXAMPLE1}}<p>{{CH2B.PILLAR_PEOPLE.EXAMPLE1}}</p>{{/IF}}</div>
      {{/IF}}
      {{#IF CH2B.PILLAR_PROBLEMS}}
      <div class="pillar"><div class="ph"><span class="pn">{{CH2B.PILLAR_PROBLEMS.HEADING_ALLCAPS}}</span>{{#IF CH2B.PILLAR_PROBLEMS.HEADING_SUBTITLE}}<span class="ps">— {{CH2B.PILLAR_PROBLEMS.HEADING_SUBTITLE}}</span>{{/IF}}</div>
      {{#IF CH2B.PILLAR_PROBLEMS.LEARNING}}<p class="learn"><b>Learning:</b> {{CH2B.PILLAR_PROBLEMS.LEARNING}}</p>{{/IF}}
      {{#IF CH2B.PILLAR_PROBLEMS.EXAMPLE1}}<p>{{CH2B.PILLAR_PROBLEMS.EXAMPLE1}}</p>{{/IF}}</div>
      {{/IF}}
      {{#IF CH2B.PILLAR_PROCEDURES}}
      <div class="pillar"><div class="ph"><span class="pn">{{CH2B.PILLAR_PROCEDURES.HEADING_ALLCAPS}}</span>{{#IF CH2B.PILLAR_PROCEDURES.HEADING_SUBTITLE}}<span class="ps">— {{CH2B.PILLAR_PROCEDURES.HEADING_SUBTITLE}}</span>{{/IF}}</div>
      {{#IF CH2B.PILLAR_PROCEDURES.LEARNING}}<p class="learn"><b>Learning:</b> {{CH2B.PILLAR_PROCEDURES.LEARNING}}</p>{{/IF}}
      {{#IF CH2B.PILLAR_PROCEDURES.EXAMPLE1}}<p>{{CH2B.PILLAR_PROCEDURES.EXAMPLE1}}</p>{{/IF}}</div>
      {{/IF}}
      {{#IF CH2B.COMBINATION_SYNTHESIS}}
      <div class="combo"><h3 class="section-h">The Combination</h3>
      <p class="synth">{{CH2B.COMBINATION_SYNTHESIS}}</p></div>
      {{/IF}}
    </div>
  </div>
  <div class="foot"><span>{{BRAND.COMPANY}}</span><span>{{CLIENT.NAME}} · <span class="cur">05b</span></span></div>
</section>
{{/IF}}

<!-- ════════ PAGE 6 · CH 3 VIA — RANKING ════════ -->
<section class="page">
  <div class="band"><span class="wm">Life<b>work</b></span><span>Chapter 3 · Character Strengths</span></div>
  <div class="body grid">
    <div class="rail"><div class="num">03</div><div class="lab">VIA</div><div class="sub">Character strengths</div></div>
    <div class="main">
      <h2 class="chap-title">Character <em>strengths.</em></h2>
      <div class="hr-gold"></div>
      <p class="lede">{{CH3.LEDE}}</p>
      <h3 class="section-h">Strength rankings · top 10</h3>
      <ol class="rank" style="grid-template-rows:repeat(5,auto)">
        {{#EACH VIA.TOP10}}<li><span class="ix">{{INDEX}}</span><span class="nm">{{.name}}</span><span class="sc">{{.score}}<span class="of">/25</span></span></li>{{/EACH}}
      </ol>
    </div>
  </div>
  <div class="foot"><span>{{BRAND.COMPANY}}</span><span>{{CLIENT.NAME}} · <span class="cur">06</span></span></div>
</section>

<!-- ════════ PAGE 7 · CH 3 VIA — EVIDENCE TABLE ════════ -->
<section class="page">
  <div class="band"><span class="wm">Life<b>work</b></span><span>Chapter 3 · Character Strengths</span></div>
  <div class="body"><div class="main">
    <div class="eyebrow">Chapter 03 · evidence</div>
    <h3 class="section-h">The evidence table · top 5</h3>
    <p>For each top-ranked strength, Sage cross-references it with moments from your life history where that strength was in action.</p>
    <table class="evidence">
      <thead><tr><th style="width:108px">Strength</th><th>VIA definition</th><th style="width:38px">Rank</th><th style="width:34px">Freq</th><th style="width:74px">Salience</th><th>Achievements</th></tr></thead>
      <tbody>
        {{#EACH VIA.EVIDENCE}}
        <tr><td class="nm">{{.name}}</td><td>{{.definition}}</td><td class="rk">{{.rank}}</td><td class="fq">{{.freq}}</td><td><span class="pill {{.salienceClass}}">{{.salience}}</span></td><td>{{.achievements}}</td></tr>
        {{/EACH}}
      </tbody>
    </table>
  </div></div>
  <div class="foot"><span>{{BRAND.COMPANY}}</span><span>{{CLIENT.NAME}} · <span class="cur">07</span></span></div>
</section>

<!-- ════════ PAGE 8 · CH 3 KEY FINDINGS ════════ -->
<section class="page">
  <div class="band"><span class="wm">Life<b>work</b></span><span>Chapter 3 · Character Strengths</span></div>
  <div class="body"><div class="main">
    <div class="eyebrow">Chapter 03 · key findings</div>
    <h3 class="section-h">Key findings</h3>
    {{#EACH CH3.KEY_FINDINGS}}<p>{{.}}</p>{{/EACH}}
  </div></div>
  <div class="foot"><span>{{BRAND.COMPANY}}</span><span>{{CLIENT.NAME}} · <span class="cur">08</span></span></div>
</section>

<!-- ════════ PAGE 9 · CH 4 OCEAN BARS ════════ -->
<section class="page">
  <div class="band"><span class="wm">Life<b>work</b></span><span>Chapter 4 · Personality Profile</span></div>
  <div class="body grid">
    <div class="rail"><div class="num">04</div><div class="lab">OCEAN</div><div class="sub">Big Five personality</div></div>
    <div class="main">
      <h2 class="chap-title">Personality <em>profile.</em></h2>
      <div class="hr-gold"></div>
      <p class="lede">{{CH4.LEDE}}</p>
      <div class="ocean">
        <div class="axis"><span></span><div class="ticks"><span>0</span><span>25</span><span>50</span><span>75</span><span>100</span></div><span></span></div>
        {{#EACH OCEAN.DOMAINS}}
        <div class="trait"><span class="nm">{{.name}}</span><div class="track"><span class="q" style="left:25%"></span><span class="q" style="left:50%"></span><span class="q" style="left:75%"></span><div class="fill" style="width:{{.pct}}%"></div></div><span class="sc">{{.pct}}</span></div>
        {{/EACH}}
      </div>
      <h3 class="section-h">What the psychometrics show</h3>
      {{#EACH CH4.PSYCHOMETRICS_PARAS}}<p>{{.}}</p>{{/EACH}}
    </div>
  </div>
  <div class="foot"><span>{{BRAND.COMPANY}}</span><span>{{CLIENT.NAME}} · <span class="cur">09</span></span></div>
</section>

<!-- ════════ PAGE 10 · CH 4 TWO PICTURES ════════ -->
<section class="page">
  <div class="band"><span class="wm">Life<b>work</b></span><span>Chapter 4 · Personality Profile</span></div>
  <div class="body"><div class="main">
    <div class="eyebrow">Chapter 04 · synthesis</div>
    <h3 class="section-h">Where the two pictures meet</h3>
    {{#EACH CH4.SYNTHESIS_PARAS}}<p>{{.}}</p>{{/EACH}}
    <div class="keyfind"><div class="kt">{{CH4.KEYFIND.TITLE}}</div><p>{{CH4.KEYFIND.BODY}}</p></div>
  </div></div>
  <div class="foot"><span>{{BRAND.COMPANY}}</span><span>{{CLIENT.NAME}} · <span class="cur">10</span></span></div>
</section>

<!-- ════════ PAGE 11 · CH 5 BEHAVIOURAL STYLE ════════ -->
<section class="page">
  <div class="band"><span class="wm">Life<b>work</b></span><span>Chapter 5 · Behavioural Style</span></div>
  <div class="body grid">
    <div class="rail"><div class="num">05</div><div class="lab">Insights</div><div class="sub">Colour energies</div></div>
    <div class="main">
      <h2 class="chap-title">Behavioural <em>style.</em></h2>
      <div class="hr-gold"></div>
      <p class="lede">The following is an approximation derived by mapping your Big Five scores onto the Insights Discovery colour-energy framework, using the academic consensus correlations between OCEAN and the Jungian dimensions. It is a coaching tool, not a clinical assessment. For a validated Insights profile, contact an accredited Insights practitioner.</p>
      <div class="insights">
        <div class="wheel-wrap">
          <svg width="220" height="220" viewBox="0 0 240 240" xmlns="http://www.w3.org/2000/svg">
            <path d="M120,120 L120,8 A112,112 0 0,1 232,120 Z" fill="#A2402F"/>
            <path d="M120,120 L232,120 A112,112 0 0,1 120,232 Z" fill="#C0892F"/>
            <path d="M120,120 L120,232 A112,112 0 0,1 8,120 Z" fill="#5E7F4E"/>
            <path d="M120,120 L8,120 A112,112 0 0,1 120,8 Z" fill="#3C6E8F"/>
            <circle cx="{{CH5.WHEEL.X}}" cy="{{CH5.WHEEL.Y}}" r="8" fill="#fff" stroke="#16233F" stroke-width="2.5"/>
            <circle cx="{{CH5.WHEEL.X}}" cy="{{CH5.WHEEL.Y}}" r="3.5" fill="#16233F"/>
          </svg>
          <div class="wnote">Your position</div>
        </div>
        <div class="icards">
          <div class="icard"><div class="ihead {{CH5.PRIMARY.cssClass}}"><div class="badge">1</div><div><div class="iname">{{CH5.PRIMARY.fullName}}</div><div class="isub">Primary energy · {{CH5.PRIMARY.jungian}}</div></div></div><div class="ibody"><p>{{CH5.PRIMARY.description}}</p></div></div>
          <div class="icard"><div class="ihead {{CH5.SECONDARY.cssClass}}"><div class="badge">2</div><div><div class="iname">{{CH5.SECONDARY.fullName}}</div><div class="isub">Secondary energy · {{CH5.SECONDARY.jungian}}</div></div></div><div class="ibody"><p>{{CH5.SECONDARY.description}}</p></div></div>
        </div>
      </div>
      <div class="jbox">
        <div class="jl"><div class="jlab">Jungian Type</div><div class="jtype">{{CH5.JUNGIAN_TYPE}}</div></div>
        <div class="jr"><div><div class="jlab">Approx. MBTI equivalent</div><div class="jval">{{CH5.JUNGIAN_TYPE}}</div></div><div class="jspelt">{{CH5.JUNGIAN_SPELT}}</div></div>
      </div>
      <div class="axisrow">
        {{#EACH CH5.AXES}}<div class="axiscard"><div class="al">{{.label}}</div><div class="av">{{.value}}</div><div class="an">{{.note}}</div></div>{{/EACH}}
      </div>
    </div>
  </div>
  <div class="foot"><span>{{BRAND.COMPANY}}</span><span>{{CLIENT.NAME}} · <span class="cur">11</span></span></div>
</section>

<!-- ════════ PAGE 12 · CH 6 DEVELOPMENT EDGE ════════ -->
<section class="page">
  <div class="band"><span class="wm">Life<b>work</b></span><span>Chapter 6 · Development Edge</span></div>
  <div class="body grid">
    <div class="rail"><div class="num">06</div><div class="lab">Development</div><div class="sub">Your growth edge</div></div>
    <div class="main">
      <h2 class="chap-title">Development <em>edge.</em></h2>
      <div class="hr-gold"></div>
      {{#EACH CH6.SECTIONS}}<h3 class="section-h">{{.heading}}</h3>{{#EACH .paragraphs}}<p>{{.}}</p>{{/EACH}}{{/EACH}}
    </div>
  </div>
  <div class="foot"><span>{{BRAND.COMPANY}}</span><span>{{CLIENT.NAME}} · <span class="cur">12</span></span></div>
</section>

<!-- ════════ PAGE 12b · CH 6 DEVELOPMENT EDGE (OVERFLOW) ════════ -->
{{#IF CH6.HAS_OVERFLOW}}
<section class="page">
  <div class="band"><span class="wm">Life<b>work</b></span><span>Chapter 6 · Development Edge (continued)</span></div>
  <div class="body"><div class="main">
    <div class="eyebrow">Chapter 06 · continued</div>
    {{#EACH CH6.OVERFLOW_SECTIONS}}{{#IF .heading}}<h3 class="section-h">{{.heading}}</h3>{{/IF}}{{#EACH .paragraphs}}<p>{{.}}</p>{{/EACH}}{{/EACH}}
  </div></div>
  <div class="foot"><span>{{BRAND.COMPANY}}</span><span>{{CLIENT.NAME}} · <span class="cur">12b</span></span></div>
</section>
{{/IF}}

<!-- ════════ PAGE 13 · CH 7 CONCLUSIONS (past/present) ════════ -->
<section class="page">
  <div class="band"><span class="wm">Life<b>work</b></span><span>Chapter 7 · Conclusions</span></div>
  <div class="body grid">
    <div class="rail"><div class="num">07</div><div class="lab">Conclusions</div><div class="sub">Past · present · future</div></div>
    <div class="main">
      <h2 class="chap-title">Conclusions.</h2>
      <div class="hr-gold"></div>
      <h3 class="section-h">Past</h3>
      {{#EACH CH7.PAST}}<p>{{.}}</p>{{/EACH}}
      <h3 class="section-h">Present</h3>
      {{#EACH CH7.PRESENT}}<p>{{.}}</p>{{/EACH}}
      <div class="pull">{{CH7.PRESENT_PULLQUOTE}}</div>
    </div>
  </div>
  <div class="foot"><span>{{BRAND.COMPANY}}</span><span>{{CLIENT.NAME}} · <span class="cur">13</span></span></div>
</section>

<!-- ════════ PAGE 14 · CH 7 FUTURE + TELL-ME-ABOUT ════════ -->
<section class="page">
  <div class="band"><span class="wm">Life<b>work</b></span><span>Chapter 7 · Conclusions</span></div>
  <div class="body"><div class="main">
    <div class="eyebrow">Chapter 07 · continued</div>
    <h3 class="section-h">Future</h3>
    {{#EACH CH7.FUTURE}}<p>{{.}}</p>{{/EACH}}
    <div class="tmay">
      <div class="tk">Tell me about yourself · a suggested answer</div>
      <div class="ti">I am fundamentally driven by:</div>
      <ul class="drives">{{#EACH CH7.DRIVES}}<li>{{.}}</li>{{/EACH}}</ul>
      {{#EACH CH7.TMAY_PARAS}}<p>{{.}}</p>{{/EACH}}
    </div>
  </div></div>
  <div class="foot"><span>{{BRAND.COMPANY}}</span><span>{{CLIENT.NAME}} · <span class="cur">14</span></span></div>
</section>

<!-- ════════ PAGE 15 · CH 8 CAREER DIRECTIONS ════════ -->
<section class="page">
  <div class="band"><span class="wm">Life<b>work</b></span><span>Chapter 8 · Career Directions</span></div>
  <div class="body grid">
    <div class="rail"><div class="num">08</div><div class="lab">Directions</div><div class="sub">Where you go next</div></div>
    <div class="main">
      <h2 class="chap-title">Career <em>directions.</em></h2>
      <div class="hr-gold"></div>
      {{#EACH CH8.DIRECTIONS}}{{#IF .heading}}<h3 class="section-h">{{.heading}}</h3>{{/IF}}{{#EACH .paragraphs}}<p>{{.}}</p>{{/EACH}}{{/EACH}}
      {{#IF CH8.NO_OVERFLOW}}<div class="pull">{{CH8.CLOSING}}</div>{{/IF}}
    </div>
  </div>
  <div class="foot"><span>{{BRAND.COMPANY}}</span><span>{{CLIENT.NAME}} · <span class="cur">15</span></span></div>
</section>

<!-- ════════ PAGE 15b · CH 8 CAREER DIRECTIONS (OVERFLOW) ════════ -->
{{#IF CH8.HAS_OVERFLOW}}
<section class="page">
  <div class="band"><span class="wm">Life<b>work</b></span><span>Chapter 8 · Career Directions (continued)</span></div>
  <div class="body"><div class="main">
    <div class="eyebrow">Chapter 08 · continued</div>
    {{#EACH CH8.OVERFLOW_DIRECTIONS}}{{#IF .heading}}<h3 class="section-h">{{.heading}}</h3>{{/IF}}{{#EACH .paragraphs}}<p>{{.}}</p>{{/EACH}}{{/EACH}}
    <div class="pull">{{CH8.CLOSING}}</div>
  </div></div>
  <div class="foot"><span>{{BRAND.COMPANY}}</span><span>{{CLIENT.NAME}} · <span class="cur">15b</span></span></div>
</section>
{{/IF}}

<!-- ════════ PAGE 16 · APPENDIX — FOUR VARIANTS ════════ -->
<section class="page">
  <div class="band"><span class="wm">Life<b>work</b></span><span>Appendix</span></div>
  <div class="body"><div class="main">
    <div class="eyebrow">Appendix</div>
    <h2 class="annex-title">The four report <em>variants.</em></h2>
    <div class="hr-gold"></div>
    <p class="lede">{{APPENDIX.LEDE}}</p>
    <table class="variants">
      <thead><tr><th>Variant</th><th>For</th><th>The central question</th></tr></thead>
      <tbody>
        {{#EACH APPENDIX.VARIANTS}}<tr><td class="vr">{{.name}}</td><td class="wh">{{.for}}</td><td class="q">{{.question}}</td></tr>{{/EACH}}
      </tbody>
    </table>
    <p class="citation" style="margin-top:22px">This report is confidential and prepared exclusively for the named individual.</p>
  </div></div>
  <div class="foot"><span>{{BRAND.COMPANY}}</span><span>{{CLIENT.NAME}} · <span class="cur">16</span></span></div>
</section>

<!-- ════════ PAGE 17 · DATA DIVIDER ════════ -->
<section class="page divider">
  <div class="dband"><span class="wm">Life<b>work</b></span><span>{{BRAND.COMPANY}} · WOW Report</span></div>
  <div class="dbody">
    <div class="dhr"></div>
    <h1>Your data.</h1>
    <div class="di">The underlying information that Sage used to build your report — recorded exactly as you gave it, and as the instruments scored it.</div>
    <div class="contents">
      <div class="crow"><span class="cx">A</span><span class="cl">Life History Data</span></div>
      <div class="crow"><span class="cx">B</span><span class="cl">Biographical Data</span></div>
      <div class="crow"><span class="cx">C</span><span class="cl">VIA Character Strengths — all 24</span></div>
      <div class="crow"><span class="cx">D</span><span class="cl">OCEAN Personality Profile — with facets</span></div>
    </div>
  </div>
  <div class="dfoot">Prepared for {{CLIENT.NAME}} · {{REPORT.DATE}}</div>
</section>

<!-- ════════ ANNEX A · LIFE HISTORY ════════ -->
{{#EACH LIFE_HISTORY.PAGES}}
<section class="page">
  <div class="band"><span class="wm">Life<b>work</b></span><span>A · Life History</span></div>
  <div class="body"><div class="main">
    {{#IF .showKicker}}
    <div class="eyebrow">Annex A · Life History</div>
    <h2 class="annex-title">Life <em>history.</em></h2>
    <div class="hr-gold"></div>
    <p class="lede">Achievements recorded during the Sage life history interview. Where Sage asked a follow-up, the enrichment note is shown beneath.</p>
    {{/IF}}
    {{#IF .continued}}<div class="eyebrow">Annex A · continued</div>{{/IF}}
    {{#EACH .stages}}
    <div class="stage"><span class="st">{{.title}}</span><span class="sa">{{.ages}}</span></div>
    {{#EACH .entries}}
    <div class="lh"><div class="lt"><span class="ltitle">{{.title}}</span><span class="lmeta"><span>Age {{.age}}</span><span class="esf {{.esfClass}}">{{.esf}}</span></span></div>
    <div class="lbody">{{.body}}</div>
    {{#IF .note}}<div class="lnote">{{.note}}</div>{{/IF}}</div>
    {{/EACH}}
    {{/EACH}}
  </div></div>
  <div class="foot"><span>{{BRAND.COMPANY}}</span><span>{{CLIENT.NAME}} · <span class="cur">{{.pageNum}}</span></span></div>
</section>
{{/EACH}}

<!-- ════════ ANNEX B · BIOGRAPHICAL DATA ════════ -->
<section class="page">
  <div class="band"><span class="wm">Life<b>work</b></span><span>B · Biographical Data</span></div>
  <div class="body"><div class="main">
    <div class="eyebrow">Annex B · Biographical</div>
    <h2 class="annex-title">Biographical <em>data.</em></h2>
    <div class="hr-gold"></div>
    <p class="lede">Family background, educational history, and career history as provided by the client.</p>

    <h3 class="subhead">B1 — Family background</h3>
    {{#IF BIOGRAPHICAL.FAMILY.HAS_DATA}}
    <div class="bfields">
      {{#IF BIOGRAPHICAL.FAMILY.upbringingLocation}}<div class="bfield"><span class="bl">Location of upbringing</span><span class="bv">{{BIOGRAPHICAL.FAMILY.upbringingLocation}}</span></div>{{/IF}}
      {{#IF BIOGRAPHICAL.FAMILY.fatherOccupation}}<div class="bfield"><span class="bl">Father’s occupation</span><span class="bv">{{BIOGRAPHICAL.FAMILY.fatherOccupation}}</span></div>{{/IF}}
      {{#IF BIOGRAPHICAL.FAMILY.motherOccupation}}<div class="bfield"><span class="bl">Mother’s occupation</span><span class="bv">{{BIOGRAPHICAL.FAMILY.motherOccupation}}</span></div>{{/IF}}
      {{#IF BIOGRAPHICAL.FAMILY.siblingPosition}}<div class="bfield"><span class="bl">Position among siblings</span><span class="bv">{{BIOGRAPHICAL.FAMILY.siblingPosition}}</span></div>{{/IF}}
    </div>
    {{#IF BIOGRAPHICAL.FAMILY.familyNarrative}}<p class="bnote">{{BIOGRAPHICAL.FAMILY.familyNarrative}}</p>{{/IF}}
    {{#IF BIOGRAPHICAL.FAMILY.significantInfluences}}
    <h3 class="subhead">Significant influences</h3>
    <p class="bnote">{{BIOGRAPHICAL.FAMILY.significantInfluences}}</p>
    {{/IF}}
    {{/IF}}

    <h3 class="subhead">B2 — Educational history</h3>
    {{#IF BIOGRAPHICAL.HAS_EDUCATION}}
    {{#EACH BIOGRAPHICAL.EDUCATION}}
    <div class="edu"><div class="eh"><span class="es">{{.institution}}</span><span class="ey">{{.qualification}}{{#IF .subject}} · {{.subject}}{{/IF}}{{#IF .yearFrom}} · {{.yearFrom}}–{{.yearTo}}{{/IF}}</span></div>{{#IF .highlights}}<div class="en">{{.highlights}}</div>{{/IF}}</div>
    {{/EACH}}
    {{/IF}}
  </div></div>
  <div class="foot"><span>{{BRAND.COMPANY}}</span><span>{{CLIENT.NAME}} · Annex B</span></div>
</section>

<!-- ════════ ANNEX B (cont.) · CAREER HISTORY ════════ -->
<section class="page">
  <div class="band"><span class="wm">Life<b>work</b></span><span>B · Biographical Data</span></div>
  <div class="body"><div class="main">
    <div class="eyebrow">Annex B · Career history</div>
    <h3 class="subhead">B3 — Career history</h3>
    {{#IF BIOGRAPHICAL.HAS_CAREER}}
    {{#EACH BIOGRAPHICAL.CAREER}}
    <div class="career"><div class="ch"><span class="co">{{.organisation}}</span>{{#IF .yearFrom}}<span class="cmeta">{{.yearFrom}}–{{.yearTo}}</span>{{/IF}}</div>
    {{#IF .role}}<div class="cr">{{.role}}</div>{{/IF}}
    {{#IF .keyResponsibilities}}<div class="cbody">{{.keyResponsibilities}}</div>{{/IF}}
    <div class="cmeta-row">
      {{#IF .highlights}}<span class="mk">Liked</span><span class="mv">{{.highlights}}</span>{{/IF}}
      {{#IF .whyLeft}}<span class="mk">Why left</span><span class="mv">{{.whyLeft}}</span>{{/IF}}
    </div></div>
    {{/EACH}}
    {{/IF}}
  </div></div>
  <div class="foot"><span>{{BRAND.COMPANY}}</span><span>{{CLIENT.NAME}} · Annex B</span></div>
</section>

<!-- ════════ ANNEX C · VIA FULL 24 ════════ -->
<section class="page">
  <div class="band"><span class="wm">Life<b>work</b></span><span>C · VIA Character Strengths</span></div>
  <div class="body"><div class="main">
    <div class="eyebrow">Annex C · VIA</div>
    <h2 class="annex-title">VIA character <em>strengths.</em></h2>
    <div class="hr-gold"></div>
    <p class="lede">All 24 strengths ranked by score out of 25. Top 5 highlighted in gold; bottom 5 in muted.</p>
    <ol class="rank full" style="grid-template-rows:repeat(12,auto)">
      {{#EACH VIA.ALL24}}<li class="{{.cssClass}}"><span class="ix">{{INDEX}}</span><span class="nm">{{.name}}</span><span class="sc">{{.score}}<span class="of">/25</span></span></li>{{/EACH}}
    </ol>
    <div class="virtues-note">{{VIA.VIRTUES_NOTE}}</div>
  </div></div>
  <div class="foot"><span>{{BRAND.COMPANY}}</span><span>{{CLIENT.NAME}} · <span class="cur">22</span></span></div>
</section>

<!-- ════════ ANNEX C (cont.) · VIA DEFINITIONS ════════ -->
<section class="page">
  <div class="band"><span class="wm">Life<b>work</b></span><span>C · VIA Character Strengths — Definitions</span></div>
  <div class="body"><div class="main">
    <div class="eyebrow">Annex C · Definitions</div>
    <h2 class="annex-title">VIA <em>definitions.</em></h2>
    <div class="hr-gold"></div>
    <p class="lede">The 24 character strengths, grouped by the six core virtues. Definitions are drawn from the VIA Classification (Peterson &amp; Seligman, 2004).</p>
    <div class="defs">
      <div class="vgroup"><div class="vg">Wisdom</div>
        <div class="def"><span class="dn">Creativity</span><div class="dd">Thinking of novel and productive ways to conceptualise and do things; includes artistic achievement but is not limited to it.</div></div>
        <div class="def"><span class="dn">Curiosity</span><div class="dd">Taking an interest in ongoing experience for its own sake; finding subjects and topics fascinating; exploring and discovering.</div></div>
        <div class="def"><span class="dn">Judgement</span><div class="dd">Thinking things through and examining them from all sides; not jumping to conclusions; changing one’s mind in light of evidence.</div></div>
        <div class="def"><span class="dn">Love of Learning</span><div class="dd">Mastering new skills, topics, and bodies of knowledge, whether on one’s own or formally; related to curiosity but goes beyond it.</div></div>
        <div class="def"><span class="dn">Perspective</span><div class="dd">Being able to provide wise counsel to others; having ways of looking at the world that make sense to oneself and others.</div></div>
      </div>
      <div class="vgroup"><div class="vg">Courage</div>
        <div class="def"><span class="dn">Bravery</span><div class="dd">Not shrinking from threat, challenge, difficulty, or pain; speaking up for what is right even if there is opposition.</div></div>
        <div class="def"><span class="dn">Perseverance</span><div class="dd">Finishing what one starts; persisting in a course of action in spite of obstacles; taking pleasure in completing tasks.</div></div>
        <div class="def"><span class="dn">Honesty</span><div class="dd">Speaking the truth and presenting oneself in a genuine way; acting without pretence; taking responsibility for one’s feelings and actions.</div></div>
        <div class="def"><span class="dn">Zest</span><div class="dd">Approaching life with excitement and energy; not doing things halfway; living life as an adventure; feeling alive and activated.</div></div>
      </div>
      <div class="vgroup"><div class="vg">Humanity</div>
        <div class="def"><span class="dn">Love</span><div class="dd">Valuing close relations with others, in particular those in which sharing and caring are reciprocated; being close to people.</div></div>
        <div class="def"><span class="dn">Kindness</span><div class="dd">Doing favours and good deeds for others; helping them; taking care of them.</div></div>
        <div class="def"><span class="dn">Social Intelligence</span><div class="dd">Being aware of the motives and feelings of other people and oneself; knowing what to do to fit into different social situations.</div></div>
      </div>
      <div class="vgroup"><div class="vg">Justice</div>
        <div class="def"><span class="dn">Teamwork</span><div class="dd">Working well as a member of a group or team; being loyal to the group; doing one’s share.</div></div>
        <div class="def"><span class="dn">Fairness</span><div class="dd">Treating all people the same according to notions of fairness and justice; not letting personal feelings bias decisions.</div></div>
        <div class="def"><span class="dn">Leadership</span><div class="dd">Encouraging a group to get things done while maintaining good relations within the group.</div></div>
      </div>
      <div class="vgroup"><div class="vg">Temperance</div>
        <div class="def"><span class="dn">Forgiveness</span><div class="dd">Forgiving those who have done wrong; accepting the shortcomings of others; giving people a second chance; not being vengeful.</div></div>
        <div class="def"><span class="dn">Humility</span><div class="dd">Letting one’s accomplishments speak for themselves; not regarding oneself as more special than one is.</div></div>
        <div class="def"><span class="dn">Prudence</span><div class="dd">Being careful about one’s choices; not taking undue risks; not saying or doing things that might later be regretted.</div></div>
        <div class="def"><span class="dn">Self-Regulation</span><div class="dd">Regulating what one feels and does; being disciplined; controlling one’s appetites and emotions.</div></div>
      </div>
      <div class="vgroup"><div class="vg">Transcendence</div>
        <div class="def"><span class="dn">Appreciation of Beauty</span><div class="dd">Noticing and appreciating beauty, excellence, and/or skilled performance in various domains of life.</div></div>
        <div class="def"><span class="dn">Gratitude</span><div class="dd">Being aware of and thankful for the good things that happen; taking time to express thanks.</div></div>
        <div class="def"><span class="dn">Hope</span><div class="dd">Expecting the best in the future and working to achieve it; believing a good future can be brought about.</div></div>
        <div class="def"><span class="dn">Humour</span><div class="dd">Liking to laugh and tease; bringing smiles to other people; seeing the light side; making jokes.</div></div>
        <div class="def"><span class="dn">Spirituality</span><div class="dd">Having coherent beliefs about the higher purpose and meaning of the universe; knowing where one fits within the larger scheme.</div></div>
      </div>
    </div>
  </div></div>
  <div class="foot"><span>{{BRAND.COMPANY}}</span><span>{{CLIENT.NAME}} · Annex C</span></div>
</section>

<!-- ════════ ANNEX D · OCEAN FACETS (1/2) ════════ -->
<section class="page">
  <div class="band"><span class="wm">Life<b>work</b></span><span>D · OCEAN Personality Profile</span></div>
  <div class="body"><div class="main">
    <div class="eyebrow">Annex D · OCEAN</div>
    <h2 class="annex-title">OCEAN personality <em>profile.</em></h2>
    <div class="hr-gold"></div>
    <p class="lede">Five domain scores and 30 sub-scale facets. Scores are percentiles (0–100). Above 70 is high; below 30 is low.</p>
    {{#EACH OCEAN.PAGE1_DOMAINS}}
    <div class="fgroup"><div class="fgh"><span class="fgn">{{.name}}</span><span class="fgs">{{.pct}}<span class="pct">%ile</span></span></div>
      <div class="facets">{{#EACH .facets}}<div class="facet"><span class="fn">{{.name}}</span><span class="fb"><span class="ff" style="width:{{.pct}}%"></span></span><span class="fs">{{.pct}}</span></div>{{/EACH}}</div>
    </div>
    {{/EACH}}
  </div></div>
  <div class="foot"><span>{{BRAND.COMPANY}}</span><span>{{CLIENT.NAME}} · <span class="cur">23</span></span></div>
</section>

<!-- ════════ ANNEX D · OCEAN FACETS (2/2) ════════ -->
<section class="page">
  <div class="band"><span class="wm">Life<b>work</b></span><span>D · OCEAN Personality Profile</span></div>
  <div class="body"><div class="main">
    <div class="eyebrow">Annex D · continued</div>
    {{#EACH OCEAN.PAGE2_DOMAINS}}
    <div class="fgroup"><div class="fgh"><span class="fgn">{{.name}}</span><span class="fgs">{{.pct}}<span class="pct">%ile</span></span></div>
      <div class="facets">{{#EACH .facets}}<div class="facet"><span class="fn">{{.name}}</span><span class="fb"><span class="ff" style="width:{{.pct}}%"></span></span><span class="fs">{{.pct}}</span></div>{{/EACH}}</div>
    </div>
    {{/EACH}}
    <div class="annex-note">{{OCEAN.FACET_NOTE}}</div>
    <div class="annex-note" style="border:none;padding-top:6px;margin-top:6px;font-family:var(--mono);font-size:9px;letter-spacing:0.12em;text-transform:uppercase;">Confidential — prepared by {{BRAND.COMPANY}} for the named client only.</div>
  </div></div>
  <div class="foot"><span>{{BRAND.COMPANY}}</span><span>{{CLIENT.NAME}} · <span class="cur">24</span></span></div>
</section>

<!-- ════════ ANNEX D (cont.) · OCEAN DEFINITIONS ════════ -->
<section class="page">
  <div class="band"><span class="wm">Life<b>work</b></span><span>D · OCEAN — Sub-scale Definitions</span></div>
  <div class="body"><div class="main">
    <div class="eyebrow">Annex D · Sub-scales</div>
    <h2 class="annex-title">OCEAN <em>sub-scales.</em></h2>
    <div class="hr-gold"></div>
    <p class="lede">The 30 facets of the NEO Personality Inventory, grouped by the five broad domains. Definitions are drawn from Costa &amp; McCrae (1992).</p>
    <div class="defs">
      <div class="vgroup"><div class="vg">Openness to Experience</div>
        <div class="def"><span class="dn">Imagination</span><div class="dd">A vivid imagination and a tendency to create a rich inner world of fantasy; daydreaming as a creative outlet.</div></div>
        <div class="def"><span class="dn">Artistic Interests</span><div class="dd">Deep appreciation for art, music, and poetry; moved by beauty in nature and the arts.</div></div>
        <div class="def"><span class="dn">Emotionality</span><div class="dd">Receptivity to one’s own inner feelings and emotions; valuing emotional experience as an important part of life.</div></div>
        <div class="def"><span class="dn">Adventurousness</span><div class="dd">Eagerness to try new activities, travel to new places, and experience variety; discomfort with routine.</div></div>
        <div class="def"><span class="dn">Intellect</span><div class="dd">Intellectual curiosity and a love of ideas; enjoying philosophical discussion and abstract thinking for its own sake.</div></div>
        <div class="def"><span class="dn">Liberalism</span><div class="dd">Readiness to challenge authority, convention, and traditional values; comfort with moral and social ambiguity.</div></div>
      </div>
      <div class="vgroup"><div class="vg">Conscientiousness</div>
        <div class="def"><span class="dn">Self-Efficacy</span><div class="dd">Confidence in one’s ability to accomplish things; a sense of competence and readiness to handle life’s demands.</div></div>
        <div class="def"><span class="dn">Orderliness</span><div class="dd">Being tidy, well-organised, and methodical; keeping belongings neat and following a regular schedule.</div></div>
        <div class="def"><span class="dn">Dutifulness</span><div class="dd">A strong sense of moral obligation; scrupulous adherence to ethical principles and fulfilment of commitments.</div></div>
        <div class="def"><span class="dn">Achievement-Striving</span><div class="dd">High aspirations and hard work to reach goals; a sense of direction and purposefulness in life.</div></div>
        <div class="def"><span class="dn">Self-Discipline</span><div class="dd">The capacity to begin tasks and carry them through to completion despite boredom or distraction.</div></div>
        <div class="def"><span class="dn">Cautiousness</span><div class="dd">Thinking carefully before acting or speaking; deliberateness and a tendency to weigh consequences.</div></div>
      </div>
      <div class="vgroup"><div class="vg">Extraversion</div>
        <div class="def"><span class="dn">Friendliness</span><div class="dd">Genuine liking for other people and a tendency to form close, warm attachments; easy to get along with.</div></div>
        <div class="def"><span class="dn">Gregariousness</span><div class="dd">Preference for the company of others; enjoyment of crowds and social gatherings.</div></div>
        <div class="def"><span class="dn">Assertiveness</span><div class="dd">Dominance, forcefulness, and social ascendance; speaking up without hesitation and taking charge.</div></div>
        <div class="def"><span class="dn">Activity Level</span><div class="dd">A fast tempo, vigorous movement, and a sense of being busy and energetic; preference for a hectic pace of life.</div></div>
        <div class="def"><span class="dn">Excitement-Seeking</span><div class="dd">A craving for stimulation, thrills, and excitement; attraction to bright lights and bustle.</div></div>
        <div class="def"><span class="dn">Cheerfulness</span><div class="dd">A tendency to experience positive moods — joy, optimism, and high spirits.</div></div>
      </div>
      <div class="vgroup"><div class="vg">Agreeableness</div>
        <div class="def"><span class="dn">Trust</span><div class="dd">A disposition to believe that others are honest and well-intentioned; assuming good faith in people’s motives.</div></div>
        <div class="def"><span class="dn">Morality</span><div class="dd">Frankness and sincerity in dealing with others; discomfort with manipulation or deception.</div></div>
        <div class="def"><span class="dn">Altruism</span><div class="dd">Active concern for the welfare of others; generosity and a willingness to assist those in need.</div></div>
        <div class="def"><span class="dn">Cooperation</span><div class="dd">Dislike of confrontation; willingness to compromise and suppress one’s own needs to get along with others.</div></div>
        <div class="def"><span class="dn">Modesty</span><div class="dd">Humbleness and self-effacement; reluctance to claim superiority over others even when entitled to.</div></div>
        <div class="def"><span class="dn">Sympathy</span><div class="dd">Being moved by others’ needs; a tender-minded attitude and concern for the less fortunate.</div></div>
      </div>
      <div class="vgroup"><div class="vg">Neuroticism (Emotional Range)</div>
        <div class="def"><span class="dn">Anxiety</span><div class="dd">Tendency to experience worry, fear, and apprehension; a nervous, tense disposition that anticipates trouble.</div></div>
        <div class="def"><span class="dn">Anger</span><div class="dd">Tendency to experience frustration, bitterness, and anger when things do not go as desired.</div></div>
        <div class="def"><span class="dn">Depression</span><div class="dd">Proneness to feelings of guilt, sadness, despondency, and loneliness; a tendency to feel discouraged.</div></div>
        <div class="def"><span class="dn">Self-Consciousness</span><div class="dd">Shyness and social anxiety; discomfort around others and sensitivity to ridicule or embarrassment.</div></div>
        <div class="def"><span class="dn">Immoderation</span><div class="dd">Difficulty resisting cravings and urges; a tendency to pursue short-term pleasures despite longer-term costs.</div></div>
        <div class="def"><span class="dn">Vulnerability</span><div class="dd">Susceptibility to stress; a tendency to feel panicked, confused, or unable to cope under pressure.</div></div>
      </div>
    </div>
  </div></div>
  <div class="foot"><span>{{BRAND.COMPANY}}</span><span>{{CLIENT.NAME}} · Annex D</span></div>
</section>

<div id="lw-print-bar">
  <span>Lifework · Modern Counsel</span>
  <button onclick="window.print()">Print / Save PDF</button>
</div>

</body>
</html>`;

// ─── Express route handler ────────────────────────────────────────────────────
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
