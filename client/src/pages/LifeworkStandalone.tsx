import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { X } from "lucide-react";

const LOGO_CLEAN = "https://d2xsxph8kpxj0f.cloudfront.net/107696804/kFbbE6kqNApXGDFpQJUGV7/lifework-logo-clean_6f5b0ffe.png";
const LOGO_ON_NAVY = "https://d2xsxph8kpxj0f.cloudfront.net/107696804/kFbbE6kqNApXGDFpQJUGV7/lifework-logo-onnavy_1f7a4c72.png";

// ── Design tokens (matching WOW report PDF) ──────────────────────────────────
const NAVY   = "#0f1f35";
const GOLD   = "#c9973a";
const CREAM  = "#f5f0e8";
const CREAM_DARK = "#ede8df";

// ── Eyebrow label (gold rule + small-caps) ───────────────────────────────────
function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <div style={{ width: 32, height: 1, background: GOLD, flexShrink: 0 }} />
      <span
        style={{
          color: GOLD,
          fontSize: "0.65rem",
          letterSpacing: "0.18em",
          fontWeight: 600,
          textTransform: "uppercase",
          fontFamily: "Inter, sans-serif",
        }}
      >
        {children}
      </span>
    </div>
  );
}

// ── Gold rule divider ────────────────────────────────────────────────────────
function GoldRule({ className = "" }: { className?: string }) {
  return <div className={className} style={{ height: 1, background: `linear-gradient(to right, ${GOLD}, transparent)` }} />;
}

// ── Testimonial card ─────────────────────────────────────────────────────────
function Testimonial({ quote, attribution }: { quote: string; attribution: string }) {
  return (
    <div
      className="p-8"
      style={{
        background: "#ffffff",
        borderLeft: `3px solid ${GOLD}`,
        borderRadius: 0,
      }}
    >
      <p
        className="mb-4 leading-relaxed"
        style={{ color: NAVY, fontFamily: "'Playfair Display', Georgia, serif", fontSize: "1rem", fontStyle: "italic" }}
      >
        "{quote}"
      </p>
      <p style={{ color: GOLD, fontSize: "0.7rem", letterSpacing: "0.14em", textTransform: "uppercase", fontFamily: "Inter, sans-serif", fontWeight: 600 }}>
        — {attribution}
      </p>
    </div>
  );
}

// ── Stage card ───────────────────────────────────────────────────────────────
function StageCard({ number, eyebrow, title, body }: { number: string; eyebrow: string; title: string; body: string }) {
  return (
    <div className="relative" style={{ borderTop: `2px solid ${GOLD}`, paddingTop: "1.75rem" }}>
      <div
        className="absolute -top-5 left-0 flex items-center justify-center"
        style={{
          width: 36,
          height: 36,
          background: GOLD,
          color: NAVY,
          fontFamily: "'Playfair Display', Georgia, serif",
          fontWeight: 700,
          fontSize: "1rem",
        }}
      >
        {number}
      </div>
      <p style={{ color: GOLD, fontSize: "0.65rem", letterSpacing: "0.18em", textTransform: "uppercase", fontFamily: "Inter, sans-serif", fontWeight: 600, marginBottom: "0.5rem" }}>
        {eyebrow}
      </p>
      <h3
        className="mb-3"
        style={{ color: NAVY, fontFamily: "'Playfair Display', Georgia, serif", fontSize: "1.35rem", fontWeight: 700 }}
      >
        {title}
      </h3>
      <p style={{ color: "#4a4a4a", fontSize: "0.95rem", lineHeight: 1.75 }}>
        {body}
      </p>
    </div>
  );
}

