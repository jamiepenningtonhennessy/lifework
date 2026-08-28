export const TESTIMONIAL_QUOTE_LIMIT = 5_000;
export const TESTIMONIAL_ATTRIBUTION_LIMIT = 160;
export const TESTIMONIAL_SOURCE_REFERENCE_LIMIT = 2_000;

export type TestimonialApprovalInput = {
  sourceReference: string;
  consentConfirmed: boolean;
};

export function canApproveTestimonial(input: TestimonialApprovalInput): boolean {
  return input.consentConfirmed && input.sourceReference.trim().length > 0;
}
