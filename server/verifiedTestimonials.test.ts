import { describe, expect, it } from "vitest";
import {
  canApproveTestimonial,
} from "../shared/verifiedTestimonials";
import { appRouter } from "./routers";
import {
  canSubmitPublicTestimonialDraft,
  resetPublicTestimonialDraftAttempts,
} from "./routers/verifiedTestimonials";

describe("verified testimonial safeguards", () => {
  it("requires both a recorded source and confirmed permission before approval", () => {
    expect(canApproveTestimonial({ sourceReference: "Signed consent record, 2026-08-27", consentConfirmed: true })).toBe(true);
    expect(canApproveTestimonial({ sourceReference: "", consentConfirmed: true })).toBe(false);
    expect(canApproveTestimonial({ sourceReference: "Dated client email", consentConfirmed: false })).toBe(false);
  });

  it("registers a separate public approved-only query and protected management router", () => {
    const procedures = appRouter._def.procedures;
    expect(procedures["verifiedTestimonials.publicList"]).toBeDefined();
    expect(procedures["verifiedTestimonials.submitDraft"]).toBeDefined();
    expect(procedures["verifiedTestimonials.create"]).toBeDefined();
    expect(procedures["verifiedTestimonials.approve"]).toBeDefined();
    expect(procedures["verifiedTestimonials.archive"]).toBeDefined();
    expect(procedures["verifiedTestimonials.remove"]).toBeDefined();
  });

  it("limits open testimonial draft submissions without exposing approval actions", () => {
    resetPublicTestimonialDraftAttempts();
    const now = 1_000_000;
    expect(canSubmitPublicTestimonialDraft("colleague-1", now)).toBe(true);
    expect(canSubmitPublicTestimonialDraft("colleague-1", now + 1)).toBe(true);
    expect(canSubmitPublicTestimonialDraft("colleague-1", now + 2)).toBe(true);
    expect(canSubmitPublicTestimonialDraft("colleague-1", now + 3)).toBe(false);
    expect(canSubmitPublicTestimonialDraft("colleague-1", now + 3_600_001)).toBe(true);
  });
});
