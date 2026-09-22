export const PSYCHOMETRICS_MIN_ACHIEVEMENTS = 20;

export type SageConversationStatus = "not_started" | "completed";

export type PsychometricsGate = {
  totalEvents: number;
  requiredEvents: number;
  remainingEvents: number;
  hasMinimumEvents: boolean;
  sageConversationCompleted: boolean;
  unlocked: boolean;
  blocker: "events" | "sage_conversation" | null;
};

/**
 * Psychometrics depend on a sufficiently rich life history and a completed
 * Sage conversation. Sage enrichment is useful supplementary analysis, but it
 * is not a client-completion condition: an event can be fully discussed even
 * where the transcript supplies no extra text to write back to that event.
 */
export function getPsychometricsGate(
  totalEvents: number,
  sageStatus: SageConversationStatus | string | null | undefined,
): PsychometricsGate {
  const safeTotal = Math.max(0, totalEvents);
  const hasMinimumEvents = safeTotal >= PSYCHOMETRICS_MIN_ACHIEVEMENTS;
  const sageConversationCompleted = sageStatus === "completed";
  const unlocked = hasMinimumEvents && sageConversationCompleted;

  return {
    totalEvents: safeTotal,
    requiredEvents: PSYCHOMETRICS_MIN_ACHIEVEMENTS,
    remainingEvents: Math.max(0, PSYCHOMETRICS_MIN_ACHIEVEMENTS - safeTotal),
    hasMinimumEvents,
    sageConversationCompleted,
    unlocked,
    blocker: !hasMinimumEvents ? "events" : !sageConversationCompleted ? "sage_conversation" : null,
  };
}
