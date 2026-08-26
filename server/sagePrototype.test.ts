import { describe, expect, it } from "vitest";
import { buildSagePrototypeMessages, deriveQuestionLimit, SAGE_PROTOTYPE_SYSTEM_PROMPT } from "./routers/sagePrototype";

describe("Sage coaching prototype prompt", () => {
  it("uses a varied coach-like prompt rather than the legacy stage-direction format", () => {
    expect(SAGE_PROTOTYPE_SYSTEM_PROMPT).toContain("reflective coaching companion");
    expect(SAGE_PROTOTYPE_SYSTEM_PROMPT).toContain("do not use stage directions");
    expect(SAGE_PROTOTYPE_SYSTEM_PROMPT).toContain("Do not use the same type of question twice in succession");
    expect(SAGE_PROTOTYPE_SYSTEM_PROMPT).toContain("Enjoyable, Satisfying and Fulfilling");
    expect(SAGE_PROTOTYPE_SYSTEM_PROMPT).toContain("Ask only one clear question at a time");
    expect(SAGE_PROTOTYPE_SYSTEM_PROMPT).toContain("QUESTION FIRST, INTERPRET LATER");
    expect(SAGE_PROTOTYPE_SYSTEM_PROMPT).toContain("do not front-load an interpretation");
    expect(SAGE_PROTOTYPE_SYSTEM_PROMPT).toContain("Your entire first reply must be one clear, experience-near coaching question and nothing else");
    expect(SAGE_PROTOTYPE_SYSTEM_PROMPT).toContain("do not add “I wonder whether…”");
  });

  it("keeps client input after the server-side prototype instructions", () => {
    const messages = buildSagePrototypeMessages([{ role: "user", content: "At eight, I built a den." }], ["enjoyable", "fulfilling"], 4, false);

    expect(messages).toHaveLength(2);
    expect(messages[0]).toMatchObject({ role: "system" });
    expect(messages[0].content).toContain(SAGE_PROTOTYPE_SYSTEM_PROMPT);
    expect(messages[0].content).toContain("ACTIVITY CLASSIFICATION (selected by the person): Enjoyable + Fulfilling");
    expect(messages[0].content).toContain("QUESTION BUDGET: 4 questions maximum");
    expect(messages[1]).toEqual({ role: "user", content: "At eight, I built a den." });
  });

  it("uses a deterministic varied budget between three and five questions", () => {
    const first = deriveQuestionLimit("At eight, I built a den.", ["enjoyable"]);
    const repeat = deriveQuestionLimit("At eight, I built a den.", ["enjoyable"]);
    const alternative = deriveQuestionLimit("I organised a school play.", ["satisfying", "fulfilling"]);

    expect(first).toBe(repeat);
    expect([3, 4, 5]).toContain(first);
    expect([3, 4, 5]).toContain(alternative);
  });

  it("instructs Sage to close rather than ask another question when the budget is reached", () => {
    const messages = buildSagePrototypeMessages([
      { role: "user", content: "At eight, I built a den." },
      { role: "assistant", content: "What drew you to it?" },
      { role: "user", content: "It felt private." },
      { role: "assistant", content: "What did private mean then?" },
      { role: "user", content: "It was mine." },
      { role: "assistant", content: "What mattered about that?" },
      { role: "user", content: "I could make the rules." },
    ], ["enjoyable"], 3, true);

    expect(messages[0].content).toContain("The question budget has now been reached. Close this activity without asking a question.");
  });
});
