import { ArrowUpRight, Play, ShieldCheck } from "lucide-react";

const clientVideos = [
  {
    number: "01",
    stage: "Life History",
    title: "Begin with lived experience",
    description: "Why Lifework starts with an unbounded account of the moments that have mattered most.",
    src: "/manus-storage/lifework_step1_life_history_explainer_eeeee55c.mp4",
  },
  {
    number: "02",
    stage: "Background & Career",
    title: "Add the context around the story",
    description: "How family culture, work environments and reflective career memories deepen the picture.",
    src: "/manus-storage/lifework_step2_background_career_explainer_839de757.mp4",
  },
  {
    number: "03",
    stage: "Sage Conversation",
    title: "Stay with the detail",
    description: "How Sage uses direct, curious questions to make individual memories more vivid and useful.",
    src: "/manus-storage/lifework_stage3_sage_conversation_explainer_9ae1669b.mp4",
  },
  {
    number: "04",
    stage: "Psychometrics",
    title: "Use lenses, not verdicts",
    description: "Why VIA Character Strengths and OCEAN follow the life history, rather than replacing it.",
    src: "/manus-storage/lifework_stage4_psychometrics_explainer_dce111a1.mp4",
  },
  {
    number: "05",
    stage: "Report & Coaching",
    title: "Make sense of what is now clear",
    description: "How the WoW report and a prepared coaching conversation turn evidence into a considered next step.",
    src: "/manus-storage/lifework_final_alistair_report_and_coaching_explainer_81089006.mp4",
  },
] as const;

const clientVideosCss = `
  .lw-accreditation {
    --paper: #f6f1e9;
    --paper-deep: #eee6d6;
    --navy: #1a2744;
    --ink: #1d2638;
    --gold: #b8862f;
    --muted: #677083;
    --rule: rgba(26, 39, 68, 0.16);
    --rule-strong: rgba(26, 39, 68, 0.34);
    min-height: 100vh;
    background: var(--paper);
    color: var(--ink);
    font-family: "Source Serif 4", Georgia, serif;
  }
  .lw-accreditation *, .lw-accreditation *::before, .lw-accreditation *::after { box-sizing: border-box; }
  .lw-accreditation .la-shell { width: min(1280px, calc(100% - 48px)); margin: 0 auto; }
  .lw-accreditation .la-sans { font-family: "Libre Franklin", Inter, sans-serif; }
  .lw-accreditation .la-header { min-height: 74px; display: flex; align-items: center; justify-content: space-between; gap: 22px; border-bottom: 1px solid var(--rule); }
  .lw-accreditation .la-wordmark { color: var(--navy); font-family: "Cormorant Garamond", Georgia, serif; font-size: 1.58rem; font-weight: 600; letter-spacing: -0.035em; text-decoration: none; }
  .lw-accreditation .la-wordmark em { color: var(--gold); font-style: italic; }
  .lw-accreditation .la-header-label, .lw-accreditation .la-kicker, .lw-accreditation .la-stage, .lw-accreditation .la-note-label, .lw-accreditation .la-footer { font-family: "Libre Franklin", Inter, sans-serif; font-size: 0.6rem; font-weight: 700; letter-spacing: 0.17em; line-height: 1.4; text-transform: uppercase; }
  .lw-accreditation .la-header-label { color: var(--muted); text-align: right; }
  .lw-accreditation .la-hero { padding: 68px 0 42px; border-bottom: 1px solid var(--rule-strong); }
  .lw-accreditation .la-hero-grid { display: grid; grid-template-columns: minmax(0, 1fr) minmax(290px, 0.62fr); gap: clamp(34px, 7vw, 104px); align-items: end; }
  .lw-accreditation .la-kicker { display: flex; align-items: center; gap: 10px; color: var(--gold); }
  .lw-accreditation .la-kicker::before { content: ""; width: 30px; height: 1px; background: var(--gold); }
  .lw-accreditation h1 { margin: 18px 0 0; max-width: 760px; color: var(--navy); font-family: "Cormorant Garamond", Georgia, serif; font-size: clamp(3.1rem, 6vw, 5.9rem); font-weight: 500; line-height: 0.93; letter-spacing: -0.045em; }
  .lw-accreditation h1 em { color: var(--gold); font-style: italic; }
  .lw-accreditation .la-intro { margin: 22px 0 0; max-width: 43rem; font-size: 1.1rem; line-height: 1.64; }
  .lw-accreditation .la-intro strong { color: var(--navy); font-weight: 600; }
  .lw-accreditation .la-sequence-note { display: flex; gap: 14px; align-items: flex-start; padding: 20px 0 4px; border-top: 1px solid var(--rule-strong); color: var(--muted); font-size: 0.95rem; line-height: 1.55; }
  .lw-accreditation .la-sequence-note svg { flex: 0 0 auto; margin-top: 2px; color: var(--gold); }
  .lw-accreditation .la-library { padding: 37px 0 60px; }
  .lw-accreditation .la-library-heading { display: flex; align-items: baseline; justify-content: space-between; gap: 20px; margin-bottom: 23px; }
  .lw-accreditation h2 { margin: 0; color: var(--navy); font-family: "Cormorant Garamond", Georgia, serif; font-size: clamp(2rem, 3.2vw, 3rem); font-weight: 500; letter-spacing: -0.035em; }
  .lw-accreditation h2 em { color: var(--gold); font-style: italic; }
  .lw-accreditation .la-library-heading p { margin: 0; color: var(--muted); font-size: 0.92rem; font-style: italic; }
  .lw-accreditation .la-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 22px; }
  .lw-accreditation .la-card { display: flex; flex-direction: column; min-width: 0; border-top: 1px solid var(--rule-strong); background: rgba(255, 255, 255, 0.26); }
  .lw-accreditation .la-card-head { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 13px; align-items: baseline; padding: 15px 0 13px; }
  .lw-accreditation .la-number { color: var(--gold); font-family: "Cormorant Garamond", Georgia, serif; font-size: 2.15rem; font-style: italic; line-height: 0.75; }
  .lw-accreditation .la-stage { color: var(--navy); }
  .lw-accreditation .la-video { position: relative; aspect-ratio: 16 / 9; overflow: hidden; background: var(--navy); border: 1px solid rgba(184, 134, 47, 0.78); }
  .lw-accreditation .la-video video { display: block; width: 100%; height: 100%; object-fit: contain; }
  .lw-accreditation .la-card-copy { padding: 14px 2px 7px; }
  .lw-accreditation h3 { margin: 0; color: var(--navy); font-family: "Cormorant Garamond", Georgia, serif; font-size: 1.48rem; font-weight: 600; line-height: 1.08; }
  .lw-accreditation .la-card-copy p { margin: 8px 0 0; color: var(--muted); font-size: 0.92rem; line-height: 1.48; }
  .lw-accreditation .la-card:last-child { grid-column: span 1; }
  .lw-accreditation .la-note { margin-top: 46px; display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 15px; align-items: start; padding: 21px 0; border-top: 1px solid var(--rule-strong); border-bottom: 1px solid var(--rule); }
  .lw-accreditation .la-note-label { color: var(--gold); padding-top: 3px; }
  .lw-accreditation .la-note p { margin: 0; max-width: 60rem; color: var(--ink); font-size: 0.98rem; line-height: 1.6; }
  .lw-accreditation .la-footer { display: flex; align-items: center; justify-content: space-between; gap: 24px; min-height: 84px; border-top: 1px solid var(--rule); color: var(--muted); }
  .lw-accreditation .la-back { display: inline-flex; align-items: center; gap: 8px; color: var(--gold); text-decoration: none; }
  .lw-accreditation .la-back:hover { color: var(--navy); }
  @media (max-width: 980px) {
    .lw-accreditation .la-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  }
  @media (max-width: 680px) {
    .lw-accreditation .la-shell { width: min(100% - 32px, 1280px); }
    .lw-accreditation .la-header-label { display: none; }
    .lw-accreditation .la-hero { padding: 50px 0 32px; }
    .lw-accreditation .la-hero-grid, .lw-accreditation .la-grid { grid-template-columns: 1fr; }
    .lw-accreditation .la-library-heading { display: block; }
    .lw-accreditation .la-library-heading p { margin-top: 8px; }
    .lw-accreditation .la-footer { align-items: flex-start; flex-direction: column; justify-content: center; padding: 18px 0; }
  }
`;

