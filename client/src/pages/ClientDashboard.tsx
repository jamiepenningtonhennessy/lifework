import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useLocation } from "wouter";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import {
  MessageSquare,
  Users,
  Star,
  Brain,
  CheckCircle2,
  Circle,
  ArrowRight,
  Loader2,
  LogOut,
  Compass,
  Lock,
  FileText,
  Download,
} from "lucide-react";
import { ChatToPeter } from "@/components/ChatToPeter";

const STEPS = [
  {
    id: "interview",
    icon: <MessageSquare className="w-5 h-5" />,
    title: "Life History Interview",
    description: "A structured conversation exploring your achievements across the decades of your life.",
    path: "/interview",
    statusKey: "interviewStatus",
    cta: "Begin Interview",
    ctaInProgress: "Continue Interview",
  },
  {
    id: "background",
    icon: <Users className="w-5 h-5" />,
    title: "Background & History",
    description: "Capture your family background, education, and career timeline.",
    path: "/background",
    statusKey: null,
    cta: "Add Background",
    ctaInProgress: "Update Background",
  },
  {
    id: "via",
    icon: <Star className="w-5 h-5" />,
    title: "VIA Character Strengths",
    description: "Complete the 120-question VIA survey to identify your core character strengths.",
    path: "/via",
    statusKey: "viaStatus",
    cta: "Take VIA Survey",
    ctaInProgress: "Continue Survey",
  },
  {
    id: "ipip",
    icon: <Brain className="w-5 h-5" />,
    title: "Personality Profile (IPIP-NEO-120)",
    description: "A 120-question personality assessment measuring 30 facets across the Big Five dimensions — the modern equivalent of the 16PF used in traditional career counselling.",
    path: "/ipip-survey",
    statusKey: "ipipStatus",
    cta: "Take Personality Survey",
    ctaInProgress: "Continue Survey",
  },
  {
    id: "cognitive",
    icon: <Brain className="w-5 h-5" />,
    title: "Reasoning Strengths Screener",
    description: "A 30-question indicative assessment covering verbal, numerical, and abstract reasoning — to help make sense of your cognitive strengths.",
    path: "/cognitive-screener",
    statusKey: "cognitiveStatus",
    cta: "Take Screener",
    ctaInProgress: "Retake Screener",
  },
  {
    id: "analysis",
    icon: <Brain className="w-5 h-5" />,
    title: "Career Analysis Report",
    description: "Your counsellor will take all the information given and write a summary report, setting out what he believes may be true, and setting out some questions to explore together.",
    path: null,
    statusKey: "analysisStatus",
    cta: null,
    ctaInProgress: null,
  },
];

