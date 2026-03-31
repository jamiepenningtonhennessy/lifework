import { PHNav } from "@/components/PHNav";
import { PHFooter } from "@/components/PHFooter";
import { ExternalLink } from "lucide-react";

const AREAS = [
  {
    num: "01",
    title: "Leadership & Practice Development",
    body: "Helping lawyers and professionals transition into leadership roles, build and manage teams, and develop their personal effectiveness. Whether you are stepping up to partnership or leading a practice group, this work addresses the real challenges of authority, influence, and culture.",
  },
  {
    num: "02",
    title: "Business Development",
    body: "A structured, practical approach to winning new clients and growing a practice -- built around the 7 Step Business Development Process. This is not theory; it is a framework that has been tested with hundreds of lawyers across three decades.",
  },
  {
    num: "03",
    title: "Career Transition & Development",
    body: "Supporting professionals in navigating career changes and achieving their long-term goals. This work often draws on the Lifework methodology to help clients understand what they are genuinely good at, what drives them, and where they are most likely to flourish.",
    lifeworkLink: true,
  },
];

export default function PHCoaching() {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--lw-cream)" }}>
      <PHNav />

      {/* -- Page hero -- */}
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
              Coaching
            </span>
          </div>
          <h1
            className="font-serif font-bold mb-5"
            style={{ fontSize: "clamp(2rem, 4vw, 3rem)", color: "white", lineHeight: 1.2, maxWidth: "36rem" }}
          >
            Coaching that goes beyond the surface.
          </h1>
          <p
            style={{ fontSize: "1rem", color: "rgba(255,255,255,0.68)", lineHeight: 1.8, maxWidth: "38rem" }}
          >
            Bespoke coaching for individuals and groups. Subjects often cover leadership, practice development, business development, and sometimes career transition. Grounded in thirty years of experience and a methodology that explores the whole person -- not just the professional.
          </p>
        </div>
      </section>

      {/* -- Coaching areas -- */}
      <section className="py-20" style={{ background: "var(--lw-cream)" }}>
        <div className="container max-w-6xl">
          <div className="flex items-center gap-3 mb-3">
            <div style={{ width: "2rem", height: "1px", background: "var(--lw-gold)" }} />
            <span
              className="font-medium tracking-widest uppercase"
              style={{ fontSize: "0.65rem", color: "var(--lw-gold)", letterSpacing: "0.18em" }}
            >
              Areas of focus
            </span>
          </div>
          <h2
            className="font-serif font-bold mb-12"
            style={{ fontSize: "clamp(1.5rem, 2.5vw, 2rem)", color: "var(--lw-navy)" }}
          >
            What coaching covers
          </h2>

          <div className="grid md:grid-cols-3 gap-8">
            {AREAS.map((a) => (
              <div
                key={a.num}
                className="p-7 flex flex-col"
                style={{ background: "white", border: "1px solid rgba(15,31,53,0.1)" }}
              >
                <div
                  className="font-serif font-bold text-3xl mb-5"
                  style={{ color: "rgba(201,151,58,0.25)" }}
                >
                  {a.num}
                </div>
                <h3
                  className="font-serif font-semibold mb-3"
                  style={{ fontSize: "1.05rem", color: "var(--lw-navy)" }}
                >
                  {a.title}
                </h3>
                <p style={{ fontSize: "0.88rem", color: "rgba(15,31,53,0.62)", lineHeight: 1.75 }} className="flex-1">
                  {a.body}
                </p>
                {(a as any).lifeworkLink && (
                  <a
                    href="/coaching/lifework"
                    className="inline-flex items-center gap-2 mt-6 text-sm font-medium tracking-widest uppercase no-underline transition-opacity hover:opacity-80"
                    style={{ color: "var(--lw-gold)", letterSpacing: "0.1em" }}
                  >
                    Open Lifework <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* -- CTA -- */}
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
              Interested in coaching?
            </h3>
            <p style={{ fontSize: "0.9rem", color: "rgba(255,255,255,0.6)" }}>
              Call or email to arrange an initial conversation.
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
