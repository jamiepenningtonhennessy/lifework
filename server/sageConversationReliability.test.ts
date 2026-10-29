import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  MISSING_SAGE_RESPONSE,
  normaliseSageResponseText,
  parseStoredSageMessages,
} from "../shared/sageConversation";

const routerSource = readFileSync(resolve(process.cwd(), "server/routers.ts"), "utf8");
const chatSource = readFileSync(resolve(process.cwd(), "client/src/components/ChatToPeter.tsx"), "utf8");

describe("Sage conversation reliability", () => {
  it("turns an empty provider reply into a safe, visible recovery message", () => {
    expect(normaliseSageResponseText(undefined)).toBe(MISSING_SAGE_RESPONSE);
    expect(normaliseSageResponseText(null)).toBe(MISSING_SAGE_RESPONSE);
    expect(normaliseSageResponseText("   ")).toBe(MISSING_SAGE_RESPONSE);
    expect(normaliseSageResponseText("A direct coaching question.")).toBe("A direct coaching question.");
  });

  it("recovers a legacy Sage message with no content without dropping the surrounding transcript", () => {
    const messages = parseStoredSageMessages(JSON.stringify([
      { role: "client", content: "A meaningful memory", timestamp: 1 },
      { role: "peter", timestamp: 2 },
      { role: "client", content: "More detail", timestamp: 3 },
    ]));

    expect(messages).toEqual([
      { role: "client", content: "A meaningful memory", timestamp: 1 },
      { role: "peter", content: MISSING_SAGE_RESPONSE, timestamp: 2 },
      { role: "client", content: "More detail", timestamp: 3 },
    ]);
  });

  it("rejects broken storage safely instead of allowing a renderer crash", () => {
    expect(parseStoredSageMessages("not valid json")).toEqual([]);
    expect(parseStoredSageMessages(JSON.stringify([{ role: "unknown", content: "x" }]))).toEqual([]);
  });

  it("uses the shared server guard before persisting a provider reply", () => {
    expect(routerSource).toContain('import { normaliseSageResponseText, parseStoredSageMessages } from "../shared/sageConversation";');
    expect(routerSource).toContain("const peterResponse = normaliseSageResponseText(");
    expect(routerSource).toContain("const existingMessages = parseStoredSageMessages(session.messages);");
  });

  it("uses safe content and a message-scoped boundary in the client chat", () => {
    expect(chatSource).toContain('import { normaliseSageResponseText, parseStoredSageMessages } from "@shared/sageConversation";');
    expect(chatSource).toContain("class SageMessageErrorBoundary");
    expect(chatSource).toContain("<SageMessageErrorBoundary content={safeContent}>");
    expect(chatSource).toContain("parseSageMessage(normaliseSageResponseText(content))");
  });
});
