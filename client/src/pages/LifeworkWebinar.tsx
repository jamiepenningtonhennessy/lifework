import { useState } from "react";
import { CalendarDays, ChevronDown, Mail, Quote } from "lucide-react";
import {
  WEBINAR_AGENDA,
  WEBINAR_SESSIONS,
} from "@shared/lifeworkWebinar";
import { lifeworkLandingPath } from "@/lib/lifeworkDomain";
import { trpc } from "@/lib/trpc";

function SectionRail({ number, label, sublabel }: { number: string; label: string; sublabel: string }) {
  return (
    <aside className="wb-section-rail" aria-hidden="true">
      <div className="wb-rail-number">{number}</div>
      <div className="wb-rail-label">{label}</div>
      <div className="wb-rail-sublabel">{sublabel}</div>
    </aside>
  );
}

function WebinarBookingModule({ id, number }: { id?: string; number: string }) {
  return (
    <section id={id} className="wb-section wb-booking">
      <div className="wb-shell wb-section-grid">
        <SectionRail number={number} label="October webinars" sublabel="Choose your session" />
        <div className="wb-section-main">
          <div className="wb-kicker">October webinars</div>
          <h2 className="wb-section-heading">Choose the session<br /><em>that suits you.</em></h2>
          <p className="wb-copy wb-booking-intro">All four sessions offer the same introduction to Lifework.</p>
          <div className="wb-session-grid">
            {WEBINAR_SESSIONS.map((session) => (
              <article key={session.timing} className="wb-session-card">
                <h3>{session.title}</h3>
                <div className="wb-session-meta">
                  <span className="wb-session-time">
                    <CalendarDays size={16} aria-hidden="true" />
                    {session.timing}
                  </span>
                  <a className="wb-session-link" href={session.registrationUrl}>
                    <Mail size={15} aria-hidden="true" />
                    Request a place
                  </a>
                </div>
              </article>
            ))}
          </div>
          <p className="wb-booking-note">Places are limited. Request a place in the session that suits you.</p>
        </div>
      </div>
    </section>
  );
}

