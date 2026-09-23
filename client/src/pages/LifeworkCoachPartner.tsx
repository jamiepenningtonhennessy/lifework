import { ArrowRight, Check, Mail } from "lucide-react";

const coachBenefits = [
  "Take the Lifework path yourself and receive your own WOW Report before you offer it to clients.",
  "Learn to lead the one-hour Lifework Coaching Conversation with confidence and care.",
  "Receive the Counsellor's Pack: the underlying methodology, psychometric briefings and practical session guidance.",
  "Use the Lifework AI tools — Alistair the Analyst and Sage the Coach — as part of a considered client journey.",
  "Offer something distinctive, substantial and genuinely valuable in a crowded coaching market.",
] as const;

const painPoints = [
  "Your qualification taught you how to coach, but not always how to build a practice people can clearly choose.",
  "You know your clients deserve more than another generic strengths exercise, questionnaire or job-search conversation.",
  "You want to charge with confidence because the work you offer has real depth and a visible outcome.",
] as const;

export default function LifeworkCoachPartner() {
  return (
    <div className="lcp">
      <style>{coachPartnerCss}</style>
      <header className="lcp-shell lcp-header">
        <a href="/" className="lcp-wordmark" aria-label="Lifework home">Life<em>work</em></a>
        <div className="lcp-running">For coaches who want to offer more</div>
        <a className="lcp-sign-in" href="/">Client sign in</a>
      </header>

      <main>
        <section className="lcp-hero">
          <div className="lcp-shell lcp-hero-grid">
            <aside className="lcp-rail" aria-hidden="true">
              <div className="lcp-rail-number">01</div>
              <div className="lcp-rail-label">Partner opportunity</div>
              <div className="lcp-rail-note">A more distinctive practice</div>
            </aside>
            <div className="lcp-hero-copy">
              <div className="lcp-kicker">Lifework for coaches</div>
              <h1>Give your clients<br /><em>something more to find.</em></h1>
              <p className="lcp-lede">You became a coach because you care about people. Building a practice that stands out — and allows you to charge with confidence — is a different skill entirely.</p>
              <div className="lcp-hero-actions">
                <a className="lcp-button" href="mailto:jamie@lifeworkpath.com?subject=Lifework%20Coach%20Partner%20Enquiry">
                  Talk to Jamie <ArrowRight size={16} />
                </a>
                <a className="lcp-text-link" href="#how-it-works">See how it works <span>↓</span></a>
              </div>
            </div>
          </div>
        </section>

        <section className="lcp-section" aria-labelledby="crowded-market-heading">
          <div className="lcp-shell lcp-grid">
            <aside className="lcp-section-rail" aria-hidden="true">
              <div className="lcp-rail-number">02</div>
              <div className="lcp-rail-label">The challenge</div>
              <div className="lcp-rail-note">A crowded market</div>
            </aside>
            <div className="lcp-main lcp-challenge-layout">
              <div>
                <div className="lcp-kicker">A familiar position</div>
                <h2 id="crowded-market-heading">You have the instinct.<br /><em>Now give it a distinctive form.</em></h2>
              </div>
              <div className="lcp-challenge-copy">
                <p>Many excellent coaches discover that accreditation alone does not tell them how to stand out, explain their value or build a commercially sustainable practice. Lifework helps you offer a deeper starting point: not a label your client is given, but a careful reading of the life they have actually lived.</p>
                <div className="lcp-pain-list">
                  {painPoints.map((point, index) => (
                    <p key={point}><span>{String(index + 1).padStart(2, "0")}</span>{point}</p>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="lcp-section lcp-process" id="how-it-works" aria-labelledby="process-heading">
          <div className="lcp-shell lcp-grid">
            <aside className="lcp-section-rail" aria-hidden="true">
              <div className="lcp-rail-number">03</div>
              <div className="lcp-rail-label">The difference</div>
              <div className="lcp-rail-note">Life history, not labels</div>
            </aside>
            <div className="lcp-main">
              <div className="lcp-kicker">What makes Lifework different</div>
              <h2 id="process-heading">Not another model<br /><em>for clients to fit themselves into.</em></h2>
              <div className="lcp-process-copy">
                <p>Lifework is a structured career-analysis programme built on life history, rather than psychometrics alone. It explores the occasions when a person was most effective, energised and fulfilled — then helps them understand the conditions that made those moments possible.</p>
                <p>The result is owned rather than assigned. Your client sees the pattern in the evidence of their own life, and can begin to make sense of what it means for their career and life now.</p>
              </div>
              <div className="lcp-evidence-grid">
                <article>
                  <strong>Six stages</strong>
                  <span>A considered journey from life history to a clear next conversation.</span>
                </article>
                <article>
                  <strong>Two AI guides</strong>
                  <span>Alistair and Sage support reflection without replacing your judgement as coach.</span>
                </article>
                <article>
                  <strong>The WOW Report</strong>
                  <span>A substantial, plain-language character study clients can return to long after the session.</span>
                </article>
              </div>
            </div>
          </div>
        </section>

        <section className="lcp-section" aria-labelledby="partner-heading">
          <div className="lcp-shell lcp-grid">
            <aside className="lcp-section-rail" aria-hidden="true">
              <div className="lcp-rail-number">04</div>
              <div className="lcp-rail-label">Your practice</div>
              <div className="lcp-rail-note">What partnership gives you</div>
            </aside>
            <div className="lcp-main">
              <div className="lcp-kicker">As a Lifework coach partner</div>
              <h2 id="partner-heading">A premium offering<br /><em>with real substance behind it.</em></h2>
              <div className="lcp-benefit-grid">
                {coachBenefits.map((benefit) => (
                  <article key={benefit}>
                    <Check size={17} aria-hidden="true" />
                    <p>{benefit}</p>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="lcp-section lcp-partnership" aria-labelledby="partnership-heading">
          <div className="lcp-shell lcp-grid">
            <aside className="lcp-section-rail" aria-hidden="true">
              <div className="lcp-rail-number">05</div>
              <div className="lcp-rail-label">The partnership</div>
            </aside>
            <div className="lcp-main lcp-partnership-main">
              <div className="lcp-community-panel">
                <div className="lcp-kicker">The community</div>
                <h2 id="partnership-heading">Coaching need not<br /><em>be solitary.</em></h2>
                <p>There is rarely a natural home for coaches between client sessions: somewhere that keeps you curious, sharp and connected to peers who care about the same work.</p>
                <p>The Lifework coach community is being built around meaningful belonging. It is not simply a webinar series or a noisy social group; it is a small, thoughtful circle of practitioners developing their work together.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="lcp-closing" aria-labelledby="closing-heading">
          <div className="lcp-shell lcp-closing-inner">
            <div className="lcp-kicker">A conversation, not a pitch</div>
            <h2 id="closing-heading">Could Lifework give your practice<br /><em>the distinctive depth it deserves?</em></h2>
            <p>If the idea feels like it might be for you, get in touch. Jamie can talk you through the programme, the partner experience and whether it fits the practice you are building.</p>
            <a className="lcp-button" href="mailto:jamie@lifeworkpath.com?subject=Lifework%20Coach%20Partner%20Enquiry">
              <Mail size={16} /> Get in touch with Jamie
            </a>
            <a className="lcp-email" href="mailto:jamie@lifeworkpath.com">jamie@lifeworkpath.com</a>
          </div>
        </section>
      </main>

      <footer className="lcp-footer">
        <div className="lcp-shell lcp-footer-inner">
          <a href="/" className="lcp-wordmark">Life<em>work</em></a>
          <span>Career Analysis · Positive Psychology</span>
          <a href="/data-security">Data Security &amp; Privacy</a>
        </div>
      </footer>
    </div>
  );
}

const coachPartnerCss = `
  .lcp {
    --lcp-paper: #f6f1e9;
    --lcp-paper-deep: #eee5d5;
    --lcp-navy: #1a2744;
    --lcp-ink: #1c2435;
    --lcp-gold: #b8862f;
    --lcp-muted: #667084;
    --lcp-rule: rgba(26, 39, 68, 0.16);
    --lcp-rule-strong: rgba(26, 39, 68, 0.35);
    background: var(--lcp-paper);
    color: var(--lcp-ink);
    font-family: "Source Serif 4", Georgia, serif;
    min-height: 100vh;
  }
  .lcp *, .lcp *::before, .lcp *::after { box-sizing: border-box; }
  .lcp-shell { width: min(1180px, calc(100% - 48px)); margin: 0 auto; }
  .lcp-header { align-items: center; border-bottom: 1px solid var(--lcp-rule); display: flex; gap: 24px; justify-content: space-between; min-height: 72px; }
  .lcp-wordmark { color: var(--lcp-navy); font-family: "Cormorant Garamond", Georgia, serif; font-size: 1.55rem; font-weight: 600; letter-spacing: -0.03em; text-decoration: none; }
  .lcp-wordmark em { color: var(--lcp-gold); font-style: italic; }
  .lcp-running, .lcp-sign-in, .lcp-kicker, .lcp-rail-label, .lcp-footer span, .lcp-footer a:not(.lcp-wordmark) { font-family: "Libre Franklin", Inter, sans-serif; font-size: 0.62rem; font-weight: 650; letter-spacing: 0.16em; line-height: 1.4; text-transform: uppercase; }
  .lcp-running { color: var(--lcp-muted); text-align: center; }
  .lcp-sign-in { border: 1px solid var(--lcp-navy); color: var(--lcp-navy); padding: 9px 14px; text-decoration: none; transition: background 160ms ease-out, color 160ms ease-out; }
  .lcp-sign-in:hover { background: var(--lcp-paper-deep); color: var(--lcp-navy); }
  .lcp-hero { border-bottom: 1px solid var(--lcp-rule-strong); }
  .lcp-hero-grid, .lcp-grid { display: grid; grid-template-columns: 112px minmax(0, 1fr); }
  .lcp-hero-grid { min-height: 616px; }
  .lcp-rail, .lcp-section-rail { border-right: 1px solid var(--lcp-rule); padding-right: 18px; }
  .lcp-rail { padding-top: 106px; }
  .lcp-rail-number { color: var(--lcp-gold); font-family: "Cormorant Garamond", Georgia, serif; font-size: 3.15rem; font-style: italic; line-height: 0.78; }
  .lcp-rail-label { color: var(--lcp-navy); font-size: 0.56rem; margin-top: 18px; }
  .lcp-rail-note { color: var(--lcp-muted); font-size: 0.79rem; font-style: italic; line-height: 1.35; margin-top: 6px; }
  .lcp-hero-copy { align-self: center; max-width: 880px; padding: 72px 0 74px clamp(30px, 6vw, 94px); }
  .lcp-kicker { align-items: center; color: var(--lcp-gold); display: flex; gap: 10px; margin-bottom: 20px; }
  .lcp-kicker::before { background: var(--lcp-gold); content: ""; display: block; height: 1px; width: 30px; }
  .lcp h1, .lcp h2, .lcp h3 { color: var(--lcp-navy); font-family: "Cormorant Garamond", Georgia, serif; font-weight: 500; letter-spacing: -0.043em; margin: 0; }
  .lcp h1 { font-size: clamp(3.5rem, 7.25vw, 6.6rem); line-height: 0.9; }
  .lcp h2 { font-size: clamp(2.55rem, 4.25vw, 4.45rem); line-height: 0.94; }
  .lcp h1 em, .lcp h2 em { color: var(--lcp-gold); font-style: italic; }
  .lcp-lede { font-size: 1.18rem; line-height: 1.63; margin: 33px 0 0; max-width: 42rem; }
  .lcp-hero-actions { align-items: center; display: flex; flex-wrap: wrap; gap: 24px; margin-top: 35px; }
  .lcp-button { align-items: center; background: var(--lcp-gold); border: 1px solid var(--lcp-gold); color: var(--lcp-navy); display: inline-flex; font-family: "Libre Franklin", Inter, sans-serif; font-size: 0.64rem; font-weight: 750; gap: 11px; letter-spacing: 0.14em; padding: 14px 18px; text-decoration: none; text-transform: uppercase; transition: background 160ms ease-out, transform 160ms ease-out; }
  .lcp-button:hover { background: #c99b45; color: var(--lcp-navy); transform: translateY(-1px); }
  .lcp-button:active { transform: scale(0.97); }
  .lcp-text-link { color: var(--lcp-navy); font-family: "Libre Franklin", Inter, sans-serif; font-size: 0.64rem; font-weight: 700; letter-spacing: 0.12em; text-decoration: none; text-transform: uppercase; }
  .lcp-text-link span { color: var(--lcp-gold); font-size: 1rem; margin-left: 5px; }
  .lcp-section { border-bottom: 1px solid var(--lcp-rule); padding: 106px 0; }
  .lcp-section-rail { padding-top: 5px; }
  .lcp-main { padding-left: clamp(30px, 6vw, 94px); }
  .lcp-challenge-layout { align-items: start; display: grid; gap: clamp(38px, 7vw, 116px); grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr); }
  .lcp-challenge-copy, .lcp-process-copy { color: var(--lcp-ink); font-size: 1.05rem; line-height: 1.7; max-width: 43rem; }
  .lcp-challenge-copy > p, .lcp-process-copy p { margin: 0 0 18px; }
  .lcp-pain-list { border-top: 1px solid var(--lcp-rule-strong); margin-top: 31px; }
  .lcp-pain-list p { align-items: baseline; border-bottom: 1px solid var(--lcp-rule); display: grid; gap: 18px; grid-template-columns: 30px 1fr; line-height: 1.54; margin: 0; padding: 18px 0; }
  .lcp-pain-list span { color: var(--lcp-gold); font-family: "Libre Franklin", Inter, sans-serif; font-size: 0.6rem; font-weight: 700; letter-spacing: 0.12em; }
  .lcp-process { background: var(--lcp-paper-deep); }
  .lcp-process-copy { margin-top: 30px; }
  .lcp-evidence-grid { border-bottom: 1px solid var(--lcp-rule-strong); border-top: 1px solid var(--lcp-rule-strong); display: grid; grid-template-columns: repeat(3, 1fr); margin-top: 42px; }
  .lcp-evidence-grid article { border-right: 1px solid var(--lcp-rule); min-height: 200px; padding: 25px 26px 27px 0; margin-right: 26px; }
  .lcp-evidence-grid article:last-child { border-right: 0; margin-right: 0; }
  .lcp-evidence-grid strong { color: var(--lcp-navy); display: block; font-family: "Cormorant Garamond", Georgia, serif; font-size: 1.72rem; font-weight: 600; letter-spacing: -0.02em; }
  .lcp-evidence-grid span { color: var(--lcp-muted); display: block; font-size: 0.93rem; line-height: 1.5; margin-top: 12px; }
  .lcp-benefit-grid { border-top: 1px solid var(--lcp-rule-strong); display: grid; grid-template-columns: repeat(2, 1fr); margin-top: 42px; }
  .lcp-benefit-grid article { align-items: start; border-bottom: 1px solid var(--lcp-rule); display: flex; gap: 12px; min-height: 122px; padding: 23px 26px 23px 0; }
  .lcp-benefit-grid article:nth-child(odd) { border-right: 1px solid var(--lcp-rule); margin-right: 30px; }
  .lcp-benefit-grid article:nth-child(even) { padding-left: 0; }
  .lcp-benefit-grid svg { color: var(--lcp-gold); flex: 0 0 auto; margin-top: 4px; }
  .lcp-benefit-grid p { font-size: 1rem; line-height: 1.55; margin: 0; }
  .lcp-partnership { background: var(--lcp-paper); }
  .lcp-partnership-main { max-width: 770px; }
  .lcp-community-panel p { font-size: 1rem; line-height: 1.65; }
  .lcp-community-panel p:first-of-type { margin-top: 28px; }
  .lcp-community-panel p { margin: 22px 0 0; }
  .lcp-closing { background: var(--lcp-paper-deep); border-bottom: 1px solid var(--lcp-rule); padding: 112px 0 100px; text-align: center; }
  .lcp-closing-inner { max-width: 880px; }
  .lcp-closing .lcp-kicker { justify-content: center; }
  .lcp-closing h2 { font-size: clamp(2.7rem, 5vw, 5rem); }
  .lcp-closing p { font-size: 1.08rem; line-height: 1.68; margin: 29px auto 32px; max-width: 43rem; }
  .lcp-email { color: var(--lcp-gold); display: block; font-family: "Libre Franklin", Inter, sans-serif; font-size: 0.65rem; font-weight: 700; letter-spacing: 0.13em; margin-top: 24px; text-decoration: none; text-transform: uppercase; }
  .lcp-footer { background: var(--lcp-paper); }
  .lcp-footer-inner { align-items: center; display: flex; gap: 20px; justify-content: space-between; min-height: 86px; }
  .lcp-footer span { color: var(--lcp-muted); text-align: center; }
  .lcp-footer a:not(.lcp-wordmark) { color: var(--lcp-gold); text-decoration: none; }
  @media (prefers-reduced-motion: reduce) { .lcp *, .lcp *::before, .lcp *::after { scroll-behavior: auto !important; transition-duration: 0.01ms !important; } }
  @media (max-width: 800px) {
    .lcp-shell { width: min(100% - 32px, 1180px); }
    .lcp-running { display: none; }
    .lcp-hero-grid, .lcp-grid { grid-template-columns: 1fr; }
    .lcp-rail, .lcp-section-rail { display: none; }
    .lcp-hero-copy, .lcp-main { padding-left: 0; }
    .lcp-hero-copy { padding: 82px 0 70px; }
    .lcp-challenge-layout { grid-template-columns: 1fr; }
    .lcp-challenge-layout { gap: 28px; }
    .lcp-section { padding: 76px 0; }
    .lcp-evidence-grid, .lcp-benefit-grid { grid-template-columns: 1fr; }
    .lcp-evidence-grid article, .lcp-evidence-grid article:last-child { border-bottom: 1px solid var(--lcp-rule); border-right: 0; margin: 0; min-height: 0; padding: 24px 0; }
    .lcp-evidence-grid article:last-child { border-bottom: 0; }
    .lcp-benefit-grid article, .lcp-benefit-grid article:nth-child(odd) { border-right: 0; margin-right: 0; min-height: 0; padding: 22px 0; }
    .lcp-closing { padding: 82px 0 72px; }
    .lcp-footer-inner { align-items: flex-start; flex-direction: column; padding: 26px 0; }
    .lcp-footer span { text-align: left; }
  }
`;
