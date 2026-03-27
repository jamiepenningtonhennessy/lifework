/**
 * Preview Mode — Thin wrappers around every client-facing page.
 *
 * Strategy: each preview page renders the real page component but with a
 * custom tRPC mock context injected via a React context provider. Rather than
 * mocking tRPC (which would require deep plumbing), we render the real pages
 * directly but intercept the data at the component level by passing props
 * through a PreviewContext that the preview-aware versions of each page read.
 *
 * For pages that are simple enough, we re-render the real page UI inline
 * with dummy data substituted. For complex pages we use a lightweight
 * "preview shell" that shows the same visual structure.
 */

import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, ArrowRight, Eye, CheckCircle2, Circle, Lock, Brain, Download, FileText, MessageSquare, Compass, BarChart2, User, BookOpen } from "lucide-react";
import { Streamdown } from "streamdown";
import {
  PREVIEW_PROFILE,
  PREVIEW_ACHIEVEMENTS,
  PREVIEW_FAMILY,
  PREVIEW_EDUCATION,
  PREVIEW_CAREER,
  PREVIEW_VIA_RESULTS,
  PREVIEW_IPIP_RESULTS,
  PREVIEW_WOW_REPORT,
  PREVIEW_CAREER_EXPLORER_MESSAGES,
} from "./previewData";
import {
  IPIP_DOMAINS,
  IPIP_FACETS,
  interpretDomainScore,
  type IpipDomainKey,
  type IpipFacetKey,
} from "../../../shared/ipip-data";

// ─── Shared preview chrome ────────────────────────────────────────────────────
function PreviewBanner({ label, back }: { label: string; back: string }) {
  const [, navigate] = useLocation();
  return (
    <div className="border-b border-border bg-card sticky top-0 z-20">
      <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate(back)} className="gap-1">
            <ArrowLeft className="w-4 h-4" /> Back
          </Button>
          <div className="w-px h-4 bg-border" />
          <Eye className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-foreground">{label}</span>
        </div>
        <Badge variant="outline" className="text-xs border-primary/40 text-primary">Preview — Alex Morgan</Badge>
      </div>
    </div>
  );
}

// ─── 1. Client Dashboard ──────────────────────────────────────────────────────
export function PreviewClientDashboard() {
  const [, navigate] = useLocation();
  const steps = [
    { label: "Life History Interview", path: "/preview/interview", done: true, icon: MessageSquare },
    { label: "Background & History", path: "/preview/background", done: true, icon: User },
    { label: "VIA Character Strengths", path: "/preview/via/results", done: true, icon: BarChart2 },
    { label: "Personality Survey", path: "/preview/ipip-results", done: true, icon: Brain },
  ];
  return (
    <div className="min-h-screen bg-background">
      <PreviewBanner label="Client Dashboard" back="/preview" />
      <div className="max-w-3xl mx-auto px-4 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground mb-1">Welcome back, Alex</h1>
          <p className="text-muted-foreground">Your Lifework journey — all steps complete.</p>
        </div>
        <div className="grid gap-3 mb-8">
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <Card key={step.label} className="cursor-pointer hover:border-primary/40 transition-colors" onClick={() => navigate(step.path)}>
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="w-9 h-9 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                  </div>
                  <div className="flex-1">
                    <span className="font-medium text-foreground">{step.label}</span>
                  </div>
                  <Badge variant="outline" className="text-green-600 border-green-300 text-xs">Complete</Badge>
                </CardContent>
              </Card>
            );
          })}
        </div>
        <div className="grid gap-3">
          <Card className="cursor-pointer hover:border-primary/40 transition-colors border-primary/20 bg-primary/5" onClick={() => navigate("/preview/my-report")}>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <FileText className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <span className="font-medium text-foreground">My Lifework Report</span>
                <p className="text-xs text-muted-foreground mt-0.5">Your personalised career analysis is ready</p>
              </div>
              <ArrowRight className="w-4 h-4 text-primary" />
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:border-primary/40 transition-colors" onClick={() => navigate("/preview/career-explorer")}>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Compass className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <span className="font-medium text-foreground">Career Explorer</span>
                <p className="text-xs text-muted-foreground mt-0.5">Continue your conversation with Sage</p>
              </div>
              <ArrowRight className="w-4 h-4 text-primary" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ─── 2. Interview ─────────────────────────────────────────────────────────────
