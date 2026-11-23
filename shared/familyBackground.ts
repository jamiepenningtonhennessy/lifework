export const FAMILY_REQUIRED_FIELDS = [
  "fatherOccupation",
  "motherOccupation",
  "siblingPosition",
  "upbringingLocation",
  "familyNarrative",
  "significantInfluences",
] as const;

export type FamilyRequiredField = (typeof FAMILY_REQUIRED_FIELDS)[number];

export const FAMILY_FIELD_LABELS: Record<FamilyRequiredField, string> = {
  fatherOccupation: "Parent / Guardian 1 — Occupation",
  motherOccupation: "Parent / Guardian 2 — Occupation",
  siblingPosition: "Sibling position",
  upbringingLocation: "Upbringing location",
  familyNarrative: "Family background narrative",
  significantInfluences: "Significant influences",
};

/** Structural input shared by persisted records and partially completed drafts. */
export type FamilyBackgroundData = Partial<Record<FamilyRequiredField, string | null>>;

/** Nonblank responses, including explicit unknown/non-disclosure responses, count. */
export function getFamilyBackgroundCompletion(
  data: FamilyBackgroundData | null | undefined,
): { complete: boolean; missingFields: FamilyRequiredField[] } {
  const missingFields = FAMILY_REQUIRED_FIELDS.filter(
    (field) => !data?.[field]?.trim(),
  );
  return { complete: missingFields.length === 0, missingFields };
}
