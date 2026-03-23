import { Link } from "wouter";
import { PHNav } from "@/components/PHNav";
import { PHFooter } from "@/components/PHFooter";
import { ArrowRight } from "lucide-react";

const CLIENTS = [
  "Reed Smith", "Latham & Watkins", "Stewarts", "Potter Clarkson",
  "Keystone Law", "Roythornes", "Kingsley Napley", "Ankura",
  "Edge Health", "Schroders",
];

export default function PHHome() {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--lw-cream)" }}>
      <PHNav />

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section
        className="relative overflow-hidden"
        style={{ background: "var(--lw-navy)", paddingTop: "6rem", paddingBottom: "6rem" }}
      >
        {/* Subtle diagonal accent */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "linear-gradient(135deg, rgba(201,151,58,0.06) 0%, transparent 60%)",
          }}
        />
        <div className="container max-w-6xl relative">
          <div className="max-w-2xl">
            <div className="flex items-center gap-3 mb-6">
              <div style={{ width: "2.5rem", height: "1px", background: "var(--lw-gold)" }} />
              <span
                className="font-medium tracking-widest uppercase"
                style={{ fontSize: "0.7rem", color: "var(--lw-gold)", letterSpacing: "0.18em" }}
              >
                Professional Development
              </span>
            </div>
            <h1
              className="font-serif font-bold mb-6"
              style={{ fontSize: "clamp(2.4rem, 5vw, 3.6rem)", color: "white", lineHeight: 1.15 }}
            >
              The modern mentor<br />
              <em style={{ color: "var(--lw-gold)" }}>for the modern lawyer.</em>
            </h1>
            <p
              className="mb-8"
              style={{ fontSize: "1.05rem", color: "rgba(255,255,255,0.72)", lineHeight: 1.75, maxWidth: "38rem" }}
            >
              Thirty years working with lawyers and professional services firms — helping individuals and organisations develop the skills, confidence, and commercial awareness they need to thrive.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link
                href="/ph/coaching"
                className="inline-flex items-center gap-2 px-6 py-3 font-medium text-sm tracking-widest uppercase no-underline transition-opacity hover:opacity-80"
                style={{
                  background: "var(--lw-gold)",
                  color: "var(--lw-navy)",
                  letterSpacing: "0.1em",
                }}
              >
                Coaching <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/ph/training"
                className="inline-flex items-center gap-2 px-6 py-3 font-medium text-sm tracking-widest uppercase no-underline transition-opacity hover:opacity-80"
                style={{
                  border: "1px solid rgba(201,151,58,0.6)",
                  color: "var(--lw-gold)",
                  background: "transparent",
                  letterSpacing: "0.1em",
                }}
              >
                Training <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Clients strip ────────────────────────────────────────────────── */}
      <section
        style={{ background: "var(--lw-navy-mid)", borderBottom: "1px solid rgba(201,151,58,0.15)" }}
      >
        <div className="container max-w-6xl py-5">
          <div className="flex flex-wrap items-center gap-x-8 gap-y-2">
            <span
              className="font-medium tracking-widest uppercase shrink-0"
              style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.35)", letterSpacing: "0.15em" }}
            >
              Selected clients
            </span>
            {CLIENTS.map((c) => (
              <span
                key={c}
                style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.45)", fontWeight: 500 }}
              >
                {c}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Two pillars ──────────────────────────────────────────────────── */}
      <section className="container max-w-6xl py-20">
        <div className="flex items-center gap-3 mb-3">
          <div style={{ width: "2rem", height: "1px", background: "var(--lw-gold)" }} />
          <span
            className="font-medium tracking-widest uppercase"
            style={{ fontSize: "0.65rem", color: "var(--lw-gold)", letterSpacing: "0.18em" }}
          >
            What I do
          </span>
        </div>
        <h2
          className="font-serif font-bold mb-12"
          style={{ fontSize: "clamp(1.8rem, 3vw, 2.4rem)", color: "var(--lw-navy)" }}
        >
          Two disciplines. One purpose.
        </h2>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Coaching card */}
          <div
            className="p-8 flex flex-col"
            style={{ background: "white", border: "1px solid rgba(15,31,53,0.1)" }}
          >
            <div
              className="w-10 h-10 flex items-center justify-center mb-6 font-serif font-bold text-lg"
              style={{ border: "1px solid var(--lw-gold)", color: "var(--lw-gold)" }}
            >
              01
            </div>
            <h3
              className="font-serif font-bold mb-3"
              style={{ fontSize: "1.4rem", color: "var(--lw-navy)" }}
            >
              Coaching
            </h3>
            <p style={{ color: "rgba(15,31,53,0.65)", lineHeight: 1.75, fontSize: "0.92rem", flex: 1 }}>
              Bespoke coaching for individuals and groups — covering leadership and practice development, business development, and career transition. Underpinned by the <em>Take Counsel</em> methodology: a deep exploration of life history that reveals the patterns of motivation and behaviour that shape a career.
            </p>
            <div className="mt-6 pt-6" style={{ borderTop: "1px solid rgba(15,31,53,0.08)" }}>
              <Link
                href="/ph/coaching"
                className="inline-flex items-center gap-2 text-sm font-medium tracking-widest uppercase no-underline transition-opacity hover:opacity-70"
                style={{ color: "var(--lw-gold)", letterSpacing: "0.1em" }}
              >
                Explore coaching <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Training card */}
          <div
            className="p-8 flex flex-col"
            style={{ background: "white", border: "1px solid rgba(15,31,53,0.1)" }}
          >
            <div
              className="w-10 h-10 flex items-center justify-center mb-6 font-serif font-bold text-lg"
              style={{ border: "1px solid var(--lw-gold)", color: "var(--lw-gold)" }}
            >
              02
            </div>
            <h3
              className="font-serif font-bold mb-3"
              style={{ fontSize: "1.4rem", color: "var(--lw-navy)" }}
            >
              Training
            </h3>
            <p style={{ color: "rgba(15,31,53,0.65)", lineHeight: 1.75, fontSize: "0.92rem", flex: 1 }}>
              Highly practical programmes for law firms and professional services organisations — from core professional skills to AI-powered role-play scenarios. In partnership with Qinect, I offer cutting-edge simulations that let professionals practise difficult conversations in a psychologically safe environment.
            </p>
            <div className="mt-6 pt-6" style={{ borderTop: "1px solid rgba(15,31,53,0.08)" }}>
              <Link
                href="/ph/training"
                className="inline-flex items-center gap-2 text-sm font-medium tracking-widest uppercase no-underline transition-opacity hover:opacity-70"
                style={{ color: "var(--lw-gold)", letterSpacing: "0.1em" }}
              >
                Explore training <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Quote / philosophy ───────────────────────────────────────────── */}
      <section
        className="py-20"
        style={{ background: "var(--lw-navy)" }}
      >
        <div className="container max-w-6xl">
          <div className="max-w-3xl mx-auto text-center">
            <div
              className="font-serif italic mb-6"
              style={{ fontSize: "clamp(1.3rem, 2.5vw, 1.8rem)", color: "rgba(255,255,255,0.9)", lineHeight: 1.55 }}
            >
              "Lasting change comes not from instruction alone, but from understanding the deeper systems — cultural, behavioural and motivational — that shape how professionals work and grow."
            </div>
            <div style={{ width: "2rem", height: "1px", background: "var(--lw-gold)", margin: "0 auto 1rem" }} />
            <p
              className="font-medium tracking-widest uppercase"
              style={{ fontSize: "0.7rem", color: "var(--lw-gold)", letterSpacing: "0.15em" }}
            >
              Jamie Pennington — Director, Pennington Hennessy
            </p>
          </div>
        </div>
      </section>

      {/* ── About teaser ─────────────────────────────────────────────────── */}
      <section className="container max-w-6xl py-20">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div style={{ width: "2rem", height: "1px", background: "var(--lw-gold)" }} />
              <span
                className="font-medium tracking-widest uppercase"
                style={{ fontSize: "0.65rem", color: "var(--lw-gold)", letterSpacing: "0.18em" }}
              >
                About
              </span>
            </div>
            <h2
              className="font-serif font-bold mb-5"
              style={{ fontSize: "clamp(1.6rem, 2.8vw, 2.2rem)", color: "var(--lw-navy)" }}
            >
              Jamie Pennington
            </h2>
            <p
              className="mb-4"
              style={{ color: "rgba(15,31,53,0.65)", lineHeight: 1.8, fontSize: "0.95rem" }}
            >
              Director of Pennington Hennessy and Visiting Professor at the University of Law. Over thirty years working with lawyers and professional services firms — helping them develop the skills, confidence, and commercial awareness they need to thrive.
            </p>
            <p
              className="mb-6"
              style={{ color: "rgba(15,31,53,0.65)", lineHeight: 1.8, fontSize: "0.95rem" }}
            >
              A pioneer in the use of AI for professional development, Jamie has developed a suite of AI-powered role-play scenarios in partnership with Qinect that allow professionals to practise and refine their skills in realistic, bespoke simulations.
            </p>
            <Link
              href="/ph/about"
              className="inline-flex items-center gap-2 text-sm font-medium tracking-widest uppercase no-underline transition-opacity hover:opacity-70"
              style={{ color: "var(--lw-gold)", letterSpacing: "0.1em" }}
            >
              Read more <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          {/* Photo placeholder */}
          <div
            className="flex items-center justify-center"
            style={{
              aspectRatio: "4/5",
              background: "var(--lw-cream-dark)",
              border: "1px solid rgba(15,31,53,0.1)",
              maxWidth: "380px",
            }}
          >
            <div className="text-center p-8">
              <div
                className="w-16 h-16 flex items-center justify-center mx-auto mb-4 font-serif text-2xl font-bold"
                style={{ border: "1px solid rgba(201,151,58,0.4)", color: "var(--lw-gold)" }}
              >
                JP
              </div>
              <p
                className="font-medium tracking-widest uppercase"
                style={{ fontSize: "0.65rem", color: "rgba(15,31,53,0.35)", letterSpacing: "0.15em" }}
              >
                Photo coming soon
              </p>
            </div>
          </div>
        </div>
      </section>

      <PHFooter />
    </div>
  );
}
