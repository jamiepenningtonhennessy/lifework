/** Shared by WOW authoring and prose rewrites; does not alter scores or layout. */
export const REPORT_SCORE_ATTRIBUTION_RULE = `ASSESSMENT SCORE ATTRIBUTION — apply to every numerical score cited in report prose:
- Explicitly identify each OCEAN domain or facet score as OCEAN, and each VIA character-strength score as VIA, beside the individual score. This applies even in a chapter devoted to just one assessment; a chapter heading or a label elsewhere is not enough.
- For example: "your OCEAN Extraversion score of 78 and your VIA Curiosity score of 23". Another concise form is "Extraversion (OCEAN: 78)" or "Curiosity (VIA: 23)". Examples illustrate wording only; never copy these numbers unless they are in this client's data.
- Identify the source, not the scale: do not add denominators or explanations of score ranges to narrative citations. Do not compare the raw magnitudes of OCEAN and VIA scores as though they share a scale.
- Preserve the supplied values exactly. Do not invent scores, convert or rescale them, confuse VIA ranks with scores, or label life-history counts, ages, dates or other numbers as assessment scores.
- During any style rewrite or paragraph deduplication, retain or restore the assessment label beside every cited score. Leave existing structured tables, chart data and their scale labels unchanged.`;

export function withReportScoreAttribution(systemPrompt: string): string {
  return systemPrompt.includes(REPORT_SCORE_ATTRIBUTION_RULE)
    ? systemPrompt
    : `${systemPrompt}\n\n${REPORT_SCORE_ATTRIBUTION_RULE}`;
}
