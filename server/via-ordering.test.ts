import { describe, expect, it } from "vitest";
import { getViaQuestionsForClient, scoreVia, VIA_QUESTIONS } from "../shared/via-data";

describe("VIA question ordering", () => {
  it("returns every question exactly once in a stable client-specific order", () => {
    const firstOrder = getViaQuestionsForClient(101);
    const returnedOrder = getViaQuestionsForClient(101);

    expect(firstOrder).toHaveLength(VIA_QUESTIONS.length);
    expect(firstOrder.map((question) => question.id)).toEqual(returnedOrder.map((question) => question.id));
    expect(new Set(firstOrder.map((question) => question.id))).toEqual(
      new Set(VIA_QUESTIONS.map((question) => question.id))
    );
    expect(firstOrder.map((question) => question.id)).not.toEqual(VIA_QUESTIONS.map((question) => question.id));
    expect(firstOrder.every((question, index) => index === 0 || question.strengthId !== firstOrder[index - 1]?.strengthId)).toBe(true);
  });

  it("gives different clients distinct question sequences", () => {
    expect(getViaQuestionsForClient(101).map((question) => question.id)).not.toEqual(
      getViaQuestionsForClient(202).map((question) => question.id)
    );
  });

  it("keeps every tested client order fully mixed across adjacent questions", () => {
    for (let clientId = 1; clientId <= 100; clientId += 1) {
      const questions = getViaQuestionsForClient(clientId);
      expect(questions).toHaveLength(120);
      expect(questions.every((question, index) => index === 0 || question.strengthId !== questions[index - 1]?.strengthId)).toBe(true);
    }
  });

  it("preserves the question identifiers used by the strength scoring", () => {
    const answers = Object.fromEntries(VIA_QUESTIONS.map((question) => [question.id, (question.id % 5) + 1]));
    const shuffledQuestionIds = new Set(getViaQuestionsForClient(101).map((question) => question.id));

    expect(Object.keys(answers).every((questionId) => shuffledQuestionIds.has(Number(questionId)))).toBe(true);
    expect(scoreVia(answers)).toHaveLength(24);
  });
});
