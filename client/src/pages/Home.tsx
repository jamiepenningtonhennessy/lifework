import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { getLoginUrl } from "@/const";
import { useLocation } from "wouter";
import { ArrowRight, BookOpen, Brain, Star } from "lucide-react";
import { trpc } from "@/lib/trpc";

export default function Home() {
  const { user, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const { data: _profile } = trpc.profile.getMyProfile.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const handleStart = () => {
    if (!isAuthenticated) {
      window.location.href = getLoginUrl();
    } else {
      navigate("/dashboard");
    }
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

      {/* Navigation — navy bar */}
      <nav style={{ background: "var(--lw-navy)", borderBottom: "1px solid rgba(201,151,58,0.25)" }}
        className="sticky top-0 z-50">
        <div className="container flex items-center justify-between h-16">
          {/* Wordmark */}
          <div className="flex items-center gap-3">
            <img src="https://d2xsxph8kpxj0f.cloudfront.net/107696804/kFbbE6kqNApXGDFpQJUGV7/phsquare_98c01de4.jpg" alt="Pennington Hennessy" className="w-8 h-8 object-cover" />
            <span style={{ color: "white", fontFamily: "'Playfair Display', serif", fontWeight: 600, fontSize: "1.1rem", letterSpacing: "0.02em" }}>
              Lifework
            </span>
          </div>
          {/* Nav actions */}
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <>
                <span className="text-sm hidden sm:block" style={{ color: "rgba(255,255,255,0.6)" }}>
                  Welcome, {user?.name?.split(" ")[0]}
                </span>
                {user?.role === "admin" && (
                  <button
                    onClick={() => navigate("/counselor")}
                    className="px-4 py-2 text-sm font-medium tracking-wide uppercase cursor-pointer transition-colors"
                    style={{
                      border: "1px solid rgba(201,151,58,0.6)",
                      color: "var(--lw-gold)",
                      background: "transparent",
                      letterSpacing: "0.08em",
                      fontSize: "0.75rem"
                    }}
                    onMouseEnter={e => { (e.target as HTMLButtonElement).style.background = "rgba(201,151,58,0.1)"; }}
                    onMouseLeave={e => { (e.target as HTMLButtonElement).style.background = "transparent"; }}
                  >
                    Counsellor View
                  </button>
                )}
                <button
                  onClick={() => navigate("/dashboard")}
                  className="px-4 py-2 text-sm font-medium tracking-wide uppercase cursor-pointer transition-colors"
                  style={{
                    background: "var(--lw-gold)",
                    color: "var(--lw-navy)",
                    letterSpacing: "0.08em",
                    fontSize: "0.75rem",
                    fontWeight: 600
                  }}
                  onMouseEnter={e => { (e.target as HTMLButtonElement).style.background = "oklch(0.60 0.13 72)"; }}
                  onMouseLeave={e => { (e.target as HTMLButtonElement).style.background = "var(--lw-gold)"; }}
                >
                  My Dashboard
                </button>
              </>
            ) : (
              <button
                onClick={() => window.location.href = getLoginUrl()}
                className="px-4 py-2 text-sm font-medium tracking-wide uppercase cursor-pointer"
                style={{
                  background: "var(--lw-gold)",
                  color: "var(--lw-navy)",
                  letterSpacing: "0.08em",
                  fontSize: "0.75rem",
                  fontWeight: 600
                }}
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Hero — full-bleed dark navy */}
      <section style={{ background: "var(--lw-navy)", minHeight: "520px" }}
        className="relative overflow-hidden">
        {/* Subtle texture overlay */}
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: "radial-gradient(circle at 70% 50%, oklch(0.68 0.13 72) 0%, transparent 60%)" }} />
        <div className="container relative py-28 lg:py-36">
          <div className="max-w-2xl">
            {/* Eyebrow */}
            <div className="lw-eyebrow mb-6" style={{ color: "var(--lw-gold)" }}>
              Career Analysis
            </div>
            <h1 className="font-serif font-bold leading-tight mb-6"
              style={{ fontSize: "clamp(2.4rem, 5vw, 3.6rem)", color: "white" }}>
              Discover the story<br />
              <em style={{ color: "var(--lw-gold)", fontStyle: "italic" }}>your life is telling.</em>
            </h1>
            <p className="leading-relaxed mb-10"
              style={{ fontSize: "1.05rem", color: "rgba(255,255,255,0.72)", maxWidth: "520px" }}>
              Lifework guides you through a reflective journey of your life history — your achievements,
              your strengths, your values — to reveal the career that is authentically yours.
              Based on the pioneering methodology of Bernard Haldane and the Dependable Strengths tradition.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={handleStart}
                className="inline-flex items-center gap-2 px-7 py-3 font-medium tracking-wide uppercase cursor-pointer transition-opacity"
                style={{
                  background: "var(--lw-gold)",
                  color: "var(--lw-navy)",
                  letterSpacing: "0.08em",
                  fontSize: "0.8rem",
                  fontWeight: 600
                }}
                onMouseEnter={e => { (e.target as HTMLButtonElement).style.opacity = "0.88"; }}
                onMouseLeave={e => { (e.target as HTMLButtonElement).style.opacity = "1"; }}
              >
                Begin Your Journey <ArrowRight className="w-4 h-4" />
              </button>
              {(!isAuthenticated || user?.role === "admin") && (
                <button
                  onClick={handleCounselor}
                  className="inline-flex items-center gap-2 px-7 py-3 font-medium tracking-wide uppercase cursor-pointer transition-colors"
                  style={{
                    border: "1px solid rgba(255,255,255,0.4)",
                    color: "white",
                    background: "transparent",
                    letterSpacing: "0.08em",
                    fontSize: "0.8rem"
                  }}
                  onMouseEnter={e => { (e.target as HTMLButtonElement).style.borderColor = "var(--lw-gold)"; (e.target as HTMLButtonElement).style.color = "var(--lw-gold)"; }}
                  onMouseLeave={e => { (e.target as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.4)"; (e.target as HTMLButtonElement).style.color = "white"; }}
                >
                  Counsellor Access
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Stats bar — mid-navy */}
      <section style={{ background: "var(--lw-navy-mid)", borderTop: "1px solid rgba(201,151,58,0.2)", borderBottom: "1px solid rgba(201,151,58,0.2)" }}>
        <div className="container py-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { num: "965", label: "Clients Analysed" },
              { num: "35+", label: "Years of Research" },
              { num: "3", label: "Stage Process" },
              { num: "1", label: "Counsellor, Personally" },
            ].map(stat => (
              <div key={stat.label}>
                <div className="font-serif font-bold mb-1"
                  style={{ fontSize: "2rem", color: "var(--lw-gold)" }}>
                  {stat.num}
                </div>
                <div className="uppercase tracking-widest"
                  style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.55)", letterSpacing: "0.14em" }}>
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works — cream section */}
      <section className="py-24" style={{ background: "var(--lw-cream)" }}>
        <div className="container">
          <div className="mb-14">
            <div className="lw-eyebrow mb-4">The Process</div>
            <h2 className="font-serif font-bold text-foreground"
              style={{ fontSize: "2rem" }}>
              How it works
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-0 max-w-4xl" style={{ border: "1px solid rgba(201,151,58,0.3)" }}>
            {[
              {
                icon: <BookOpen className="w-5 h-5" />,
                step: "01",
                title: "Life History Interview",
                desc: "A structured conversation explores your achievements decade by decade — childhood through to today.",
              },
              {
                icon: <Star className="w-5 h-5" />,
                step: "02",
                title: "Psychometric Instruments",
                desc: "A small set of validated assessments that act as lenses through which we consider the you that your life shows.",
              },
              {
                icon: <Brain className="w-5 h-5" />,
                step: "03",
                title: "Analysis & Report",
                desc: "Your counsellor will take all the information given and write a summary report, setting out what he believes may be true, and setting out some questions to explore together.",
              },
            ].map((item, i) => (
              <div
                key={item.step}
                className="p-8 relative"
                style={{
                  borderRight: i < 2 ? "1px solid rgba(201,151,58,0.25)" : "none",
                  borderBottom: "none"
                }}
              >
                <div className="font-serif font-bold mb-6"
                  style={{ fontSize: "2.5rem", color: "rgba(201,151,58,0.18)" }}>
                  {item.step}
                </div>
                <div className="mb-4" style={{ color: "var(--lw-gold)" }}>
                  {item.icon}
                </div>
                <h3 className="font-serif font-semibold text-foreground mb-3"
                  style={{ fontSize: "1.05rem" }}>
                  {item.title}
                </h3>
                <p className="leading-relaxed" style={{ fontSize: "0.875rem", color: "var(--lw-navy-light)" }}>
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About the Methodology — cream section */}
      <section className="py-20" style={{ background: "white", borderTop: "1px solid rgba(15,31,53,0.08)" }}>
        <div className="container max-w-4xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-start">
            <div>
              <p className="font-medium tracking-widest uppercase mb-4" style={{ fontSize: "0.7rem", color: "var(--lw-gold)", letterSpacing: "0.12em" }}>
                — THE METHODOLOGY
              </p>
              <h2 className="font-serif font-bold mb-6" style={{ fontSize: "2rem", lineHeight: 1.2, color: "var(--lw-navy)" }}>
                A different kind of career conversation
              </h2>
            </div>
            <div className="space-y-5" style={{ color: "var(--lw-navy-light)", fontSize: "0.95rem", lineHeight: 1.75 }}>
              <p>
                Lifework is built on the Dependable Strengths methodology, developed by Bernard Haldane at Columbia University in the 1940s and refined over decades of research at the University of Washington. The core insight is simple but profound: the most reliable guide to a fulfilling career is not a questionnaire about preferences, but a careful reading of the life you have already lived.
              </p>
              <p>
                Bernard Haldane spent decades refining this approach, and his Dependable Strengths methodology has since been applied with thousands of clients across every stage of working life — from graduates finding their first direction to senior professionals facing retirement. The central conviction is that every life history, read attentively, contains a pattern of motivated achievement that points clearly toward the work that will be most rewarding.
              </p>
              <p>
                Lifework makes that conversation available at scale, guided by a counsellor who knows the methodology and the database of real outcomes behind it. The psychometric instruments — personality and character strengths — are not the analysis. They are lenses through which the life history is read more clearly.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Quote — navy section */}
      <section className="py-20" style={{ background: "var(--lw-navy)" }}>
        <div className="container max-w-3xl">
          <blockquote className="font-serif italic leading-relaxed mb-6"
            style={{ fontSize: "1.5rem", color: "white", borderLeft: "3px solid var(--lw-gold)", paddingLeft: "1.5rem" }}>
            "The most important thing is to find out what is important to you — not what others think should be important."
          </blockquote>
          <p style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.5)", letterSpacing: "0.06em" }}>
            — Bernard Haldane, Dependable Strengths
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ background: "var(--lw-navy)", borderTop: "1px solid rgba(201,151,58,0.2)" }}
        className="py-8">
        <div className="container flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src="https://d2xsxph8kpxj0f.cloudfront.net/107696804/kFbbE6kqNApXGDFpQJUGV7/phsquare_98c01de4.jpg" alt="Pennington Hennessy" className="w-6 h-6 object-cover" />
            <span style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.85rem", fontFamily: "'Playfair Display', serif" }}>
              Lifework
            </span>
          </div>
          <p style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.4)" }}>
            Inspired by the work of Bernard Haldane · A{" "}
            <a
              href="https://www.penningtonhennessy.com"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "var(--lw-gold)", textDecoration: "none" }}
              onMouseEnter={e => (e.currentTarget.style.textDecoration = "underline")}
              onMouseLeave={e => (e.currentTarget.style.textDecoration = "none")}
            >
              Pennington Hennessy
            </a>{" "}service
          </p>
        </div>
      </footer>
    </div>
  );
}