export default function LifeworkClientVideoLibrary() {
  return (
    <div className="lw-accreditation">
      <style>{clientVideosCss}</style>
      <header className="la-shell la-header">
        <a className="la-wordmark" href="https://lifeworkpath.com/" aria-label="LifeworkPath home">Life<em>work</em></a>
        <div className="la-header-label">Client experience<br />Video library</div>
      </header>

      <main>
        <section className="la-shell la-hero">
          <div className="la-hero-grid">
            <div>
              <div className="la-kicker">The Lifework client journey</div>
              <h1>The client journey,<br /><em>in sequence.</em></h1>
              <p className="la-intro">Five short films that introduce each client stage, from an open life history through to the WoW report and coaching conversation. <strong>Watch them in order:</strong> the sequence is central to the Lifework method.</p>
            </div>
            <aside className="la-sequence-note">
              <ShieldCheck size={21} aria-hidden="true" />
              <span>These client-facing introductions explain the purpose of each stage without interpreting an individual client’s experience for them.</span>
            </aside>
          </div>
        </section>

        <section className="la-shell la-library" aria-labelledby="video-library-heading">
          <div className="la-library-heading">
            <h2 id="video-library-heading">The five <em>client films.</em></h2>
            <p>Short, sequential and ready to review.</p>
          </div>
          <div className="la-grid">
            {clientVideos.map((video) => (
              <article className="la-card" key={video.number}>
                <div className="la-card-head">
                  <span className="la-number">{video.number}</span>
                  <span className="la-stage">{video.stage}</span>
                </div>
                <div className="la-video">
                  <video src={video.src} controls playsInline preload="metadata" title={`${video.stage}: ${video.title}`} />
                </div>
                <div className="la-card-copy">
                  <h3>{video.title}</h3>
                  <p>{video.description}</p>
                </div>
              </article>
            ))}
          </div>
          <div className="la-note">
            <div className="la-note-label">About these films</div>
            <p>Each film introduces one stage of the Lifework process. Together, they show why the journey begins with lived experience and moves carefully towards a considered coaching conversation.</p>
          </div>
        </section>
      </main>

      <footer className="la-shell la-footer">
        <span>© Lifework · Client video library</span>
        <a className="la-back" href="https://lifeworkpath.com/">LifeworkPath home <ArrowUpRight size={14} /></a>
      </footer>
    </div>
  );
}
