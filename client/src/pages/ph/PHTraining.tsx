import { PHNav } from "@/components/PHNav";
import { PHFooter } from "@/components/PHFooter";
import { ExternalLink } from "lucide-react";

const MODULES = [
  { title: "Delegation & Supervision", body: "Building the habits and language of effective delegation — so work gets done well without constant oversight." },
  { title: "Feedback Conversations", body: "Giving and receiving feedback with clarity and confidence. Practised through AI-powered role-play scenarios." },
  { title: "Networking & Relationship Building", body: "A practical framework for building a professional network — not as a social exercise, but as a business development discipline." },
  { title: "Commercial Awareness", body: "Understanding the business context in which law is practised — and communicating that understanding to clients." },
  { title: "Business Writing", body: "Concise, purposeful writing for proposals, reports, and client communications." },
  { title: "Negotiation", body: "Principled negotiation skills for lawyers — from fee discussions to complex commercial deals." },
  { title: "The Talking Money Protocol", body: "A four-stage process for scoping work, agreeing estimates, working within budgets, and managing cash flow conversations with clients." },
  { title: "The 7 Step BD Process", body: "A structured, repeatable system for winning new clients and growing a practice — built around the specific realities of professional services." },
];

export default function PHTraining() {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--lw-cream)" }}>
      <PHNav />

      {/* ── Page hero ────────────────────────────────────────────────────── */}
      <section
        style={{ background: "var(--lw-navy)", paddingTop: "5rem", paddingBottom: "5rem" }}
      >
        <div className="container max-w-6xl">
          <div className="flex items-center gap-3 mb-5">
            <div style={{ width: "2.5rem", height: "1px", background: "var(--lw-gold)" }} />
            <span
              className="font-medium tracking-widest uppercase"
              style={{ fontSize: "0.7rem", color: "var(--lw-gold)", letterSpacing: "0.18em" }}
            >
              Training
            </span>
          </div>
          <h1
            className="font-serif font-bold mb-5"
            style={{ fontSize: "clamp(2rem, 4vw, 3rem)", color: "white", lineHeight: 1.2, maxWidth: "36rem" }}
          >
            Practical training.<br />
            <em style={{ color: "var(--lw-gold)" }}>Powered by AI.</em>
          </h1>
          <p
            style={{ fontSize: "1rem", color: "rgba(255,255,255,0.68)", lineHeight: 1.8, maxWidth: "40rem" }}
          >
            Highly practical programmes for law firms and professional services organisations. From core professional skills to cutting-edge AI-driven simulations — training designed to produce real, lasting behaviour change.
          </p>
        </div>
      </section>

      {/* ── AI Scenarios callout ─────────────────────────────────────────── */}
      <section className="py-20" style={{ background: "white" }}>
        <div className="container max-w-6xl">
          <div className="grid md:grid-cols-2 gap-14 items-start">
            {/* AI Scenarios panel */}
            <div
              className="p-8"
              style={{
                background: "var(--lw-navy)",
                border: "1px solid rgba(201,151,58,0.25)",
              }}
            >
              <div className="flex items-center gap-3 mb-5">
                <div style={{ width: "2rem", height: "1px", background: "var(--lw-gold)" }} />
                <span
                  className="font-medium tracking-widest uppercase"
                  style={{ fontSize: "0.65rem", color: "var(--lw-gold)", letterSpacing: "0.18em" }}
                >
                  Innovation
                </span>
              </div>
              <h2
                className="font-serif font-bold mb-4"
                style={{ fontSize: "1.5rem", color: "white" }}
              >
                AI-Powered Scenarios
              </h2>
              <p
                className="mb-4"
                style={{ fontSize: "0.88rem", color: "rgba(255,255,255,0.65)", lineHeight: 1.8 }}
              >
                I offer a suite of AI-driven role-play scenarios that allow professionals to practise difficult conversations in a psychologically safe environment. The learner is the protagonist; AI plays the other roles — consistently, realistically, and without judgment.
              </p>
              <p
                className="mb-6"
                style={{ fontSize: "0.88rem", color: "rgba(255,255,255,0.65)", lineHeight: 1.8 }}
              >
                Scenarios can be bespoke — built around your firm's specific situations — or drawn from a menu of pre-created modules covering feedback, delegation, client conversations, and more.
              </p>
              <a
                href="/ai-coaching"
                className="inline-flex items-center gap-2 text-sm font-medium tracking-widest uppercase no-underline transition-opacity hover:opacity-80"
                style={{ color: "var(--lw-gold)", letterSpacing: "0.1em" }}
              >
                See the AI Scenarios platform <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            {/* Why it works */}
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div style={{ width: "2rem", height: "1px", background: "var(--lw-gold)" }} />
                <span
                  className="font-medium tracking-widest uppercase"
                  style={{ fontSize: "0.65rem", color: "var(--lw-gold)", letterSpacing: "0.18em" }}
                >
                  Why it works
                </span>
              </div>
              <h2
                className="font-serif font-bold mb-5"
                style={{ fontSize: "clamp(1.4rem, 2.2vw, 1.9rem)", color: "var(--lw-navy)" }}
              >
                The case for AI-enhanced learning
              </h2>
              {[
                { label: "Scalable practice", text: "Every learner gets the same quality of role-play partner — regardless of group size or geography." },
                { label: "Psychological safety", text: "People take more risks, make more mistakes, and learn faster when there is no social cost to failure." },
                { label: "Individual feedback", text: "Each scenario generates personalised feedback — something a human facilitator cannot provide at scale." },
                { label: "Desk-side reinforcement", text: "Learners can return to scenarios between sessions, reinforcing skills when they are most needed." },
              ].map((item) => (
                <div key={item.label} className="mb-5 flex gap-4">
                  <div
                    className="mt-1 shrink-0"
                    style={{ width: "6px", height: "6px", background: "var(--lw-gold)", borderRadius: "50%", marginTop: "0.55rem" }}
                  />
                  <div>
                    <p
                      className="font-semibold mb-1"
                      style={{ fontSize: "0.9rem", color: "var(--lw-navy)" }}
                    >
                      {item.label}
                    </p>
                    <p style={{ fontSize: "0.87rem", color: "rgba(15,31,53,0.62)", lineHeight: 1.7 }}>
                      {item.text}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Training modules ─────────────────────────────────────────────── */}
      <section className="py-20" style={{ background: "var(--lw-cream)" }}>
        <div className="container max-w-6xl">
          <div className="flex items-center gap-3 mb-3">
            <div style={{ width: "2rem", height: "1px", background: "var(--lw-gold)" }} />
            <span
              className="font-medium tracking-widest uppercase"
              style={{ fontSize: "0.65rem", color: "var(--lw-gold)", letterSpacing: "0.18em" }}
            >
              Programmes
            </span>
          </div>
          <h2
            className="font-serif font-bold mb-12"
            style={{ fontSize: "clamp(1.5rem, 2.5vw, 2rem)", color: "var(--lw-navy)" }}
          >
            Training modules
          </h2>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {MODULES.map((m) => (
              <div
                key={m.title}
                className="p-6"
                style={{ background: "white", border: "1px solid rgba(15,31,53,0.1)" }}
              >
                <h3
                  className="font-serif font-semibold mb-3"
                  style={{ fontSize: "0.97rem", color: "var(--lw-navy)" }}
                >
                  {m.title}
                </h3>
                <p style={{ fontSize: "0.83rem", color: "rgba(15,31,53,0.58)", lineHeight: 1.7 }}>
                  {m.body}
                </p>
              </div>
            ))}
          </div>

          <p
            className="mt-8"
            style={{ fontSize: "0.85rem", color: "rgba(15,31,53,0.45)", fontStyle: "italic" }}
          >
            All programmes can be tailored to your firm's specific context and delivered in-person, online, or as a blend.
          </p>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────── */}
      <section
        className="py-16"
        style={{ background: "var(--lw-navy-mid)", borderTop: "1px solid rgba(201,151,58,0.15)" }}
      >
        <div className="container max-w-6xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div>
            <h3
              className="font-serif font-bold mb-2"
              style={{ fontSize: "1.4rem", color: "white" }}
            >
              Interested in training for your firm?
            </h3>
            <p style={{ fontSize: "0.9rem", color: "rgba(255,255,255,0.6)" }}>
              Call or email to discuss your requirements.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <a
              href="tel:07887536309"
              className="inline-flex items-center gap-2 px-6 py-3 font-medium text-sm tracking-widest uppercase no-underline transition-opacity hover:opacity-80"
              style={{
                background: "var(--lw-gold)",
                color: "var(--lw-navy)",
                letterSpacing: "0.1em",
              }}
            >
              07887 536309
            </a>
            <a
              href="mailto:jamie@penningtonhennessy.com"
              className="text-sm no-underline transition-opacity hover:opacity-80"
              style={{ color: "rgba(255,255,255,0.5)", textAlign: "center" }}
            >
              jamie@penningtonhennessy.com
            </a>
          </div>
        </div>
      </section>

      <PHFooter />
    </div>
  );
}
