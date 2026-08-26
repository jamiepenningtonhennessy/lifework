import { describe, expect, it } from "vitest";
import { buildSagePrototypeMessages, SAGE_PROTOTYPE_SYSTEM_PROMPT } from "./routers/sagePrototype";

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
    const messages = buildSagePrototypeMessages([{ role: "user", content: "At eight, I built a den." }]);

    expect(messages).toHaveLength(2);
    expect(messages[0]).toMatchObject({ role: "system", content: SAGE_PROTOTYPE_SYSTEM_PROMPT });
    expect(messages[1]).toEqual({ role: "user", content: "At eight, I built a den." });
  });
});
