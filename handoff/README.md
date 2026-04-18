# Lifework WOW Report — design handoff

This folder is a portable, brand-locked template for the Lifework WOW Report, intended to be consumed by any agent (Manus, etc.) that can fetch raw files from GitHub and substitute JSON data into an HTML template.

## What's in here

| File | Purpose |
|---|---|
| `lifework-template.html` | The 24-page report shell with `{{PLACEHOLDER}}` tokens. |
| `lifework.css`           | All styling — typography, colours, page chrome, charts. Do not rewrite; just link. |
| `data.example.json`      | A fully-shaped example payload. Use as the schema reference. |
| `assets/ph-tangram.jpg`  | PH tangram mark used in the header lockup. |
| `assets/lifework-logo.png` | Lifework wordmark (available if needed). |

## Design system — locked values

- **Page**: A4 portrait, 794 × 1123 px at 96 dpi. Padding 72 × 88.
- **Colours**:
  - Navy `#1A2744`, soft navy `#2A3A5E`, navy mist `#8A9BBF`
  - Gold `#C9973A`, soft gold `#E0B866`
  - Cream `#F5F0E8`, warm cream `#EFE6D6`
  - Ink `#0E1628`, muted ink `#5a6278`
- **Type**: *Cormorant Garamond* (serif display + body italics), *Inter* (sans UI). Loaded via Google Fonts `<link>` at top of `lifework-template.html`.
- **Logo**: PH tangram (jpg) injected into every `.mark` placeholder by the inline `<script>` at the bottom of the template.

## Template syntax

The template uses three directives. These are NOT standard Mustache/Handlebars — a renderer just needs:

| Directive | Meaning |
|---|---|
| `{{PATH.TO.VALUE}}` | Replace with the value at that dotted JSON path. HTML in values is fine (e.g. `<em>`, `<strong>`). |
| `{{#EACH ARRAY}}...{{/EACH}}` | Repeat the block once per item. Inside, `{{.field}}` refers to fields on the current item; `{{.}}` = the whole current item (for arrays of strings). |
| `{{#IF VALUE}}...{{/IF}}` | Render only if value is truthy. |

Loops may nest (`LIFE_HISTORY.PAGES[i].stages[j].entries[k]`).

## Data schema — top-level keys

```
BRAND.COMPANY                     "Pennington Hennessy"
CLIENT.NAME, CLIENT.FIRST_NAME
REPORT.DATE, REPORT.EDITION_LABEL, REPORT.COVER_TITLE_LINE1/2, REPORT.ANALYST
COVER_LETTER.PARAGRAPHS[]         string[] · HTML allowed
COVER_LETTER.SIGN_OFF/AUTHOR_NAME/AUTHOR_EMAIL
CH1.HERO + CH1.PARAGRAPHS[]
CH2.LEDE, PAGE1/2_PARAGRAPHS[], PAGE1/2_SECTION_H, KEYFIND.{TITLE,PARAGRAPHS[]}
CH3.LEDE, KEY_FINDINGS[], PULLQUOTE
VIA.TOP10[]      { name, score }      · 10 items
VIA.ALL24[]      { name, score, cssClass }   · 24 items (cssClass ∈ "top5"|""|"bot5")
VIA.EVIDENCE[]   { name, definition, rank, freq, salience, salienceClass, achievements }
VIA.VIRTUES_NOTE
CH4.LEDE, PSYCHOMETRICS_PARAS[], SYNTHESIS_PARAS[], KEYFIND.{TITLE,BODY}
OCEAN.DOMAINS[]  { name, pct }   · 5 big-five domains (for bar chart on p9)
OCEAN.PAGE1_DOMAINS[] { name, pct, facets:[{ name, pct }] }   · O, C, E (page 23)
OCEAN.PAGE2_DOMAINS[] { name, pct, first?, facets:[{ name, pct }] } · A, N (page 24)
OCEAN.FACET_NOTE
CH5.LEDE, PRIMARY/SECONDARY.{name, traits, cssClass}, JUNGIAN.{code, spelt},
     AXES[]{label,value,note}, STRENGTHS[], WATCHOUTS[], FIT
CH6.SECTIONS[]{ heading, paragraphs[] }, PULLQUOTE
CH7.PAST[], PRESENT[], PRESENT_PULLQUOTE, FUTURE[], DRIVES[], TMAY_PARAS[]
CH8.DIRECTIONS[]{ heading, paragraphs[] }, CLOSING
APPENDIX.LEDE, VARIANTS[]{ name, for, question }
LIFE_HISTORY.PAGES[] {
   pageNum:"17".."21", showKicker:bool,
   stages:[{ title, ages, entries:[{ title, age, esf, esfClass, body, note? }] }]
}
```

### Enumerated class values

| Field | Allowed |
|---|---|
| `esfClass` | `"sat"` (Satisfying · gold) · `"ful"` (Fulfilling · navy) · `"enj"` (Enjoyable · mist) |
| `salienceClass` | `""` (High — gold pill) · `"med"` (Medium — navy pill) |
| `CH5.PRIMARY.cssClass` / `SECONDARY.cssClass` | `"green"` (Earth Green) · `"blue"` (Cool Blue) · `"red"` · `"yellow"` |
| `VIA.ALL24[].cssClass` | `"top5"` · `""` · `"bot5"` |
| `OCEAN.PAGE2_DOMAINS[].first` | `true` on the first domain of page 24 only (removes the top margin) |

### Numeric fields

- `score` (VIA): integer 0–25
- `pct` (OCEAN domains & facets): integer 0–100 — used verbatim in the `width: ...%` bar styles

## Page count

24 pages, fixed. Page numbers are hard-coded into the footer `<span class="cur">NN</span>` so they stay stable. The only variable region is `LIFE_HISTORY.PAGES[]` which must have **5 entries** (pages 17–21) even if some are sparsely populated.

## Rendering contract

1. Load `lifework-template.html`.
2. Load `lifework.css` alongside it, same folder.
3. Fetch JSON matching the schema above.
4. Apply the three directives (`{{X}}`, `{{#EACH}}`, `{{#IF}}`) — a ~50-line function is enough. See `data.example.json` for shape.
5. Serve or print. For PDF export, use the browser print dialog at A4 portrait — the `@media print` rules in `lifework.css` produce exactly one page per `<section class="page">`.

## Editorial notes

- Long-form prose paragraphs (CHn.PARAGRAPHS, PAST, PRESENT, FUTURE, etc.) **may contain inline HTML** — `<em>`, `<strong>`, `<br/>`, entity references. Escape user input before inserting if you don't trust the source.
- `summary-hero`, `lede`, `keyfind` pullquotes are styled to be short (1–3 sentences). Keep copy tight or the page will overflow on print. On screen, pages expand vertically; on print they are clipped to A4.
- The cover letter (page 1) is the one spot with a persistent, warm, conversational voice. The body chapters use the Sage analytical voice.

## Tangram / logo swaps

To change the mark used in every header, replace `assets/ph-tangram.jpg`. The injector is at the bottom of `lifework-template.html`:

```html
<script>
  document.querySelectorAll('.mark').forEach(el => {
    if (!el.innerHTML.trim()) {
      el.innerHTML = '<img src="assets/ph-tangram.jpg" ... />';
    }
  });
</script>
```

## Colophon

Designed in HTML/CSS with Cormorant Garamond + Inter. Print CSS targets A4 portrait at 96 dpi. No build step required.