export default function ClientDashboard() {
  const { isAuthenticated, loading, user, logout } = useAuth();
  const [, navigate] = useLocation();

  const { data: profile, isLoading: loadingProfile } = trpc.profile.getMyProfile.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  const generateAnalysis = trpc.analysis.generate.useMutation({
    onSuccess: () => {
      window.location.reload();
    },
  });

  if (!loading && !isAuthenticated) {
    window.location.href = getLoginUrl();
    return null;
  }

  const getStatus = (statusKey: string | null): string => {
    if (!profile || !statusKey) return "not_started";
    return (profile as any)[statusKey] ?? "not_started";
  };

  const completedSteps = STEPS.filter((s) => s.statusKey && getStatus(s.statusKey) === "completed").length;
  const totalSteps = STEPS.filter((s) => s.statusKey).length;
  const progressPct = Math.round((completedSteps / totalSteps) * 100);

  const canGenerateAnalysis =
    getStatus("interviewStatus") === "completed" &&
    getStatus("viaStatus") === "completed" &&
    getStatus("ipipStatus") === "completed";

  return (
    <div className="min-h-screen" style={{ background: "var(--lw-cream)" }}>
      {/* Header */}
      <div className="sticky top-0 z-10" style={{ background: "var(--lw-navy)", borderBottom: "1px solid rgba(201,151,58,0.25)" }}>
        <div className="container flex items-center justify-between h-14">
          <div className="flex items-center gap-2">
            <img src="https://d2xsxph8kpxj0f.cloudfront.net/107696804/kFbbE6kqNApXGDFpQJUGV7/phsquare_98c01de4.jpg" alt="Pennington Hennessy" className="w-7 h-7 object-cover" />
            <span className="font-serif font-semibold" style={{ color: "white" }}>Lifework</span>
          </div>
          <div className="flex items-center gap-2">
            {user?.role === "admin" && (
              <button
                onClick={() => navigate("/counselor")}
                className="px-3 py-1.5 text-xs font-medium tracking-wide uppercase cursor-pointer"
                style={{ border: "1px solid rgba(201,151,58,0.5)", color: "var(--lw-gold)", background: "transparent", letterSpacing: "0.08em" }}
              >
                Counsellor View
              </button>
            )}
            <span className="text-sm hidden sm:block" style={{ color: "rgba(255,255,255,0.6)" }}>{user?.name}</span>
            <button onClick={logout} className="p-1.5 cursor-pointer" style={{ color: "rgba(255,255,255,0.5)" }}>
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="container max-w-3xl py-10">
        {loadingProfile ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Welcome */}
            <div className="mb-10">
              <h1 className="text-3xl font-serif font-bold text-foreground mb-2">
                Welcome{user?.name ? `, ${user.name.split(" ")[0]}` : ""}
              </h1>
              <p className="text-muted-foreground leading-relaxed">
                Your career analysis journey. Complete each step at your own pace. You can leave and come back later during the Life History and Background &amp; History; some clients find they like the opportunity to pause and reflect. When you have finished these first two stages please click on the &ldquo;Chat to Jamie&rdquo; button. Jamie will have read what you have written, and will offer you some thoughts and ask you questions that may aid your reflection.
              </p>
            </div>

            {/* Progress */}
            <div className="mb-8 p-5 rounded-xl bg-card border border-border">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-foreground">Overall Progress</span>
                <span className="text-sm font-bold text-[var(--lw-gold)]">{completedSteps} of {totalSteps} steps complete</span>
              </div>
              <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-[var(--lw-gold)] rounded-full transition-all duration-500"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>

            {/* Steps */}
            <div className="space-y-4">
              {STEPS.map((step, idx) => {
                const status = getStatus(step.statusKey);
                const isCompleted = status === "completed";
                const isInProgress = status === "in_progress";
                const isLocked = idx > 0 && getStatus(STEPS[idx - 1]?.statusKey ?? null) === "not_started";

                return (
                  <Card
                    key={step.id}
                    className={`border transition-all ${
                      isCompleted
                        ? "border-green-200 bg-green-50/50"
                        : isInProgress
                        ? "border-[var(--lw-gold)]/40 bg-[var(--lw-gold-light)]/20"
                        : "border-border"
                    }`}
                  >
                    <CardContent className="pt-5 pb-5">
                      <div className="flex items-start gap-4">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                            isCompleted
                              ? "bg-green-100 text-green-600"
                              : isInProgress
                              ? "bg-[var(--lw-gold-light)] text-[var(--lw-gold)]"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {step.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-serif font-semibold text-foreground">{step.title}</h3>
                            {isCompleted && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                            {isInProgress && (
                              <span className="text-xs bg-[var(--lw-gold)] text-white px-2 py-0.5 rounded-full">In Progress</span>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
                        </div>
                        <div className="flex-shrink-0 flex flex-col items-end gap-2">
                          {step.id === "background" && (
                            <ChatToPeter
                              section="career_education"
                              buttonLabel="Chat to Jamie"
                              sectionDescription="Jamie has read your education and career history. He'd like to explore the relationship between your formal career path and what you've actually found most rewarding."
                            />
                          )}
                          {step.id === "analysis" ? (
                            isCompleted ? (
                              <Button size="sm" variant="outline" onClick={() => navigate("/my-report")}>
                                View Report
                              </Button>
                            ) : generateAnalysis.isPending ? (
                              <Button size="sm" disabled>
                                <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> Generating...
                              </Button>
                            ) : !canGenerateAnalysis ? (
                              <span className="text-xs text-muted-foreground">Complete steps 1–4 first</span>
                            ) : (
                              <Button
                                size="sm"
                                onClick={() => generateAnalysis.mutate()}
                                className="bg-[var(--lw-gold)] hover:bg-[oklch(0.60 0.13 72)] text-white gap-1"
                              >
                                Generate Analysis <ArrowRight className="w-3.5 h-3.5" />
                              </Button>
                            )
                          ) : step.path ? (
                            <Button
                              size="sm"
                              variant={isCompleted ? "outline" : "default"}
                              onClick={() => navigate(step.path!)}
                              className={!isCompleted ? "bg-[var(--lw-gold)] hover:bg-[oklch(0.60 0.13 72)] text-white gap-1" : "gap-1"}
                            >
                              {isCompleted ? "Review" : isInProgress ? step.ctaInProgress : step.cta}
                              {!isCompleted && <ArrowRight className="w-3.5 h-3.5" />}
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* View My Report — shown prominently once analysis is complete */}
            {getStatus("analysisStatus") === "completed" && (
              <div
                className="mt-6 rounded-xl overflow-hidden"
                style={{ border: "2px solid var(--lw-gold)", background: "var(--lw-navy)" }}
              >
                <div className="px-5 py-4">
                  <div className="flex items-start gap-4">
                    <div
                      className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{ background: "rgba(201,151,58,0.18)", border: "1px solid rgba(201,151,58,0.5)" }}
                    >
                      <FileText className="w-5 h-5" style={{ color: "var(--lw-gold)" }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-base font-serif font-semibold mb-1"
                        style={{ color: "white" }}
                      >
                        Your Career Analysis Report is ready
                      </p>
                      <p className="text-sm" style={{ color: "rgba(255,255,255,0.65)" }}>
                        Your counsellor has prepared a personalised analysis of your life history,
                        character strengths, personality profile, and reasoning strengths.
                      </p>
                      <div className="flex flex-wrap gap-3 mt-4">
                        <button
                          onClick={() => navigate("/my-report")}
                          className="flex items-center gap-2 px-4 py-2 text-sm font-medium cursor-pointer transition-opacity hover:opacity-90"
                          style={{
                            background: "var(--lw-gold)",
                            color: "white",
                            border: "none",
                            letterSpacing: "0.04em",
                          }}
                        >
                          <FileText className="w-4 h-4" />
                          View My Report
                        </button>
                        <button
                          onClick={() => window.open("/api/export/report", "_blank")}
                          className="flex items-center gap-2 px-4 py-2 text-sm font-medium cursor-pointer transition-opacity hover:opacity-80"
                          style={{
                            background: "transparent",
                            color: "var(--lw-gold)",
                            border: "1px solid rgba(201,151,58,0.5)",
                            letterSpacing: "0.04em",
                          }}
                        >
                          <Download className="w-4 h-4" />
                          Download PDF
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Career Explorer — unlocked by counsellor after coaching call */}
            {getStatus("analysisStatus") === "completed" && (
              profile?.careerExplorerUnlocked ? (
                <div
                  className="mt-6 p-4 rounded-xl border cursor-pointer hover:opacity-90 transition-opacity"
                  style={{ background: "var(--lw-navy)", borderColor: "rgba(201,151,58,0.4)" }}
                  onClick={() => navigate("/career-explorer")}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ background: "rgba(201,151,58,0.15)", border: "1px solid rgba(201,151,58,0.4)" }}
                      >
                        <Compass className="w-4 h-4" style={{ color: "var(--lw-gold)" }} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold" style={{ color: "white" }}>Career Explorer</p>
                        <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.6)" }}>
                          Ask Alex how your profile matches any career — or discover what suits you best.
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 flex-shrink-0" style={{ color: "var(--lw-gold)" }} />
                  </div>
                </div>
              ) : (
                <div
                  className="mt-6 p-4 rounded-xl border"
                  style={{ background: "rgba(15,31,53,0.4)", borderColor: "rgba(201,151,58,0.2)" }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ background: "rgba(201,151,58,0.08)", border: "1px solid rgba(201,151,58,0.2)" }}
                    >
                      <Lock className="w-4 h-4" style={{ color: "rgba(201,151,58,0.5)" }} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold" style={{ color: "rgba(255,255,255,0.5)" }}>Career Explorer</p>
                      <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>
                        Available after your coaching conversation — your counsellor will activate this for you.
                      </p>
                    </div>
                  </div>
                </div>
              )
            )}

            {/* VIA Results shortcut if completed */}
            {getStatus("viaStatus") === "completed" && (
              <div className="mt-6 p-4 rounded-xl bg-[var(--lw-gold-light)] border border-[var(--gold)]/30">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">Your VIA results are ready</p>
                    <p className="text-xs text-muted-foreground mt-0.5">View your ranked character strengths</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => navigate("/via/results")}>
                    View Strengths
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
