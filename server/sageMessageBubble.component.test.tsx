// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it } from "vitest";
import { SageMessageBubble } from "@/components/ChatToPeter";
import { MISSING_SAGE_RESPONSE } from "../shared/sageConversation";

afterEach(() => cleanup());

describe("SageMessageBubble recovery", () => {
  it("renders a safe recovery reply when a legacy assistant message has no content", () => {
    render(<SageMessageBubble content={undefined as unknown as string} />);

    expect(screen.getByText(MISSING_SAGE_RESPONSE)).toBeInTheDocument();
    expect(screen.queryByText("We could not load this part of Lifework.")).not.toBeInTheDocument();
  });

  it("keeps an ordinary Sage reply readable", () => {
    render(<SageMessageBubble content="[Sage pauses] What did that moment feel like for you?" />);

    expect(screen.getByText("Sage pauses")).toBeInTheDocument();
    expect(screen.getByText("What did that moment feel like for you?")).toBeInTheDocument();
  });
});
