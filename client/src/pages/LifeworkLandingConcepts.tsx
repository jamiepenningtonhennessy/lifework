import { FormEvent, useState } from "react";
import { ArrowRight, Download, X } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { canEnterCounsellorWorkspace } from "@shared/counsellorAccess";

export const landingConcepts = [
  {
    slug: "journal",
    number: "01",
    name: "The Life Journal",
    summary: "Warm-paper editorial pages with a chapter rail and quiet reading rhythm.",
  },
  {
    slug: "title-page",
    number: "02",
    name: "The Personal Edition",
    summary: "A composed report-cover approach with confident typography and generous space.",
  },
  {
    slug: "field-notes",
    number: "03",
    name: "The Field Notes",
    summary: "A contemporary editorial grid that feels considered, reflective and less institutional.",
  },
] as const;

type ConceptSlug = (typeof landingConcepts)[number]["slug"];

type LifeworkLandingConceptsProps = {
  forcedConcept?: ConceptSlug;
  reviewOnly?: boolean;
};

type Audience = {
  stage: string;
  desc: string;
  pdf: string;
  filename: string;
};

const audiences: Audience[] = [
  {
    stage: "Graduates & school leavers",
    desc: "Choose a direction with confidence, not guesswork.",
    pdf: "https://d2xsxph8kpxj0f.cloudfront.net/107696804/kFbbE6kqNApXGDFpQJUGV7/lifework-brochure_72321d38.pdf",
    filename: "Lifework-Graduates.pdf",
  },
  {
    stage: "Mid-career professionals",
    desc: "Understand why some work feels effortless and other work drains you.",
    pdf: "https://d2xsxph8kpx0f.cloudfront.net/107696804/kFbbE6kqNApXGDFpQJUGV7/lifework-midcareer-brochure_fb9f6283.pdf".replace("kpx0f", "kpxj0f"),
    filename: "Lifework-MidCareer.pdf",
  },
  {
    stage: "Returning to work",
    desc: "Discover that the years away built strengths, not gaps.",
    pdf: "https://d2xsxph8kpxj0f.cloudfront.net/107696804/kFbbE6kqNApXGDFpQJUGV7/lifework-returntowork-brochure_219ab55a.pdf",
    filename: "Lifework-ReturnToWork.pdf",
  },
  {
    stage: "Approaching retirement",
    desc: "Find fresh, meaningful expressions of who you are — on your own terms.",
    pdf: "https://d2xsxph8kpxj0f.cloudfront.net/107696804/kFbbE6kqNApXGDFpQJUGV7/lifework-retirement-brochure_e19ec92a.pdf",
    filename: "Lifework-Retirement.pdf",
  },
];

const stages = [
  {
    step: "01",
    title: "Your Past",
    subtitle: "The story of who you are",
    desc: "A structured life history interview explores your achievements decade by decade — from childhood to today. Not your CV. The moments when you were most fully yourself, mapped across Emotions, Skills, and Values.",
  },
  {
    step: "02",
    title: "Your Present",
    subtitle: "Lenses, not labels",
    desc: "Validated psychometric tools — VIA Character Strengths and a Big Five personality profile — are used not to categorise you, but as fresh angles on the same timeline. They add depth and insight to what your life history has already revealed.",
  },
  {
    step: "03",
    title: "Your Future",
    subtitle: "Wisdom for the road ahead",
    desc: "Sage, your AI career coach, reads everything you have written and asks the reflective questions that help you see the pattern clearly. Your counsellor then brings it all together — a compass, not a prescription, for what comes next.",
  },
] as const;

