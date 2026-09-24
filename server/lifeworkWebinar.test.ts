import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  WEBINAR_AGENDA,
  WEBINAR_BOOKING_URL,
  WEBINAR_SESSIONS,
} from "../shared/lifeworkWebinar";

const webinarPageSource = readFileSync(
  resolve(process.cwd(), "client/src/pages/LifeworkWebinar.tsx"),
  "utf8",
);

describe("Lifework webinar landing-page content", () => {
  it("contains the four October Lifework webinar sessions with interim registration destinations", () => {
    expect(WEBINAR_SESSIONS).toEqual([
      {
        title: "An introduction to Lifework",
        timing: "12:30 BST on 6 October",
        registrationUrl: WEBINAR_BOOKING_URL,
      },
      {
        title: "An introduction to Lifework",
        timing: "18:00 BST on 6 October",
        registrationUrl: WEBINAR_BOOKING_URL,
      },
      {
        title: "An introduction to Lifework",
        timing: "12:30 BST on 22 October",
        registrationUrl: WEBINAR_BOOKING_URL,
      },
      {
        title: "An introduction to Lifework",
        timing: "18:00 BST on 22 October",
        registrationUrl: WEBINAR_BOOKING_URL,
      },
    ]);
  });

  it("uses a transparent interim registration destination", () => {
    expect(WEBINAR_BOOKING_URL).toBe("mailto:jamie@lifeworkpath.com?subject=Lifework%20October%20webinar%20registration");
  });

  it("uses the updated Lifework-focused discussion agenda", () => {
    expect(WEBINAR_AGENDA).toEqual([
      "Why CVs and career ladders are yesterday's solutions to yesterday's organisations.",
      "How the Lifework journey reveals what needs to be present for you to be fully you.",
      "The Lifework process, and how you can benefit from it.",
    ]);
  });

  it("draws public feedback from the webinar-specific approved placement list", () => {
    expect(webinarPageSource).toContain('publicForPage.useQuery({ pageKey: "webinar" })');
  });

  it("places the full booking module before the Lifework introduction and repeats it at the page end", () => {
    const firstBookingIndex = webinarPageSource.indexOf('<WebinarBookingModule id="reserve" />');
    const introductionIndex = webinarPageSource.indexOf('<section id="main-content"');
    const finalBookingIndex = webinarPageSource.lastIndexOf("<WebinarBookingModule />");
    const footerIndex = webinarPageSource.indexOf("<footer");
    const bookingModuleUses = webinarPageSource.match(/<WebinarBookingModule(?: id="reserve")? \/>/g) ?? [];

    expect(bookingModuleUses).toHaveLength(2);
    expect(firstBookingIndex).toBeGreaterThan(-1);
    expect(firstBookingIndex).toBeLessThan(introductionIndex);
    expect(finalBookingIndex).toBeGreaterThan(introductionIndex);
    expect(finalBookingIndex).toBeLessThan(footerIndex);
    expect(webinarPageSource).not.toContain('<GoldButton href="#reserve">Request a place</GoldButton>');
  });

  it("places each Request a place action directly beside its session time", () => {
    expect(webinarPageSource).toContain('All four sessions offer the same introduction to Lifework.');
    expect(webinarPageSource).toContain('Live online webinars · 6th & 22nd October 2026');
    expect(webinarPageSource).toContain('View the October sessions');
    expect(webinarPageSource).toContain('flex flex-wrap items-center gap-x-5 gap-y-3 text-sm');

    const sessionTimingIndex = webinarPageSource.indexOf('{session.timing}');
    const requestPlaceIndex = webinarPageSource.indexOf('Request a place', sessionTimingIndex);
    expect(sessionTimingIndex).toBeGreaterThan(-1);
    expect(requestPlaceIndex).toBeGreaterThan(sessionTimingIndex);
  });
});
