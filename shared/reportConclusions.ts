/**
 * The report’s interview answer belongs only in the final highlighted panel.
 * Some model responses omit the expected Markdown heading, causing that answer
 * to be parsed as part of the preceding Future narrative. Stop Future at the
 * first unmistakable answer marker without rewriting any of the retained prose.
 */
export function withoutInterviewAnswerInFuture(paragraphs: string[]): string[] {
  const answerStart = paragraphs.findIndex((paragraph) => {
    const normalized = paragraph
      .replace(/[*_#>`]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();

    return (
      normalized.includes("tell me about yourself") ||
      normalized.includes("i am fundamentally driven by") ||
      (normalized.includes("suggested answer") && normalized.includes("interview question"))
    );
  });

  return answerStart === -1 ? paragraphs : paragraphs.slice(0, answerStart);
}