const conceptCss = `
  .lw-concept {
    --paper: #f6f1e9;
    --paper-deep: #efe7d8;
    --navy: #1a2744;
    --navy-soft: #2d3c5c;
    --gold: #b8862f;
    --ink: #1c2435;
    --muted: #687186;
    --rule: rgba(26, 39, 68, 0.16);
    --rule-strong: rgba(26, 39, 68, 0.35);
    min-height: 100vh;
    background: var(--paper);
    color: var(--ink);
    font-family: "Source Serif 4", Georgia, serif;
  }
  .lw-concept *, .lw-concept *::before, .lw-concept *::after { box-sizing: border-box; }
  .lw-concept .lc-sans { font-family: "Libre Franklin", Inter, sans-serif; }
  .lw-concept .lc-display { font-family: "Cormorant Garamond", Georgia, serif; }
  .lw-concept .lc-shell { width: min(1180px, calc(100% - 48px)); margin: 0 auto; }
  .lw-concept .lc-running-header {
    min-height: 72px; display: flex; align-items: center; justify-content: space-between; gap: 24px;
    border-bottom: 1px solid var(--rule); color: var(--muted);
  }
  .lw-concept .lc-wordmark { color: var(--navy); font-family: "Cormorant Garamond", Georgia, serif; font-size: 1.55rem; font-weight: 600; letter-spacing: -0.03em; text-decoration: none; }
  .lw-concept .lc-wordmark em { color: var(--gold); font-style: italic; }
  .lw-concept .lc-topnav { display: flex; align-items: center; gap: 18px; }
  .lw-concept .lc-tag, .lw-concept .lc-running, .lw-concept .lc-kicker, .lw-concept .lc-micro, .lw-concept .lc-rail-title, .lw-concept .lc-foot { font-family: "Libre Franklin", Inter, sans-serif; font-size: 0.62rem; line-height: 1.45; font-weight: 600; letter-spacing: 0.18em; text-transform: uppercase; }
  .lw-concept .lc-running { text-align: right; color: var(--muted); }
  .lw-concept .lc-sign-in { border: 1px solid var(--navy); background: transparent; padding: 9px 14px; color: var(--navy); text-decoration: none; transition: background 160ms ease-out, color 160ms ease-out; font-family: "Libre Franklin", Inter, sans-serif; font-size: 0.62rem; font-weight: 600; letter-spacing: 0.18em; text-transform: uppercase; cursor: pointer; }
  .lw-concept .lc-sign-in:hover { color: var(--navy); background: var(--paper-deep); }
  .lw-concept .lc-review { background: var(--navy); color: rgba(255,255,255,0.7); padding: 10px 0; }
  .lw-concept .lc-review-inner { width: min(1180px, calc(100% - 48px)); margin: 0 auto; display: flex; justify-content: space-between; align-items: center; gap: 20px; }
  .lw-concept .lc-review-links { display: flex; gap: 0; overflow-x: auto; }
  .lw-concept .lc-review-link { border-left: 1px solid rgba(255,255,255,0.18); padding: 3px 13px; color: rgba(255,255,255,0.62); text-decoration: none; white-space: nowrap; }
  .lw-concept .lc-review-link:last-child { border-right: 1px solid rgba(255,255,255,0.18); }
  .lw-concept .lc-review-link[data-active="true"] { color: #fff; }
  .lw-concept .lc-hero { border-bottom: 1px solid var(--rule-strong); }
  .lw-concept .lc-hero-grid { display: grid; grid-template-columns: 146px minmax(0, 1fr); min-height: 610px; }
  .lw-concept .lc-rail { border-right: 1px solid var(--rule); padding: 94px 24px 40px 0; }
  .lw-concept .lc-rail-num { color: var(--gold); font-family: "Cormorant Garamond", Georgia, serif; font-size: 3rem; line-height: 0.8; font-style: italic; }
  .lw-concept .lc-rail-title { margin-top: 16px; color: var(--navy); font-size: 0.55rem; }
  .lw-concept .lc-rail-sub { margin-top: 5px; color: var(--muted); font-size: 0.78rem; font-style: italic; line-height: 1.3; }
  .lw-concept .lc-hero-copy { padding: 92px 0 68px clamp(40px, 7vw, 112px); max-width: 810px; display: flex; flex-direction: column; justify-content: center; }
  .lw-concept .lc-kicker { display: flex; gap: 10px; align-items: center; color: var(--gold); margin-bottom: 21px; }
  .lw-concept .lc-kicker::before { content: ""; display: block; width: 30px; height: 1px; background: var(--gold); }
  .lw-concept .lc-hero h1 { color: var(--navy); font-family: "Cormorant Garamond", Georgia, serif; font-size: clamp(3.2rem, 7vw, 6.25rem); font-weight: 500; line-height: 0.91; letter-spacing: -0.045em; margin: 0; }
  .lw-concept .lc-hero h1 em { color: var(--gold); font-style: italic; }
  .lw-concept .lc-intro { max-width: 40rem; margin: 34px 0 0; color: var(--ink); font-size: 1.17rem; line-height: 1.62; }
  .lw-concept .lc-actions { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 34px; }
  .lw-concept .lc-button { display: inline-flex; align-items: center; gap: 12px; border: 1px solid var(--gold); padding: 14px 18px; background: var(--gold); color: var(--navy); font-family: "Libre Franklin", Inter, sans-serif; font-size: 0.64rem; font-weight: 700; letter-spacing: 0.15em; text-decoration: none; text-transform: uppercase; transition: transform 160ms ease-out, background 160ms ease-out; cursor: pointer; }
  .lw-concept .lc-button:hover { background: #cca04c; transform: translateY(-1px); }
  .lw-concept .lc-button.lc-button--quiet { background: transparent; border-color: var(--navy); color: var(--navy); }
  .lw-concept .lc-button.lc-button--quiet:hover { background: var(--paper-deep); color: var(--navy); }
  .lw-concept .lc-section { padding: 104px 0; }
  .lw-concept .lc-section-grid { display: grid; grid-template-columns: 146px minmax(0, 1fr); }
  .lw-concept .lc-section-rail { border-right: 1px solid var(--rule); padding-right: 24px; }
  .lw-concept .lc-section-main { padding-left: clamp(40px, 7vw, 112px); }
  .lw-concept .lc-section-heading { margin: 0 0 26px; color: var(--navy); font-family: "Cormorant Garamond", Georgia, serif; font-size: clamp(2.45rem, 4vw, 4.15rem); font-weight: 500; line-height: 0.96; letter-spacing: -0.035em; }
  .lw-concept .lc-section-heading em { color: var(--gold); font-style: italic; }
  .lw-concept .lc-guide-heading { font-size: clamp(2.15rem, 3.55vw, 3.55rem); }
  .lw-concept .lc-guide-heading .lc-guide-line { font-family: inherit; white-space: nowrap; }
  .lw-concept .lc-guide-heading .lc-guide-gold { color: var(--gold); font-family: inherit; }
  .lw-concept .lc-copy { max-width: 41rem; color: var(--ink); font-size: 1.04rem; line-height: 1.7; }
  .lw-concept .lc-copy p { margin: 0 0 16px; }
  .lw-concept .lc-audience-list { margin-top: 42px; border-top: 1px solid var(--rule-strong); }
  .lw-concept .lc-audience { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: center; gap: 20px; padding: 18px 0; border-bottom: 1px solid var(--rule); }
  .lw-concept .lc-audience-name { color: var(--navy); font-family: "Cormorant Garamond", Georgia, serif; font-size: 1.42rem; font-weight: 600; }
  .lw-concept .lc-audience-desc { margin-top: 4px; color: var(--muted); font-size: 0.94rem; line-height: 1.4; }
  .lw-concept .lc-download { display: inline-flex; align-items: center; gap: 7px; color: var(--gold); font-family: "Libre Franklin", Inter, sans-serif; font-size: 0.6rem; font-weight: 700; letter-spacing: 0.15em; text-decoration: none; text-transform: uppercase; white-space: nowrap; }
  .lw-concept .lc-download:hover { color: var(--navy); }
  .lw-concept .lc-video { background: var(--navy); color: var(--paper); }
  .lw-concept .lc-video .lc-section-heading { color: var(--paper); }
  .lw-concept .lc-video .lc-copy { color: rgba(255,255,255,0.74); }
  .lw-concept .lc-video-frame { margin-top: 38px; border: 1px solid rgba(184,134,47,0.7); padding: 7px; background: rgba(255,255,255,0.04); }
  .lw-concept .lc-video-frame video { display: block; width: 100%; }
  .lw-concept .lc-stages { display: grid; grid-template-columns: repeat(3, 1fr); border-top: 1px solid var(--rule-strong); border-bottom: 1px solid var(--rule-strong); margin-top: 40px; }
  .lw-concept .lc-stage { min-height: 310px; padding: 28px 28px 32px 0; margin-right: 28px; border-right: 1px solid var(--rule); }
  .lw-concept .lc-stage:last-child { border-right: 0; margin-right: 0; }
  .lw-concept .lc-stage-num { color: var(--gold); font-family: "Cormorant Garamond", Georgia, serif; font-size: 2.6rem; font-style: italic; line-height: 0.9; }
  .lw-concept .lc-stage h3 { margin: 23px 0 3px; color: var(--navy); font-family: "Cormorant Garamond", Georgia, serif; font-size: 1.75rem; font-weight: 600; }
  .lw-concept .lc-stage-sub { color: var(--gold); font-family: "Libre Franklin", Inter, sans-serif; font-size: 0.58rem; font-weight: 600; letter-spacing: 0.14em; line-height: 1.4; text-transform: uppercase; }
  .lw-concept .lc-stage p { margin: 18px 0 0; color: var(--ink); font-size: 0.96rem; line-height: 1.6; }
  .lw-concept .lc-invitation { background: var(--paper-deep); border-top: 1px solid var(--rule); border-bottom: 1px solid var(--rule); }
  .lw-concept .lc-invitation-inner { max-width: 730px; margin: 0 auto; text-align: center; }
  .lw-concept .lc-invitation .lc-kicker { justify-content: center; }
  .lw-concept .lc-invitation .lc-section-heading { margin-bottom: 24px; }
  .lw-concept .lc-invitation .lc-copy { margin: 0 auto; }
  .lw-concept .lc-invitation .lc-actions { justify-content: center; }
  .lw-concept .lc-testimonials { background: var(--paper); }
  .lw-concept .lc-testimonial-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 0 40px; border-top: 1px solid var(--rule-strong); margin-top: 38px; }
  .lw-concept .lc-testimonial { min-height: 220px; padding: 30px 0; border-bottom: 1px solid var(--rule); }
  .lw-concept .lc-testimonial:nth-child(odd) { padding-right: 36px; border-right: 1px solid var(--rule); }
  .lw-concept .lc-testimonial:nth-child(even) { padding-left: 36px; }
  .lw-concept .lc-testimonial blockquote { margin: 0; color: var(--navy); font-family: "Cormorant Garamond", Georgia, serif; font-size: 1.48rem; font-style: italic; font-weight: 500; line-height: 1.28; }
  .lw-concept .lc-testimonial cite { display: block; margin-top: 20px; color: var(--muted); font-family: "Libre Franklin", Inter, sans-serif; font-size: 0.59rem; font-style: normal; font-weight: 600; letter-spacing: 0.16em; text-transform: uppercase; }
  .lw-concept .lc-empty { padding: 36px 0; color: var(--muted); font-style: italic; border-bottom: 1px solid var(--rule); }
  .lw-concept .lc-closing { padding: 110px 0 78px; background: var(--paper-deep); border-top: 1px solid var(--rule); border-bottom: 1px solid var(--rule); text-align: center; }
  .lw-concept .lc-quote { max-width: 840px; margin: 0 auto; color: var(--navy); font-family: "Cormorant Garamond", Georgia, serif; font-size: clamp(2rem, 4vw, 3.7rem); font-style: italic; font-weight: 500; line-height: 1.05; letter-spacing: -0.03em; }
  .lw-concept .lc-quote-source { margin-top: 28px; color: var(--gold); font-family: "Libre Franklin", Inter, sans-serif; font-size: 0.62rem; font-weight: 600; letter-spacing: 0.18em; text-transform: uppercase; }
  .lw-concept .lc-footer { border-top: 1px solid var(--rule); background: var(--paper); color: var(--muted); }
  .lw-concept .lc-footer-inner { min-height: 84px; display: flex; align-items: center; justify-content: space-between; gap: 24px; }
  .lw-concept .lc-footer .lc-wordmark { color: var(--navy); }
  .lw-concept .lc-footer-copy { color: var(--muted); font-size: 0.78rem; }
  .lw-concept .lc-footer-copy a, .lw-concept .lc-privacy { color: var(--gold); text-decoration: none; }

  /* Concept 02: title-page composition */
  .lw-concept[data-concept="title-page"] .lc-hero-grid { grid-template-columns: 1fr; min-height: 690px; }
  .lw-concept[data-concept="title-page"] .lc-hero-copy { max-width: 880px; padding: 0; margin: auto 0; }
  .lw-concept[data-concept="title-page"] .lc-hero h1 { font-size: clamp(3.8rem, 8.5vw, 7.8rem); max-width: 830px; }
  .lw-concept[data-concept="title-page"] .lc-intro { border-top: 1px solid var(--rule-strong); padding-top: 22px; max-width: 550px; }
  .lw-concept[data-concept="title-page"] .lc-section-grid { grid-template-columns: minmax(0, 1fr); }
  .lw-concept[data-concept="title-page"] .lc-section-rail { display: none; }
  .lw-concept[data-concept="title-page"] .lc-section-main { padding-left: 0; }
  .lw-concept[data-concept="title-page"] .lc-guide-layout { display: grid; grid-template-columns: 0.9fr 1.1fr; gap: clamp(40px, 8vw, 120px); align-items: start; }
  .lw-concept[data-concept="title-page"] .lc-audience-list { margin-top: 0; }
  .lw-concept[data-concept="title-page"] .lc-video .lc-section-main { max-width: 900px; margin: 0 auto; }
  .lw-concept[data-concept="title-page"] .lc-stages { margin-top: 0; }
  .lw-concept[data-concept="title-page"] .lc-invitation { background: var(--navy); border: 0; }
  .lw-concept[data-concept="title-page"] .lc-invitation .lc-section-heading { color: var(--paper); }
  .lw-concept[data-concept="title-page"] .lc-invitation .lc-copy { color: rgba(255,255,255,0.72); }

  /* Concept 03: editorial grid / field notes */
  .lw-concept[data-concept="field-notes"] .lc-hero { border-bottom: 0; background: linear-gradient(to right, transparent 0, transparent calc(100% - 1px), var(--rule) calc(100% - 1px)); }
  .lw-concept[data-concept="field-notes"] .lc-hero-grid { grid-template-columns: 92px minmax(0, 1fr); min-height: 630px; }
  .lw-concept[data-concept="field-notes"] .lc-rail { padding-right: 16px; }
  .lw-concept[data-concept="field-notes"] .lc-hero-copy { padding-left: clamp(28px, 5vw, 84px); max-width: 900px; }
  .lw-concept[data-concept="field-notes"] .lc-hero h1 { font-size: clamp(3.3rem, 7.4vw, 6.7rem); }
  .lw-concept[data-concept="field-notes"] .lc-section-grid { grid-template-columns: 92px minmax(0, 1fr); }
  .lw-concept[data-concept="field-notes"] .lc-section-main { padding-left: clamp(28px, 5vw, 84px); }
  .lw-concept[data-concept="field-notes"] .lc-guide-layout { display: grid; grid-template-columns: 1.05fr 0.95fr; gap: clamp(40px, 7vw, 100px); }
  .lw-concept[data-concept="field-notes"] .lc-audience-list { margin-top: 0; }
  .lw-concept[data-concept="field-notes"] .lc-video { background: var(--paper-deep); color: var(--ink); }
  .lw-concept[data-concept="field-notes"] .lc-video .lc-section-heading { color: var(--navy); }
  .lw-concept[data-concept="field-notes"] .lc-video .lc-copy { color: var(--ink); }
  .lw-concept[data-concept="field-notes"] .lc-video-frame { background: #fffdf9; border-color: rgba(184,134,47,0.7); }
  .lw-concept[data-concept="field-notes"] .lc-review { background: var(--paper-deep); color: var(--navy); border-bottom: 1px solid var(--rule); }
  .lw-concept[data-concept="field-notes"] .lc-review-link { border-color: var(--rule); color: var(--muted); }
  .lw-concept[data-concept="field-notes"] .lc-review-link:last-child { border-color: var(--rule); }
  .lw-concept[data-concept="field-notes"] .lc-review-link[data-active="true"] { color: var(--navy); }
  .lw-concept[data-concept="field-notes"] .lc-stage { min-height: 340px; }
  .lw-concept[data-concept="field-notes"] .lc-invitation { background: var(--paper); }
  .lw-concept[data-concept="field-notes"] .lc-testimonial-grid { grid-template-columns: repeat(4, 1fr); gap: 0; }
  .lw-concept[data-concept="field-notes"] .lc-testimonial { min-height: 265px; padding: 24px 20px 24px 0; border-right: 1px solid var(--rule); }
  .lw-concept[data-concept="field-notes"] .lc-testimonial:nth-child(odd), .lw-concept[data-concept="field-notes"] .lc-testimonial:nth-child(even) { padding-left: 0; padding-right: 20px; border-right: 1px solid var(--rule); }
  .lw-concept[data-concept="field-notes"] .lc-testimonial:last-child { border-right: 0; }
  .lw-concept[data-concept="field-notes"] .lc-testimonial blockquote { font-size: 1.25rem; }
  .lw-concept .lc-modal-backdrop { align-items: center; background: rgba(57, 46, 29, 0.26); display: flex; inset: 0; justify-content: center; padding: 24px; position: fixed; z-index: 100; }
  .lw-concept .lc-modal { background: var(--paper); border: 1px solid var(--rule-strong); box-shadow: 0 20px 65px rgba(28,36,53,0.18); max-width: 480px; padding: 38px; position: relative; width: 100%; }
  .lw-concept .lc-modal-close { background: transparent; border: 0; color: var(--navy); cursor: pointer; padding: 8px; position: absolute; right: 13px; top: 13px; }
  .lw-concept .lc-modal-title { color: var(--navy); font-family: "Cormorant Garamond", Georgia, serif; font-size: 2.15rem; font-weight: 500; line-height: 1; margin: 0 0 14px; }
  .lw-concept .lc-modal-copy { color: var(--ink); font-size: 0.98rem; line-height: 1.6; margin: 0 0 22px; }
  .lw-concept .lc-modal-label { color: var(--navy); display: block; font-family: "Libre Franklin", Inter, sans-serif; font-size: 0.61rem; font-weight: 700; letter-spacing: 0.16em; margin-bottom: 8px; text-transform: uppercase; }
  .lw-concept .lc-modal-input { background: #fffdf9; border: 1px solid var(--rule-strong); color: var(--ink); font-family: "Source Serif 4", Georgia, serif; font-size: 1.1rem; padding: 12px; width: 100%; }
  .lw-concept .lc-modal-error { color: #a04538; font-size: 0.9rem; margin: 12px 0 0; }
  .lw-concept .lc-modal .lc-button { margin-top: 22px; width: 100%; justify-content: center; }

  @media (max-width: 800px) {
    .lw-concept .lc-shell, .lw-concept .lc-review-inner { width: min(100% - 32px, 1180px); }
    .lw-concept .lc-running { display: none; }
    .lw-concept .lc-review-inner { width: 100%; padding: 0 16px; }
    .lw-concept .lc-review-inner > .lc-tag { display: none; }
    .lw-concept .lc-review-links { width: 100%; justify-content: space-between; }
    .lw-concept .lc-review-link { padding: 3px 7px; font-size: 0.52rem; }
    .lw-concept .lc-review-link .lc-concept-name { display: none; }
    .lw-concept .lc-hero-grid, .lw-concept[data-concept="field-notes"] .lc-hero-grid, .lw-concept .lc-section-grid, .lw-concept[data-concept="field-notes"] .lc-section-grid { grid-template-columns: 1fr; }
    .lw-concept .lc-rail, .lw-concept .lc-section-rail { display: none; }
    .lw-concept .lc-hero-copy, .lw-concept[data-concept="field-notes"] .lc-hero-copy { padding: 80px 0 66px; }
    .lw-concept .lc-section-main, .lw-concept[data-concept="field-notes"] .lc-section-main { padding-left: 0; }
    .lw-concept .lc-guide-layout, .lw-concept[data-concept="title-page"] .lc-guide-layout, .lw-concept[data-concept="field-notes"] .lc-guide-layout { grid-template-columns: 1fr; gap: 38px; }
    .lw-concept .lc-stages { grid-template-columns: 1fr; }
    .lw-concept .lc-stage { min-height: auto; padding: 30px 0; margin: 0; border-right: 0; border-bottom: 1px solid var(--rule); }
    .lw-concept .lc-stage:last-child { border-bottom: 0; }
    .lw-concept .lc-testimonial-grid, .lw-concept[data-concept="field-notes"] .lc-testimonial-grid { grid-template-columns: 1fr; }
    .lw-concept .lc-testimonial, .lw-concept .lc-testimonial:nth-child(odd), .lw-concept .lc-testimonial:nth-child(even), .lw-concept[data-concept="field-notes"] .lc-testimonial, .lw-concept[data-concept="field-notes"] .lc-testimonial:nth-child(odd), .lw-concept[data-concept="field-notes"] .lc-testimonial:nth-child(even) { min-height: auto; padding: 26px 0; border-right: 0; }
    .lw-concept .lc-footer-inner { flex-direction: column; padding: 24px 0; align-items: flex-start; }
  }
`;

