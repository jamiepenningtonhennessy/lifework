import { describe, expect, it } from "vitest";
import {
  TESTIMONIAL_VIDEO_PLACEHOLDER_COUNT,
  WEBINAR_AGENDA,
  WEBINAR_BOOKING_URL,
  WEBINAR_SESSIONS,
} from "../shared/lifeworkWebinar";

describe("Lifework webinar landing-page content", () => {
  it("contains the two confirmed Lifework webinar sessions without supplementary card detail", () => {
    expect(WEBINAR_SESSIONS).toEqual([
      { title: "An introduction to Lifework", timing: "12:30 BST on 16 September" },
      { title: "An introduction to Lifework", timing: "18:00 BST on 24 September" },
    ]);
  });

  it("uses a transparent interim registration destination and five testimonial slots", () => {
    expect(WEBINAR_BOOKING_URL).toMatch(/^mailto:/);
    expect(TESTIMONIAL_VIDEO_PLACEHOLDER_COUNT).toBe(5);
  });

  it("uses the updated Lifework-focused discussion agenda", () => {
    expect(WEBINAR_AGENDA).toEqual([
      "Why CVs and career ladders are yesterday's solutions to yesterday's organisations.",
      "How the Lifework journey reveals what needs to be present for you to be fully you.",
      "The Lifework process, and how you can benefit from it.",
    ]);
  });
});
