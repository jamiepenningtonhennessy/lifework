import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { useLocation } from "wouter";
import { ArrowRight, CheckCircle, X, Lock, Download } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { lifeworkLandingPath } from "@/lib/lifeworkDomain";

const LIFEWORK_VIDEO_URL = "https://d2xsxph8kpxj0f.cloudfront.net/107696804/kFbbE6kqNApXGDFpQJUGV7/lifework-overview_10b2a812.mp4";

export default function Home() {
  const { user, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();

  // Access code gate state
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [accessCode, setAccessCode] = useState("");
  const [codeError, setCodeError] = useState("");
  const [codeVerified, setCodeVerified] = useState(false);

  const verifyCode = trpc.auth.verifyAccessCode.useMutation({
    onSuccess: (data) => {
      if (data.valid) {
        setCodeVerified(true);
        setCodeError("");
        // Store in sessionStorage so it survives a page refresh within the session
        sessionStorage.setItem("lw_access_granted", "1");
        // Proceed to sign-in — return to Lifework opening page after login
        window.location.href = getLoginUrl(lifeworkLandingPath());
      } else {
        setCodeError("That code doesn't match. Please check with your counsellor.");
      }
    },
    onError: () => {
      setCodeError("Something went wrong. Please try again.");
    },
  });

  const handleBeginJourney = () => {
    if (isAuthenticated) {
      navigate("/dashboard");
      return;
    }
    // Check if already granted this session
    if (sessionStorage.getItem("lw_access_granted") === "1") {
      window.location.href = getLoginUrl(lifeworkLandingPath());
      return;
    }
    setShowCodeModal(true);
  };

  const handleSubmitCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessCode.trim()) {
      setCodeError("Please enter your access code.");
      return;
    }
    verifyCode.mutate({ code: accessCode.trim() });
  };

  const handleCounselor = () => {
    if (!isAuthenticated) {
      window.location.href = getLoginUrl();
    } else {
      navigate("/counselor");
    }
  };

  return (
    <div className="min-h-screen" style={{ background: "var(--lw-cream)" }}>

      {/* ── Navigation ── */}
      <nav style={{ background: "var(--lw-navy)", borderBottom: "1px solid rgba(201,151,58,0.25)" }}
        className="sticky top-0 z-50">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center">
            <img
              src="https://d2xsxph8kpxj0f.cloudfront.net/107696804/kFbbE6kqNApXGDFpQJUGV7/lifework-logo-onnavy_1f7a4c72.png"
              alt="Lifework"
              className="h-9 w-auto object-contain"
            />
          </div>
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <>
                <span className="text-sm hidden sm:block" style={{ color: "rgba(255,255,255,0.6)" }}>
                  Welcome, {user?.name?.split(" ")[0]}
                </span>
                {user?.role === "admin" && (
                  <button onClick={handleCounselor}
                    className="px-4 py-2 text-sm font-medium tracking-wide uppercase cursor-pointer transition-colors"
                    style={{ border: "1px solid rgba(201,151,58,0.6)", color: "var(--lw-gold)", background: "transparent", letterSpacing: "0.08em", fontSize: "0.75rem" }}>
                    Counsellor View
                  </button>
                )}
                <button onClick={() => navigate("/dashboard")}
                  className="px-4 py-2 text-sm font-medium tracking-wide uppercase cursor-pointer"
                  style={{ background: "var(--lw-gold)", color: "var(--lw-navy)", letterSpacing: "0.08em", fontSize: "0.75rem", fontWeight: 600 }}>
                  My Dashboard
                </button>
              </>
            ) : (
              <button onClick={handleBeginJourney}
                className="px-4 py-2 text-sm font-medium tracking-wide uppercase cursor-pointer"
                style={{ background: "var(--lw-gold)", color: "var(--lw-navy)", letterSpacing: "0.08em", fontSize: "0.75rem", fontWeight: 600 }}>
                Sign In
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* ── BEAT 1 & 2: Hero — The Character and Their Problem ── */}
      <section style={{ background: "var(--lw-navy)", minHeight: "520px" }} className="relative overflow-hidden">
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: "radial-gradient(circle at 70% 50%, oklch(0.68 0.13 72) 0%, transparent 60%)" }} />
        <div className="container relative py-24 lg:py-32">
          <div className="max-w-2xl">
            <div className="lw-eyebrow mb-6" style={{ color: "var(--lw-gold)" }}>
              Career Analysis · Positive Psychology
            </div>
            <h1 className="font-serif font-bold leading-tight mb-6"
              style={{ fontSize: "clamp(2.2rem, 5vw, 3.4rem)", color: "white" }}>
              What if the right career<br />
              <em style={{ color: "var(--lw-gold)", fontStyle: "italic" }}>already lives inside you?</em>
            </h1>
            <p className="leading-relaxed mb-10"
              style={{ fontSize: "1.05rem", color: "rgba(255,255,255,0.75)", maxWidth: "540px" }}>
              You have spent years acquiring experience, skills, and wisdom. But somewhere along the way,
              the noise of other people's expectations may have drowned out the signal of what genuinely
              energises you. Lifework helps you find it again.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <button onClick={handleBeginJourney}
                className="inline-flex items-center gap-2 px-7 py-3 font-medium tracking-wide uppercase cursor-pointer transition-opacity"
                style={{ background: "var(--lw-gold)", color: "var(--lw-navy)", letterSpacing: "0.08em", fontSize: "0.8rem", fontWeight: 600 }}>
                Begin Your Journey <ArrowRight className="w-4 h-4" />
              </button>
              <a href="mailto:jamie@penningtonhennessy.com"
                className="inline-flex items-center gap-2 px-7 py-3 font-medium tracking-wide uppercase cursor-pointer transition-colors"
                style={{ border: "1px solid rgba(255,255,255,0.4)", color: "white", background: "transparent", letterSpacing: "0.08em", fontSize: "0.8rem", textDecoration: "none" }}>
                Ask Jamie a Question
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── BEAT 3: The Guide — Empathy + Authority ── */}
      <section className="py-20" style={{ background: "var(--lw-cream)" }}>
        <div className="container max-w-4xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-start">
            <div>
              <div className="lw-eyebrow mb-4" style={{ color: "var(--lw-gold)" }}>The Guide</div>
              <h2 className="font-serif font-bold mb-6" style={{ fontSize: "2rem", lineHeight: 1.2, color: "var(--lw-navy)" }}>
                We understand what this feels like.
              </h2>
              <p className="leading-relaxed mb-4" style={{ color: "var(--lw-navy-light)", fontSize: "0.95rem" }}>
                Whether you are a graduate standing at a crossroads, a mid-career professional who has built
                a life that looks right on paper but feels hollow, someone returning to work after years away,
                or a senior leader asking what comes next — the question is the same: <em>what is actually mine?</em>
              </p>
              <p className="leading-relaxed" style={{ color: "var(--lw-navy-light)", fontSize: "0.95rem" }}>
                Lifework is built on thirty years of working with lawyers, professionals, and individuals at
                every stage of life. The methodology is rooted in Bernard Haldane's Dependable Strengths
                research — the insight that the most reliable guide to a fulfilling career is not a questionnaire
                about preferences, but a careful reading of the life you have already lived.
              </p>
            </div>
            <div className="space-y-4 md:mt-[28%]">
              {[
                {
                  stage: "Graduates & school leavers",
                  desc: "Choose a direction with confidence, not guesswork.",
                  pdf: "https://d2xsxph8kpxj0f.cloudfront.net/107696804/kFbbE6kqNApXGDFpQJUGV7/lifework-brochure_72321d38.pdf",
                  filename: "Lifework-Graduates.pdf",
                },
                {
                  stage: "Mid-career professionals",
                  desc: "Understand why some work feels effortless and other work drains you.",
                  pdf: "https://d2xsxph8kpxj0f.cloudfront.net/107696804/kFbbE6kqNApXGDFpQJUGV7/lifework-midcareer-brochure_fb9f6283.pdf",
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
              ].map(item => (
                <div key={item.stage}
                  className="flex items-center justify-between gap-4 px-4 py-3 rounded-lg"
                  style={{ border: "1px solid rgba(201,151,58,0.25)", background: "rgba(201,151,58,0.04)" }}
                >
                  <div className="flex gap-3 items-start min-w-0">
                    <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: "var(--lw-gold)" }} />
                    <div className="min-w-0">
                      <p className="font-semibold text-sm" style={{ color: "var(--lw-navy)" }}>{item.stage}</p>
                      <p className="text-xs mt-0.5" style={{ color: "var(--lw-navy-light)" }}>{item.desc}</p>
                    </div>
                  </div>
                  <a
                    href={item.pdf}
                    download={item.filename}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 flex-shrink-0 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider rounded transition-opacity hover:opacity-80"
                    style={{ background: "var(--lw-gold)", color: "var(--lw-navy)", letterSpacing: "0.08em", textDecoration: "none" }}
                  >
                    <Download className="w-3 h-3" />
                    Download
                  </a>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── VIDEO SECTION ── */}
      <section className="py-20" style={{ background: "var(--lw-navy-mid)", borderTop: "1px solid rgba(201,151,58,0.2)", borderBottom: "1px solid rgba(201,151,58,0.2)" }}>
        <div className="container max-w-4xl">
          <div className="mb-10 text-center">
            <div className="lw-eyebrow mb-4" style={{ color: "var(--lw-gold)" }}>How it works</div>
            <h2 className="font-serif font-bold" style={{ fontSize: "1.8rem", color: "white" }}>
              The story of Lifework — in five minutes
            </h2>
            <p className="mt-3" style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.95rem" }}>
              Rooted in positive psychology, anchored in your own life story.
            </p>
          </div>
          {/* Native video player */}
          <div style={{ border: "2px solid rgba(201,151,58,0.4)", borderRadius: "2px", overflow: "hidden" }}>
            <video
              src={LIFEWORK_VIDEO_URL}
              controls
              playsInline
              style={{ width: "100%", display: "block" }}
              title="Lifework Overview"
            />
          </div>
        </div>
      </section>

      {/* ── BEAT 4: The Plan — Three Stages ── */}
      <section className="py-20" style={{ background: "white", borderTop: "1px solid rgba(15,31,53,0.08)" }}>
        <div className="container max-w-4xl">
          <div className="mb-14">
            <div className="lw-eyebrow mb-4" style={{ color: "var(--lw-gold)" }}>The Plan</div>
            <h2 className="font-serif font-bold" style={{ fontSize: "2rem", color: "var(--lw-navy)" }}>
              Three stages. A lifetime of clarity.
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-0 max-w-4xl" style={{ border: "1px solid rgba(201,151,58,0.3)" }}>
            {[
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
            ].map((item, i) => (
              <div key={item.step} className="p-8 relative"
                style={{ borderRight: i < 2 ? "1px solid rgba(201,151,58,0.25)" : "none" }}>
                <div className="font-serif font-bold mb-4"
                  style={{ fontSize: "2.5rem", color: "rgba(201,151,58,0.18)" }}>
                  {item.step}
                </div>
                <h3 className="font-serif font-bold mb-1" style={{ fontSize: "1.1rem", color: "var(--lw-navy)" }}>
                  {item.title}
                </h3>
                <p className="text-xs uppercase tracking-widest mb-4" style={{ color: "var(--lw-gold)", letterSpacing: "0.1em" }}>
                  {item.subtitle}
                </p>
                <p className="leading-relaxed" style={{ fontSize: "0.875rem", color: "var(--lw-navy-light)" }}>
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── BEAT 5 & 6: CTA + Stakes ── */}
      <section className="py-24" style={{ background: "var(--lw-navy)" }}>
        <div className="container max-w-3xl text-center">
          <div className="lw-eyebrow mb-6" style={{ color: "var(--lw-gold)" }}>Take the Next Step</div>
          <h2 className="font-serif font-bold mb-6" style={{ fontSize: "2.2rem", color: "white", lineHeight: 1.25 }}>
            The right career already lives inside you.<br />
            <em style={{ color: "var(--lw-gold)", fontStyle: "italic" }}>Let's find it together.</em>
          </h2>
          <p className="leading-relaxed mb-10" style={{ color: "rgba(255,255,255,0.7)", fontSize: "1rem", maxWidth: "560px", margin: "0 auto 2.5rem" }}>
            The risk is not that you will fail. The risk is spending another five years — or ten — doing
            work that never quite fits. Not because the right work doesn't exist, but because you never
            took the time to find out what it was.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="mailto:jamie@penningtonhennessy.com?subject=Lifework%20Enquiry"
              className="inline-flex items-center gap-2 px-8 py-4 font-medium tracking-wide uppercase cursor-pointer"
              style={{ background: "var(--lw-gold)", color: "var(--lw-navy)", letterSpacing: "0.08em", fontSize: "0.85rem", fontWeight: 700, textDecoration: "none" }}>
              Email Jamie to Get Started <ArrowRight className="w-4 h-4" />
            </a>
            <button onClick={handleBeginJourney}
              className="inline-flex items-center gap-2 px-8 py-4 font-medium tracking-wide uppercase cursor-pointer"
              style={{ border: "1px solid rgba(255,255,255,0.4)", color: "white", background: "transparent", letterSpacing: "0.08em", fontSize: "0.85rem" }}>
              I Have an Access Code
            </button>
          </div>
          <p className="mt-8 text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>
            Already a client?{" "}
            <button onClick={handleBeginJourney}
              className="cursor-pointer underline"
              style={{ color: "var(--lw-gold)", background: "none", border: "none", padding: 0, fontSize: "inherit" }}>
              Sign in here
            </button>
          </p>
        </div>
      </section>

      {/* ── BEAT 7: Success — What life looks like on the other side ── */}
      <section className="py-20" style={{ background: "var(--lw-cream)" }}>
        <div className="container max-w-4xl">
          <div className="mb-12 text-center">
            <div className="lw-eyebrow mb-4" style={{ color: "var(--lw-gold)" }}>What Success Looks Like</div>
            <h2 className="font-serif font-bold" style={{ fontSize: "1.8rem", color: "var(--lw-navy)" }}>
              A compass for every stage of life
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {[
              {
                quote: "I finally understood why some things feel effortless and others feel like swimming upstream. That changed everything.",
                attribution: "Graduate, choosing between Law and Psychology",
              },
              {
                quote: "I had spent twelve years building a career that looked right on paper. Lifework helped me understand why it never felt right — and what would.",
                attribution: "Senior Manager, mid-career transition",
              },
              {
                quote: "I kept telling myself I was out of date. Lifework showed me that the skills I was most worried about losing were actually the ones I'd spent five years strengthening.",
                attribution: "Professional, returning to work after a career break",
              },
              {
                quote: "I had assumed retirement meant stepping back. Lifework helped me see it as stepping forward — into something I actually chose.",
                attribution: "Director, approaching retirement",
              },
            ].map((item, i) => (
              <div key={i} className="p-8"
                style={{ background: "white", borderLeft: "3px solid var(--lw-gold)", borderBottom: "1px solid rgba(201,151,58,0.2)" }}>
                <blockquote className="font-serif italic leading-relaxed mb-4"
                  style={{ fontSize: "1rem", color: "var(--lw-navy)", lineHeight: 1.7 }}>
                  "{item.quote}"
                </blockquote>
                <p style={{ fontSize: "0.75rem", color: "var(--lw-navy-light)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                  — {item.attribution}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA strip ── */}
      <section className="py-16" style={{ background: "var(--lw-navy-mid)", borderTop: "1px solid rgba(201,151,58,0.2)" }}>
        <div className="container max-w-3xl text-center">
          <p className="font-serif italic mb-6" style={{ fontSize: "1.3rem", color: "white" }}>
            "The most important thing is to find out what is important to you — not what others think should be important."
          </p>
          <p className="mb-8" style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.5)", letterSpacing: "0.06em" }}>
            — Bernard Haldane, Dependable Strengths
          </p>
          <a href="mailto:jamie@penningtonhennessy.com?subject=Lifework%20Enquiry"
            className="inline-flex items-center gap-2 px-8 py-4 font-medium tracking-wide uppercase"
            style={{ background: "var(--lw-gold)", color: "var(--lw-navy)", letterSpacing: "0.08em", fontSize: "0.85rem", fontWeight: 700, textDecoration: "none" }}>
            Email Jamie — jamie@penningtonhennessy.com <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{ background: "var(--lw-navy)", borderTop: "1px solid rgba(201,151,58,0.2)" }} className="py-8">
        <div className="container flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center">
            <img
              src="https://d2xsxph8kpxj0f.cloudfront.net/107696804/kFbbE6kqNApXGDFpQJUGV7/lifework-logo-onnavy_1f7a4c72.png"
              alt="Lifework"
              className="h-7 w-auto object-contain"
            />
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-6">
            <p style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.4)" }}>
              Inspired by the work of Bernard Haldane &middot; A{" "}
              <a href="https://www.penningtonhennessy.com" target="_blank" rel="noopener noreferrer"
                style={{ color: "var(--lw-gold)", textDecoration: "none" }}>
                Pennington Hennessy
              </a>{" "}service
            </p>
            <a href="/data-security"
              style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.4)", textDecoration: "none" }}
              className="hover:opacity-80 transition-opacity whitespace-nowrap">
              Data Security &amp; Privacy
            </a>
          </div>
        </div>
      </footer>

      {/* ── Access Code Modal ── */}
      {showCodeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: "rgba(15,31,53,0.85)", backdropFilter: "blur(4px)" }}>
          <div className="relative w-full max-w-md mx-4 p-8"
            style={{ background: "var(--lw-cream)", border: "1px solid rgba(201,151,58,0.4)" }}>
            <button onClick={() => { setShowCodeModal(false); setCodeError(""); setAccessCode(""); }}
              className="absolute top-4 right-4 cursor-pointer"
              style={{ background: "none", border: "none", color: "var(--lw-navy-light)" }}>
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3 mb-6">
              <Lock className="w-5 h-5" style={{ color: "var(--lw-gold)" }} />
              <h3 className="font-serif font-bold" style={{ fontSize: "1.3rem", color: "var(--lw-navy)" }}>
                Enter Your Access Code
              </h3>
            </div>
            <p className="mb-6 leading-relaxed" style={{ fontSize: "0.9rem", color: "var(--lw-navy-light)" }}>
              Lifework is a personal coaching programme. To create an account, please enter the access
              code provided by your counsellor. If you don't have one yet,{" "}
              <a href="mailto:jamie@penningtonhennessy.com?subject=Lifework%20Access%20Code"
                style={{ color: "var(--lw-gold)" }}>
                email Jamie
              </a>{" "}to get started.
            </p>
            <form onSubmit={handleSubmitCode}>
              <input
                type="text"
                value={accessCode}
                onChange={e => { setAccessCode(e.target.value); setCodeError(""); }}
                placeholder="Enter access code"
                className="w-full px-4 py-3 mb-2 outline-none"
                style={{
                  border: codeError ? "1px solid #c0392b" : "1px solid rgba(201,151,58,0.5)",
                  background: "white",
                  color: "var(--lw-navy)",
                  fontSize: "1rem",
                  fontFamily: "inherit",
                  letterSpacing: "0.1em",
                }}
                autoFocus
              />
              {codeError && (
                <p className="mb-3 text-sm" style={{ color: "#c0392b" }}>{codeError}</p>
              )}
              <button
                type="submit"
                disabled={verifyCode.isPending}
                className="w-full py-3 font-medium tracking-wide uppercase cursor-pointer mt-2"
                style={{
                  background: "var(--lw-gold)",
                  color: "var(--lw-navy)",
                  letterSpacing: "0.08em",
                  fontSize: "0.85rem",
                  fontWeight: 700,
                  border: "none",
                  opacity: verifyCode.isPending ? 0.7 : 1,
                }}>
                {verifyCode.isPending ? "Checking…" : "Continue to Sign In →"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