function getSlug(location: string): ConceptSlug {
  const match = landingConcepts.find((concept) => location.endsWith(`/${concept.slug}`));
  return match?.slug ?? "journal";
}

type HeaderProps = {
  concept: ConceptSlug;
  reviewOnly: boolean;
  isAuthenticated: boolean;
  userName?: string | null;
  canOpenCounsellorWorkspace: boolean;
  onBeginJourney: () => void;
  onOpenDashboard: () => void;
  onOpenCounsellor: () => void;
};

function Header({
  concept,
  reviewOnly,
  isAuthenticated,
  userName,
  canOpenCounsellorWorkspace,
  onBeginJourney,
  onOpenDashboard,
  onOpenCounsellor,
}: HeaderProps) {
  return (
    <>
      {reviewOnly && (
        <div className="lc-review">
          <div className="lc-review-inner">
            <span className="lc-tag">Review-only landing-page directions</span>
            <nav className="lc-review-links" aria-label="Landing-page design options">
              {landingConcepts.map((item) => (
                <a
                  key={item.slug}
                  href={`/lifework-designs/${item.slug}`}
                  data-active={item.slug === concept}
                  className="lc-review-link lc-tag"
                >
                  <span>{item.number}</span><span className="lc-concept-name"> {item.name}</span>
                </a>
              ))}
            </nav>
          </div>
        </div>
      )}
      <header className="lc-shell lc-running-header">
        <a href={reviewOnly ? "/lifework-designs/field-notes" : "/"} className="lc-wordmark" aria-label="Lifework home">Life<em>work</em></a>
        <div className="lc-running">Career Analysis · Positive Psychology</div>
        <div className="lc-topnav">
          {isAuthenticated ? (
            <>
              <span className="lc-running">Welcome, {userName?.split(" ")[0]}</span>
              {canOpenCounsellorWorkspace && <button type="button" onClick={onOpenCounsellor} className="lc-sign-in">Counsellor View</button>}
              <button type="button" onClick={onOpenDashboard} className="lc-button">My Dashboard</button>
            </>
          ) : (
            <button type="button" onClick={onBeginJourney} className="lc-sign-in">Sign In</button>
          )}
        </div>
      </header>
    </>
  );
}

