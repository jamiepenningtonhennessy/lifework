import { describe, expect, it } from "vitest";
import { MAX_JOB_SPEC_REVIEWS_PER_CLIENT, hasRoomForAnotherJobSpec } from "../shared/jobSpecReview";

describe("job specification review capacity", () => {
  it("allows a client to retain up to ten job specifications", () => {
    expect(hasRoomForAnotherJobSpec(0)).toBe(true);
    expect(hasRoomForAnotherJobSpec(MAX_JOB_SPEC_REVIEWS_PER_CLIENT - 1)).toBe(true);
  });

  it("requires a deletion before storing an eleventh review", () => {
    expect(hasRoomForAnotherJobSpec(MAX_JOB_SPEC_REVIEWS_PER_CLIENT)).toBe(false);
  });
});