export function PreviewInterview() {
  const [, navigate] = useLocation();
  const decades = ["Childhood (before 18)", "20s", "30s", "40s"];
  return (
    <div className="min-h-screen bg-background">
      <PreviewBanner label="Life History Interview" back="/preview" />
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-foreground mb-1">Life History Interview</h2>
          <p className="text-muted-foreground text-sm">Your recorded achievements, organised by decade.</p>
        </div>
        {decades.map((decade) => {
          const items = PREVIEW_ACHIEVEMENTS.filter((a) => a.decade === decade);
          return (
            <div key={decade} className="mb-6">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">{decade}</h3>
              <div className="grid gap-2">
                {items.map((a) => (
                  <Card key={a.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-medium text-foreground">{a.title}</p>
                          <p className="text-sm text-muted-foreground mt-1">{a.description}</p>
                        </div>
                        <Badge variant="outline" className="flex-shrink-0 text-xs">{a.esf}</Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {items.length === 0 && (
                  <p className="text-sm text-muted-foreground italic">No achievements recorded for this decade.</p>
                )}
              </div>
            </div>
          );
        })}
        <Button variant="outline" className="w-full mt-4" onClick={() => navigate("/preview/dashboard")}>
          Back to Dashboard
        </Button>
      </div>
    </div>
  );
}

// ─── 3. Background ────────────────────────────────────────────────────────────
export function PreviewBackground() {
  const [, navigate] = useLocation();
  return (
    <div className="min-h-screen bg-background">
      <PreviewBanner label="Background & History" back="/preview" />
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Intro video */}
        <div className="mb-8 overflow-hidden" style={{ border: "1px solid rgba(201,151,58,0.3)", background: "#000" }}>
          <div style={{ position: "relative", paddingBottom: "56.25%", height: 0 }}>
            <iframe
              src="https://drive.google.com/file/d/1d5tJEmwsCXmvdsXJGSe1yzN1csLqoK6h/preview"
              allow="autoplay"
              allowFullScreen
              style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: 0 }}
              title="Career, education and family"
            />
          </div>
        </div>

        {/* Family */}
        <div className="mb-8">
          <h3 className="text-base font-semibold text-foreground mb-3 border-b border-border pb-2">Family Background</h3>
          <dl className="grid gap-2 text-sm">
            <div className="flex gap-2"><dt className="text-muted-foreground w-36 flex-shrink-0">Father's occupation</dt><dd className="text-foreground">{PREVIEW_FAMILY.fatherOccupation}</dd></div>
            <div className="flex gap-2"><dt className="text-muted-foreground w-36 flex-shrink-0">Mother's occupation</dt><dd className="text-foreground">{PREVIEW_FAMILY.motherOccupation}</dd></div>
            <div className="flex gap-2"><dt className="text-muted-foreground w-36 flex-shrink-0">Siblings</dt><dd className="text-foreground">{PREVIEW_FAMILY.siblings}</dd></div>
            <div className="flex gap-2"><dt className="text-muted-foreground w-36 flex-shrink-0">Childhood location</dt><dd className="text-foreground">{PREVIEW_FAMILY.childhoodLocation}</dd></div>
            <div className="flex gap-2"><dt className="text-muted-foreground w-36 flex-shrink-0">Notes</dt><dd className="text-foreground">{PREVIEW_FAMILY.familyNotes}</dd></div>
          </dl>
        </div>

        {/* Education */}
        <div className="mb-8">
          <h3 className="text-base font-semibold text-foreground mb-3 border-b border-border pb-2">Education</h3>
          <div className="grid gap-3">
            {PREVIEW_EDUCATION.map((e) => (
              <Card key={e.id}><CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-foreground">{e.institution}</p>
                    <p className="text-sm text-muted-foreground">{e.qualification} — {e.subject}</p>
                    {e.notes && <p className="text-xs text-muted-foreground mt-1">{e.notes}</p>}
                  </div>
                  <span className="text-xs text-muted-foreground flex-shrink-0">{e.yearFrom}–{e.yearTo}</span>
                </div>
              </CardContent></Card>
            ))}
          </div>
        </div>

        {/* Career */}
        <div className="mb-8">
          <h3 className="text-base font-semibold text-foreground mb-3 border-b border-border pb-2">Career History</h3>
          <div className="grid gap-3">
            {PREVIEW_CAREER.map((c) => (
              <Card key={c.id}><CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-foreground">{c.role}</p>
                    <p className="text-sm text-muted-foreground">{c.organisation}</p>
                    {c.notes && <p className="text-xs text-muted-foreground mt-1">{c.notes}</p>}
                  </div>
                  <span className="text-xs text-muted-foreground flex-shrink-0">{c.yearFrom}–{c.yearTo ?? "present"}</span>
                </div>
              </CardContent></Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── 4. VIA Survey landing ────────────────────────────────────────────────────
export function PreviewVIASurvey() {
  const [, navigate] = useLocation();
  return (
    <div className="min-h-screen bg-background">
      <PreviewBanner label="VIA Character Strengths Survey" back="/preview" />
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <BookOpen className="w-14 h-14 text-primary mx-auto mb-6" />
        <h1 className="text-2xl font-bold text-foreground mb-3">VIA Character Strengths Survey</h1>
        <p className="text-muted-foreground mb-8 max-w-md mx-auto">
          This survey identifies your top character strengths from 24 universal virtues. It takes approximately 15 minutes. Alex has already completed this survey — view the results below.
        </p>
        <div className="flex gap-3 justify-center">
          <Button variant="outline" onClick={() => navigate("/preview")}>Back to Preview Hub</Button>
          <Button onClick={() => navigate("/preview/via/results")} className="gap-1">
            View Results <ArrowRight className="w-4 h-4" />
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
      <div className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container flex items-center justify-between h-14">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/preview/via")}>
              <ArrowLeft className="w-4 h-4 mr-1" /> Survey
            </Button>
            <div className="h-4 w-px bg-border" />
            <span className="font-serif font-semibold text-foreground">Your Character Strengths</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs border-primary/40 text-primary">Preview</Badge>
            <Button size="sm" onClick={() => navigate("/preview/dashboard")} className="gap-1 bg-[var(--lw-gold)] hover:bg-[oklch(0.60_0.13_72)] text-white">
              Dashboard <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>
      <div className="container max-w-3xl py-8">
        {/* Top 5 */}
        <div className="mb-8">
          <h2 className="text-lg font-bold text-foreground mb-1">Top 5 Signature Strengths</h2>
          <p className="text-sm text-muted-foreground mb-4">These are Alex's most dominant character strengths.</p>
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
        {/* Full ranking */}
        <div>
          <h2 className="text-lg font-bold text-foreground mb-4">Full Ranking</h2>
          <div className="grid gap-2">
            {ranked.map((s) => (
              <div key={s.id} className="flex items-center gap-3 py-2 border-b border-border/50 last:border-0">
                <span className="w-6 text-sm text-muted-foreground text-right">{s.rank}</span>
                <span className="flex-1 text-sm text-foreground">{s.name}</span>
                <Badge variant="outline" className={`text-xs ${VIRTUE_COLORS[s.virtue] ?? ""}`}>{s.virtue}</Badge>
                <div className="w-20">
                  <Progress value={(s.score / 25) * 100} className="h-1.5" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── 6. IPIP Survey landing ───────────────────────────────────────────────────
export function PreviewIpipSurvey() {
  const [, navigate] = useLocation();
  return (
    <div className="min-h-screen bg-background">
      <PreviewBanner label="Personality Survey (IPIP-NEO)" back="/preview" />
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <Brain className="w-14 h-14 text-primary mx-auto mb-6" />
        <h1 className="text-2xl font-bold text-foreground mb-3">Personality Survey</h1>
        <p className="text-muted-foreground mb-8 max-w-md mx-auto">
          The IPIP-NEO-120 measures five major personality dimensions and thirty facets. It takes approximately 20 minutes. Alex has already completed this survey — view the results below.
        </p>
        <div className="flex gap-3 justify-center">
          <Button variant="outline" onClick={() => navigate("/preview")}>Back to Preview Hub</Button>
          <Button onClick={() => navigate("/preview/ipip-results")} className="gap-1">
            View Results <ArrowRight className="w-4 h-4" />
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
      <div className="max-w-4xl mx-auto px-4 py-10">
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Brain className="h-7 w-7 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">Personality Profile</h1>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs border-primary/40 text-primary">Preview</Badge>
            <Button variant="ghost" size="sm" onClick={() => navigate("/preview")}>
              <ArrowLeft className="w-4 h-4 mr-1" /> Hub
            </Button>
          </div>
        </div>
        <p className="text-muted-foreground mb-8">
          IPIP-NEO-120 results across five personality dimensions and thirty facets.
        </p>
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
                <p className="text-xs text-muted-foreground mt-1">{interpretDomainScore(domain, ds)}</p>
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

// ─── 8. My Report ─────────────────────────────────────────────────────────────
export function PreviewMyReport() {
  const [, navigate] = useLocation();
  const report = PREVIEW_WOW_REPORT;
  const wow = report.wowReportJson;

  const sections = [
    { key: "summary", label: "1. Lifework Summary", content: wow.summary },
    { key: "lifeHistoryPattern", label: "2. Life History Pattern", content: wow.lifeHistoryPattern },
    { key: "personalitySection", label: "4. Personality Profile", content: wow.personalitySection },
    { key: "behaviouralStyle", label: "5. Behavioural Style", content: wow.behaviouralStyle },
    { key: "careerDirections", label: "6. Career Directions", content: wow.careerDirections },
    { key: "developmentEdge", label: "7. Development Edge", content: wow.developmentEdge },
    { key: "conclusions", label: "8. Conclusions", content: wow.conclusions },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/preview/dashboard")} className="gap-1">
              <ArrowLeft className="w-4 h-4" /> Dashboard
            </Button>
            <div className="w-px h-5 bg-border" />
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              <span className="font-semibold text-foreground">Career Analysis Report</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs border-primary/40 text-primary">Preview</Badge>
            <Button variant="outline" size="sm" className="gap-2" disabled>
              <Download className="w-4 h-4" /> Export PDF
            </Button>
          </div>
        </div>
      </div>
      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-10">
        <Card className="mb-8 border-primary/20 bg-gradient-to-br from-primary/5 to-background">
          <CardContent className="p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-foreground mb-1">{wow.clientFullName}</h1>
                <p className="text-muted-foreground text-sm">Lifework Career Analysis · {wow.generatedAt}</p>
              </div>
              <Badge className="bg-green-500/10 text-green-600 border-green-300">Complete</Badge>
            </div>
          </CardContent>
        </Card>
        {sections.map((s) => (
          <Card key={s.key} className="mb-6">
            <CardHeader className="pb-2 border-b border-border">
              <CardTitle className="text-base font-semibold text-primary">{s.label}</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="prose prose-sm max-w-none dark:prose-invert">
                <Streamdown>{s.content}</Streamdown>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ─── 9. Career Explorer ───────────────────────────────────────────────────────
export function PreviewCareerExplorer() {
  const [, navigate] = useLocation();
  const messages = PREVIEW_CAREER_EXPLORER_MESSAGES;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="border-b border-border bg-card sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/preview/dashboard")} className="gap-1">
              <ArrowLeft className="w-4 h-4" /> Dashboard
            </Button>
            <div className="w-px h-5 bg-border" />
            <Compass className="h-5 w-5 text-primary" />
            <span className="font-semibold text-foreground">Career Explorer</span>
          </div>
          <Badge variant="outline" className="text-xs border-primary/40 text-primary">Preview</Badge>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 max-w-3xl w-full mx-auto px-4 py-6 space-y-4">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[80%] rounded-lg px-4 py-3 text-sm ${
              msg.role === "user"
                ? "bg-primary text-primary-foreground"
                : "bg-card border border-border text-foreground"
            }`}>
              {msg.role === "assistant" ? (
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  <Streamdown>{msg.content}</Streamdown>
                </div>
              ) : (
                <p>{msg.content}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Input (disabled in preview) */}
      <div className="border-t border-border bg-card">
        <div className="max-w-3xl mx-auto px-4 py-4 flex gap-3">
          <div className="flex-1 rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-muted-foreground">
            Message input disabled in preview mode…
          </div>
          <Button disabled className="gap-1">Send</Button>
        </div>
      </div>
    </div>
  );
}
