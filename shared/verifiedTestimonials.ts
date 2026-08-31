export const TESTIMONIAL_QUOTE_LIMIT = 5_000;
export const TESTIMONIAL_ATTRIBUTION_LIMIT = 160;
export const TESTIMONIAL_SOURCE_REFERENCE_LIMIT = 2_000;

export const TESTIMONIAL_PAGE_OPTIONS = [
  { key: "webinar", label: "Webinar page" },
  { key: "lifework_home", label: "Lifework home page" },
] as const;

export const TESTIMONIAL_PAGE_KEYS = TESTIMONIAL_PAGE_OPTIONS.map((page) => page.key) as [
  (typeof TESTIMONIAL_PAGE_OPTIONS)[number]["key"],
  ...(typeof TESTIMONIAL_PAGE_OPTIONS)[number]["key"][],
];

export type TestimonialPageKey = (typeof TESTIMONIAL_PAGE_OPTIONS)[number]["key"];

export type TestimonialApprovalInput = {
  sourceReference: string;
  consentConfirmed: boolean;
};

export function canApproveTestimonial(input: TestimonialApprovalInput): boolean {
  return input.consentConfirmed && input.sourceReference.trim().length > 0;
}
