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
  it("contains the two confirmed Lifework webinar sessions without supplementary card detail", () => {
    expect(WEBINAR_SESSIONS).toEqual([
      {
        title: "An introduction to Lifework",
        timing: "12:30 BST on 16 September",
        registrationUrl: "https://us02web.zoom.us/meeting/register/fuGdT3CTTiyJj1Ax1fBPAw",
      },
      {
        title: "An introduction to Lifework",
        timing: "18:00 BST on 24 September",
        registrationUrl: "https://us02web.zoom.us/meeting/register/fPl8rbYYSOCWSS39PHzqYA",
      },
    ]);
  });

  it("uses a transparent interim registration destination", () => {
    expect(WEBINAR_BOOKING_URL).toMatch(/^mailto:/);
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
});
