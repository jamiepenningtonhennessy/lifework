import { Link } from "wouter";
import { PHNav } from "@/components/PHNav";
import { PHFooter } from "@/components/PHFooter";
import { ArrowRight, CheckCircle, Download, ChevronRight } from "lucide-react";

// ─── Brand constants ──────────────────────────────────────────────────────────
const NAVY = "var(--lw-navy)";
const NAVY_MID = "var(--lw-navy-mid)";
const GOLD = "var(--lw-gold)";
const CREAM = "var(--lw-cream)";
const CREAM_DARK = "var(--lw-cream-dark)";

// ─── Eyebrow rule component ───────────────────────────────────────────────────
function Eyebrow({ label, light = false }: { label: string; light?: boolean }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <div style={{ width: "2.5rem", height: "1px", background: GOLD }} />
      <span
        className="font-medium tracking-widest uppercase"
        style={{
          fontSize: "0.68rem",
          color: GOLD,
          letterSpacing: "0.18em",
          opacity: light ? 0.9 : 1,
        }}
      >
        {label}
      </span>
    </div>
  );
}

// ─── Gold rule divider ────────────────────────────────────────────────────────
function GoldRule() {
  return (
    <div
      style={{
        width: "3rem",
        height: "2px",
        background: GOLD,
        margin: "1.5rem 0",
      }}
    />
  );
}

// ─── Primary CTA button ───────────────────────────────────────────────────────
function CTAButton({ label = "Book a Discovery Call", href = "/coaching" }: { label?: string; href?: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 px-7 py-3.5 font-medium text-sm tracking-widest uppercase no-underline transition-opacity hover:opacity-85"
      style={{
        background: GOLD,
        color: NAVY,
        letterSpacing: "0.1em",
        fontWeight: 600,
      }}
    >
      {label} <ArrowRight className="w-4 h-4" />
    </Link>
  );
}

// ─── Secondary (outline) CTA ──────────────────────────────────────────────────
function SecondaryButton({ label, href = "#" }: { label: string; href?: string }) {
  return (
    <a
      href={href}
      className="inline-flex items-center gap-2 px-7 py-3.5 font-medium text-sm tracking-widest uppercase no-underline transition-opacity hover:opacity-80"
      style={{
        border: `1px solid rgba(201,151,58,0.55)`,
        color: GOLD,
        letterSpacing: "0.1em",
        background: "transparent",
      }}
    >
      <Download className="w-4 h-4" /> {label}
    </a>
  );
}

// ─── Stat block ───────────────────────────────────────────────────────────────
function Stat({ number, label }: { number: string; label: string }) {
  return (
    <div className="text-center">
      <div
        className="font-serif font-bold"
        style={{ fontSize: "2.6rem", color: GOLD, lineHeight: 1 }}
      >
        {number}
      </div>
      <div
        className="mt-2 text-sm tracking-wide uppercase"
        style={{ color: "rgba(255,255,255,0.55)", letterSpacing: "0.08em", fontSize: "0.72rem" }}
      >
        {label}
      </div>
    </div>
  );
}

// ─── Step card ────────────────────────────────────────────────────────────────
function Step({ number, title, body }: { number: string; title: string; body: string }) {
  return (
    <div className="flex gap-6">
      <div className="flex-shrink-0">
        <div
          className="flex items-center justify-center font-serif font-bold"
          style={{
            width: "3rem",
            height: "3rem",
            border: `1px solid ${GOLD}`,
            color: GOLD,
            fontSize: "1.1rem",
          }}
        >
          {number}
        </div>
      </div>
      <div>
        <h3
          className="font-serif font-semibold mb-2"
          style={{ fontSize: "1.15rem", color: "white" }}
        >
          {title}
        </h3>
        <p style={{ color: "rgba(255,255,255,0.65)", lineHeight: 1.75, fontSize: "0.95rem" }}>
          {body}
        </p>
      </div>
    </div>
  );
}

// ─── Outcome item ─────────────────────────────────────────────────────────────
function Outcome({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-3">
      <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: GOLD }} />
      <p style={{ color: "rgba(255,255,255,0.8)", lineHeight: 1.65, fontSize: "0.97rem" }}>{text}</p>
    </div>
  );
}

