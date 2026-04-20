/**
 * html-report.ts
 *
 * Express route: GET /api/report/html/:clientId
 *
 * Renders the Lifework WOW Report as a fully-styled HTML page using the
 * lifework-template.html design system.  The template is embedded as a
 * string constant (so no filesystem reads at runtime) and populated with
 * the client's Claude export JSON via a lightweight {{}} / {{#EACH}} /
 * {{#IF}} renderer.
 *
 * CDN URLs (uploaded via manus-upload-file --webdev):
 *   CSS:     https://d2xsxph8kpxj0f.cloudfront.net/107696804/kFbbE6kqNApXGDFpQJUGV7/lifework_4e47a34c.css
 *   Tangram: https://d2xsxph8kpxj0f.cloudfront.net/107696804/kFbbE6kqNApXGDFpQJUGV7/ph-tangram_8a2cd166.jpg
 */

import { Request, Response } from "express";
import { buildClaudeExportJson } from "./routers/claudeExport.js";
import { sdk } from "./_core/sdk.js";

// ─── CDN constants ────────────────────────────────────────────────────────────

const CDN_CSS     = "https://d2xsxph8kpxj0f.cloudfront.net/107696804/kFbbE6kqNApXGDFpQJUGV7/lifework_4e47a34c.css";
const CDN_TANGRAM = "https://d2xsxph8kpxj0f.cloudfront.net/107696804/kFbbE6kqNApXGDFpQJUGV7/ph-tangram_8a2cd166.jpg";

// ─── Template renderer ────────────────────────────────────────────────────────

/**
 * Resolve a dotted path like "CLIENT.FIRST_NAME" against a data object.
 * Returns "" for missing paths.
 */
function resolvePath(data: Record<string, unknown>, path: string): unknown {
  const parts = path.split(".");
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
  return String(val);
}

/**
 * Main template renderer.
 * Handles:
 *   {{PATH.TO.VALUE}}
 *   {{#EACH ARRAY}} ... {{.field}} ... {{/EACH}}
 *   {{#IF VALUE}} ... {{/IF}}
 *   {{INDEX}} inside EACH (1-based)
 */
function renderTemplate(template: string, data: Record<string, unknown>): string {
  // Process EACH loops (may be nested one level)
  function processEach(tmpl: string, ctx: Record<string, unknown>): string {
    return tmpl.replace(
      /\{\{#EACH ([^}]+)\}\}([\s\S]*?)\{\{\/EACH\}\}/g,
      (_match, arrayPath: string, block: string) => {
        const arr = resolvePath(ctx, arrayPath.trim());
        if (!Array.isArray(arr)) return "";
        return arr
          .map((item, idx) => {
            // Build item context: if item is an object, spread it; otherwise use "." as the item itself
            const itemCtx: Record<string, unknown> =
              item !== null && typeof item === "object"
                ? { ...(item as Record<string, unknown>), INDEX: idx + 1 }
                : { ".": item, INDEX: idx + 1 };
            // Replace {{.field}} and {{.}} within the block
            let rendered = block;
            // Handle nested EACH (one level deep)
            rendered = processEach(rendered, { ...ctx, ...itemCtx });
            // Handle nested IF
            rendered = processIf(rendered, { ...ctx, ...itemCtx });
            // Replace {{.field}} tokens
            rendered = rendered.replace(/\{\{\.([^}]*)\}\}/g, (_m, field: string) => {
              const f = field.trim();
              if (f === "") {
                // {{.}} = the whole item
                return item != null ? String(item) : "";
              }
              const v = (itemCtx as Record<string, unknown>)[f];
              if (v == null) return "";
              if (Array.isArray(v)) return v.join(", ");
              return String(v);
            });
            // Replace {{INDEX}}
            rendered = rendered.replace(/\{\{INDEX\}\}/g, String(idx + 1));
            // Replace remaining {{PATH}} tokens with outer context
            rendered = rendered.replace(/\{\{([^#/][^}]*)\}\}/g, (_m, path: string) => {
              return renderToken(ctx, path);
            });
            return rendered;
          })
          .join("");
      }
    );
  }

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

  let out = template;
  // Process top-level EACH
  out = processEach(out, data);
  // Process top-level IF
  out = processIf(out, data);
  // Replace remaining simple tokens
  out = out.replace(/\{\{([^#/][^}]*)\}\}/g, (_m, path: string) => {
    return renderToken(data, path);
  });
  return out;
}

// ─── HTML template (embedded) ─────────────────────────────────────────────────
// We embed the template as a string so there are no filesystem reads at runtime.
// The CSS is loaded from CDN; the tangram is injected via the inline script.

const TEMPLATE = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Lifework WOW Report — {{CLIENT.NAME}}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400;1,500;1,600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="${CDN_CSS}">
<style>
  /* Print button — hidden on print */
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
  @media print { #lw-print-bar { display: none !important; } }
  body { padding-bottom: 72px; }
  @media print { body { padding-bottom: 0; } }
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
    {{#IF CH2.PAGE1_SECTION_H}}<h3 class="section-h">{{CH2.PAGE1_SECTION_H}}</h3>{{/IF}}
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
    <h3 class="section-h" style="margin-top:0;">{{CH2.PAGE2_SECTION_H}}</h3>
    {{#EACH CH2.PAGE2_PARAGRAPHS}}
    <p>{{.}}</p>
    {{/EACH}}
    <div class="keyfind">
      <h3 class="section-h" style="margin:0 0 8px;">{{CH2.KEYFIND.TITLE}}</h3>
      {{#EACH CH2.KEYFIND.PARAGRAPHS}}
      <p style="margin:0 0 10px;">{{.}}</p>
      {{/EACH}}
    </div>
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
    <div class="keyfind">
      <p style="margin:0;font-family:var(--serif);font-style:italic;font-size:18px;line-height:1.4;color:var(--navy);">{{CH3.PULLQUOTE}}</p>
    </div>
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
    <span class="kicker">Chapter 05</span>
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
    <div class="keyfind">
      <p style="margin:0;font-family:var(--serif);font-style:italic;font-size:18px;line-height:1.4;color:var(--navy);">{{CH6.PULLQUOTE}}</p>
    </div>
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
  // Inject the PH tangram logo into every .mark placeholder
  document.querySelectorAll('.mark').forEach(function(el) {
    if (!el.innerHTML.trim()) {
      el.innerHTML = '<img src="${CDN_TANGRAM}" alt="Pennington Hennessy" style="width:100%;height:100%;display:block;object-fit:contain;"/>';
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
