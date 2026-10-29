export type SageConversationRole = "peter" | "client";

export type SageConversationMessage = {
  role: SageConversationRole;
  content: string;
  timestamp: number;
};

/**
 * Used when the AI provider accepted a turn but returned no usable text. It is
 * deliberately plain text so it is safe to render in a chat bubble and clear
 * that the client's preceding contribution has not been lost.
 */
export const MISSING_SAGE_RESPONSE =
  "I’m sorry — I was unable to complete my last response. Your previous message is safely saved. Please continue when you’re ready, or ask me to return to that point.";

export const MISSING_CLIENT_MESSAGE =
  "[A previous client message could not be restored.]";

export function normaliseSageResponseText(value: unknown): string {
  if (typeof value === "string" && value.trim().length > 0) {
    return value;
  }

  return MISSING_SAGE_RESPONSE;
}

function normaliseTimestamp(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

/**
 * Treat persisted chat history as untrusted input. Older sessions may contain
 * a partially written message after an upstream model failure; recover the
 * surrounding conversation rather than allowing a missing content field to
 * crash the client or contaminate the next model request.
 */
export function parseStoredSageMessages(serialized: string | null | undefined): SageConversationMessage[] {
  try {
    const parsed: unknown = JSON.parse(serialized || "[]");
    if (!Array.isArray(parsed)) return [];

    return parsed.flatMap((message): SageConversationMessage[] => {
      if (!message || typeof message !== "object") return [];

      const candidate = message as {
        role?: unknown;
        content?: unknown;
        timestamp?: unknown;
      };

      if (candidate.role !== "peter" && candidate.role !== "client") return [];

      return [{
        role: candidate.role,
        content: candidate.role === "peter"
          ? normaliseSageResponseText(candidate.content)
          : typeof candidate.content === "string" && candidate.content.trim().length > 0
            ? candidate.content
            : MISSING_CLIENT_MESSAGE,
        timestamp: normaliseTimestamp(candidate.timestamp),
      }];
    });
  } catch {
    return [];
  }
}
