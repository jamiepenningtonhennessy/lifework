import { getFamilyBackgroundCompletion, type FamilyBackgroundData } from "./familyBackground";

export const PSYCHOMETRICS_MIN_ACHIEVEMENTS = 20;

export type SageConversationStatus = "not_started" | "completed";

export type PsychometricsGate = {
  totalEvents: number;
  requiredEvents: number;
  remainingEvents: number;
  hasMinimumEvents: boolean;
  sageConversationCompleted: boolean;
  familyBackgroundCompleted: boolean;
  unlocked: boolean;
  blocker: "events" | "sage_conversation" | "family_background" | null;
};

/**
 * New psychometrics require a rich life history, a saved Sage conversation and
 * all six family-background responses. CV/career data and Sage enrichment are
 * supplementary, not completion conditions. This gate does not restrict reads
 * of existing questionnaire results or reports.
 */
export function getPsychometricsGate(
  totalEvents: number,
  sageStatus: SageConversationStatus | string | null | undefined,
  family?: FamilyBackgroundData | null,
): PsychometricsGate {
  const safeTotal = Math.max(0, totalEvents);
  const hasMinimumEvents = safeTotal >= PSYCHOMETRICS_MIN_ACHIEVEMENTS;
  const sageConversationCompleted = sageStatus === "completed";
  const familyBackgroundCompleted = getFamilyBackgroundCompletion(family).complete;
  const unlocked = hasMinimumEvents && sageConversationCompleted && familyBackgroundCompleted;

  return {
    totalEvents: safeTotal,
    requiredEvents: PSYCHOMETRICS_MIN_ACHIEVEMENTS,
    remainingEvents: Math.max(0, PSYCHOMETRICS_MIN_ACHIEVEMENTS - safeTotal),
    hasMinimumEvents,
    sageConversationCompleted,
    familyBackgroundCompleted,
    unlocked,
    blocker: !hasMinimumEvents ? "events" : !sageConversationCompleted ? "sage_conversation" : !familyBackgroundCompleted ? "family_background" : null,
  };
}
