import { describe, expect, it } from "vitest";
import { ALISTAIR_CONVERSATION_PANEL_CLASS, ALISTAIR_MESSAGE_BUBBLE_CLASS } from "../shared/alistairLayout";

describe("Alistair responsive conversation layout", () => {
  it("uses a wide desktop panel and constrains individual message bubbles to a readable half-width", () => {
    expect(ALISTAIR_CONVERSATION_PANEL_CLASS).toContain("max-w-6xl");
    expect(ALISTAIR_MESSAGE_BUBBLE_CLASS).toContain("md:max-w-[62%]");
    expect(ALISTAIR_MESSAGE_BUBBLE_CLASS).toContain("max-w-[88%]");
  });
});
