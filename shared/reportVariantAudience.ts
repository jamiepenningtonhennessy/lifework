/** Audience-specific evidence stays within the standard answer format. */
export type ReportVariantAudience = "student" | "job_returner" | "retirement";

export const VARIANT_AREA_HEADING_RULE = "Do NOT include an outer chapter title. The first ## heading must name the first individual direction or development area, not the chapter.";

const ANSWER_EVIDENCE: Record<ReportVariantAudience, string> = {
  student: 'In those sentences, name 2-3 specific demonstrated capabilities from education, voluntary work, sports, or early experiences. You may begin with "Even at this early stage, I have already shown...". Describe demonstrated capability, not abstract potential or an invented career track record.',
  job_returner: 'In those sentences, name capabilities from the track record before the career break and one evidence-backed strength developed or clarified during the break. You may use "Before my career break, I built a track record in..." and "During that time, I also...". Treat the break as part of the evidence, not an apology or a deficit.',
  retirement: "In those sentences, connect the drivers to a lifetime of accumulated capability and the kinds of contribution, environment, or purpose where you do your best work in the next chapter.",
};

export function reportVariantAnswerTail(audience: ReportVariantAudience): string {
  const question = audience === "retirement"
    ? "the question 'What are you doing now?'"
    : "the interview question 'Tell me about yourself'";
  const future = audience === "retirement"
    ? "A forward-looking statement for this next chapter. What should it draw on? What should it offer?"
    : "A forward-looking statement. What should future roles draw on? What should they offer?";

  return `## Tell Me About Yourself
Introduce with exactly this sentence: "The following is a suggested answer to ${question} — drawn from everything your Lifework analysis has revealed:"

Then write the following structure in the first person (to be spoken by the client). Use exactly two prose paragraphs plus three driver bullets; do not add a third prose paragraph. The introductory sentence above is outside the spoken answer.

Paragraph 1: Open with "I am fundamentally driven by:" then immediately follow with three bullet points (one line each) naming the three core drivers precisely — one short phrase each, drawn directly from the evidence. Specific and distinctive, not generic virtues. Then add 1-2 sentences describing what these drivers have shaped the client for — the kinds of roles, environments, or problems where they do their best work. ${ANSWER_EVIDENCE[audience]}

Paragraph 2 (2-3 sentences): ${future} End with a single sentence of intent.

The whole piece should be readable and speakable in under 60 seconds. Every sentence must earn its place.`;
}
