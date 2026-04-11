import { ArrowRight, Lock, Clock, MessageSquare, TrendingDown, CheckCircle2, XCircle } from "lucide-react";

// ─── Static marketing page: Pennington Hennessy AI Coaching ───────────────────
// Content from www.penningtonhennessy-ai.com, restyled to match Lifework brand.

const NAV_LINKS = [
  { label: "Features", href: "#features" },
  { label: "Pricing", href: "#pricing" },
  { label: "Demo", href: "#demo" },
  { label: "About", href: "#about" },
];

const PAIN_POINTS = [
  { icon: <Lock className="w-5 h-5" />, label: "No safe place to rehearse" },
  { icon: <Clock className="w-5 h-5" />, label: "Real-time pressure" },
  { icon: <MessageSquare className="w-5 h-5" />, label: "Risk of miscommunication" },
  { icon: <TrendingDown className="w-5 h-5" />, label: "Lost client opportunities" },
];

const SOLUTION_STEPS = [
  {
    step: "01",
    title: "Choose a Scenario",
    desc: "Tailored to the conversation you need: fee discussions, difficult clients, negotiations, BD, leadership.",
  },
  {
    step: "02",
    title: "Practise With Precise AI Role-Plays",
    desc: "Realistic interactions, emotional cues, pushback, and tailored challenges.",
  },
  {
    step: "03",
    title: "Get Feedback and Improve",
    desc: "Build confidence, communication skill, and commercial impact.",
  },
];

const BENEFITS = [
  "Communicate with clarity and authority",
  "Build stronger client relationships",
  "Handle objections and pushback",
  "Reduce stress and performance anxiety",
  "Improve commercial awareness",
  "Increase win rates and client satisfaction",
];

const TESTIMONIALS = [
  {
    quote:
      "The AI role-plays gave our team a safe way to practise difficult conversations. The impact was noticeable immediately. Our lawyers felt more confident, and client feedback improved within the first month.",
    name: "Managing Partner",
    role: "",
  },
  {
    quote:
      "We integrated this into our partnership training program. The structured feedback loop helped junior lawyers develop commercial skills they would normally take years to acquire.",
    name: "Head of Talent Development",
    role: "",
  },
];

const UNPREPARED = [
  "Missed opportunities",
  "Damaged client trust",
  "Ineffective conversations",
  "Increased stress and doubt",
  "Weak commercial outcomes",
  "Lower confidence in high-stakes moments",
];

const PREPARED = [
  "Confident, polished communication",
  "Greater client trust",
  "Stronger commercial performance",
  "Lawyers who feel prepared for anything",
  "Higher win rates and deal closures",
  "Improved client satisfaction and retention",
];

const HOW_STEPS = [
  {
    step: "01",
    title: "Book a Demo",
    desc: "Schedule 30 minutes with our team to see how it works",
  },
  {
    step: "02",
    title: "Practise with AI Role-Plays",
    desc: "Start with a tailored scenario for your needs",
  },
  {
    step: "03",
    title: "Lead with Confidence",
    desc: "Apply new skills to real client conversations",
  },
];

// ─── Shared style helpers ──────────────────────────────────────────────────────

const navyBg = { background: "var(--lw-navy)" } as const;
const navyMidBg = { background: "var(--lw-navy-mid)" } as const;
const creamBg = { background: "var(--lw-cream)" } as const;
const whiteBg = { background: "white" } as const;
const goldColor = { color: "var(--lw-gold)" } as const;
const navyColor = { color: "var(--lw-navy)" } as const;
const goldBorder = { borderColor: "rgba(201,151,58,0.3)" } as const;

// ─── Component ────────────────────────────────────────────────────────────────