// ─── Problem card ─────────────────────────────────────────────────────────────
function ProblemCard({ label, text }: { label: string; text: string }) {
  return (
    <div
      style={{
        borderLeft: `2px solid ${GOLD}`,
        paddingLeft: "1.25rem",
      }}
    >
      <div
        className="font-medium tracking-widest uppercase mb-2"
        style={{ fontSize: "0.65rem", color: GOLD, letterSpacing: "0.15em" }}
      >
        {label}
      </div>
      <p style={{ color: "rgba(255,255,255,0.72)", lineHeight: 1.7, fontSize: "0.95rem" }}>
        {text}
      </p>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function LifeworkStorybrand() {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: CREAM }}>
      <PHNav />

      {/* ══════════════════════════════════════════════════════════════════════
          STAGE 1 — HERO: Character + Desire + CTA
      ══════════════════════════════════════════════════════════════════════ */}
      <section
        className="relative overflow-hidden"
        style={{ background: NAVY, paddingTop: "7rem", paddingBottom: "7rem" }}
      >
        {/* Subtle gold gradient wash */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "linear-gradient(135deg, rgba(201,151,58,0.07) 0%, transparent 55%)",
          }}
        />
        {/* Decorative vertical gold line */}
        <div
          className="absolute right-0 top-0 bottom-0 hidden lg:block"
          style={{ width: "1px", background: "rgba(201,151,58,0.12)", right: "28%" }}
        />

        <div className="container max-w-6xl relative">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left: copy */}
            <div>
              <Eyebrow label="Career Clarity for Professionals" />
              <h1
                className="font-serif font-bold mb-6"
                style={{
                  fontSize: "clamp(2.4rem, 5vw, 3.8rem)",
                  color: "white",
                  lineHeight: 1.12,
                }}
              >
                You already know
                <br />
                <em style={{ color: GOLD }}>something is missing.</em>
              </h1>
              <p
                className="mb-3"
                style={{
                  fontSize: "1.15rem",
                  color: "rgba(255,255,255,0.85)",
                  lineHeight: 1.75,
                  maxWidth: "36rem",
                  fontFamily: "'Playfair Display', serif",
                  fontStyle: "italic",
                }}
              >
                Find out what you were actually built to do.
              </p>
              <p
                className="mb-10"
                style={{
                  fontSize: "0.97rem",
                  color: "rgba(255,255,255,0.62)",
                  lineHeight: 1.8,
                  maxWidth: "34rem",
                }}
              >
                Lifework is a structured, evidence-based career analysis programme for professionals who want more than a new job — they want the right one.
              </p>
              <div className="flex flex-wrap gap-4">
                <CTAButton label="Book a Discovery Call" href="/coaching" />
                <SecondaryButton label="What Lifework Reveals" href="#guide" />
              </div>
            </div>

            {/* Right: authority stats panel */}
            <div
              className="hidden lg:block"
              style={{
                border: `1px solid rgba(201,151,58,0.2)`,
                padding: "2.5rem",
                background: "rgba(255,255,255,0.03)",
              }}
            >
              <p
                className="font-serif italic mb-8"
                style={{ color: "rgba(255,255,255,0.7)", lineHeight: 1.75, fontSize: "1.05rem" }}
              >
                "The ones who thrive are not the ones who are most technically skilled. They are the ones who know what they are for."
              </p>
              <div
                className="text-sm font-medium tracking-wide uppercase mb-8"
                style={{ color: GOLD, fontSize: "0.72rem", letterSpacing: "0.12em" }}
              >
                — Mark Brandon, Pennington Hennessy
              </div>
              <div
                style={{ borderTop: "1px solid rgba(201,151,58,0.2)", paddingTop: "2rem" }}
              >
                <div className="grid grid-cols-3 gap-6">
                  <Stat number="965" label="Individual analyses" />
                  <Stat number="30+" label="Years of practice" />
                  <Stat number="3" label="Validated instruments" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Mobile stats bar */}
      <div
        className="lg:hidden"
        style={{ background: NAVY_MID, borderTop: "1px solid rgba(201,151,58,0.15)", padding: "2rem 0" }}
      >
        <div className="container max-w-6xl">
          <div className="grid grid-cols-3 gap-4">
            <Stat number="965" label="Analyses" />
            <Stat number="30+" label="Years" />
            <Stat number="3" label="Instruments" />
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          STAGE 2 — PROBLEM: External / Internal / Philosophical
      ══════════════════════════════════════════════════════════════════════ */}
      <section
        style={{
          background: NAVY_MID,
          paddingTop: "5rem",
          paddingBottom: "5rem",
          borderTop: "1px solid rgba(201,151,58,0.12)",
        }}
      >
        <div className="container max-w-6xl">
          <div className="grid lg:grid-cols-2 gap-16 items-start">
            <div>
              <Eyebrow label="The problem" />
              <h2
                className="font-serif font-bold mb-6"
                style={{ fontSize: "clamp(1.8rem, 3.5vw, 2.6rem)", color: "white", lineHeight: 1.2 }}
              >
                Most career advice tells you what to do.
                <br />
                <em style={{ color: GOLD }}>It never asks who you are.</em>
              </h2>
              <p style={{ color: "rgba(255,255,255,0.65)", lineHeight: 1.8, fontSize: "0.97rem", maxWidth: "34rem" }}>
                Conventional career guidance starts in the wrong place. It looks at the market, at your CV, at what is hiring. It treats you as a set of transferable skills to be repositioned. It does not ask the more important question: what kind of work would genuinely suit this particular person?
              </p>
              <GoldRule />
              <p style={{ color: "rgba(255,255,255,0.65)", lineHeight: 1.8, fontSize: "0.97rem", maxWidth: "34rem" }}>
                The result is a career that looks fine from the outside but feels like wearing someone else's suit. You are competent. You are probably respected. But you are not quite <em style={{ color: "rgba(255,255,255,0.85)" }}>you</em>.
              </p>
            </div>

            <div className="flex flex-col gap-8">
              <ProblemCard
                label="The surface problem"
                text="You have a successful career on paper, but you are not sure it is the right one. Job applications feel like guesswork. You keep landing in roles that look right but feel slightly off."
              />
              <ProblemCard
                label="How it feels"
                text="You feel vaguely fraudulent — as if you have been playing a character rather than being yourself. You are not sure whether the problem is the industry, the firm, the role, or something about you that you cannot quite name."
              />
              <ProblemCard
                label="Why it matters"
                text="You should not have to spend thirty years in work that does not fit. Your career should be built on who you actually are — not on what you happened to fall into, or what looked impressive at twenty-two."
              />
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          STAGE 3 — GUIDE: Empathy + Authority
      ══════════════════════════════════════════════════════════════════════ */}
      <section
        id="guide"
        style={{
          background: CREAM,
          paddingTop: "5.5rem",
          paddingBottom: "5.5rem",
        }}
      >
        <div className="container max-w-6xl">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left: empathy + authority copy */}
            <div>
              <Eyebrow label="Thirty years. 965 clients." />
              <h2
                className="font-serif font-bold mb-6"
                style={{ fontSize: "clamp(1.8rem, 3.5vw, 2.6rem)", color: NAVY, lineHeight: 1.2 }}
              >
                We have heard this
                <br />
                <em style={{ color: GOLD }}>many times before.</em>
              </h2>
              <p style={{ color: "rgba(15,31,53,0.7)", lineHeight: 1.8, fontSize: "0.97rem", marginBottom: "1.5rem" }}>
                We know how hard it is to name the feeling — the sense that your career is slightly out of register with who you are. We know how much it costs, in energy and in confidence, to keep performing a version of yourself that does not quite fit.
              </p>
              <p style={{ color: "rgba(15,31,53,0.7)", lineHeight: 1.8, fontSize: "0.97rem", marginBottom: "2rem" }}>
                The Lifework programme was developed by Mark Brandon of Pennington Hennessy, drawing on the Haldane Dependable Strengths methodology — one of the most rigorous frameworks in career analysis. Over three decades and nearly a thousand individual analyses, one finding has remained consistent: when people do work that aligns with their genuine strengths and motivations, they do not just perform better. They feel like themselves.
              </p>
              <div className="flex flex-col gap-3">
                {[
                  "Methodology rooted in Bernard Haldane's Dependable Strengths framework",
                  "Three validated psychometric instruments: VIA, OCEAN, Insights",
                  "965 individual career analyses since 1994",
                  "Thirty years working with lawyers and professional services professionals",
                ].map((item) => (
                  <div key={item} className="flex items-start gap-3">
                    <div
                      style={{
                        width: "5px",
                        height: "5px",
                        borderRadius: "50%",
                        background: GOLD,
                        flexShrink: 0,
                        marginTop: "0.55rem",
                      }}
                    />
                    <p style={{ color: "rgba(15,31,53,0.72)", fontSize: "0.93rem", lineHeight: 1.65 }}>{item}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Mark Brandon profile card */}
            <div
              style={{
                background: NAVY,
                padding: "2.5rem",
                border: `1px solid rgba(201,151,58,0.2)`,
              }}
            >
              <div className="flex items-start gap-5 mb-6">
                <img
                  src="https://d2xsxph8kpxj0f.cloudfront.net/107696804/kFbbE6kqNApXGDFpQJUGV7/ph_logo_white_50c7173c.png"
                  alt="Pennington Hennessy"
                  style={{ height: "36px", width: "auto", objectFit: "contain", flexShrink: 0, marginTop: "4px" }}
                />
              </div>
              <blockquote
                className="font-serif italic mb-6"
                style={{ color: "rgba(255,255,255,0.82)", lineHeight: 1.8, fontSize: "1.05rem", borderLeft: `2px solid ${GOLD}`, paddingLeft: "1.25rem" }}
              >
                "I have worked with lawyers and professionals for thirty years. The ones who thrive are not the ones who are most technically skilled. They are the ones who know what they are for."
              </blockquote>
              <div style={{ color: GOLD, fontSize: "0.78rem", letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 600 }}>
                Mark Brandon
              </div>
              <div style={{ color: "rgba(255,255,255,0.45)", fontSize: "0.78rem", marginTop: "0.25rem" }}>
                Founder, Pennington Hennessy
              </div>
              <div style={{ borderTop: "1px solid rgba(201,151,58,0.15)", marginTop: "2rem", paddingTop: "1.75rem" }}>
                <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.82rem", lineHeight: 1.65 }}>
                  Pennington Hennessy has worked with individuals and organisations across law, finance, and professional services since 1994.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          STAGE 4 — PLAN: Three-step process
      ══════════════════════════════════════════════════════════════════════ */}
      <section
        style={{
          background: NAVY,
          paddingTop: "5.5rem",
          paddingBottom: "5.5rem",
          borderTop: "1px solid rgba(201,151,58,0.12)",
        }}
      >
        <div className="container max-w-6xl">
          <div className="max-w-2xl mb-14">
            <Eyebrow label="How it works" />
            <h2
              className="font-serif font-bold mb-4"
              style={{ fontSize: "clamp(1.8rem, 3.5vw, 2.6rem)", color: "white", lineHeight: 1.2 }}
            >
              A clear process.
              <br />
              <em style={{ color: GOLD }}>A clear outcome.</em>
            </h2>
            <p style={{ color: "rgba(255,255,255,0.6)", lineHeight: 1.8, fontSize: "0.97rem" }}>
              Three structured stages, each building on the last. The process takes four to six weeks from first conversation to coaching session.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-10">
            {/* Step connector line — desktop only */}
            <div className="md:col-span-3 hidden md:flex items-center gap-0 mb-2 -mt-6">
              <div style={{ flex: 1, height: "1px", background: "rgba(201,151,58,0.2)" }} />
            </div>

            {[
              {
                n: "01",
                title: "Tell your story",
                body: "You complete a structured life history interview, decade by decade, identifying the achievements that gave you genuine satisfaction — not the ones that looked good, but the ones that felt right. This is the raw material of everything that follows.",
              },
              {
                n: "02",
                title: "Complete the analysis",
                body: "Three validated psychometric instruments — VIA Character Strengths, the OCEAN personality profile, and Insights colour energies — add an objective layer to the life history. Together, they reveal patterns that are consistent, specific, and yours.",
              },
              {
                n: "03",
                title: "Your coaching session",
                body: "Mark works through the findings with you in a focused one-to-one session. You leave with a written report, a clear picture of your distinctive strengths, and a specific answer to the question you came with.",
              },
            ].map((step) => (
              <div
                key={step.n}
                style={{
                  borderTop: `2px solid ${GOLD}`,
                  paddingTop: "1.75rem",
                }}
              >
                <div
                  className="font-serif font-bold mb-4"
                  style={{ fontSize: "2.2rem", color: "rgba(201,151,58,0.3)", lineHeight: 1 }}
                >
                  {step.n}
                </div>
                <h3
                  className="font-serif font-semibold mb-3"
                  style={{ fontSize: "1.15rem", color: "white" }}
                >
                  {step.title}
                </h3>
                <p style={{ color: "rgba(255,255,255,0.6)", lineHeight: 1.75, fontSize: "0.93rem" }}>
                  {step.body}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-14 flex flex-wrap gap-4">
            <CTAButton label="Book a Discovery Call" href="/coaching" />
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          STAGE 5 — CTA: Prominent mid-page call to action
      ══════════════════════════════════════════════════════════════════════ */}
      <section
        style={{
          background: GOLD,
          paddingTop: "4rem",
          paddingBottom: "4rem",
        }}
      >
        <div className="container max-w-6xl">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div>
              <h2
                className="font-serif font-bold mb-2"
                style={{ fontSize: "clamp(1.5rem, 3vw, 2rem)", color: NAVY, lineHeight: 1.2 }}
              >
                Ready to find out what you were built to do?
              </h2>
              <p style={{ color: "rgba(15,31,53,0.7)", fontSize: "0.97rem" }}>
                A 30-minute discovery call. No obligation. No jargon.
              </p>
            </div>
            <Link
              href="/coaching"
              className="inline-flex items-center gap-2 px-8 py-4 font-medium text-sm tracking-widest uppercase no-underline transition-opacity hover:opacity-85 flex-shrink-0"
              style={{
                background: NAVY,
                color: "white",
                letterSpacing: "0.1em",
                fontWeight: 600,
              }}
            >
              Book a Discovery Call <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          STAGE 6 — FAILURE: The cost of inaction
      ══════════════════════════════════════════════════════════════════════ */}
      <section
        style={{
          background: CREAM_DARK,
          paddingTop: "5.5rem",
          paddingBottom: "5.5rem",
          borderTop: "1px solid rgba(15,31,53,0.08)",
        }}
      >
        <div className="container max-w-6xl">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <Eyebrow label="The cost of staying" />
              <h2
                className="font-serif font-bold mb-6"
                style={{ fontSize: "clamp(1.8rem, 3.5vw, 2.6rem)", color: NAVY, lineHeight: 1.2 }}
              >
                Most people who feel this way
                <br />
                <em style={{ color: GOLD }}>do not act on it.</em>
              </h2>
              <p style={{ color: "rgba(15,31,53,0.7)", lineHeight: 1.8, fontSize: "0.97rem", marginBottom: "1.5rem" }}>
                They tell themselves it is not that bad. They apply for another role that looks similar to the last one. They wait for the right opportunity to present itself. Years pass.
              </p>
              <p style={{ color: "rgba(15,31,53,0.7)", lineHeight: 1.8, fontSize: "0.97rem" }}>
                The research on career misalignment is unambiguous: it affects performance, health, relationships, and — most insidiously — self-perception. People who spend years in work that does not fit begin to believe that the discomfort is their fault. That they are not trying hard enough. That this is simply what work feels like.
              </p>
              <GoldRule />
              <p
                className="font-serif italic"
                style={{ color: NAVY, fontSize: "1.05rem", lineHeight: 1.7 }}
              >
                It is not. And you do not have to find out the hard way.
              </p>
            </div>

            {/* Right: contrast panel */}
            <div className="grid gap-4">
              <div
                style={{
                  background: "rgba(15,31,53,0.06)",
                  border: "1px solid rgba(15,31,53,0.1)",
                  padding: "1.75rem",
                }}
              >
                <div
                  className="font-medium tracking-widest uppercase mb-3"
                  style={{ fontSize: "0.65rem", color: "rgba(15,31,53,0.45)", letterSpacing: "0.15em" }}
                >
                  Without Lifework
                </div>
                {[
                  "Another role that looks right but feels wrong",
                  "Years of vague dissatisfaction you cannot name",
                  "Competence without conviction",
                  "The growing sense that this is simply what work is",
                ].map((t) => (
                  <div key={t} className="flex items-start gap-3 mb-2">
                    <div style={{ color: "rgba(15,31,53,0.35)", marginTop: "2px", fontSize: "1rem" }}>—</div>
                    <p style={{ color: "rgba(15,31,53,0.6)", fontSize: "0.92rem", lineHeight: 1.6 }}>{t}</p>
                  </div>
                ))}
              </div>
              <div
                style={{
                  background: NAVY,
                  border: `1px solid rgba(201,151,58,0.25)`,
                  padding: "1.75rem",
                }}
              >
                <div
                  className="font-medium tracking-widest uppercase mb-3"
                  style={{ fontSize: "0.65rem", color: GOLD, letterSpacing: "0.15em" }}
                >
                  With Lifework
                </div>
                {[
                  "A clear, written account of your distinctive strengths",
                  "Language for who you are that works in any room",
                  "Confidence to pursue work that is genuinely yours",
                  "A specific answer to the question you came with",
                ].map((t) => (
                  <div key={t} className="flex items-start gap-3 mb-2">
                    <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: GOLD }} />
                    <p style={{ color: "rgba(255,255,255,0.75)", fontSize: "0.92rem", lineHeight: 1.6 }}>{t}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          STAGE 7 — SUCCESS: The transformation
      ══════════════════════════════════════════════════════════════════════ */}
      <section
        style={{
          background: NAVY,
          paddingTop: "5.5rem",
          paddingBottom: "5.5rem",
          borderTop: "1px solid rgba(201,151,58,0.12)",
        }}
      >
        <div className="container max-w-6xl">
          <div className="max-w-2xl mb-14">
            <Eyebrow label="What clarity feels like" />
            <h2
              className="font-serif font-bold mb-6"
              style={{ fontSize: "clamp(1.8rem, 3.5vw, 2.6rem)", color: "white", lineHeight: 1.2 }}
            >
              Not surprise.
              <br />
              <em style={{ color: GOLD }}>Recognition.</em>
            </h2>
            <p style={{ color: "rgba(255,255,255,0.65)", lineHeight: 1.8, fontSize: "0.97rem" }}>
              Clients who complete the Lifework programme describe a consistent experience: the analysis names things they already half-knew but had never been able to articulate. It gives them a language for their strengths that is specific enough to be useful — in interviews, in conversations with partners and managers, in their own thinking about what comes next.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-14">
            <Outcome text="A clear, written account of your distinctive strengths and motivations — not generic, but specific to you." />
            <Outcome text="An understanding of the environments and conditions in which you do your best work." />
            <Outcome text="A specific, evidence-based answer to the question you came with — whether that is which roles to pursue, which environments to avoid, or what a fulfilling second act might look like." />
            <Outcome text="The confidence to pursue work that is genuinely yours — and the language to explain why it fits." />
          </div>

          {/* Final testimonial */}
          <div
            style={{
              borderTop: "1px solid rgba(201,151,58,0.2)",
              paddingTop: "3rem",
              maxWidth: "42rem",
            }}
          >
            <blockquote
              className="font-serif italic mb-5"
              style={{ color: "rgba(255,255,255,0.82)", lineHeight: 1.8, fontSize: "1.1rem" }}
            >
              "I have worked with lawyers and professionals for thirty years. The ones who thrive are not the ones who are most technically skilled. They are the ones who know what they are for."
            </blockquote>
            <div style={{ color: GOLD, fontSize: "0.78rem", letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 600 }}>
              Mark Brandon — Pennington Hennessy
            </div>
          </div>

          {/* Final CTA */}
          <div className="mt-14 flex flex-wrap gap-4 items-center">
            <CTAButton label="Book a Discovery Call" href="/coaching" />
            <span style={{ color: "rgba(255,255,255,0.35)", fontSize: "0.85rem" }}>
              Thirty minutes. No obligation. A conversation that might change the next thirty years.
            </span>
          </div>
        </div>
      </section>

      <PHFooter />
    </div>
  );
}
