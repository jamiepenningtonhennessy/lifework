import { Link } from "wouter";
import { PHNav } from "@/components/PHNav";
import { PHFooter } from "@/components/PHFooter";
import { Check, X, Mail } from "lucide-react";

// ─── Brand constants ──────────────────────────────────────────────────────────
const NAVY     = "var(--lw-navy)";
const NAVY_MID = "var(--lw-navy-mid)";
const GOLD     = "var(--lw-gold)";
const CREAM    = "var(--lw-cream)";

// ─── Eyebrow ──────────────────────────────────────────────────────────────────
function Eyebrow({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <div style={{ width: "2.5rem", height: "1px", background: GOLD }} />
      <span
        className="font-medium tracking-widest uppercase"
        style={{ fontSize: "0.68rem", color: GOLD, letterSpacing: "0.18em" }}
      >
        {label}
      </span>
    </div>
  );
}

// ─── Feature row ─────────────────────────────────────────────────────────────
function Feature({ label, included }: { label: string; included: boolean }) {
  return (
    <div
      className="flex items-start gap-3 py-3"
      style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}
    >
      <div className="mt-0.5 shrink-0">
        {included ? (
          <Check size={16} style={{ color: GOLD }} strokeWidth={2.5} />
        ) : (
          <X size={16} style={{ color: "rgba(255,255,255,0.2)" }} strokeWidth={2} />
        )}
      </div>
      <span
        style={{
          fontSize: "0.9rem",
          color: included ? "rgba(255,255,255,0.88)" : "rgba(255,255,255,0.28)",
          lineHeight: 1.5,
        }}
      >
        {label}
      </span>
    </div>
  );
}

// ─── Tier badge ───────────────────────────────────────────────────────────────
function TierBadge({ label, color }: { label: string; color: string }) {
  return (
    <div
      className="inline-block px-3 py-1 rounded-sm mb-5 font-medium tracking-widest uppercase"
      style={{ background: color, fontSize: "0.65rem", letterSpacing: "0.2em", color: NAVY }}
    >
      {label}
    </div>
  );
}

// ─── Pricing card ─────────────────────────────────────────────────────────────
interface TierProps {
  badge: string;
  badgeColor: string;
  name: string;
  price: string;
  vat: string;
  tagline: string;
  features: { label: string; included: boolean }[];
  highlighted?: boolean;
  ctaLabel?: string;
}

