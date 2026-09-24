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
        registrationUrl: "https://us02web.zoom.us/meeting/register/NpjpJ7hIR9K9ueQCqlWFmA",
      },
      {
        title: "An introduction to Lifework",
        timing: "18:00 BST on 6 October",
        registrationUrl: "https://us02web.zoom.us/meeting/register/fYzJ1jWhR_eWipnCf4f3zQ",
      },
      {
        title: "An introduction to Lifework",
        timing: "12:30 BST on 22 October",
        registrationUrl: "https://us02web.zoom.us/meeting/register/ZP01ENWWR_aagFOe0zKvdw",
      },
      {
        title: "An introduction to Lifework",
        timing: "18:00 BST on 22 October",
        registrationUrl: "https://us02web.zoom.us/meeting/register/tQZi33I6SPeA3rneUdyr0w",
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

  it("uses one booking module between the agenda and testimonials", () => {
    const agendaIndex = webinarPageSource.indexOf('<section id="main-content" className="wb-section wb-agenda-section">');
    const bookingIndex = webinarPageSource.indexOf('<WebinarBookingModule id="reserve" number="02" />');
    const testimonialIndex = webinarPageSource.indexOf('<section className="wb-section wb-testimonials">');
    const footerIndex = webinarPageSource.indexOf("<footer");
    const bookingModuleUses = webinarPageSource.match(/<WebinarBookingModule id="reserve" number="02" \/>/g) ?? [];

    expect(bookingModuleUses).toHaveLength(1);
    expect(agendaIndex).toBeGreaterThan(-1);
    expect(agendaIndex).toBeLessThan(bookingIndex);
    expect(bookingIndex).toBeLessThan(testimonialIndex);
    expect(testimonialIndex).toBeLessThan(footerIndex);
    expect(webinarPageSource).not.toContain('<WebinarBookingModule number="06" />');
  });

  it("places each Request a place action directly beside its session time", () => {
    expect(webinarPageSource).toContain('All four sessions offer the same introduction to Lifework.');
    expect(webinarPageSource).toContain('View the October sessions');
    expect(webinarPageSource).toContain('className="wb-session-meta"');

    const sessionTimingIndex = webinarPageSource.indexOf('{session.timing}');
    const requestPlaceIndex = webinarPageSource.indexOf('Request a place', sessionTimingIndex);
    expect(sessionTimingIndex).toBeGreaterThan(-1);
    expect(requestPlaceIndex).toBeGreaterThan(sessionTimingIndex);
  });

  it("uses the current warm-paper Lifework editorial system", () => {
    expect(webinarPageSource).toContain('className="lw-webinar"');
    expect(webinarPageSource).toContain('--wb-paper: #f6f1e9');
    expect(webinarPageSource).toContain('--wb-paper-deep: #eee5d5');
    expect(webinarPageSource).toContain('--wb-navy: #1a2744');
    expect(webinarPageSource).toContain('--wb-gold: #b8862f');
    expect(webinarPageSource).toContain('"Cormorant Garamond"');
    expect(webinarPageSource).toContain('"Libre Franklin"');
    expect(webinarPageSource).toContain('className="wb-shell wb-header"');
    expect(webinarPageSource).toContain('className="wb-section wb-booking"');
    expect(webinarPageSource).toContain('className="wb-section wb-testimonials"');
    expect(webinarPageSource).toContain('Career Analysis · Positive Psychology');
    expect(webinarPageSource).not.toContain('var(--lw-navy-mid)');
    expect(webinarPageSource).not.toContain('A Pennington Hennessy service');
  });

  it("uses the requested three-module agenda-to-booking-to-testimonial flow", () => {
    const agendaIndex = webinarPageSource.indexOf('<section id="main-content" className="wb-section wb-agenda-section">');
    const bookingIndex = webinarPageSource.indexOf('<WebinarBookingModule id="reserve" number="02" />');
    const testimonialIndex = webinarPageSource.indexOf('<section className="wb-section wb-testimonials">');

    expect(agendaIndex).toBeLessThan(bookingIndex);
    expect(bookingIndex).toBeLessThan(testimonialIndex);
    expect(webinarPageSource).toContain('SectionRail number="01" label="In the webinar"');
    expect(webinarPageSource).toContain('<WebinarBookingModule id="reserve" number="02" />');
    expect(webinarPageSource).toContain('SectionRail number="03" label="What people say"');
    expect(webinarPageSource).not.toContain('<section className="wb-hero">');
    expect(webinarPageSource).not.toContain('We look at the person');
    expect(webinarPageSource).not.toContain('SectionRail number="04"');
  });
});
