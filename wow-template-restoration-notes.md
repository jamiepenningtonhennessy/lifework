# WOW Report Template Restoration Notes

## Reference reviewed
- Source: `/home/ubuntu/upload/WOW-Report-David.pdf`
- Initial visual review completed for pages 1–5.

## Reusable brand/template elements observed so far
- The report uses a **highly restrained editorial layout** with generous cream-white space and sharp rectangular geometry.
- Typography is **serif-led for identity moments** and restrained sans-serif/body copy for long-form reading.
- Gold is used as a **selective accent**, not a dominant fill: small labels, section subheads, and fine brand marks.
- The cover treatment is minimal: centred client name/date, with the Lifework logo positioned low/right and ample negative space.
- Interior pages use a **small running header** at top left (`LIFEWORK CAREER ANALYSIS`) and a right-aligned client name at top right.
- Footer treatment is subtle: small `Pennington Hennessy` at lower left and page number at lower right.
- Section headings are clean, text-led, and understated rather than boxed or heavily decorated.
- Secondary subsection headings appear in gold and provide the main visual rhythm inside dense text pages.
- Overall impression: **calm, premium, paper-like, editorial, and intellectually serious** rather than sales-led or corporate-web styled.

## Likely website elements that may have drifted away from this template
- Overly conventional website navigation styling that feels more like the Pennington Hennessy site than the report.
- Loss of the report's minimalist spacing, quiet headers, and subtle gold annotation language.
- Missing page-frame cues such as small editorial labels, quiet top bars, and understated footer signatures.
- Website surfaces may currently feel more like a standard landing page than an extension of the report document system.

## Additional findings from pages 6–10
- The report sustains a **consistent editorial frame** across internal pages rather than changing layout system section by section.
- Long-form text is broken with measured pull-quote style emphasis, section labels, and disciplined column width, which keeps pages calm and readable.
- Gold is functioning more like an **annotation layer** than a brand stripe; it marks transitions, fine rules, and sub-section captions.
- The page architecture suggests the site should favour **quiet typographic sections with narrow readable measures**, rather than oversized marketing cards or broad utility-nav patterns.
- The visual system feels closer to a **designed report microsite** than to a general consultancy website; restoring it likely means simplifying the top navigation and introducing more editorial framing around headings and section intros.

## Authoritative Claude Design source
The user supplied `/home/ubuntu/upload/lifework-report-modern-counsel.ts`, a drop-in replacement for the active HTML report endpoint (`GET /api/report/html/:clientId`). Its header explicitly states that data bindings, report structure, template engine, authorisation, and `buildClaudeExportJson` remain unchanged; only the CSS and markup are redesigned. This makes it an appropriate source to reinstate rather than reinterpreting the PDF visually.

The supplied template is called **Modern Counsel**. It uses a navy-and-gold structural report system with **Libre Franklin** for primary typography and **IBM Plex Mono** for labels, data, page furniture, and rules. Each A4-like page is a discrete `794 × 1123px` paper panel. Reusable design primitives include: navy running header bands; small mono page metadata; restrained bottom footer bands; a 120px left structural rail with chapter number and label; gold rules; large sans-serif chapter titles; disciplined narrow text measure; and navy full-page dividers for major data sections.

The supplied renderer is designed for the existing HTML-report pipeline. It includes the existing token engine (`renderTemplate`), supports all current `{{TOKEN}}`, `{{#IF}}`, and `{{#EACH}}` bindings, calls the existing `buildClaudeExportJson`, and has an existing authenticated Express handler. The sensible restoration path is therefore to compare the uploaded file against the active `server/html-report.ts` and restore the supplied CSS/template while preserving current project imports and route registration.