function TierCard({
  badge,
  badgeColor,
  name,
  price,
  vat,
  tagline,
  features,
  highlighted = false,
  ctaLabel = "Enquire",
}: TierProps) {
  return (
    <div
      className="flex flex-col rounded-sm"
      style={{
        background: highlighted ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.03)",
        border: highlighted
          ? `2px solid ${GOLD}`
          : "1px solid rgba(255,255,255,0.1)",
        padding: "2rem 1.75rem 1.75rem",
        position: "relative",
      }}
    >
      {highlighted && (
        <div
          className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 font-medium tracking-widest uppercase text-center"
          style={{
            background: GOLD,
            color: NAVY,
            fontSize: "0.6rem",
            letterSpacing: "0.2em",
            whiteSpace: "nowrap",
          }}
        >
          Most Popular
        </div>
      )}

      <TierBadge label={badge} color={badgeColor} />

      <h3
        className="font-serif font-bold mb-1"
        style={{ fontSize: "1.5rem", color: "white", lineHeight: 1.2 }}
      >
        {name}
      </h3>

      <div className="flex items-baseline gap-1 mt-3 mb-1">
        <span
          className="font-serif font-bold"
          style={{ fontSize: "2.4rem", color: GOLD, lineHeight: 1 }}
        >
          {price}
        </span>
        <span style={{ color: "rgba(255,255,255,0.45)", fontSize: "0.85rem" }}>
          {vat}
        </span>
      </div>

      <p
        className="mb-6"
        style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.85rem", lineHeight: 1.5 }}
      >
        {tagline}
      </p>

      <div className="flex-1 mb-8">
        {features.map((f) => (
          <Feature key={f.label} label={f.label} included={f.included} />
        ))}
      </div>

      <a
        href="mailto:jamie@penningtonhennessy.com"
        className="flex items-center justify-center gap-2 w-full py-3 font-medium tracking-wide uppercase transition-opacity hover:opacity-80"
        style={{
          background: highlighted ? GOLD : "transparent",
          border: highlighted ? "none" : `1px solid ${GOLD}`,
          color: highlighted ? NAVY : GOLD,
          fontSize: "0.78rem",
          letterSpacing: "0.12em",
          textDecoration: "none",
        }}
      >
        <Mail size={14} />
        {ctaLabel}
      </a>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
const BRONZE_COLOR = "#cd7f32";
const SILVER_COLOR = "#a8a9ad";
const GOLD_COLOR   = "var(--gold)";

const BRONZE_FEATURES = [
  { label: "Life history interview with Sage (AI coach)", included: true },
  { label: "VIA Character Strengths assessment", included: true },
  { label: "OCEAN Personality Profile", included: true },
  { label: "WOW Report — Executive Summary", included: true },
  { label: "WOW Report — Life History Pattern", included: true },
  { label: "WOW Report — Personality Profile", included: true },
  { label: "WOW Report — Behavioural Style", included: true },
  { label: "WOW Report — Development Edge", included: true },
  { label: "WOW Report — Conclusions", included: true },
  { label: "Ongoing access to Sage AI career coach", included: true },
  { label: "WOW Report — Career Directions chapter", included: false },
  { label: "One-hour feedback session with Jamie Pennington", included: false },
  { label: "Three personal follow-on coaching sessions", included: false },
];

const SILVER_FEATURES = [
  { label: "Life history interview with Sage (AI coach)", included: true },
  { label: "VIA Character Strengths assessment", included: true },
  { label: "OCEAN Personality Profile", included: true },
  { label: "WOW Report — Executive Summary", included: true },
  { label: "WOW Report — Life History Pattern", included: true },
  { label: "WOW Report — Personality Profile", included: true },
  { label: "WOW Report — Behavioural Style", included: true },
  { label: "WOW Report — Development Edge", included: true },
  { label: "WOW Report — Conclusions", included: true },
  { label: "Ongoing access to Sage AI career coach", included: true },
  { label: "WOW Report — Career Directions chapter", included: true },
  { label: "One-hour feedback session with Jamie Pennington", included: true },
  { label: "Three personal follow-on coaching sessions", included: false },
];

const GOLD_FEATURES = [
  { label: "Life history interview with Sage (AI coach)", included: true },
  { label: "VIA Character Strengths assessment", included: true },
  { label: "OCEAN Personality Profile", included: true },
  { label: "WOW Report — Executive Summary", included: true },
  { label: "WOW Report — Life History Pattern", included: true },
  { label: "WOW Report — Personality Profile", included: true },
  { label: "WOW Report — Behavioural Style", included: true },
  { label: "WOW Report — Development Edge", included: true },
  { label: "WOW Report — Conclusions", included: true },
  { label: "Ongoing access to Sage AI career coach", included: true },
  { label: "WOW Report — Career Directions chapter", included: true },
  { label: "One-hour feedback session with Jamie Pennington", included: true },
  { label: "Three personal follow-on coaching sessions", included: true },
];

export default function LifeworkPricing() {
  return (
    <div style={{ background: NAVY, minHeight: "100vh" }}>
      <PHNav />

      {/* ── Hero ── */}
      <section className="pt-28 pb-16" style={{ background: NAVY }}>
        <div className="container max-w-4xl text-center">
          <Eyebrow label="Lifework Programmes" />
          <h1
            className="font-serif font-bold mb-6"
            style={{
              fontSize: "clamp(2rem, 4.5vw, 3.2rem)",
              color: "white",
              lineHeight: 1.15,
            }}
          >
            Invest in understanding<br />
            <em style={{ color: GOLD, fontStyle: "italic" }}>who you really are.</em>
          </h1>
          <p
            className="mx-auto"
            style={{
              maxWidth: "38rem",
              color: "rgba(255,255,255,0.6)",
              fontSize: "1.05rem",
              lineHeight: 1.7,
            }}
          >
            Three levels of engagement — from a comprehensive self-directed analysis
            to a fully guided programme with personal coaching and an action plan.
            All built on thirty years of practice and three validated instruments.
          </p>
        </div>
      </section>

      {/* ── Pricing cards ── */}
      <section className="pb-24" style={{ background: NAVY }}>
        <div className="container max-w-6xl">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
            <TierCard
              badge="Bronze"
              badgeColor={BRONZE_COLOR}
              name="Self-Directed Analysis"
              price="£500"
              vat="+ VAT"
              tagline="The complete Lifework analysis — your full WOW Report and ongoing AI coaching — at your own pace."
              features={BRONZE_FEATURES}
              ctaLabel="Enquire about Bronze"
            />
            <TierCard
              badge="Silver"
              badgeColor={SILVER_COLOR}
              name="Analysis + Coaching"
              price="£1,000"
              vat="+ VAT"
              tagline="Everything in Bronze, plus the Career Directions chapter and a one-hour debrief with Jamie Pennington."
              features={SILVER_FEATURES}
              highlighted
              ctaLabel="Enquire about Silver"
            />
            <TierCard
              badge="Gold"
              badgeColor={GOLD_COLOR}
              name="Full Programme"
              price="£2,500"
              vat="+ VAT"
              tagline="The complete guided experience — analysis, debrief, and three personal sessions to design and act on your plan."
              features={GOLD_FEATURES}
              ctaLabel="Enquire about Gold"
            />
          </div>
        </div>
      </section>

      {/* ── What is the WOW Report ── */}
      <section
        className="py-20"
        style={{
          background: "var(--lw-cream)",
          borderTop: "1px solid rgba(15,31,53,0.08)",
        }}
      >
        <div className="container max-w-4xl">
          <Eyebrow label="The WOW Report" />
          <h2
            className="font-serif font-bold mb-6"
            style={{ fontSize: "clamp(1.6rem, 3vw, 2.2rem)", color: NAVY, lineHeight: 1.2 }}
          >
            A career analysis unlike anything else
          </h2>
          <div className="grid md:grid-cols-2 gap-10">
            <p style={{ color: "rgba(15,31,53,0.7)", lineHeight: 1.8, fontSize: "0.95rem" }}>
              The WOW Report is the centrepiece of every Lifework programme. It draws on your
              life history interview, your VIA Character Strengths profile, and your OCEAN
              Personality assessment to produce a detailed, personalised analysis of who you
              are and what you are built to do.
            </p>
            <p style={{ color: "rgba(15,31,53,0.7)", lineHeight: 1.8, fontSize: "0.95rem" }}>
              Bronze and Silver clients receive all chapters except Career Directions.
              Silver and Gold clients receive the full report — including the Career Directions
              chapter, which translates your analysis into specific roles, sectors, and
              environments where you are most likely to thrive.
            </p>
          </div>
        </div>
      </section>

      {/* ── What happens in the coaching sessions ── */}
      <section
        className="py-20"
        style={{
          background: "var(--lw-navy-mid)",
          borderTop: "1px solid rgba(201,151,58,0.15)",
        }}
      >
        <div className="container max-w-4xl">
          <Eyebrow label="Silver & Gold" />
          <h2
            className="font-serif font-bold mb-6"
            style={{ fontSize: "clamp(1.6rem, 3vw, 2.2rem)", color: "white", lineHeight: 1.2 }}
          >
            What the coaching sessions involve
          </h2>
          <div className="grid md:grid-cols-2 gap-10">
            <div>
              <h3
                className="font-serif font-semibold mb-3"
                style={{ color: GOLD, fontSize: "1.05rem" }}
              >
                The feedback session (Silver &amp; Gold)
              </h3>
              <p style={{ color: "rgba(255,255,255,0.65)", lineHeight: 1.8, fontSize: "0.92rem" }}>
                A one-hour session with Jamie Pennington to walk through your WOW Report together.
                This is where the analysis comes alive — Jamie will draw out the threads,
                challenge assumptions, and help you understand what the evidence is really saying
                about your motivated strengths and career direction.
              </p>
            </div>
            <div>
              <h3
                className="font-serif font-semibold mb-3"
                style={{ color: GOLD, fontSize: "1.05rem" }}
              >
                Follow-on sessions (Gold only)
              </h3>
              <p style={{ color: "rgba(255,255,255,0.65)", lineHeight: 1.8, fontSize: "0.92rem" }}>
                Three further sessions focused on designing your action plan and following
                through on it. These are structured around what you want to change, what is
                getting in the way, and what concrete steps will move you forward. Paced to
                suit your timeline.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-20" style={{ background: NAVY }}>
        <div className="container max-w-2xl text-center">
          <Eyebrow label="Get started" />
          <h2
            className="font-serif font-bold mb-4"
            style={{ fontSize: "clamp(1.6rem, 3vw, 2.2rem)", color: "white", lineHeight: 1.2 }}
          >
            Not sure which programme is right for you?
          </h2>
          <p
            className="mb-8"
            style={{ color: "rgba(255,255,255,0.55)", fontSize: "0.95rem", lineHeight: 1.7 }}
          >
            Send a message and Jamie will help you decide which level of engagement
            makes most sense for where you are right now.
          </p>
          <a
            href="mailto:jamie@penningtonhennessy.com"
            className="inline-flex items-center gap-2 px-8 py-4 font-medium tracking-wide uppercase transition-opacity hover:opacity-80"
            style={{
              background: GOLD,
              color: NAVY,
              fontSize: "0.78rem",
              letterSpacing: "0.12em",
              textDecoration: "none",
            }}
          >
            <Mail size={15} />
            Get in touch
          </a>
        </div>
      </section>

      <PHFooter />
    </div>
  );
}
