/**
 * Preview Mode — First-Visit States
 *
 * Every page shows exactly what a brand-new client sees on their first visit:
 * real intro videos, empty forms, surveys ready to start, Sage ready to begin.
 * A persistent nav bar at the top lets you jump between pages without returning
 * to the hub.
 */

import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  ArrowLeft,
  ArrowRight,
  Eye,
  CheckCircle2,
  Circle,
  Brain,
  MessageSquare,
  Compass,
  BarChart2,
  User,
  BookOpen,
  Star,
  Sparkles,
  LogOut,
  Lock,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Streamdown } from "streamdown";
import { IPIP_DOMAINS, IPIP_FACETS, type IpipDomainKey, type IpipFacetKey } from "../../../shared/ipip-data";
import { PREVIEW_IPIP_RESULTS, PREVIEW_VIA_RESULTS } from "./previewData";

// ─── Video embed helper ───────────────────────────────────────────────────────
function VideoEmbed({ fileId, title }: { fileId: string; title: string }) {
  return (
    <div className="overflow-hidden" style={{ border: "2px solid rgba(201,151,58,0.4)", borderRadius: "2px", background: "#000" }}>
      <div style={{ position: "relative", paddingBottom: "56.25%", height: 0 }}>
        <iframe
          src={`https://drive.google.com/file/d/${fileId}/preview`}
          allow="autoplay"
          allowFullScreen
          style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: "none" }}
          title={title}
        />
      </div>
    </div>
  );
}

// ─── Persistent preview nav bar ───────────────────────────────────────────────
const NAV_PAGES = [
  { label: "Home", path: "/preview/home" },
  { label: "Dashboard", path: "/preview/dashboard" },
  { label: "Life History", path: "/preview/interview" },
  { label: "Background", path: "/preview/background" },
  { label: "VIA Survey", path: "/preview/via" },
  { label: "VIA Results", path: "/preview/via/results" },
  { label: "IPIP Survey", path: "/preview/ipip-survey" },
  { label: "IPIP Results", path: "/preview/ipip-results" },
  { label: "My Report", path: "/preview/my-report" },
  { label: "Career Explorer", path: "/preview/career-explorer" },
];