export default function LifeworkWebinar() {
  const [expandedAgenda, setExpandedAgenda] = useState<number | null>(0);
  const homeHref = lifeworkLandingPath();
  const { data: approvedTestimonials, isLoading: isLoadingTestimonials } = trpc.verifiedTestimonials.publicForPage.useQuery({ pageKey: "webinar" });

  return (
    <main className="lw-webinar">
      <style>{webinarCss}</style>
      <a href="#main-content" className="wb-skip-link">Skip to content</a>

      <header className="wb-shell wb-header">
        <a href={homeHref} className="wb-wordmark" aria-label="Lifework home">Life<em>work</em></a>
        <div className="wb-running-title">Career Analysis · Positive Psychology</div>
        <a className="wb-sign-in" href="#reserve">View the October sessions</a>
      </header>

      <section id="main-content" className="wb-section wb-agenda-section">
        <div className="wb-shell wb-section-grid">
          <SectionRail number="01" label="In the webinar" sublabel="An honest conversation" />
          <div className="wb-section-main">
            <div className="wb-kicker">In the webinar</div>
            <h2 className="wb-section-heading">What we will<br /><em>explore together.</em></h2>
            <p className="wb-copy wb-agenda-intro">A live, practical introduction—not a generic career-planning lecture.</p>
            <div className="wb-agenda-list">
              {WEBINAR_AGENDA.map((item, index) => {
                const isExpanded = expandedAgenda === index;
                return (
                  <article key={item} className="wb-agenda-item">
                    <button type="button" onClick={() => setExpandedAgenda(isExpanded ? null : index)} aria-expanded={isExpanded}>
                      <span className="wb-agenda-summary">
                        <span className="wb-agenda-number">0{index + 1}</span>
                        <span>{item}</span>
                      </span>
                      <ChevronDown className={isExpanded ? "wb-chevron wb-chevron--open" : "wb-chevron"} size={20} aria-hidden="true" />
                    </button>
                    {isExpanded && (
                      <p>
                        {index === 0 && "We will challenge the assumption that the answer can be found in a job description alone."}
                        {index === 1 && "We will explain why recurring stories of achievement can be more revealing than an inventory of preferences."}
                        {index === 2 && "You will leave with a more useful frame for the decision you are facing now."}
                      </p>
                    )}
                  </article>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <WebinarBookingModule id="reserve" number="02" />

      <section className="wb-section wb-testimonials">
        <div className="wb-shell wb-section-grid">
          <SectionRail number="03" label="What people say" sublabel="In their own words" />
          <div className="wb-section-main">
            <div className="wb-kicker">The value of a different question</div>
            <h2 className="wb-section-heading">What people value<br /><em>in Lifework.</em></h2>
            <p className="wb-copy">A better next move starts with a fuller understanding of the person making it.</p>
            {isLoadingTestimonials ? (
              <div className="wb-testimonial-loading" aria-label="Loading approved feedback" />
            ) : approvedTestimonials?.length ? (
              <div className="wb-testimonial-grid">
                {approvedTestimonials.map((testimonial) => (
                  <article key={testimonial.id} className="wb-testimonial">
                    <Quote size={21} aria-hidden="true" />
                    <blockquote>“{testimonial.quote}”</blockquote>
                    <cite>— {testimonial.attribution}</cite>
                  </article>
                ))}
              </div>
            ) : (
              <div className="wb-empty-feedback">
                <p>Verified feedback selected for this page will appear here.</p>
                <span>We publish feedback only after the original source and permission to display it have been recorded.</span>
              </div>
            )}
          </div>
        </div>
      </section>

      <footer className="wb-footer">
        <div className="wb-shell wb-footer-inner">
          <a href={homeHref} className="wb-wordmark">Life<em>work</em></a>
          <span>Career Analysis · Positive Psychology</span>
          <a href="/data-security">Data Security &amp; Privacy</a>
        </div>
      </footer>
    </main>
  );
}

const webinarCss = `
  .lw-webinar {
    --wb-paper: #f6f1e9;
    --wb-paper-deep: #eee5d5;
    --wb-navy: #1a2744;
    --wb-ink: #1c2435;
    --wb-gold: #b8862f;
    --wb-muted: #667084;
    --wb-rule: rgba(26, 39, 68, 0.16);
    --wb-rule-strong: rgba(26, 39, 68, 0.35);
    min-height: 100vh;
    overflow-x: hidden;
    background: var(--wb-paper);
    color: var(--wb-ink);
    font-family: "Source Serif 4", Georgia, serif;
  }
  .lw-webinar *, .lw-webinar *::before, .lw-webinar *::after { box-sizing: border-box; }
  .lw-webinar .wb-shell { width: min(1180px, calc(100% - 48px)); margin: 0 auto; }
  .lw-webinar .wb-skip-link { position: fixed; top: 12px; left: 12px; transform: translateY(-160%); z-index: 100; padding: 11px 15px; background: #fffdf9; color: var(--wb-navy); font-family: "Libre Franklin", Inter, sans-serif; font-size: 0.72rem; font-weight: 700; text-decoration: none; }
  .lw-webinar .wb-skip-link:focus { transform: translateY(0); outline: 2px solid var(--wb-gold); }
  .lw-webinar .wb-header { min-height: 74px; display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 24px; border-bottom: 1px solid var(--wb-rule); }
  .lw-webinar .wb-wordmark { color: var(--wb-navy); font-family: "Cormorant Garamond", Georgia, serif; font-size: 1.6rem; font-weight: 600; letter-spacing: -0.04em; text-decoration: none; }
  .lw-webinar .wb-wordmark em { color: var(--wb-gold); font-style: italic; }
  .lw-webinar .wb-running-title, .lw-webinar .wb-sign-in, .lw-webinar .wb-kicker, .lw-webinar .wb-rail-label, .lw-webinar .wb-footer span, .lw-webinar .wb-footer a:not(.wb-wordmark) { font-family: "Libre Franklin", Inter, sans-serif; font-size: 0.61rem; font-weight: 700; letter-spacing: 0.16em; line-height: 1.4; text-transform: uppercase; }
  .lw-webinar .wb-running-title { color: var(--wb-muted); text-align: center; }
  .lw-webinar .wb-sign-in { justify-self: end; border: 1px solid var(--wb-navy); padding: 9px 14px; color: var(--wb-navy); text-decoration: none; transition: background 160ms ease-out; }
  .lw-webinar .wb-sign-in:hover { background: var(--wb-paper-deep); }
  .lw-webinar .wb-hero { border-bottom: 1px solid var(--wb-rule); }
  .lw-webinar .wb-hero-grid, .lw-webinar .wb-section-grid { display: grid; grid-template-columns: 92px minmax(0, 1fr); }
  .lw-webinar .wb-section-rail { border-right: 1px solid var(--wb-rule); padding: 6px 16px 0 0; }
  .lw-webinar .wb-hero .wb-section-rail { padding-top: 108px; }
  .lw-webinar .wb-rail-number { color: var(--wb-gold); font-family: "Cormorant Garamond", Georgia, serif; font-size: 3rem; font-style: italic; line-height: 0.8; }
  .lw-webinar .wb-rail-label { margin-top: 17px; color: var(--wb-navy); font-size: 0.55rem; }
  .lw-webinar .wb-rail-sublabel { margin-top: 5px; color: var(--wb-muted); font-size: 0.78rem; font-style: italic; line-height: 1.3; }
  .lw-webinar .wb-hero-main { min-height: 620px; display: grid; grid-template-columns: minmax(0, 1.15fr) minmax(275px, 0.65fr); align-items: center; gap: clamp(40px, 7vw, 105px); padding: 78px 0 72px clamp(30px, 6vw, 84px); }
  .lw-webinar .wb-hero-copy { max-width: 690px; }
  .lw-webinar .wb-kicker { display: flex; align-items: center; gap: 10px; margin: 0 0 21px; color: var(--wb-gold); }
  .lw-webinar .wb-kicker::before { display: block; width: 30px; height: 1px; background: var(--wb-gold); content: ""; }
  .lw-webinar h1, .lw-webinar h2, .lw-webinar h3 { margin: 0; color: var(--wb-navy); font-family: "Cormorant Garamond", Georgia, serif; font-weight: 500; letter-spacing: -0.043em; }
  .lw-webinar h1 { font-size: clamp(3.4rem, 7.15vw, 6.7rem); line-height: 0.91; }
  .lw-webinar h1 em, .lw-webinar h2 em { color: var(--wb-gold); font-style: italic; }
  .lw-webinar .wb-intro { max-width: 43rem; margin: 33px 0 0; font-size: 1.17rem; line-height: 1.63; }
  .lw-webinar .wb-actions { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 34px; }
  .lw-webinar .wb-button { display: inline-flex; align-items: center; gap: 12px; border: 1px solid var(--wb-gold); padding: 14px 18px; background: var(--wb-gold); color: var(--wb-navy); font-family: "Libre Franklin", Inter, sans-serif; font-size: 0.64rem; font-weight: 700; letter-spacing: 0.15em; text-decoration: none; text-transform: uppercase; transition: background 160ms ease-out, transform 160ms ease-out; }
  .lw-webinar .wb-button:hover { background: #cca04c; transform: translateY(-1px); }
  .lw-webinar .wb-button:active { transform: scale(0.97); }
  .lw-webinar .wb-button--quiet { border-color: var(--wb-navy); background: transparent; color: var(--wb-navy); }
  .lw-webinar .wb-button--quiet:hover { background: var(--wb-paper-deep); }
  .lw-webinar .wb-details { display: flex; flex-wrap: wrap; gap: 16px 28px; margin-top: 42px; color: var(--wb-muted); font-family: "Libre Franklin", Inter, sans-serif; font-size: 0.74rem; }
  .lw-webinar .wb-details span { display: inline-flex; align-items: center; gap: 8px; }
  .lw-webinar .wb-details svg { color: var(--wb-gold); }
  .lw-webinar .wb-fit-panel { border-top: 1px solid var(--wb-rule-strong); border-bottom: 1px solid var(--wb-rule-strong); padding: 28px 0; }
  .lw-webinar .wb-fit-panel ul { margin: 0; padding: 0; list-style: none; }
  .lw-webinar .wb-fit-panel li { display: flex; gap: 12px; padding: 16px 0; border-bottom: 1px solid var(--wb-rule); font-size: 0.98rem; line-height: 1.5; }
  .lw-webinar .wb-fit-panel li:last-child { padding-bottom: 0; border-bottom: 0; }
  .lw-webinar .wb-fit-panel svg { flex: 0 0 auto; margin-top: 3px; color: var(--wb-gold); }
  .lw-webinar .wb-section { padding: 104px 0; border-bottom: 1px solid var(--wb-rule); }
  .lw-webinar .wb-section-main { padding-left: clamp(30px, 6vw, 84px); }
  .lw-webinar .wb-section-heading { margin-bottom: 26px; font-size: clamp(2.5rem, 4.2vw, 4.4rem); line-height: 0.96; }
  .lw-webinar .wb-copy { max-width: 43rem; color: var(--wb-ink); font-size: 1.04rem; line-height: 1.7; }
  .lw-webinar .wb-copy p { margin: 0 0 17px; }
  .lw-webinar .wb-booking { background: var(--wb-paper-deep); }
  .lw-webinar .wb-booking-intro { margin: 0; color: var(--wb-muted); }
  .lw-webinar .wb-session-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0 34px; margin-top: 39px; border-top: 1px solid var(--wb-rule-strong); }
  .lw-webinar .wb-session-card { padding: 26px 0 28px; border-bottom: 1px solid var(--wb-rule); }
  .lw-webinar .wb-session-card:nth-child(odd) { border-right: 1px solid var(--wb-rule); padding-right: 34px; }
  .lw-webinar .wb-session-card:nth-child(even) { padding-left: 34px; }
  .lw-webinar .wb-session-card h3 { font-size: 1.8rem; line-height: 1.04; }
  .lw-webinar .wb-session-meta { display: flex; flex-wrap: wrap; align-items: center; gap: 14px 20px; margin-top: 20px; }
  .lw-webinar .wb-session-time, .lw-webinar .wb-session-link { display: inline-flex; align-items: center; gap: 8px; }
  .lw-webinar .wb-session-time { color: var(--wb-muted); font-size: 0.9rem; }
  .lw-webinar .wb-session-time svg, .lw-webinar .wb-session-link svg { color: var(--wb-gold); }
  .lw-webinar .wb-session-link { padding-bottom: 4px; border-bottom: 1px solid var(--wb-gold); color: var(--wb-navy); font-family: "Libre Franklin", Inter, sans-serif; font-size: 0.6rem; font-weight: 700; letter-spacing: 0.14em; text-decoration: none; text-transform: uppercase; }
  .lw-webinar .wb-session-link:hover { color: var(--wb-gold); }
  .lw-webinar .wb-booking-note { margin: 25px 0 0; color: var(--wb-muted); font-size: 0.82rem; font-style: italic; }
  .lw-webinar .wb-introduction-layout { display: grid; grid-template-columns: minmax(0, 0.95fr) minmax(0, 1.05fr); gap: clamp(38px, 7vw, 110px); align-items: start; }
  .lw-webinar .wb-agenda-section { background: #fffdf9; }
  .lw-webinar .wb-agenda-intro { margin-bottom: 34px; color: var(--wb-muted); }
  .lw-webinar .wb-agenda-list { border-top: 1px solid var(--wb-rule-strong); border-bottom: 1px solid var(--wb-rule-strong); }
  .lw-webinar .wb-agenda-item { border-bottom: 1px solid var(--wb-rule); }
  .lw-webinar .wb-agenda-item:last-child { border-bottom: 0; }
  .lw-webinar .wb-agenda-item button { display: flex; width: 100%; align-items: center; justify-content: space-between; gap: 22px; padding: 24px 0; border: 0; background: transparent; color: var(--wb-navy); cursor: pointer; font: inherit; text-align: left; }
  .lw-webinar .wb-agenda-summary { display: flex; align-items: flex-start; gap: 19px; font-size: 1.13rem; line-height: 1.45; }
  .lw-webinar .wb-agenda-number { flex: 0 0 auto; color: var(--wb-gold); font-family: "Cormorant Garamond", Georgia, serif; font-size: 2rem; font-style: italic; line-height: 0.8; }
  .lw-webinar .wb-chevron { flex: 0 0 auto; color: var(--wb-gold); transition: transform 160ms ease-out; }
  .lw-webinar .wb-chevron--open { transform: rotate(180deg); }
  .lw-webinar .wb-agenda-item p { max-width: 43rem; margin: -3px 0 0; padding: 0 0 24px 48px; color: var(--wb-muted); font-size: 0.96rem; line-height: 1.6; }
  .lw-webinar .wb-testimonials { background: var(--wb-paper); }
  .lw-webinar .wb-testimonial-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); margin-top: 38px; border-top: 1px solid var(--wb-rule-strong); }
  .lw-webinar .wb-testimonial { min-height: 246px; padding: 29px 34px 29px 0; border-bottom: 1px solid var(--wb-rule); }
  .lw-webinar .wb-testimonial:nth-child(odd) { border-right: 1px solid var(--wb-rule); margin-right: 34px; }
  .lw-webinar .wb-testimonial:nth-child(even) { padding-left: 0; }
  .lw-webinar .wb-testimonial svg { color: var(--wb-gold); }
  .lw-webinar .wb-testimonial blockquote { margin: 21px 0 0; color: var(--wb-navy); font-family: "Cormorant Garamond", Georgia, serif; font-size: 1.46rem; font-style: italic; font-weight: 500; line-height: 1.28; }
  .lw-webinar .wb-testimonial cite { display: block; margin-top: 20px; color: var(--wb-muted); font-family: "Libre Franklin", Inter, sans-serif; font-size: 0.59rem; font-style: normal; font-weight: 700; letter-spacing: 0.15em; text-transform: uppercase; }
  .lw-webinar .wb-testimonial-loading { height: 244px; margin-top: 38px; border-top: 1px solid var(--wb-rule-strong); border-bottom: 1px solid var(--wb-rule); background: repeating-linear-gradient(90deg, transparent 0, transparent 19%, rgba(26,39,68,0.055) 20%, transparent 21%); }
  .lw-webinar .wb-empty-feedback { max-width: 43rem; margin-top: 38px; padding: 26px 0; border-top: 1px solid var(--wb-rule-strong); border-bottom: 1px solid var(--wb-rule); }
  .lw-webinar .wb-empty-feedback p { margin: 0; color: var(--wb-navy); font-family: "Cormorant Garamond", Georgia, serif; font-size: 1.8rem; }
  .lw-webinar .wb-empty-feedback span { display: block; margin-top: 10px; color: var(--wb-muted); font-size: 0.92rem; line-height: 1.5; }
  .lw-webinar .wb-footer { border-top: 1px solid var(--wb-rule); background: var(--wb-paper); }
  .lw-webinar .wb-footer-inner { display: flex; min-height: 86px; align-items: center; justify-content: space-between; gap: 24px; }
  .lw-webinar .wb-footer span { color: var(--wb-muted); text-align: center; }
  .lw-webinar .wb-footer a:not(.wb-wordmark) { color: var(--wb-gold); text-decoration: none; }
  @media (prefers-reduced-motion: reduce) { .lw-webinar *, .lw-webinar *::before, .lw-webinar *::after { scroll-behavior: auto !important; transition-duration: 0.01ms !important; } }
  @media (max-width: 800px) {
    .lw-webinar .wb-shell { width: min(100% - 32px, 1180px); }
    .lw-webinar .wb-header { grid-template-columns: 1fr auto; min-height: 68px; }
    .lw-webinar .wb-running-title { display: none; }
    .lw-webinar .wb-sign-in { font-size: 0.53rem; padding: 8px 10px; }
    .lw-webinar .wb-hero-grid, .lw-webinar .wb-section-grid { grid-template-columns: 1fr; }
    .lw-webinar .wb-section-rail { display: none; }
    .lw-webinar .wb-hero-main { min-height: 0; grid-template-columns: 1fr; gap: 44px; padding: 80px 0 64px; }
    .lw-webinar h1 { font-size: clamp(3.15rem, 14vw, 4.65rem); }
    .lw-webinar .wb-intro { font-size: 1.08rem; }
    .lw-webinar .wb-details { gap: 14px 19px; margin-top: 34px; }
    .lw-webinar .wb-fit-panel { padding: 24px 0; }
    .lw-webinar .wb-section { padding: 76px 0; }
    .lw-webinar .wb-section-main { padding-left: 0; }
    .lw-webinar .wb-section-heading { font-size: clamp(2.4rem, 12vw, 3.4rem); }
    .lw-webinar .wb-introduction-layout { grid-template-columns: 1fr; gap: 35px; }
    .lw-webinar .wb-session-grid, .lw-webinar .wb-testimonial-grid { grid-template-columns: 1fr; }
    .lw-webinar .wb-session-card, .lw-webinar .wb-session-card:nth-child(odd), .lw-webinar .wb-session-card:nth-child(even) { padding: 24px 0; border-right: 0; margin: 0; }
    .lw-webinar .wb-session-card h3 { font-size: 1.65rem; }
    .lw-webinar .wb-session-meta { align-items: flex-start; flex-direction: column; gap: 13px; }
    .lw-webinar .wb-testimonial, .lw-webinar .wb-testimonial:nth-child(odd), .lw-webinar .wb-testimonial:nth-child(even) { min-height: 0; padding: 27px 0; border-right: 0; margin: 0; }
    .lw-webinar .wb-testimonial blockquote { font-size: 1.34rem; }
    .lw-webinar .wb-footer-inner { align-items: flex-start; flex-direction: column; padding: 25px 0; }
    .lw-webinar .wb-footer span { text-align: left; }
  }
`;
