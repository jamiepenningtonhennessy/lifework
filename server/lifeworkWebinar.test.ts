import { describe, expect, it } from "vitest";
import {
  TESTIMONIAL_VIDEO_PLACEHOLDER_COUNT,
  WEBINAR_BOOKING_URL,
  WEBINAR_SESSIONS,
} from "../shared/lifeworkWebinar";

describe("Lifework webinar landing-page content", () => {
  it("contains two clearly marked September session placeholders", () => {
    expect(WEBINAR_SESSIONS).toHaveLength(2);
    expect(WEBINAR_SESSIONS.every((session) => session.timing.includes("September 2026"))).toBe(true);
  });

  it("uses a transparent interim registration destination and five testimonial slots", () => {
    expect(WEBINAR_BOOKING_URL).toMatch(/^mailto:/);
    expect(TESTIMONIAL_VIDEO_PLACEHOLDER_COUNT).toBe(5);
  });
});