function Hero({ concept, onBeginJourney }: { concept: ConceptSlug; onBeginJourney: () => void }) {
  return (
    <section className="lc-hero">
      <div className="lc-shell lc-hero-grid">
        {concept !== "title-page" && (
          <aside className="lc-rail" aria-hidden="true">
            <div className="lc-rail-num">01</div>
            <div className="lc-rail-title">Career Analysis</div>
            <div className="lc-rail-sub">The beginning of a better question</div>
          </aside>
        )}
        <div className="lc-hero-copy">
          <div className="lc-kicker">Career Analysis · Positive Psychology</div>
          <h1>What if the right career<br /><em>already lives inside you?</em></h1>
          <p className="lc-intro">You have spent years acquiring experience, skills, and wisdom. But somewhere along the way, the noise of other people's expectations may have drowned out the signal of what genuinely energises you. Lifework helps you find it again.</p>
          <div className="lc-actions">
            <button type="button" className="lc-button" onClick={onBeginJourney}>Begin Your Journey <ArrowRight size={16} /></button>
            <a className="lc-button lc-button--quiet" href="mailto:jamie@lifeworkpath.com">Ask Jamie a Question</a>
          </div>
        </div>
      </div>
    </section>
  );
}

function SectionRail({ num, label, sub }: { num: string; label: string; sub: string }) {
  return (
    <aside className="lc-section-rail" aria-hidden="true">
      <div className="lc-rail-num">{num}</div>
      <div className="lc-rail-title">{label}</div>
      <div className="lc-rail-sub">{sub}</div>
    </aside>
  );
}

