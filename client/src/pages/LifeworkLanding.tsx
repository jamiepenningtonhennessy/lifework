import { useState } from "react";
import { useLocation } from "wouter";
import { ArrowRight, CheckCircle, X } from "lucide-react";
import { trpc } from "@/lib/trpc";

export default function LifeworkLanding() {
  const [, navigate] = useLocation();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const submitLead = trpc.marketing.submitLead.useMutation({
    onSuccess: () => {
      setSubmitted(true);
      // Scroll to thank you section
      setTimeout(() => {
        document.getElementById("thank-you")?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;
    submitLead.mutate({ name: name.trim(), email: email.trim(), source: "lifework-landing" });
  };

  const handleStartNow = () => {
    navigate("/coaching/lifework");
  };

  return (
    <div className="min-h-screen" style={{ background: "var(--lw-cream)" }}>
      {/* ── Hero Section ── */}
      <section
        className="relative min-h-[85vh] flex items-center justify-center px-4 py-20"
        style={{
          background: "linear-gradient(135deg, var(--lw-navy) 0%, var(--lw-navy-mid) 100%)",
        }}
      >
        <div className="container max-w-5xl text-center">
          {/* One-liner headline */}
          <h1
            className="text-4xl md:text-6xl font-bold mb-6 leading-tight"
            style={{ color: "white", fontFamily: "'Playfair Display', serif" }}
          >
            Find the Career That Fits{" "}
            <span style={{ color: "var(--lw-gold)" }}>Who You Really Are</span>
          </h1>

          <p
            className="text-lg md:text-xl mb-10 max-w-2xl mx-auto leading-relaxed"
            style={{ color: "rgba(255,255,255,0.85)" }}
          >
            Stop guessing. Take a 20-minute assessment built by a career coach with 30 years'
            experience — and get a personalised report that shows you exactly what careers match
            your strengths, personality, and values.
          </p>

          {/* Direct CTA */}
          <button
            onClick={handleStartNow}
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl text-lg font-semibold transition-all hover:scale-105 active:scale-95 shadow-xl"
            style={{ background: "var(--lw-gold)", color: "var(--lw-navy)" }}
          >
            Start Your Free Assessment
            <ArrowRight className="w-5 h-5" />
          </button>

          <p className="mt-4 text-sm" style={{ color: "rgba(255,255,255,0.6)" }}>
            No credit card required · Takes 20 minutes · Get your results instantly
          </p>
        </div>
      </section>

      {/* ── Problem & Stakes Section ── */}
      <section className="py-20 px-4">
        <div className="container max-w-4xl">
          <h2
            className="text-3xl md:text-4xl font-bold text-center mb-6"
            style={{ color: "var(--lw-navy)", fontFamily: "'Playfair Display', serif" }}
          >
            Everyone Keeps Asking: "What Do You Want to Do?"
          </h2>
          <p className="text-lg text-center mb-12" style={{ color: "var(--lw-navy-mid)" }}>
            And you don't have an answer. You feel lost, anxious, like everyone else has a plan
            except you.
          </p>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="p-6 rounded-xl" style={{ background: "white", border: "1px solid rgba(13,27,46,0.1)" }}>
              <div className="w-12 h-12 rounded-full mb-4 flex items-center justify-center" style={{ background: "rgba(201,151,58,0.1)" }}>
                <X className="w-6 h-6" style={{ color: "var(--lw-gold)" }} />
              </div>
              <h3 className="font-semibold mb-2" style={{ color: "var(--lw-navy)" }}>
                You're stuck choosing
              </h3>
              <p className="text-sm" style={{ color: "var(--lw-navy-mid)" }}>
                Picking a university course or first job based on guesswork — not on who you
                actually are.
              </p>
            </div>

            <div className="p-6 rounded-xl" style={{ background: "white", border: "1px solid rgba(13,27,46,0.1)" }}>
              <div className="w-12 h-12 rounded-full mb-4 flex items-center justify-center" style={{ background: "rgba(201,151,58,0.1)" }}>
                <X className="w-6 h-6" style={{ color: "var(--lw-gold)" }} />
              </div>
              <h3 className="font-semibold mb-2" style={{ color: "var(--lw-navy)" }}>
                You feel the pressure
              </h3>
              <p className="text-sm" style={{ color: "var(--lw-navy-mid)" }}>
                Parents, teachers, friends — everyone has an opinion, but none of them are living
                your life.
              </p>
            </div>

            <div className="p-6 rounded-xl" style={{ background: "white", border: "1px solid rgba(13,27,46,0.1)" }}>
              <div className="w-12 h-12 rounded-full mb-4 flex items-center justify-center" style={{ background: "rgba(201,151,58,0.1)" }}>
                <X className="w-6 h-6" style={{ color: "var(--lw-gold)" }} />
              </div>
              <h3 className="font-semibold mb-2" style={{ color: "var(--lw-navy)" }}>
                You're worried about wasting time
              </h3>
              <p className="text-sm" style={{ color: "var(--lw-navy-mid)" }}>
                What if you pick the wrong degree? The wrong job? What if you realise too late?
              </p>
            </div>
          </div>

          <p
            className="text-center mt-12 text-lg font-semibold"
            style={{ color: "var(--lw-navy)" }}
          >
            You deserve to make this decision based on real insight — not guesswork.
          </p>
        </div>
      </section>

      {/* ── Guide Section (Empathy + Authority) ── */}
      <section className="py-20 px-4" style={{ background: "white" }}>
        <div className="container max-w-4xl">
          <p className="text-center text-lg mb-12" style={{ color: "var(--lw-navy-mid)" }}>
            We understand how frustrating it is to feel lost when everyone expects you to have it
            all figured out.
          </p>

          <div className="flex flex-col md:flex-row items-center gap-12">
            <div className="flex-1">
              <h2
                className="text-3xl font-bold mb-4"
                style={{ color: "var(--lw-navy)", fontFamily: "'Playfair Display', serif" }}
              >
                Built by a Career Coach with 30 Years' Experience
              </h2>
              <p className="mb-4" style={{ color: "var(--lw-navy-mid)" }}>
                Lifework was created by Peter Pennington, a professional career coach who has helped
                thousands of people find the right path. Now, his proven assessment method is
                available to you — for free.
              </p>
              <p style={{ color: "var(--lw-navy-mid)" }}>
                In just 20 minutes, you'll complete a scientifically-backed personality and strengths
                assessment. Then you'll get a personalised WOW Report that shows you exactly what
                careers fit who you are.
              </p>
            </div>
            <div className="flex-shrink-0">
              <img
                src="https://d2xsxph8kpxj0f.cloudfront.net/107696804/kFbbE6kqNApXGDFpQJUGV7/phsquare_98c01de4.jpg"
                alt="Pennington Hennessy"
                className="w-48 h-48 rounded-2xl object-cover shadow-xl"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── Plan Section (How It Works) ── */}
      <section className="py-20 px-4">
        <div className="container max-w-5xl">
          <h2
            className="text-3xl md:text-4xl font-bold text-center mb-16"
            style={{ color: "var(--lw-navy)", fontFamily: "'Playfair Display', serif" }}
          >
            How It Works
          </h2>

          <div className="grid md:grid-cols-3 gap-12">
            <div className="text-center">
              <div
                className="w-16 h-16 rounded-full mx-auto mb-6 flex items-center justify-center text-2xl font-bold"
                style={{ background: "var(--lw-gold)", color: "var(--lw-navy)" }}
              >
                1
              </div>
              <h3 className="text-xl font-semibold mb-3" style={{ color: "var(--lw-navy)" }}>
                Take the Free Assessment
              </h3>
              <p style={{ color: "var(--lw-navy-mid)" }}>
                Answer questions about your personality, strengths, and values. It takes 20 minutes
                and there are no wrong answers.
              </p>
            </div>

            <div className="text-center">
              <div
                className="w-16 h-16 rounded-full mx-auto mb-6 flex items-center justify-center text-2xl font-bold"
                style={{ background: "var(--lw-gold)", color: "var(--lw-navy)" }}
              >
                2
              </div>
              <h3 className="text-xl font-semibold mb-3" style={{ color: "var(--lw-navy)" }}>
                Get Your Personalised WOW Report
              </h3>
              <p style={{ color: "var(--lw-navy-mid)" }}>
                Instantly receive a detailed report showing your top strengths, personality type,
                and what careers match who you are.
              </p>
            </div>

            <div className="text-center">
              <div
                className="w-16 h-16 rounded-full mx-auto mb-6 flex items-center justify-center text-2xl font-bold"
                style={{ background: "var(--lw-gold)", color: "var(--lw-navy)" }}
              >
                3
              </div>
              <h3 className="text-xl font-semibold mb-3" style={{ color: "var(--lw-navy)" }}>
                Start Your Career with Confidence
              </h3>
              <p style={{ color: "var(--lw-navy-mid)" }}>
                Make decisions based on real insight. Know exactly what careers fit you — and why.
              </p>
            </div>
          </div>

          <div className="text-center mt-16">
            <button
              onClick={handleStartNow}
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl text-lg font-semibold transition-all hover:scale-105 active:scale-95 shadow-xl"
              style={{ background: "var(--lw-gold)", color: "var(--lw-navy)" }}
            >
              Start Your Free Assessment
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </section>

      {/* ── Success Section (The "After" State) ── */}
      <section className="py-20 px-4" style={{ background: "white" }}>
        <div className="container max-w-4xl">
          <h2
            className="text-3xl md:text-4xl font-bold text-center mb-12"
            style={{ color: "var(--lw-navy)", fontFamily: "'Playfair Display', serif" }}
          >
            Imagine Knowing Exactly What Career Fits You
          </h2>

          <div className="grid md:grid-cols-2 gap-6">
            {[
              "Feel confident when people ask 'what do you want to do?'",
              "Choose your university course based on who you really are",
              "Know your strengths and how to use them",
              "Stop second-guessing yourself",
              "Start your career with a clear plan",
              "Finally feel like you're on the right path",
            ].map((benefit, i) => (
              <div key={i} className="flex items-start gap-3">
                <CheckCircle className="w-6 h-6 flex-shrink-0 mt-0.5" style={{ color: "var(--lw-gold)" }} />
                <p className="text-lg" style={{ color: "var(--lw-navy)" }}>
                  {benefit}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA + Lead Capture ── */}
      <section
        className="py-20 px-4"
        style={{
          background: "linear-gradient(135deg, var(--lw-navy) 0%, var(--lw-navy-mid) 100%)",
        }}
      >
        <div className="container max-w-2xl text-center">
          {!submitted ? (
            <>
              <h2
                className="text-3xl md:text-4xl font-bold mb-6"
                style={{ color: "white", fontFamily: "'Playfair Display', serif" }}
              >
                Ready to Find Your Path?
              </h2>
              <p className="text-lg mb-10" style={{ color: "rgba(255,255,255,0.85)" }}>
                Start your free assessment now — or enter your email below and we'll send you a
                sample report so you can see what you'll get.
              </p>

              <div className="flex flex-col gap-4">
                <button
                  onClick={handleStartNow}
                  className="w-full inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl text-lg font-semibold transition-all hover:scale-105 active:scale-95 shadow-xl"
                  style={{ background: "var(--lw-gold)", color: "var(--lw-navy)" }}
                >
                  Start Your Free Assessment
                  <ArrowRight className="w-5 h-5" />
                </button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t" style={{ borderColor: "rgba(255,255,255,0.2)" }}></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4" style={{ background: "var(--lw-navy)", color: "rgba(255,255,255,0.6)" }}>
                      or
                    </span>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-3">
                  <input
                    type="text"
                    placeholder="Your name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="w-full px-4 py-3 rounded-xl text-lg"
                    style={{ background: "white", color: "var(--lw-navy)", border: "none" }}
                  />
                  <input
                    type="email"
                    placeholder="Your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full px-4 py-3 rounded-xl text-lg"
                    style={{ background: "white", color: "var(--lw-navy)", border: "none" }}
                  />
                  <button
                    type="submit"
                    disabled={submitLead.isPending}
                    className="w-full px-8 py-3 rounded-xl text-lg font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
                    style={{
                      background: "rgba(255,255,255,0.15)",
                      color: "white",
                      border: "1px solid rgba(255,255,255,0.3)",
                    }}
                  >
                    {submitLead.isPending ? "Sending..." : "Send Me a Sample Report"}
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div id="thank-you" className="py-12">
              <CheckCircle className="w-16 h-16 mx-auto mb-6" style={{ color: "var(--lw-gold)" }} />
              <h2
                className="text-3xl font-bold mb-4"
                style={{ color: "white", fontFamily: "'Playfair Display', serif" }}
              >
                Thanks, {name}!
              </h2>
              <p className="text-lg mb-8" style={{ color: "rgba(255,255,255,0.85)" }}>
                We've sent a sample report to <strong>{email}</strong>. Check your inbox in the next
                few minutes.
              </p>
              <button
                onClick={handleStartNow}
                className="inline-flex items-center gap-2 px-8 py-4 rounded-xl text-lg font-semibold transition-all hover:scale-105 active:scale-95 shadow-xl"
                style={{ background: "var(--lw-gold)", color: "var(--lw-navy)" }}
              >
                Start Your Free Assessment Now
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      </section>

      {/* ── Failure Avoidance (subtle footer) ── */}
      <section className="py-12 px-4" style={{ background: "var(--lw-cream)", borderTop: "1px solid rgba(13,27,46,0.1)" }}>
        <div className="container max-w-3xl text-center">
          <p className="text-sm" style={{ color: "var(--lw-navy-mid)" }}>
            Without clarity, you risk picking the wrong path — wasted years, the wrong degree, jobs
            you hate. Don't guess. Know.
          </p>
        </div>
      </section>
    </div>
  );
}
