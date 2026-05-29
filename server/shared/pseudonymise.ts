/**
 * Pseudonymisation utility for Lifework LLM calls.
 *
 * Before any prompt is sent to Claude, replace the client's real name with a
 * neutral token so that no personally identifiable information appears in the
 * API request.  After the LLM response is received, restore the real name in
 * the generated text.
 *
 * Usage:
 *   const { token, restore } = pseudonymise(firstName, lastName);
 *   // Use `token` in prompts instead of the real name.
 *   const rawOutput = await invokeLLM({ ... });
 *   const finalOutput = restore(rawOutput);
 *
 * Design notes:
 * - The token is a deterministic placeholder ("the client") that reads
 *   naturally in prose — Claude will write "the client has demonstrated…"
 *   which is grammatically correct.
 * - `restore()` replaces every occurrence of the token (case-insensitive)
 *   with the real first name so the final report reads personally.
 * - For contexts where only the first name is needed (e.g. counsellor Sage),
 *   pass only firstName.
 * - For contexts where the full name is needed on a PDF cover page, use the
 *   real name directly — PDF rendering never goes through the LLM.
 */

export const PSEUDONYM_TOKEN = "the client";
export const PSEUDONYM_TOKEN_UPPER = "The Client";

export interface PseudonymHandle {
  /** Use this token in place of the real name inside LLM prompts. */
  token: string;
  /** Capitalised version for sentence-start positions. */
  tokenUpper: string;
  /** Call this on any LLM-generated text to restore the real first name. */
  restore: (text: string) => string;
  /** Call this on any LLM-generated text to restore the real full name. */
  restoreFull: (text: string) => string;
}

/**
 * Create a pseudonym handle for a client.
 *
 * @param firstName  Client's first name (may be undefined/empty).
 * @param lastName   Client's last name (optional).
 */
export function pseudonymise(
  firstName: string | null | undefined,
  lastName?: string | null | undefined
): PseudonymHandle {
  const first = (firstName ?? "").trim();
  const last = (lastName ?? "").trim();
  const fullName = [first, last].filter(Boolean).join(" ");

  const restore = (text: string): string => {
    if (!first) return text;
    // Replace token with real first name, preserving capitalisation context
    return text
      .replace(new RegExp(PSEUDONYM_TOKEN_UPPER, "g"), first)
      .replace(new RegExp(PSEUDONYM_TOKEN, "g"), first.toLowerCase() === first ? first : first);
  };

  const restoreFull = (text: string): string => {
    if (!fullName) return text;
    return text
      .replace(new RegExp(PSEUDONYM_TOKEN_UPPER, "g"), fullName)
      .replace(new RegExp(PSEUDONYM_TOKEN, "g"), fullName);
  };

  return {
    token: PSEUDONYM_TOKEN,
    tokenUpper: PSEUDONYM_TOKEN_UPPER,
    restore,
    restoreFull,
  };
}