function Guide({ concept }: { concept: ConceptSlug }) {
  return (
    <section className="lc-section">
      <div className="lc-shell lc-section-grid">
        <SectionRail num="02" label="The Guide" sub="A considered way forward" />
        <div className="lc-section-main lc-guide-layout">
          <div>
            <div className="lc-kicker">The Guide</div>
            <h2 className="lc-section-heading lc-guide-heading">
              <span className="lc-guide-line">We understand what</span><br />
              <span className="lc-guide-line">this <span className="lc-guide-gold">feels like.</span></span>
            </h2>
            <div className="lc-copy">
              <p>Whether you are a graduate standing at a crossroads, a mid-career professional who has built a life that looks right on paper but feels hollow, someone returning to work after years away, or a senior leader asking what comes next — the question is the same: <em>what is actually mine?</em></p>
              <p>Lifework is built on thirty years of working with lawyers, professionals, and individuals at every stage of life. The methodology is rooted in Bernard Haldane's Dependable Strengths research — the insight that the most reliable guide to a fulfilling career is not a questionnaire about preferences, but a careful reading of the life you have already lived.</p>
            </div>
          </div>
          <div className="lc-audience-list">
            {audiences.map((audience) => (
              <div className="lc-audience" key={audience.stage}>
                <div>
                  <div className="lc-audience-name">{audience.stage}</div>
                  <div className="lc-audience-desc">{audience.desc}</div>
                </div>
                <a className="lc-download" href={audience.pdf} download={audience.filename} target="_blank" rel="noreferrer"><Download size={13} /> Download</a>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function VideoSection() {
  return (
    <section className="lc-section lc-video">
      <div className="lc-shell lc-section-grid">
        <SectionRail num="03" label="How it works" sub="The story of Lifework" />
        <div className="lc-section-main">
          <div className="lc-kicker">How it works</div>
          <h2 className="lc-section-heading">The story of Lifework —<br /><em>in four minutes.</em></h2>
          <div className="lc-copy"><p>Rooted in positive psychology, anchored in your own life story.</p></div>
          <div className="lc-video-frame">
            <video src="/manus-storage/lifeworkpathopen_02c49e08.mp4" controls playsInline preload="metadata" title="Lifework: how it works" />
          </div>
        </div>
      </div>
    </section>
  );
}

function Plan() {
  return (
    <section className="lc-section">
      <div className="lc-shell lc-section-grid">
        <SectionRail num="04" label="The Plan" sub="Three stages" />
        <div className="lc-section-main">
          <div className="lc-kicker">The Plan</div>
          <h2 className="lc-section-heading">Three stages.<br /><em>A lifetime of clarity.</em></h2>
          <div className="lc-stages">
            {stages.map((stage) => (
              <article className="lc-stage" key={stage.step}>
                <div className="lc-stage-num">{stage.step}</div>
                <h3>{stage.title}</h3>
                <div className="lc-stage-sub">{stage.subtitle}</div>
                <p>{stage.desc}</p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Invitation({ onBeginJourney }: { onBeginJourney: () => void }) {
  return (
    <section className="lc-section lc-invitation">
      <div className="lc-invitation-inner">
        <div className="lc-kicker">Take the Next Step</div>
        <h2 className="lc-section-heading">The right career already lives inside you.<br /><em>Let's find it together.</em></h2>
        <div className="lc-copy"><p>The risk is not that you will fail. The risk is spending another five years — or ten — doing work that never quite fits. Not because the right work doesn't exist, but because you never took the time to find out what it was.</p></div>
        <div className="lc-actions">
          <a className="lc-button" href="mailto:jamie@lifeworkpath.com?subject=Lifework%20Enquiry">Email Jamie to Get Started <ArrowRight size={16} /></a>
          <button type="button" className="lc-button lc-button--quiet" onClick={onBeginJourney}>I Have an Access Code</button>
        </div>
        <p className="lc-copy" style={{ marginTop: 26, fontSize: "0.92rem" }}>Already a client? <button type="button" onClick={onBeginJourney} style={{ color: "var(--gold)", background: "transparent", border: 0, cursor: "pointer", fontFamily: "inherit", fontSize: "inherit", padding: 0, textDecoration: "underline" }}>Sign in here</button></p>
      </div>
    </section>
  );
}

function Testimonials({ concept }: { concept: ConceptSlug }) {
  const { data: testimonials, isLoading } = trpc.verifiedTestimonials.publicForPage.useQuery({ pageKey: "lifework_home" });
  return (
    <section className="lc-section lc-testimonials">
      <div className="lc-shell lc-section-grid">
        <SectionRail num="05" label="What Success Looks Like" sub="A compass for every stage" />
        <div className="lc-section-main">
          <div className="lc-kicker">What Success Looks Like</div>
          <h2 className="lc-section-heading">A compass for every<br /><em>stage of life.</em></h2>
          {isLoading ? (
            <div className="lc-empty">Loading approved feedback…</div>
          ) : testimonials?.length ? (
            <div className="lc-testimonial-grid">
              {testimonials.slice(0, concept === "field-notes" ? 4 : 4).map((testimonial) => (
                <article className="lc-testimonial" key={testimonial.id}>
                  <blockquote>“{testimonial.quote}”</blockquote>
                  <cite>— {testimonial.attribution}</cite>
                </article>
              ))}
            </div>
          ) : (
            <div className="lc-empty">Verified feedback selected for this page will appear here.</div>
          )}
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <>
      <section className="lc-closing">
        <div className="lc-shell">
          <blockquote className="lc-quote">“The most important thing is to find out what is important to you — not what others think should be important.”</blockquote>
          <div className="lc-quote-source">— Bernard Haldane, Dependable Strengths</div>
          <div className="lc-actions" style={{ justifyContent: "center" }}>
            <a className="lc-button" href="mailto:jamie@lifeworkpath.com?subject=Lifework%20Enquiry">Email Jamie — jamie@lifeworkpath.com <ArrowRight size={16} /></a>
          </div>
        </div>
      </section>
      <footer className="lc-footer">
        <div className="lc-shell lc-footer-inner">
          <a href="/" className="lc-wordmark">Life<em>work</em></a>
          <a href="/data-security" className="lc-privacy lc-tag">Data Security &amp; Privacy</a>
        </div>
      </footer>
    </>
  );
}

type AccessCodeModalProps = {
  accessCode: string;
  error: string;
  isVerifying: boolean;
  onAccessCodeChange: (value: string) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

function AccessCodeModal({
  accessCode,
  error,
  isVerifying,
  onAccessCodeChange,
  onClose,
  onSubmit,
}: AccessCodeModalProps) {
  return (
    <div className="lc-modal-backdrop" role="presentation" onMouseDown={onClose}>
      <form className="lc-modal" onSubmit={onSubmit} onMouseDown={(event) => event.stopPropagation()}>
        <button type="button" className="lc-modal-close" onClick={onClose} aria-label="Close access-code form"><X size={20} /></button>
        <div className="lc-kicker">Client Access</div>
        <h2 className="lc-modal-title">Begin with your<br /><em>access code.</em></h2>
        <p className="lc-modal-copy">Enter the code supplied by your counsellor to begin your Lifework journey.</p>
        <label className="lc-modal-label" htmlFor="lifework-access-code">Access Code</label>
        <input
          id="lifework-access-code"
          className="lc-modal-input"
          value={accessCode}
          onChange={(event) => onAccessCodeChange(event.target.value)}
          autoComplete="off"
          autoFocus
        />
        {error && <p className="lc-modal-error" role="alert">{error}</p>}
        <button type="submit" className="lc-button" disabled={isVerifying}>{isVerifying ? "Checking…" : "Continue"} <ArrowRight size={16} /></button>
      </form>
    </div>
  );
}

export default function LifeworkLandingConcepts({ forcedConcept, reviewOnly = true }: LifeworkLandingConceptsProps) {
  const { user, isAuthenticated } = useAuth();
  const location = typeof window === "undefined" ? "/" : window.location.pathname;
  const concept = forcedConcept ?? getSlug(location);
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [accessCode, setAccessCode] = useState("");
  const [codeError, setCodeError] = useState("");

  // The public landing is deliberately a small standalone entry bundle. App
  // routes therefore need a full page navigation so main.tsx can load the
  // authenticated application bundle for /dashboard or /counselor.
  const openAppRoute = (path: string) => {
    window.location.assign(path);
  };

  const verifyCode = trpc.auth.verifyAccessCode.useMutation({
    onSuccess: (data) => {
      if (data.valid) {
        setCodeError("");
        sessionStorage.setItem("lw_access_granted", "1");
        window.location.href = getLoginUrl("/dashboard");
        return;
      }
      setCodeError("That code doesn't match. Please check with your counsellor.");
    },
    onError: () => setCodeError("Something went wrong. Please try again."),
  });

  const handleBeginJourney = () => {
    if (isAuthenticated) {
      openAppRoute("/dashboard");
      return;
    }
    if (sessionStorage.getItem("lw_access_granted") === "1") {
      window.location.href = getLoginUrl("/dashboard");
      return;
    }
    setCodeError("");
    setShowCodeModal(true);
  };

  const handleSubmitCode = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!accessCode.trim()) {
      setCodeError("Please enter your access code.");
      return;
    }
    verifyCode.mutate({ code: accessCode.trim() });
  };

  return (
    <div className="lw-concept" data-concept={concept}>
      <style>{conceptCss}</style>
      <Header
        concept={concept}
        reviewOnly={reviewOnly}
        isAuthenticated={isAuthenticated}
        userName={user?.name}
        canOpenCounsellorWorkspace={canEnterCounsellorWorkspace(user?.role)}
        onBeginJourney={handleBeginJourney}
        onOpenDashboard={() => openAppRoute("/dashboard")}
        onOpenCounsellor={() => openAppRoute("/counselor")}
      />
      <Hero concept={concept} onBeginJourney={handleBeginJourney} />
      <Guide concept={concept} />
      <VideoSection />
      <Plan />
      <Invitation onBeginJourney={handleBeginJourney} />
      <Testimonials concept={concept} />
      <Footer />
      {showCodeModal && (
        <AccessCodeModal
          accessCode={accessCode}
          error={codeError}
          isVerifying={verifyCode.isPending}
          onAccessCodeChange={setAccessCode}
          onClose={() => setShowCodeModal(false)}
          onSubmit={handleSubmitCode}
        />
      )}
    </div>
  );
}
