import { describe, expect, it } from "vitest";
import { withoutInterviewAnswerInFuture } from "../shared/reportConclusions";

describe("withoutInterviewAnswerInFuture", () => {
  it("removes a duplicated interview answer from the Future narrative", () => {
    const future = [
      "The future direction should build on the evidence already gathered.",
      "The following is a suggested answer to the interview question 'Tell me about yourself'.",
      "I am fundamentally driven by: creative work, independence and contribution.",
      "This answer belongs only in the highlighted conclusion panel.",
    ];

    expect(withoutInterviewAnswerInFuture(future)).toEqual([
      "The future direction should build on the evidence already gathered.",
    ]);
  });

  it("keeps a normal Future narrative intact when it contains no answer marker", () => {
    const future = [
      "The next role should combine thoughtful preparation with visible contribution.",
      "A deliberate transition gives the evidence room to become action.",
    ];

    expect(withoutInterviewAnswerInFuture(future)).toEqual(future);
  });
});
