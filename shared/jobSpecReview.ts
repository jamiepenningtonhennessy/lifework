export const MAX_JOB_SPEC_BYTES = 10 * 1024 * 1024;
export const MAX_JOB_SPEC_REVIEWS_PER_CLIENT = 10;

export const JOB_SPEC_ACCEPTED_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
] as const;

export type JobSpecFeedback = {
  roleTitle: string;
  organisation: string;
  overallFit: "strong" | "promising" | "stretch" | "limited-evidence";
  fitSummary: string;
  evidenceToLeadWith: string[];
  alignment: Array<{ requirement: string; clientEvidence: string; assessment: "strong" | "partial" | "not-yet-evidenced" }>;
  questionsToClarify: string[];
  positioningAdvice: string;
  importantCaution: string;
};

export function hasRoomForAnotherJobSpec(existingCount: number): boolean {
  return existingCount < MAX_JOB_SPEC_REVIEWS_PER_CLIENT;
}