function PreviewNav({ current }: { current: string }) {
  const [, navigate] = useLocation();
  const [open, setOpen] = useState(false);
  const currentPage = NAV_PAGES.find((p) => p.path === current);

  return (
    <div className="sticky top-0 z-50">
      {/* Main bar */}
      <div style={{ background: "var(--lw-navy)", borderBottom: "1px solid rgba(201,151,58,0.35)" }}>
        <div className="container flex items-center justify-between h-10 gap-4">
          {/* Left: hub link */}
          <button
            onClick={() => navigate("/preview")}
            className="flex items-center gap-1.5 text-xs uppercase tracking-widest cursor-pointer flex-shrink-0"
            style={{ color: "rgba(255,255,255,0.5)", letterSpacing: "0.08em" }}
          >
            <Eye className="w-3.5 h-3.5" />
            Preview Hub
          </button>

          {/* Desktop: page links */}
          <div className="hidden lg:flex items-center gap-0 overflow-x-auto">
            {NAV_PAGES.map((p) => (
              <button
                key={p.path}
                onClick={() => navigate(p.path)}
                className="px-2.5 py-1 text-xs whitespace-nowrap cursor-pointer transition-colors"
                style={{
                  color: current === p.path ? "var(--lw-gold)" : "rgba(255,255,255,0.55)",
                  borderBottom: current === p.path ? "2px solid var(--lw-gold)" : "2px solid transparent",
                  background: "transparent",
                }}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Mobile: dropdown */}
          <button
            onClick={() => setOpen((v) => !v)}
            className="lg:hidden flex items-center gap-1 text-xs cursor-pointer"
            style={{ color: "var(--lw-gold)" }}
          >
            {currentPage?.label ?? "Navigate"}
            {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {/* Right: badge */}
          <Badge variant="outline" className="text-xs border-primary/40 text-primary flex-shrink-0 hidden sm:flex">
            Alex Morgan
          </Badge>
        </div>
      </div>

      {/* Mobile dropdown */}
      {open && (
        <div className="lg:hidden" style={{ background: "var(--lw-navy)", borderBottom: "1px solid rgba(201,151,58,0.35)" }}>
          {NAV_PAGES.map((p) => (
            <button
              key={p.path}
              onClick={() => { navigate(p.path); setOpen(false); }}
              className="w-full text-left px-4 py-2.5 text-sm cursor-pointer"
              style={{
                color: current === p.path ? "var(--lw-gold)" : "rgba(255,255,255,0.7)",
                background: current === p.path ? "rgba(201,151,58,0.08)" : "transparent",
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── 0. Lifework Home Page (first visit) ─────────────────────────────────────
export function PreviewHome() {
  const [, navigate] = useLocation();
  return (
    <div className="min-h-screen" style={{ background: "var(--lw-cream)" }}>
      <PreviewNav current="/preview/home" />

      {/* Hero */}
      <section className="py-24" style={{ background: "var(--lw-navy)" }}>
        <div className="container max-w-4xl">
          <div className="lw-eyebrow mb-4" style={{ color: "var(--lw-gold)", fontSize: "0.7rem", letterSpacing: "0.15em", textTransform: "uppercase", fontWeight: 600 }}>
            Career Analysis
          </div>
          <h1 className="font-serif font-bold mb-6" style={{ fontSize: "clamp(2.2rem, 5vw, 3.5rem)", lineHeight: 1.1, color: "white" }}>
            The career that is<br />
            <em style={{ color: "var(--lw-gold)" }}>authentically yours.</em>
          </h1>
          <p className="mb-10 max-w-xl" style={{ color: "rgba(255,255,255,0.7)", fontSize: "1.05rem", lineHeight: 1.65 }}>
            A three-stage process that reveals the career that is authentically yours — grounded in your life story, your character, and your personality.
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => navigate("/preview/dashboard")}
              className="px-6 py-3 text-sm font-semibold uppercase tracking-widest cursor-pointer"
              style={{ background: "var(--lw-gold)", color: "var(--lw-navy)", letterSpacing: "0.1em" }}
            >
              Begin Your Journey →
            </button>
            <button
              className="px-6 py-3 text-sm font-semibold uppercase tracking-widest cursor-pointer"
              style={{ border: "1px solid rgba(201,151,58,0.5)", color: "var(--lw-gold)", background: "transparent", letterSpacing: "0.1em" }}
            >
              Counsellor Login
            </button>
          </div>
        </div>
      </section>

      {/* Overview video */}
      <section className="py-16" style={{ background: "var(--lw-navy)" }}>
        <div className="container max-w-4xl">
          <div className="mb-8 text-center">
            <div className="lw-eyebrow mb-3" style={{ color: "var(--lw-gold)", fontSize: "0.7rem", letterSpacing: "0.15em", textTransform: "uppercase" }}>Watch First</div>
            <h2 className="font-serif font-bold" style={{ fontSize: "1.8rem", color: "white" }}>
              The story of Lifework — in four minutes
            </h2>
            <p className="mt-2" style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.95rem" }}>
              Rooted in positive psychology, anchored in your own life story.
            </p>
          </div>
          <VideoEmbed fileId="1UA06Kdal_ANUxcxPK5jytkO5xYPexg7V" title="Lifework Overview" />
        </div>
      </section>

      {/* Three stages */}
      <section className="py-20" style={{ background: "var(--lw-cream)" }}>
        <div className="container max-w-4xl">
          <div className="text-center mb-12">
            <div className="lw-eyebrow mb-3" style={{ color: "var(--lw-gold)", fontSize: "0.7rem", letterSpacing: "0.15em", textTransform: "uppercase" }}>How It Works</div>
            <h2 className="font-serif font-bold" style={{ fontSize: "2rem", color: "var(--lw-navy)" }}>A three-stage process</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { n: "01", title: "Life History & Background", desc: "A structured exploration of your achievements across every decade of your life — the foundation of everything that follows." },
              { n: "02", title: "Psychometrics", desc: "Two validated assessments — VIA Character Strengths and the IPIP-NEO personality profile — that add scientific lenses to your story." },
              { n: "03", title: "Analysis & Report", desc: "Your counsellor synthesises everything into a personalised Lifework Report: who you are, where you have come from, and where you are headed." },
            ].map((s) => (
              <div key={s.n}>
                <div className="font-serif font-bold mb-3" style={{ fontSize: "2.5rem", color: "var(--lw-gold)", opacity: 0.4 }}>{s.n}</div>
                <h3 className="font-serif font-semibold mb-2" style={{ color: "var(--lw-navy)", fontSize: "1.1rem" }}>{s.title}</h3>
                <p style={{ color: "var(--lw-navy-light)", fontSize: "0.9rem", lineHeight: 1.6 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

// ─── 1. Client Dashboard (first visit — all steps not started) ────────────────
export function PreviewClientDashboard() {
  const [, navigate] = useLocation();

  const steps = [
    {
      id: "interview", icon: <MessageSquare className="w-5 h-5" />,
      title: "Life History Interview",
      description: "A structured conversation exploring your achievements across the decades of your life.",
      status: "not_started", cta: "Begin Interview", path: "/preview/interview",
    },
    {
      id: "background", icon: <User className="w-5 h-5" />,
      title: "Background & History",
      description: "Capture your family background, education, and career timeline.",
      status: "not_started", cta: "Add Background", path: "/preview/background",
    },
    {
      id: "sage", icon: <Sparkles className="w-5 h-5" />,
      title: "Sage the Online Career Coach",
      description: "Sage will read what you have written and add depth by asking you some reflective questions.",
      status: "not_started", cta: null, path: null,
    },
    {
      id: "psychometrics", icon: <Star className="w-5 h-5" />,
      title: "Psychometrics",
      description: "Two assessments — VIA Character Strengths (120 questions) and a Personality Profile (IPIP-NEO-120) — that provide additional lenses on who you are.",
      status: "not_started", cta: "Begin Psychometrics", path: "/preview/via",
    },
    {
      id: "career_explorer", icon: <Compass className="w-5 h-5" />,
      title: "Career Explorer",
      description: "Come back to this site once you have had your Lifework Coaching Conversation, and you can ask Sage for her opinion on future careers.",
      status: "not_started", cta: "Open Career Explorer", path: "/preview/career-explorer",
    },
  ];

  return (
    <div className="min-h-screen" style={{ background: "var(--lw-cream)" }}>
      <PreviewNav current="/preview/dashboard" />

      {/* Header */}
      <div className="sticky top-10 z-10" style={{ background: "var(--lw-navy)", borderBottom: "1px solid rgba(201,151,58,0.25)" }}>
        <div className="container flex items-center justify-between h-14">
          <div className="flex items-center gap-2">
            <img src="https://d2xsxph8kpxj0f.cloudfront.net/107696804/kFbbE6kqNApXGDFpQJUGV7/phsquare_98c01de4.jpg" alt="PH" className="w-7 h-7 object-cover" />
            <span className="font-serif font-semibold" style={{ color: "white" }}>Lifework</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm hidden sm:block" style={{ color: "rgba(255,255,255,0.6)" }}>Alex Morgan</span>
            <LogOut className="w-4 h-4" style={{ color: "rgba(255,255,255,0.4)" }} />
          </div>
        </div>
      </div>

      <div className="container max-w-3xl py-10">
        {/* Welcome */}
        <div className="mb-10">
          <h1 className="text-3xl font-serif font-bold text-foreground mb-2">Welcome, Alex</h1>
          <p className="text-muted-foreground leading-relaxed">
            Your career analysis journey. Complete each step at your own pace. You can leave and come back at any time during the first two stages — some clients find they like the opportunity to pause and reflect.
          </p>
        </div>

        {/* Progress */}
        <div className="mb-8 p-5 rounded-xl bg-card border border-border">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-foreground">Overall Progress</span>
            <span className="text-sm font-bold" style={{ color: "var(--lw-gold)" }}>0 of 5 steps complete</span>
          </div>
          <div className="h-2.5 bg-muted rounded-full overflow-hidden">
            <div className="h-full rounded-full" style={{ width: "0%", background: "var(--lw-gold)" }} />
          </div>
        </div>

        {/* Steps */}
        <div className="space-y-4">
          {steps.map((step, idx) => {
            const isLocked = idx > 0 && steps[idx - 1].status === "not_started" && step.id !== "sage";
            return (
              <Card key={step.id} className="border border-border">
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{ background: "rgba(201,151,58,0.1)" }}>
                      <span style={{ color: "var(--lw-gold)" }}>{step.icon}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-foreground">{step.title}</h3>
                        {isLocked && <Lock className="w-3.5 h-3.5 text-muted-foreground" />}
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed mb-3">{step.description}</p>
                      {step.cta && step.path && !isLocked && (
                        <button
                          onClick={() => navigate(step.path!)}
                          className="px-4 py-2 text-xs font-semibold uppercase tracking-widest cursor-pointer"
                          style={{ background: "var(--lw-gold)", color: "var(--lw-navy)", letterSpacing: "0.08em" }}
                        >
                          {step.cta} →
                        </button>
                      )}
                      {isLocked && (
                        <span className="text-xs text-muted-foreground">Complete the previous step to unlock</span>
                      )}
                    </div>
                    <div className="flex-shrink-0">
                      <Circle className="w-5 h-5 text-muted-foreground" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── 2. Life History Interview (first visit — intro + video) ─────────────────
export function PreviewInterview() {
  const [, navigate] = useLocation();
  return (
    <div className="min-h-screen" style={{ background: "var(--lw-cream)" }}>
      <PreviewNav current="/preview/interview" />

      {/* Page header */}
      <div className="sticky top-10 z-10" style={{ background: "var(--lw-navy)", borderBottom: "1px solid rgba(201,151,58,0.25)" }}>
        <div className="container flex items-center justify-between h-12">
          <button onClick={() => navigate("/preview/dashboard")} className="flex items-center gap-1.5 text-sm cursor-pointer" style={{ color: "rgba(255,255,255,0.6)" }}>
            <ArrowLeft className="w-4 h-4" /> Dashboard
          </button>
          <span className="font-serif font-semibold text-sm" style={{ color: "var(--lw-gold)" }}>LIFEWORK</span>
        </div>
      </div>

      <div className="container max-w-2xl py-10">
        <p className="text-xs uppercase tracking-widest font-semibold mb-2" style={{ color: "var(--lw-gold)" }}>Life History</p>
        <h1 className="text-3xl font-serif font-bold text-foreground mb-6">The story of who you are</h1>

        {/* Intro video */}
        <div className="mb-8">
          <VideoEmbed fileId="1vYmcvxcjjK3kPiOib4l9aNlg9XSCIBSL" title="Lifework introduction" />
        </div>

        {/* Opening framing */}
        <div className="space-y-4 text-[15px] leading-relaxed text-foreground mb-8">
          <p>
            Who you are now is a continuation of who you were one year, three years, five years, and a decade ago, right back to when you were a babe in arms — and perhaps even when in the womb.
          </p>
          <p>
            To enable more effective coaching, it is therefore good to understand more about your past: what you did, when and why. To capture this information in a simple, structured way, we use a life history format.
          </p>
        </div>

        {/* How it works */}
        <div className="p-5 rounded-xl bg-card border border-border mb-6">
          <h2 className="font-serif font-semibold text-foreground text-lg mb-3 flex items-center gap-2">
            <BookOpen className="w-5 h-5" style={{ color: "var(--lw-gold)" }} /> How it works
          </h2>
          <div className="space-y-3 text-sm text-foreground leading-relaxed">
            <p>
              Although you will have many adult experiences that are noteworthy, it is your <strong>earlier life that underpins "you"</strong>. We start with childhood and work forward through the decades.
            </p>
            <p>
              For each period of your life, record <strong>3–5 achievements</strong> — things you did that you are proud of, or that gave you a sense of satisfaction. These do not need to be dramatic. They just need to be real.
            </p>
            <p>
              For each achievement, you will be asked whether it was primarily <strong>Enjoyable</strong> (fun in the moment), <strong>Satisfying</strong> (rewarding to complete), or <strong>Fulfilling</strong> (meaningful over time).
            </p>
          </div>
        </div>

        <button
          onClick={() => navigate("/preview/background")}
          className="w-full py-3 text-sm font-semibold uppercase tracking-widest cursor-pointer"
          style={{ background: "var(--lw-gold)", color: "var(--lw-navy)", letterSpacing: "0.1em" }}
        >
          Begin Life History →
        </button>
      </div>
    </div>
  );
}

// ─── 3. Background & History (first visit — video + empty forms) ──────────────
export function PreviewBackground() {
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState<"family" | "education" | "career">("family");

  return (
    <div className="min-h-screen" style={{ background: "var(--lw-cream)" }}>
      <PreviewNav current="/preview/background" />

      <div className="sticky top-10 z-10" style={{ background: "var(--lw-navy)", borderBottom: "1px solid rgba(201,151,58,0.25)" }}>
        <div className="container flex items-center justify-between h-12">
          <button onClick={() => navigate("/preview/dashboard")} className="flex items-center gap-1.5 text-sm cursor-pointer" style={{ color: "rgba(255,255,255,0.6)" }}>
            <ArrowLeft className="w-4 h-4" /> Dashboard
          </button>
          <span className="font-serif font-semibold text-sm" style={{ color: "var(--lw-gold)" }}>Background & History</span>
        </div>
      </div>

      <div className="container max-w-3xl py-8">
        {/* Intro video */}
        <div className="mb-8">
          <VideoEmbed fileId="1d5tJEmwsCXmvdsXJGSe1yzN1csLqoK6h" title="Career, education and family" />
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border mb-8">
          {(["family", "education", "career"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="px-5 py-3 text-sm font-medium capitalize cursor-pointer transition-colors"
              style={{
                color: activeTab === tab ? "var(--lw-gold)" : "var(--muted-foreground, #888)",
                borderBottom: activeTab === tab ? "2px solid var(--lw-gold)" : "2px solid transparent",
                background: "transparent",
              }}
            >
              {tab === "family" ? "Family Background" : tab === "education" ? "Education" : "Career History"}
            </button>
          ))}
        </div>

        {/* Family tab */}
        {activeTab === "family" && (
          <div className="space-y-5">
            <p className="text-sm text-muted-foreground">Tell us about your family background. This context helps your counsellor understand the environment that shaped you.</p>
            {[
              { label: "Father's occupation", placeholder: "e.g. Accountant, Teacher, Farmer…" },
              { label: "Mother's occupation", placeholder: "e.g. Nurse, Shop owner, Homemaker…" },
              { label: "Siblings", placeholder: "e.g. One older brother, two younger sisters…" },
              { label: "Where did you grow up?", placeholder: "Town, city, or region…" },
            ].map((f) => (
              <div key={f.label}>
                <label className="block text-sm font-medium text-foreground mb-1.5">{f.label}</label>
                <input
                  type="text"
                  placeholder={f.placeholder}
                  className="w-full px-3 py-2.5 text-sm border border-border rounded bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1"
                  style={{ "--tw-ring-color": "var(--lw-gold)" } as React.CSSProperties}
                  readOnly
                />
              </div>
            ))}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Additional notes</label>
              <textarea
                rows={3}
                placeholder="Anything else about your family background that feels relevant…"
                className="w-full px-3 py-2.5 text-sm border border-border rounded bg-card text-foreground placeholder:text-muted-foreground focus:outline-none resize-none"
                readOnly
              />
            </div>
            <button className="px-5 py-2.5 text-sm font-semibold uppercase tracking-widest cursor-pointer opacity-60" style={{ background: "var(--lw-gold)", color: "var(--lw-navy)" }}>
              Save Family Background
            </button>
          </div>
        )}

        {/* Education tab */}
        {activeTab === "education" && (
          <div className="space-y-5">
            <p className="text-sm text-muted-foreground">Add your educational history, starting with secondary school. You can add multiple entries.</p>
            <div className="p-5 rounded-xl border border-dashed border-border bg-card text-center">
              <p className="text-sm text-muted-foreground mb-3">No education entries yet.</p>
              <button className="px-4 py-2 text-xs font-semibold uppercase tracking-widest cursor-pointer" style={{ background: "var(--lw-gold)", color: "var(--lw-navy)" }}>
                + Add Education
              </button>
            </div>
          </div>
        )}

        {/* Career tab */}
        {activeTab === "career" && (
          <div className="space-y-5">
            <p className="text-sm text-muted-foreground">Add your career history, starting with your first role. You can add multiple entries.</p>
            <div className="p-5 rounded-xl border border-dashed border-border bg-card text-center">
              <p className="text-sm text-muted-foreground mb-3">No career entries yet.</p>
              <button className="px-4 py-2 text-xs font-semibold uppercase tracking-widest cursor-pointer" style={{ background: "var(--lw-gold)", color: "var(--lw-navy)" }}>
                + Add Role
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── 4. VIA Survey (first visit — video + first page of questions) ────────────
const VIA_SAMPLE_QUESTIONS = [
  { id: 1, text: "I find the world a very interesting place." },
  { id: 2, text: "I am always coming up with new ways to do things." },
  { id: 3, text: "I love learning new things, especially in school." },
  { id: 4, text: "I can find the right words to describe my feelings." },
  { id: 5, text: "I always keep my promises." },
];
const SCALE = [
  { value: 1, label: "Very much\nunlike me" },
  { value: 2, label: "Unlike me" },
  { value: 3, label: "Neutral" },
  { value: 4, label: "Like me" },
  { value: 5, label: "Very much\nlike me" },
];

export function PreviewVIASurvey() {
  const [, navigate] = useLocation();
  return (
    <div className="min-h-screen" style={{ background: "var(--lw-cream)" }}>
      <PreviewNav current="/preview/via" />

      <div className="sticky top-10 z-10" style={{ background: "var(--lw-navy)", borderBottom: "1px solid rgba(201,151,58,0.25)" }}>
        <div className="container flex items-center justify-between h-12">
          <button onClick={() => navigate("/preview/dashboard")} className="flex items-center gap-1.5 text-sm cursor-pointer" style={{ color: "rgba(255,255,255,0.6)" }}>
            <ArrowLeft className="w-4 h-4" /> Dashboard
          </button>
          <span className="font-serif font-semibold text-sm" style={{ color: "var(--lw-gold)" }}>VIA Character Strengths</span>
          <span className="text-xs" style={{ color: "rgba(255,255,255,0.45)" }}>Page 1 of 24</span>
        </div>
        {/* Gold progress bar */}
        <div className="h-1 w-full bg-muted">
          <div className="h-full" style={{ width: "4%", background: "var(--lw-gold)" }} />
        </div>
      </div>

      <div className="container max-w-2xl py-8">
        {/* Video */}
        <div className="mb-8">
          <VideoEmbed fileId="1bJfqf5QNyio-xtNa14AFHYE8L90-1MWr" title="VIA Character Strengths — Introduction" />
        </div>

        {/* About box */}
        <div className="mb-8 p-5 rounded-xl border" style={{ background: "rgba(201,151,58,0.06)", borderColor: "rgba(201,151,58,0.2)" }}>
          <h2 className="font-serif font-semibold text-foreground mb-2">About the VIA Survey</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            The VIA Character Strengths survey identifies your core personal qualities — the things that come naturally to you and energise you. There are 120 statements. For each one, rate how much it describes you on a scale of 1 to 5. Answer honestly — there are no right or wrong answers.
          </p>
        </div>

        {/* Page indicator */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-sm font-medium text-muted-foreground">Page 1 of 24</p>
          <p className="text-sm text-muted-foreground">0 / 5 on this page</p>
        </div>

        {/* Sample questions */}
        <div className="space-y-6">
          {VIA_SAMPLE_QUESTIONS.map((q, idx) => (
            <div key={q.id} className="p-5 rounded-xl border border-border bg-card">
              <p className="text-sm font-medium text-foreground mb-4 leading-relaxed">
                <span className="text-muted-foreground mr-2">{idx + 1}.</span>{q.text}
              </p>
              <div className="flex gap-2 flex-wrap">
                {SCALE.map((s) => (
                  <button
                    key={s.value}
                    className="flex-1 min-w-[3rem] py-2 px-1 text-xs text-center rounded border border-border bg-background text-muted-foreground cursor-pointer hover:border-primary/50 transition-colors"
                  >
                    <div className="font-bold text-sm mb-0.5">{s.value}</div>
                    <div className="whitespace-pre-line leading-tight hidden sm:block">{s.label}</div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-between mt-8">
          <Button variant="outline" disabled>← Previous</Button>
          <Button style={{ background: "var(--lw-gold)", color: "var(--lw-navy)" }} onClick={() => navigate("/preview/via/results")}>
            Next → <span className="ml-1 text-xs opacity-70">(skip to results)</span>
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── 5. VIA Results ───────────────────────────────────────────────────────────
const VIRTUE_COLORS: Record<string, string> = {
  wisdom: "bg-blue-100 text-blue-800 border-blue-200",
  courage: "bg-orange-100 text-orange-800 border-orange-200",
  humanity: "bg-pink-100 text-pink-800 border-pink-200",
  justice: "bg-green-100 text-green-800 border-green-200",
  temperance: "bg-purple-100 text-purple-800 border-purple-200",
  transcendence: "bg-yellow-100 text-yellow-800 border-yellow-200",
};

export function PreviewVIAResults() {
  const [, navigate] = useLocation();
  const ranked = PREVIEW_VIA_RESULTS.rankedStrengths;
  const top5 = ranked.slice(0, 5);
  return (
    <div className="min-h-screen bg-background">
      <PreviewNav current="/preview/via/results" />
      <div className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-10 z-10">
        <div className="container flex items-center justify-between h-14">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/preview/via")}>
              <ArrowLeft className="w-4 h-4 mr-1" /> Survey
            </Button>
            <div className="h-4 w-px bg-border" />
            <span className="font-serif font-semibold text-foreground">Character Strengths</span>
          </div>
          <Button size="sm" onClick={() => navigate("/preview/ipip-survey")} className="gap-1" style={{ background: "var(--lw-gold)", color: "var(--lw-navy)" }}>
            Next: Personality Survey <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
      <div className="container max-w-3xl py-8">
        <div className="mb-8">
          <h2 className="text-lg font-bold text-foreground mb-1">Top 5 Signature Strengths</h2>
          <p className="text-sm text-muted-foreground mb-4">Alex's most dominant character strengths.</p>
          <div className="grid gap-3">
            {top5.map((s, i) => (
              <Card key={s.id} className={i === 0 ? "border-primary/40 bg-primary/5" : ""}>
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 text-sm font-bold text-primary">{s.rank}</div>
                  <div className="flex-1">
                    <p className="font-semibold text-foreground">{s.name}</p>
                    <Badge variant="outline" className={`text-xs mt-1 ${VIRTUE_COLORS[s.virtue] ?? ""}`}>{s.virtue}</Badge>
                  </div>
                  <div className="w-24">
                    <Progress value={(s.score / 25) * 100} className="h-2" />
                    <p className="text-xs text-muted-foreground text-right mt-1">{s.score}/25</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
        <div>
          <h2 className="text-lg font-bold text-foreground mb-4">Full Ranking</h2>
          <div className="grid gap-2">
            {ranked.map((s) => (
              <div key={s.id} className="flex items-center gap-3 py-2 border-b border-border/50 last:border-0">
                <span className="w-6 text-sm text-muted-foreground text-right">{s.rank}</span>
                <span className="flex-1 text-sm text-foreground">{s.name}</span>
                <Badge variant="outline" className={`text-xs ${VIRTUE_COLORS[s.virtue] ?? ""}`}>{s.virtue}</Badge>
                <div className="w-20"><Progress value={(s.score / 25) * 100} className="h-1.5" /></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── 6. IPIP Survey (first visit — video + first domain) ─────────────────────
const IPIP_SAMPLE_QUESTIONS = [
  "I am the life of the party.",
  "I don't talk a lot.",
  "I feel comfortable around people.",
  "I keep in the background.",
  "I start conversations.",
];

export function PreviewIpipSurvey() {
  const [, navigate] = useLocation();
  const firstDomain = IPIP_DOMAINS[0];
  return (
    <div className="min-h-screen bg-background">
      <PreviewNav current="/preview/ipip-survey" />

      {/* Domain tabs */}
      <div className="sticky top-10 z-10" style={{ background: "var(--lw-navy)", borderBottom: "1px solid rgba(201,151,58,0.25)" }}>
        <div className="container overflow-x-auto">
          <div className="flex gap-1 py-2 min-w-max">
            {IPIP_DOMAINS.map((d, i) => (
              <button
                key={d.key}
                className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium whitespace-nowrap transition-colors"
                style={i === 0
                  ? { background: "var(--lw-gold)", color: "var(--lw-navy)", border: "none" }
                  : { background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.6)", border: "none" }}
              >
                {d.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Video */}
        <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "var(--lw-gold)" }}>Watch before you begin</p>
          <VideoEmbed fileId="1t1UYw3YRal-UZ0efJrtr3H_IqH08ANsy" title="IPIP-NEO Personality Survey" />
        </div>

        {/* About card */}
        <Card className="mb-8 border-primary/20 bg-primary/5">
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <Brain className="h-6 w-6 text-primary mt-0.5 shrink-0" />
              <div>
                <h2 className="font-semibold text-foreground mb-2">About this assessment</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  This is the IPIP-NEO-120, a scientifically validated personality questionnaire measuring 30 facets of personality across five broad dimensions. It takes most people around 15–20 minutes to complete.
                </p>
                <p className="text-sm text-muted-foreground leading-relaxed mt-2">
                  For each statement, indicate how accurately it describes you — not how you would like to be, but how you actually are. There are no right or wrong answers.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Domain header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <Badge className="text-white font-semibold" style={{ background: firstDomain.color }}>{firstDomain.name}</Badge>
            <span className="text-sm text-muted-foreground">0 of 24 answered</span>
          </div>
          <p className="text-sm text-muted-foreground">{firstDomain.description}</p>
        </div>

        {/* Sample questions */}
        <div className="space-y-5">
          {IPIP_SAMPLE_QUESTIONS.map((q, idx) => (
            <Card key={idx}>
              <CardContent className="pt-5">
                <p className="text-sm font-medium text-foreground mb-4">
                  <span className="text-muted-foreground mr-2">{idx + 1}.</span>{q}
                </p>
                <div className="flex gap-2">
                  {["Strongly Disagree", "Disagree", "Neutral", "Agree", "Strongly Agree"].map((l, v) => (
                    <button key={v} className="flex-1 py-2 text-xs text-center rounded border border-border bg-background text-muted-foreground cursor-pointer hover:border-primary/50 transition-colors">
                      <div className="font-bold text-sm mb-0.5">{v + 1}</div>
                      <div className="hidden sm:block leading-tight" style={{ fontSize: "0.65rem" }}>{l}</div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex justify-end mt-8">
          <Button style={{ background: "var(--lw-gold)", color: "var(--lw-navy)" }} onClick={() => navigate("/preview/ipip-results")}>
            Skip to Results →
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── 7. IPIP Results ──────────────────────────────────────────────────────────
export function PreviewIpipResults() {
  const [, navigate] = useLocation();
  const domainScores = PREVIEW_IPIP_RESULTS.domainScores as Record<IpipDomainKey, number>;
  const facetScores = PREVIEW_IPIP_RESULTS.facetScores as Record<IpipFacetKey, number>;

  function scoreLabel(score: number) {
    if (score >= 70) return { label: "High", variant: "default" as const };
    if (score <= 30) return { label: "Low", variant: "secondary" as const };
    return { label: "Average", variant: "outline" as const };
  }

  return (
    <div className="min-h-screen bg-background">
      <PreviewNav current="/preview/ipip-results" />
      <div className="max-w-4xl mx-auto px-4 py-10">
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Brain className="h-7 w-7 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">Personality Profile</h1>
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate("/preview/ipip-survey")}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Survey
          </Button>
        </div>
        <p className="text-muted-foreground mb-8">IPIP-NEO-120 results across five personality dimensions and thirty facets.</p>
        {IPIP_DOMAINS.map((domain) => {
          const ds = domainScores[domain.key];
          const { label, variant } = scoreLabel(ds);
          const facetsInDomain = IPIP_FACETS.filter((f) => f.domain === domain.key);
          return (
            <Card key={domain.key} className="mb-6">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-semibold" style={{ color: domain.color }}>{domain.name}</CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant={variant}>{label}</Badge>
                    <span className="text-sm font-mono text-muted-foreground">{ds}th</span>
                  </div>
                </div>
                <Progress value={ds} className="h-2 mt-2" />
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {facetsInDomain.map((facet) => {
                    const fs = facetScores[facet.key];
                    const { label: fl, variant: fv } = scoreLabel(fs);
                    return (
                      <div key={facet.key} className="flex items-center gap-2 text-sm">
                        <span className="text-muted-foreground w-28 flex-shrink-0 truncate">{facet.name}</span>
                        <Progress value={fs} className="flex-1 h-1.5" />
                        <Badge variant={fv} className="text-xs w-14 justify-center">{fl}</Badge>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ─── 8. My Report — "not ready yet" state ────────────────────────────────────
export function PreviewMyReport() {
  const [, navigate] = useLocation();
  return (
    <div className="min-h-screen bg-background">
      <PreviewNav current="/preview/my-report" />
      <div className="border-b border-border bg-card sticky top-10 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/preview/dashboard")} className="gap-1">
            <ArrowLeft className="w-4 h-4" /> Dashboard
          </Button>
          <div className="w-px h-5 bg-border" />
          <Brain className="h-5 w-5 text-primary" />
          <span className="font-semibold text-foreground">Career Analysis Report</span>
        </div>
      </div>
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-6 px-4">
        <div className="text-center max-w-md">
          <Brain className="h-14 w-14 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-2xl font-semibold mb-2">Your Report Isn't Ready Yet</h2>
          <p className="text-muted-foreground mb-6">
            Your counsellor will generate your personalised career analysis report once you have completed all the steps in your journey. Make sure all four steps are marked as complete on your dashboard.
          </p>
          <Button onClick={() => navigate("/preview/dashboard")} className="gap-2">
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── 9. Career Explorer — first visit (Sage's opening message only) ───────────
export function PreviewCareerExplorer() {
  const [, navigate] = useLocation();

  const openingMessage = `*She sets down her pen and looks up.*

Welcome. I'm Sage — I've spent twenty years working with professionals at career crossroads, and I've read your Lifework profile carefully before this conversation.

What I'd like to do today is start with the thing that struck me most in your report, and work from there. We have time, so there's no need to rush.

What brings you here today — what's the question you most want to answer?`;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <PreviewNav current="/preview/career-explorer" />

      {/* Header */}
      <div className="border-b border-border bg-card sticky top-10 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/preview/dashboard")} className="gap-1">
            <ArrowLeft className="w-4 h-4" /> Dashboard
          </Button>
          <div className="w-px h-5 bg-border" />
          <Compass className="h-5 w-5 text-primary" />
          <span className="font-semibold text-foreground">Career Explorer</span>
        </div>
      </div>

      {/* Suggested questions */}
      <div className="max-w-3xl w-full mx-auto px-4 pt-6 pb-2">
        <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wide">Suggested questions</p>
        <div className="flex flex-wrap gap-2">
          {[
            "What careers suit me based on my profile?",
            "What roles would make the most of my VIA strengths?",
            "How do my life history themes point toward a career direction?",
          ].map((q) => (
            <button key={q} className="px-3 py-1.5 text-xs rounded-full border border-border bg-card text-muted-foreground cursor-pointer hover:border-primary/50 transition-colors">
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 max-w-3xl w-full mx-auto px-4 py-4 space-y-4">
        <div className="flex justify-start">
          <div className="max-w-[80%] space-y-1.5">
            <p className="text-xs italic text-muted-foreground px-1">She sets down her pen and looks up.</p>
            <div className="bg-card border border-border text-foreground rounded-2xl rounded-bl-sm px-4 py-3 text-sm leading-relaxed">
              <Streamdown>{openingMessage.replace(/^\*[^*]+\*\s*\n\n/, "")}</Streamdown>
            </div>
          </div>
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-border bg-card">
        <div className="max-w-3xl mx-auto px-4 py-4 flex gap-3">
          <div className="flex-1 rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-muted-foreground">
            Type your message to Sage…
          </div>
          <Button className="gap-1" style={{ background: "var(--lw-gold)", color: "var(--lw-navy)" }}>Send</Button>
        </div>
      </div>
    </div>
  );
}