// ── Client type row ──────────────────────────────────────────────────────────
function ClientTypeRow({ label, description }: { label: string; description: string }) {
  return (
    <div className="flex items-start gap-4 py-5" style={{ borderBottom: `1px solid ${CREAM_DARK}` }}>
      <div style={{ width: 6, height: 6, background: GOLD, flexShrink: 0, marginTop: 8 }} />
      <div>
        <p style={{ color: NAVY, fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 700, fontSize: "1rem", marginBottom: 4 }}>{label}</p>
        <p style={{ color: "#4a4a4a", fontSize: "0.9rem", lineHeight: 1.65 }}>{description}</p>
      </div>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────
export default function LifeworkStandalone() {
  const { user, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [accessCode, setAccessCode] = useState("");
  const [codeError, setCodeError] = useState("");

  const verifyCode = trpc.auth.verifyAccessCode.useMutation({
    onSuccess: (data) => {
      if (data.valid) {
        setCodeError("");
        sessionStorage.setItem("lw_access_granted", "1");
        window.location.href = getLoginUrl("/coaching/lifework");
      } else {
        setCodeError("That code doesn't match. Please check with your counsellor.");
      }
    },
    onError: () => setCodeError("Something went wrong. Please try again."),
  });

  const handleBeginJourney = () => {
    if (isAuthenticated) { navigate("/dashboard"); return; }
    if (sessionStorage.getItem("lw_access_granted") === "1") {
      window.location.href = getLoginUrl("/coaching/lifework"); return;
    }
    setShowCodeModal(true);
  };

  const handleSubmitCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessCode.trim()) { setCodeError("Please enter your access code."); return; }
    verifyCode.mutate({ code: accessCode.trim() });
  };

  return (
    <div style={{ background: CREAM, minHeight: "100vh", fontFamily: "Inter, sans-serif" }}>

      {/* ── Navigation ── */}
      <nav style={{ background: CREAM, borderBottom: `1px solid ${CREAM_DARK}` }} className="sticky top-0 z-50">
        <div className="container max-w-5xl flex items-center justify-between" style={{ height: 72 }}>
          <img src={LOGO_CLEAN} alt="Lifework" style={{ height: 38, width: "auto", objectFit: "contain" }} />
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <>
                <span style={{ color: "#888", fontSize: "0.85rem" }}>
                  {user?.name?.split(" ")[0]}
                </span>
                <button
                  onClick={() => navigate("/dashboard")}
                  style={{ background: GOLD, color: NAVY, padding: "0.5rem 1.25rem", fontSize: "0.75rem", letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 700, border: "none", cursor: "pointer" }}
                >
                  My Dashboard
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => { window.location.href = getLoginUrl(); }}
                  style={{ background: "transparent", color: NAVY, padding: "0.5rem 1.25rem", fontSize: "0.75rem", letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 600, border: `1px solid ${NAVY}`, cursor: "pointer" }}
                >
                  Sign In
                </button>
                <button
                  onClick={handleBeginJourney}
                  style={{ background: GOLD, color: NAVY, padding: "0.5rem 1.25rem", fontSize: "0.75rem", letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 700, border: "none", cursor: "pointer" }}
                >
                  Begin Your Journey
                </button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section style={{ background: CREAM, paddingTop: "5rem", paddingBottom: "5rem" }}>
        <div className="container max-w-5xl">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <Eyebrow>Career Analysis · Positive Psychology</Eyebrow>
              <h1
                style={{
                  color: NAVY,
                  fontFamily: "'Playfair Display', Georgia, serif",
                  fontSize: "clamp(2.2rem, 5vw, 3.2rem)",
                  fontWeight: 700,
                  lineHeight: 1.2,
                  marginBottom: "1.5rem",
                }}
              >
                What if the right career{" "}
                <em style={{ color: GOLD, fontStyle: "italic" }}>already lives inside you?</em>
              </h1>
              <p style={{ color: "#4a4a4a", fontSize: "1.05rem", lineHeight: 1.8, marginBottom: "2.5rem", maxWidth: 480 }}>
                You have spent years acquiring experience, skills, and wisdom. But somewhere along the way, the noise of other people's expectations may have drowned out the signal of what genuinely energises you. Lifework helps you find it again.
              </p>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={handleBeginJourney}
                  style={{ background: NAVY, color: CREAM, padding: "0.85rem 2rem", fontSize: "0.75rem", letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 700, border: "none", cursor: "pointer" }}
                >
                  Begin Your Journey →
                </button>
                <a
                  href="mailto:jamie@penningtonhennessy.com"
                  style={{ background: "transparent", color: NAVY, padding: "0.85rem 2rem", fontSize: "0.75rem", letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 600, border: `1px solid ${NAVY}`, textDecoration: "none", display: "inline-block" }}
                >
                  Ask a Question
                </a>
              </div>
            </div>
            {/* Right: decorative stat panel */}
            <div
              className="hidden md:block"
              style={{ background: NAVY, padding: "3rem", position: "relative" }}
            >
              <div style={{ borderTop: `1px solid rgba(201,151,58,0.4)`, marginBottom: "2rem" }} />
              {[
                { stat: "30+", label: "Years of practice" },
                { stat: "965", label: "Clients guided" },
                { stat: "3", label: "Stages to clarity" },
              ].map(({ stat, label }) => (
                <div key={label} className="mb-8 last:mb-0">
                  <p style={{ color: GOLD, fontFamily: "'Playfair Display', Georgia, serif", fontSize: "2.5rem", fontWeight: 700, lineHeight: 1 }}>{stat}</p>
                  <p style={{ color: "rgba(255,255,255,0.55)", fontSize: "0.75rem", letterSpacing: "0.14em", textTransform: "uppercase", marginTop: 6 }}>{label}</p>
                </div>
              ))}
              <div style={{ borderBottom: `1px solid rgba(201,151,58,0.4)`, marginTop: "2rem" }} />
              <img src={LOGO_ON_NAVY} alt="Lifework" style={{ height: 28, width: "auto", marginTop: "2rem", opacity: 0.7 }} />
            </div>
          </div>
        </div>
      </section>

      <GoldRule />

      {/* ── The Guide ── */}
      <section style={{ background: "#ffffff", paddingTop: "4.5rem", paddingBottom: "4.5rem" }}>
        <div className="container max-w-5xl">
          <div className="grid md:grid-cols-2 gap-16">
            <div>
              <Eyebrow>The Guide</Eyebrow>
              <h2
                style={{
                  color: NAVY,
                  fontFamily: "'Playfair Display', Georgia, serif",
                  fontSize: "clamp(1.6rem, 3vw, 2.2rem)",
                  fontWeight: 700,
                  lineHeight: 1.3,
                  marginBottom: "1.5rem",
                }}
              >
                We understand what this feels like.
              </h2>
              <p style={{ color: "#4a4a4a", fontSize: "0.95rem", lineHeight: 1.8, marginBottom: "1.25rem" }}>
                Whether you are a graduate standing at a crossroads, a mid-career professional who has built a life that looks right on paper but feels hollow, someone returning to work after years away, or a senior leader asking what comes next — the question is the same: <em style={{ color: NAVY, fontStyle: "italic" }}>what is actually mine?</em>
              </p>
              <p style={{ color: "#4a4a4a", fontSize: "0.95rem", lineHeight: 1.8 }}>
                Lifework is built on thirty years of working with lawyers, professionals, and individuals at every stage of life. The methodology is rooted in Bernard Haldane's Dependable Strengths research — the insight that the most reliable guide to a fulfilling career is not a questionnaire about preferences, but a careful reading of the life you have already lived.
              </p>
            </div>
            <div>
              <Eyebrow>Who it is for</Eyebrow>
              <ClientTypeRow label="Graduates & school leavers" description="Choose a direction with confidence, not guesswork." />
              <ClientTypeRow label="Mid-career professionals" description="Understand why some work feels effortless and other work drains you." />
              <ClientTypeRow label="Returning to work" description="Discover that the years away built strengths, not gaps." />
              <ClientTypeRow label="Approaching retirement" description="Find fresh, meaningful expressions of who you are — on your own terms." />
            </div>
          </div>
        </div>
      </section>

      <GoldRule />

      {/* ── Three Stages ── */}
      <section style={{ background: CREAM, paddingTop: "4.5rem", paddingBottom: "4.5rem" }}>
        <div className="container max-w-5xl">
          <div className="text-center mb-14">
            <Eyebrow>The Plan</Eyebrow>
            <h2
              style={{
                color: NAVY,
                fontFamily: "'Playfair Display', Georgia, serif",
                fontSize: "clamp(1.6rem, 3vw, 2.2rem)",
                fontWeight: 700,
              }}
            >
              Three stages. A lifetime of clarity.
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-10">
            <StageCard
              number="01"
              eyebrow="Your Past"
              title="The story of who you are"
              body="A structured life history interview explores your achievements decade by decade — from childhood to today. Not your CV. The moments when you were most fully yourself, mapped across Emotions, Skills, and Values."
            />
            <StageCard
              number="02"
              eyebrow="Your Present"
              title="Lenses, not labels"
              body="Validated psychometric tools — VIA Character Strengths and a Big Five personality profile — are used not to categorise you, but as fresh angles on the same timeline. They add depth and insight to what your life history has already revealed."
            />
            <StageCard
              number="03"
              eyebrow="Your Future"
              title="Wisdom for the road ahead"
              body="Sage, your AI career coach, reads everything you have written and asks the reflective questions that help you see the pattern clearly. Your counsellor then brings it all together — a compass, not a prescription, for what comes next."
            />
          </div>
        </div>
      </section>

      <GoldRule />

      {/* ── Testimonials ── */}
      <section style={{ background: CREAM_DARK, paddingTop: "4.5rem", paddingBottom: "4.5rem" }}>
        <div className="container max-w-5xl">
          <div className="text-center mb-12">
            <Eyebrow>What Success Looks Like</Eyebrow>
            <h2
              style={{
                color: NAVY,
                fontFamily: "'Playfair Display', Georgia, serif",
                fontSize: "clamp(1.6rem, 3vw, 2.2rem)",
                fontWeight: 700,
              }}
            >
              A compass for every stage of life
            </h2>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <Testimonial
              quote="I finally understood why some things feel effortless and others feel like swimming upstream. That changed everything."
              attribution="Graduate, choosing between Law and Psychology"
            />
            <Testimonial
              quote="I had spent twelve years building a career that looked right on paper. Lifework helped me understand why it never felt right — and what would."
              attribution="Senior Manager, mid-career transition"
            />
            <Testimonial
              quote="I kept telling myself I was out of date. Lifework showed me that the skills I was most worried about losing were actually the ones I'd spent five years strengthening."
              attribution="Professional, returning to work after a career break"
            />
            <Testimonial
              quote="I had assumed retirement meant stepping back. Lifework helped me see it as stepping forward — into something I actually chose."
              attribution="Director, approaching retirement"
            />
          </div>
        </div>
      </section>

      <GoldRule />

      {/* ── CTA ── */}
      <section style={{ background: NAVY, paddingTop: "5rem", paddingBottom: "5rem" }}>
        <div className="container max-w-3xl text-center">
          <Eyebrow>Take the Next Step</Eyebrow>
          <h2
            style={{
              color: CREAM,
              fontFamily: "'Playfair Display', Georgia, serif",
              fontSize: "clamp(1.8rem, 4vw, 2.6rem)",
              fontWeight: 700,
              lineHeight: 1.3,
              marginBottom: "1.5rem",
            }}
          >
            The right career already lives inside you.{" "}
            <em style={{ color: GOLD }}>Let's find it together.</em>
          </h2>
          <p style={{ color: "rgba(245,240,232,0.7)", fontSize: "1rem", lineHeight: 1.8, marginBottom: "2.5rem", maxWidth: 560, margin: "0 auto 2.5rem" }}>
            The risk is not that you will fail. The risk is spending another five years — or ten — doing work that never quite fits. Not because the right work doesn't exist, but because you never took the time to find out what it was.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <a
              href="mailto:jamie@penningtonhennessy.com"
              style={{ background: GOLD, color: NAVY, padding: "0.9rem 2.25rem", fontSize: "0.75rem", letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 700, textDecoration: "none", display: "inline-block" }}
            >
              Email Jamie to Get Started
            </a>
            <button
              onClick={handleBeginJourney}
              style={{ background: "transparent", color: CREAM, padding: "0.9rem 2.25rem", fontSize: "0.75rem", letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 600, border: `1px solid rgba(245,240,232,0.4)`, cursor: "pointer" }}
            >
              I Have an Access Code
            </button>
          </div>
        </div>
      </section>

      {/* ── Footer quote ── */}
      <section style={{ background: CREAM, paddingTop: "3.5rem", paddingBottom: "3.5rem" }}>
        <div className="container max-w-3xl text-center">
          <p
            style={{
              color: NAVY,
              fontFamily: "'Playfair Display', Georgia, serif",
              fontSize: "clamp(1.1rem, 2.5vw, 1.4rem)",
              fontStyle: "italic",
              lineHeight: 1.7,
              marginBottom: "1rem",
            }}
          >
            "The most important thing is to find out what is important to you — not what others think should be important."
          </p>
          <p style={{ color: GOLD, fontSize: "0.7rem", letterSpacing: "0.18em", textTransform: "uppercase", fontWeight: 600 }}>
            — Bernard Haldane, Dependable Strengths
          </p>
          <GoldRule className="mt-8 mb-8" />
          <div className="flex items-center justify-center gap-6">
            <img src={LOGO_CLEAN} alt="Lifework" style={{ height: 32, width: "auto", opacity: 0.7 }} />
            <span style={{ color: "#999", fontSize: "0.75rem" }}>·</span>
            <a href="mailto:jamie@penningtonhennessy.com" style={{ color: "#888", fontSize: "0.8rem", textDecoration: "none" }}>
              jamie@penningtonhennessy.com
            </a>
          </div>
        </div>
      </section>

      {/* ── Access Code Modal ── */}
      {showCodeModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(15,31,53,0.75)", backdropFilter: "blur(4px)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowCodeModal(false); }}
        >
          <div style={{ background: CREAM, padding: "2.5rem", maxWidth: 420, width: "100%", position: "relative" }}>
            <button
              onClick={() => setShowCodeModal(false)}
              style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", cursor: "pointer", color: "#888" }}
            >
              <X className="w-5 h-5" />
            </button>
            <Eyebrow>Access Code</Eyebrow>
            <h3 style={{ color: NAVY, fontFamily: "'Playfair Display', Georgia, serif", fontSize: "1.4rem", fontWeight: 700, marginBottom: "0.75rem" }}>
              Enter your code
            </h3>
            <p style={{ color: "#666", fontSize: "0.9rem", lineHeight: 1.65, marginBottom: "1.5rem" }}>
              Your counsellor will have provided an access code. Enter it below to begin your Lifework journey.
            </p>
            <form onSubmit={handleSubmitCode}>
              <input
                type="text"
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value)}
                placeholder="Access code"
                style={{
                  width: "100%",
                  padding: "0.75rem 1rem",
                  border: `1px solid ${codeError ? "#c0392b" : CREAM_DARK}`,
                  background: "#ffffff",
                  fontSize: "1rem",
                  color: NAVY,
                  outline: "none",
                  marginBottom: codeError ? "0.5rem" : "1.25rem",
                  boxSizing: "border-box",
                }}
              />
              {codeError && (
                <p style={{ color: "#c0392b", fontSize: "0.85rem", marginBottom: "1rem" }}>{codeError}</p>
              )}
              <button
                type="submit"
                disabled={verifyCode.isPending}
                style={{ width: "100%", background: NAVY, color: CREAM, padding: "0.85rem", fontSize: "0.75rem", letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 700, border: "none", cursor: "pointer", opacity: verifyCode.isPending ? 0.7 : 1 }}
              >
                {verifyCode.isPending ? "Checking…" : "Continue →"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