export default function AICoaching() {
  return (
    <div className="min-h-screen" style={creamBg}>

      {/* ── Navigation ── */}
      <nav
        className="sticky top-0 z-50"
        style={{ ...navyBg, borderBottom: "1px solid rgba(201,151,58,0.25)" }}
      >
        <div className="container flex items-center justify-between h-16">
          {/* Wordmark */}
          <div className="flex items-center gap-3">
            <img
              src="https://d2xsxph8kpxj0f.cloudfront.net/107696804/kFbbE6kqNApXGDFpQJUGV7/penhenlong_a1952c94.jpg"
              alt="Pennington Hennessy"
              style={{ height: "36px", width: "auto", objectFit: "contain" }}
            />
          </div>

          {/* Nav links (hidden on mobile) + CTA */}
          <div className="flex items-center gap-6">
            <div className="hidden md:flex items-center gap-6">
              {NAV_LINKS.map((l) => (
                <a
                  key={l.label}
                  href={l.href}
                  className="text-sm tracking-wide transition-colors"
                  style={{
                    color: "rgba(255,255,255,0.65)",
                    letterSpacing: "0.06em",
                    textDecoration: "none",
                    fontSize: "0.8rem",
                  }}
                  onMouseEnter={(e) =>
                    ((e.target as HTMLAnchorElement).style.color = "var(--lw-gold)")
                  }
                  onMouseLeave={(e) =>
                    ((e.target as HTMLAnchorElement).style.color = "rgba(255,255,255,0.65)")
                  }
                >
                  {l.label}
                </a>
              ))}
            </div>
            <a
              href="#demo"
              className="inline-flex items-center gap-2 px-5 py-2 font-medium tracking-wide uppercase"
              style={{
                background: "var(--lw-gold)",
                color: "var(--lw-navy)",
                letterSpacing: "0.08em",
                fontSize: "0.75rem",
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              Book a Demo <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section
        className="relative overflow-hidden"
        style={{ ...navyBg, minHeight: "540px" }}
      >
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              "radial-gradient(circle at 70% 50%, oklch(0.68 0.13 72) 0%, transparent 60%)",
          }}
        />
        <div className="container relative py-28 lg:py-36">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left: copy */}
            <div>
              <div className="lw-eyebrow mb-6" style={goldColor}>
                AI-Powered Legal Training
              </div>
              <h1
                className="font-serif font-bold leading-tight mb-6"
                style={{ fontSize: "clamp(2.2rem, 4.5vw, 3.4rem)", color: "white" }}
              >
                Master Crucial Conversations{" "}
                <em style={{ ...goldColor, fontStyle: "italic" }}>
                  Before They Matter
                </em>
              </h1>
              <p
                className="leading-relaxed mb-10"
                style={{
                  fontSize: "1.05rem",
                  color: "rgba(255,255,255,0.72)",
                  maxWidth: "520px",
                }}
              >
                AI-powered role-play practice helps your lawyers prepare for fee
                discussions, difficult clients, and high-stakes negotiations with
                confidence.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <a
                  href="#demo"
                  className="inline-flex items-center gap-2 px-7 py-3 font-medium tracking-wide uppercase transition-opacity"
                  style={{
                    background: "var(--lw-gold)",
                    color: "var(--lw-navy)",
                    letterSpacing: "0.08em",
                    fontSize: "0.8rem",
                    fontWeight: 600,
                    textDecoration: "none",
                  }}
                >
                  Book a Demo <ArrowRight className="w-4 h-4" />
                </a>
                <a
                  href="https://d2xsxph8kpxj0f.cloudfront.net/107696804/kFbbE6kqNApXGDFpQJUGV7/knowhow-guide_87cf4494.pdf" target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-7 py-3 font-medium tracking-wide uppercase transition-colors"
                  style={{
                    border: "1px solid rgba(255,255,255,0.4)",
                    color: "white",
                    background: "transparent",
                    letterSpacing: "0.08em",
                    fontSize: "0.8rem",
                    textDecoration: "none",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLAnchorElement).style.borderColor =
                      "var(--lw-gold)";
                    (e.currentTarget as HTMLAnchorElement).style.color =
                      "var(--lw-gold)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLAnchorElement).style.borderColor =
                      "rgba(255,255,255,0.4)";
                    (e.currentTarget as HTMLAnchorElement).style.color = "white";
                  }}
                >
                  Download the Guide
                </a>
              </div>
            </div>

            {/* Right: placeholder image frame */}
            <div
              className="hidden lg:block rounded-none overflow-hidden"
              style={{
                border: "1px solid rgba(201,151,58,0.3)",
                height: "360px",
                background: "rgba(255,255,255,0.04)",
              }}
            >
              <img
                src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=800&q=80"
                alt="Lawyer preparing for a client conversation"
                className="w-full h-full object-cover opacity-80"
                style={{ objectPosition: "center 15%" }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── The Challenge ── */}
      <section className="py-24" style={creamBg}>
        <div className="container max-w-4xl">
          <div className="text-center mb-14">
            <div className="lw-eyebrow justify-center mb-4" style={goldColor}>
              The Challenge
            </div>
            <h2
              className="font-serif font-bold mb-4"
              style={{ fontSize: "2rem", ...navyColor }}
            >
              Your Lawyers Don't Get a Second Chance at Crucial Conversations
            </h2>
            <p
              className="leading-relaxed mx-auto"
              style={{
                fontSize: "1rem",
                color: "var(--lw-navy-light)",
                maxWidth: "560px",
              }}
            >
              Important client discussions can determine fees, trust, and long-term
              relationships. But lawyers rarely get the chance to practise these
              conversations before they count — leaving them feeling unprepared and
              anxious.
            </p>
          </div>
          <div
            className="grid grid-cols-1 sm:grid-cols-2 gap-px"
            style={{ border: "1px solid rgba(201,151,58,0.3)" }}
          >
            {PAIN_POINTS.map((p) => (
              <div
                key={p.label}
                className="p-8 flex items-center gap-4"
                style={{ background: "white", borderBottom: "1px solid rgba(201,151,58,0.15)" }}
              >
                <span style={goldColor}>{p.icon}</span>
                <span
                  className="font-medium"
                  style={{ fontSize: "0.95rem", ...navyColor }}
                >
                  {p.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── The Solution ── */}
      <section id="features" className="py-24" style={navyBg}>
        <div className="container">
          <div className="mb-14">
            <div className="lw-eyebrow mb-4" style={goldColor}>
              The Solution
            </div>
            <h2
              className="font-serif font-bold"
              style={{ fontSize: "2rem", color: "white" }}
            >
              Prepare for Any Scenario With AI Role-Play Practice
            </h2>
            <p
              className="mt-3"
              style={{ fontSize: "0.95rem", color: "rgba(255,255,255,0.6)" }}
            >
              A structured approach to building communication confidence
            </p>
          </div>
          <div
            className="grid grid-cols-1 md:grid-cols-3 gap-0 max-w-4xl"
            style={{ border: "1px solid rgba(201,151,58,0.3)" }}
          >
            {SOLUTION_STEPS.map((item, i) => (
              <div
                key={item.step}
                className="p-8"
                style={{
                  borderRight:
                    i < SOLUTION_STEPS.length - 1
                      ? "1px solid rgba(201,151,58,0.25)"
                      : "none",
                }}
              >
                <div
                  className="font-serif font-bold mb-6"
                  style={{ fontSize: "2.5rem", color: "rgba(201,151,58,0.18)" }}
                >
                  {item.step}
                </div>
                <h3
                  className="font-serif font-semibold mb-3"
                  style={{ fontSize: "1.05rem", color: "white" }}
                >
                  {item.title}
                </h3>
                <p
                  className="leading-relaxed"
                  style={{ fontSize: "0.875rem", color: "rgba(255,255,255,0.6)" }}
                >
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── What You Achieve ── */}
      <section className="py-24" style={creamBg}>
        <div className="container max-w-4xl">
          <div className="mb-14">
            <div className="lw-eyebrow mb-4" style={goldColor}>
              What You Achieve
            </div>
            <h2
              className="font-serif font-bold"
              style={{ fontSize: "2rem", ...navyColor }}
            >
              Give Your Lawyers the Confidence to Lead Crucial Conversations
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-4">
            {BENEFITS.map((b) => (
              <div key={b} className="flex items-start gap-3">
                <CheckCircle2
                  className="w-4 h-4 mt-0.5 flex-shrink-0"
                  style={goldColor}
                />
                <span style={{ fontSize: "0.95rem", ...navyColor }}>{b}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section className="py-24" style={navyMidBg}>
        <div className="container max-w-4xl">
          <div className="mb-14 text-center">
            <div className="lw-eyebrow justify-center mb-4" style={goldColor}>
              Testimonials
            </div>
            <h2
              className="font-serif font-bold"
              style={{ fontSize: "2rem", color: "white" }}
            >
              Trusted by Legal Teams Worldwide
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {TESTIMONIALS.map((t) => (
              <div
                key={t.name}
                className="p-8"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(201,151,58,0.25)",
                }}
              >
                <p
                  className="leading-relaxed mb-6 italic"
                  style={{ fontSize: "0.95rem", color: "rgba(255,255,255,0.8)" }}
                >
                  "{t.quote}"
                </p>
                <div>
                  <div
                    className="font-semibold"
                    style={{ fontSize: "0.9rem", color: "var(--lw-gold)" }}
                  >
                    {t.name}
                  </div>
                  <div
                    style={{
                      fontSize: "0.8rem",
                      color: "rgba(255,255,255,0.5)",
                      marginTop: "0.2rem",
                    }}
                  >
                    {t.role}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── About ── */}
      <section id="about" className="py-20" style={whiteBg}>
        <div className="container max-w-4xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-start">
            <div>
              <div className="lw-eyebrow mb-4" style={goldColor}>
                About
              </div>
              <h2
                className="font-serif font-bold mb-6"
                style={{ fontSize: "1.8rem", lineHeight: 1.2, ...navyColor }}
              >
                Founded on Legal Communication Expertise
              </h2>
              <p
                className="leading-relaxed"
                style={{ fontSize: "0.95rem", color: "var(--lw-navy-light)" }}
              >
                Built by lawyers and communication coaches with 50+ years of combined
                experience in legal practice, client relationships, and coaching. We
                understand the exact challenges your team faces.
              </p>
            </div>
            <div
              className="p-8"
              style={{
                background: "var(--lw-cream)",
                border: "1px solid rgba(201,151,58,0.3)",
              }}
            >
              <p
                className="font-medium tracking-widest uppercase mb-3"
                style={{ fontSize: "0.7rem", ...goldColor, letterSpacing: "0.12em" }}
              >
                — Our Conviction
              </p>
              <blockquote
                className="font-serif italic leading-relaxed"
                style={{ fontSize: "1.05rem", ...navyColor }}
              >
                "The most effective professionals are those who can hold a difficult
                conversation with clarity, empathy, and authority — and that skill
                can be learned."
              </blockquote>
            </div>
          </div>
        </div>
      </section>

      {/* ── The Stakes ── */}
      <section className="py-24" style={creamBg}>
        <div className="container max-w-4xl">
          <div className="mb-14 text-center">
            <div className="lw-eyebrow justify-center mb-4" style={goldColor}>
              The Stakes
            </div>
            <h2
              className="font-serif font-bold"
              style={{ fontSize: "2rem", ...navyColor }}
            >
              What Happens If Your Team Isn't Prepared?
            </h2>
            <p
              className="mt-3 mx-auto"
              style={{
                fontSize: "0.95rem",
                color: "var(--lw-navy-light)",
                maxWidth: "480px",
              }}
            >
              The difference between walking in confident vs. unprepared affects more
              than just the conversation.
            </p>
          </div>
          <div
            className="grid grid-cols-1 md:grid-cols-2 gap-px"
            style={{ border: "1px solid rgba(201,151,58,0.3)" }}
          >
            {/* Unprepared */}
            <div className="p-8" style={{ background: "white" }}>
              <div className="flex items-center gap-2 mb-6">
                <XCircle className="w-5 h-5" style={{ color: "#b91c1c" }} />
                <h3
                  className="font-serif font-semibold"
                  style={{ fontSize: "1rem", ...navyColor }}
                >
                  If They Don't Prepare
                </h3>
              </div>
              <div className="space-y-3">
                {UNPREPARED.map((u) => (
                  <div key={u} className="flex items-start gap-3">
                    <span
                      style={{ color: "#b91c1c", fontSize: "1rem", lineHeight: 1.4 }}
                    >
                      •
                    </span>
                    <span
                      style={{ fontSize: "0.875rem", color: "var(--lw-navy-light)" }}
                    >
                      {u}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Prepared */}
            <div className="p-8" style={{ background: "var(--lw-cream)" }}>
              <div className="flex items-center gap-2 mb-6">
                <CheckCircle2 className="w-5 h-5" style={goldColor} />
                <h3
                  className="font-serif font-semibold"
                  style={{ fontSize: "1rem", ...navyColor }}
                >
                  If They Do Prepare
                </h3>
              </div>
              <div className="space-y-3">
                {PREPARED.map((p) => (
                  <div key={p} className="flex items-start gap-3">
                    <CheckCircle2
                      className="w-4 h-4 mt-0.5 flex-shrink-0"
                      style={goldColor}
                    />
                    <span
                      style={{ fontSize: "0.875rem", color: "var(--lw-navy-light)" }}
                    >
                      {p}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section id="demo" className="py-24" style={navyBg}>
        <div className="container max-w-3xl text-center">
          <div className="lw-eyebrow justify-center mb-6" style={goldColor}>
            Get Started
          </div>
          <h2
            className="font-serif font-bold mb-6"
            style={{ fontSize: "2.2rem", color: "white" }}
          >
            Give Your Lawyers the Confidence They Deserve
          </h2>
          <p
            className="leading-relaxed mb-10 mx-auto"
            style={{
              fontSize: "1rem",
              color: "rgba(255,255,255,0.7)",
              maxWidth: "480px",
            }}
          >
            Start transforming how your team approaches crucial conversations. Book a
            demo today and see the difference AI-powered practice can make.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="mailto:jamie@penningtonhennessy.com?subject=Book%20a%20Demo"
              className="inline-flex items-center gap-2 px-8 py-3 font-medium tracking-wide uppercase"
              style={{
                background: "var(--lw-gold)",
                color: "var(--lw-navy)",
                letterSpacing: "0.08em",
                fontSize: "0.8rem",
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              Book a Demo <ArrowRight className="w-4 h-4" />
            </a>
            <a
              href="https://d2xsxph8kpxj0f.cloudfront.net/107696804/kFbbE6kqNApXGDFpQJUGV7/knowhow-guide_87cf4494.pdf" target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-8 py-3 font-medium tracking-wide uppercase"
              style={{
                border: "1px solid rgba(255,255,255,0.4)",
                color: "white",
                background: "transparent",
                letterSpacing: "0.08em",
                fontSize: "0.8rem",
                textDecoration: "none",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.borderColor =
                  "var(--lw-gold)";
                (e.currentTarget as HTMLAnchorElement).style.color = "var(--lw-gold)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.borderColor =
                  "rgba(255,255,255,0.4)";
                (e.currentTarget as HTMLAnchorElement).style.color = "white";
              }}
            >
              Download the Guide
            </a>
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="py-24" style={creamBg}>
        <div className="container">
          <div className="mb-14 text-center">
            <div className="lw-eyebrow justify-center mb-4" style={goldColor}>
              How It Works
            </div>
            <h2
              className="font-serif font-bold"
              style={{ fontSize: "2rem", ...navyColor }}
            >
              It's Simple to Get Started
            </h2>
          </div>
          <div
            className="grid grid-cols-1 md:grid-cols-3 gap-0 max-w-4xl mx-auto"
            style={{ border: "1px solid rgba(201,151,58,0.3)" }}
          >
            {HOW_STEPS.map((item, i) => (
              <div
                key={item.step}
                className="p-8 text-center"
                style={{
                  borderRight:
                    i < HOW_STEPS.length - 1
                      ? "1px solid rgba(201,151,58,0.25)"
                      : "none",
                  background: "white",
                }}
              >
                <div
                  className="font-serif font-bold mb-4"
                  style={{ fontSize: "2.5rem", color: "rgba(201,151,58,0.18)" }}
                >
                  {item.step}
                </div>
                <h3
                  className="font-serif font-semibold mb-3"
                  style={{ fontSize: "1.05rem", ...navyColor }}
                >
                  {item.title}
                </h3>
                <p
                  className="leading-relaxed"
                  style={{ fontSize: "0.875rem", color: "var(--lw-navy-light)" }}
                >
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer
        style={{
          ...navyBg,
          borderTop: "1px solid rgba(201,151,58,0.2)",
        }}
      >
        <div className="container py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
            {/* Brand */}
            <div className="md:col-span-2">
              <div className="mb-5">
                <img
                  src="https://d2xsxph8kpxj0f.cloudfront.net/107696804/kFbbE6kqNApXGDFpQJUGV7/penhenlong_a1952c94.jpg"
                  alt="Pennington Hennessy"
                  style={{ height: "32px", width: "auto", objectFit: "contain" }}
                />
              </div>
              <p
                style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.5)" }}
              >
                Prepare. Practise. Perform.
              </p>
            </div>

            {/* Product links */}
            <div>
              <p
                className="uppercase tracking-widest mb-4"
                style={{
                  fontSize: "0.65rem",
                  color: "var(--lw-gold)",
                  letterSpacing: "0.14em",
                }}
              >
                Product
              </p>
              {["Features", "Pricing", "Demo"].map((l) => (
                <a
                  key={l}
                  href={`#${l.toLowerCase()}`}
                  className="block mb-2 transition-colors"
                  style={{
                    fontSize: "0.85rem",
                    color: "rgba(255,255,255,0.55)",
                    textDecoration: "none",
                  }}
                  onMouseEnter={(e) =>
                    ((e.target as HTMLAnchorElement).style.color = "var(--lw-gold)")
                  }
                  onMouseLeave={(e) =>
                    ((e.target as HTMLAnchorElement).style.color =
                      "rgba(255,255,255,0.55)")
                  }
                >
                  {l}
                </a>
              ))}
            </div>

            {/* Company links */}
            <div>
              <p
                className="uppercase tracking-widest mb-4"
                style={{
                  fontSize: "0.65rem",
                  color: "var(--lw-gold)",
                  letterSpacing: "0.14em",
                }}
              >
                Company
              </p>
              {["About", "Blog", "Contact", "Privacy", "Terms"].map((l) => (
                <a
                  key={l}
                  href={`#${l.toLowerCase()}`}
                  className="block mb-2 transition-colors"
                  style={{
                    fontSize: "0.85rem",
                    color: "rgba(255,255,255,0.55)",
                    textDecoration: "none",
                  }}
                  onMouseEnter={(e) =>
                    ((e.target as HTMLAnchorElement).style.color = "var(--lw-gold)")
                  }
                  onMouseLeave={(e) =>
                    ((e.target as HTMLAnchorElement).style.color =
                      "rgba(255,255,255,0.55)")
                  }
                >
                  {l}
                </a>
              ))}
            </div>
          </div>

          <hr style={{ borderColor: "rgba(201,151,58,0.15)", borderTopWidth: 1 }} />
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6">
            <p style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.4)" }}>
              © 2026 Pennington Hennessy. All rights reserved.
            </p>
            <div className="flex items-center gap-4">
              {["LinkedIn", "Twitter"].map((s) => (
                <a
                  key={s}
                  href="#"
                  className="transition-colors"
                  style={{
                    fontSize: "0.8rem",
                    color: "rgba(255,255,255,0.4)",
                    textDecoration: "none",
                  }}
                  onMouseEnter={(e) =>
                    ((e.target as HTMLAnchorElement).style.color = "var(--lw-gold)")
                  }
                  onMouseLeave={(e) =>
                    ((e.target as HTMLAnchorElement).style.color =
                      "rgba(255,255,255,0.4)")
                  }
                >
                  {s}
                </a>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
