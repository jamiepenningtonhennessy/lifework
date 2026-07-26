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
  ArrowRight,
  Loader2,
  LogOut,
  Compass,
  Briefcase,
  X,
  KeyRound,
  Sparkles,
  Lock,
  AlertCircle,
} from "lucide-react";
import { ChatToPeter } from "@/components/ChatToPeter";
import { useState, useEffect } from "react";

// ─── Step definitions ─────────────────────────────────────────────────────────

const STEPS = [
  {
    id: "interview",
    icon: <MessageSquare className="w-5 h-5" />,
    title: "1. Life History Interview",
    description:
      "A structured conversation exploring your achievements across the decades of your life.",
    path: "/interview",
    statusKey: "interviewStatus",
    cta: "Begin Interview",
    ctaInProgress: "Continue Interview",
  },
  {
    id: "background",
    icon: <Users className="w-5 h-5" />,
    title: "2. Background & History",
    description:
      "Capture your family background, education, and career timeline.",
    path: "/background",
    statusKey: "backgroundStatus",
    cta: "Add Background",
    ctaInProgress: "Update Background",
  },
  {
    id: "sage",
    icon: <Sparkles className="w-5 h-5" />,
    title: "3. Sage — Exploring your Life History",
    description:
      "Sage will read what you have written and add depth by asking you some reflective questions. You must complete at least 20 events with Sage before moving on to the psychometric assessments.",
    path: null,
    statusKey: "sageStatus",
    cta: null,
    ctaInProgress: null,
  },
  {
    id: "psychometrics",
    icon: <Star className="w-5 h-5" />,
    title: "4. Psychometrics",
    description:
      "Two assessments — VIA Character Strengths (120 questions) and a Personality Profile (IPIP-NEO-120) — that provide additional lenses on who you are.",
    path: "/via",
    statusKey: "viaStatus",
    cta: "Begin Psychometrics",
    ctaInProgress: "Continue Psychometrics",
  },
  {
    id: "lifework_coaching",
    icon: <Brain className="w-5 h-5" />,
    title: "5. Lifework Coaching",
    description: "Set up an exploration of your Lifework report with a Lifework Coach.",
    path: null,
    statusKey: null,
    cta: "Request a Coaching Date",
    ctaInProgress: "Request a Coaching Date",
  },
  {
    id: "career_explorer",
    icon: <Compass className="w-5 h-5" />,
    title: "6. Career Explorer",
    description:
      "Come back to this site once you have had your Lifework Coaching Conversation, and you can ask Sage for her opinion on future careers, or perhaps discuss the challenges that a possible chosen career might bring.",
    path: "/career-explorer",
    statusKey: null,
    cta: "Open Career Explorer",
    ctaInProgress: "Continue Career Explorer",
  },
  {
    id: "jobs_explorer",
    icon: <Briefcase className="w-5 h-5" />,
    title: "7. Jobs Explorer",
    description:
      "Your personalised market monitor — live vacancies scored against your profile, early signals from senior departures at target employers, and a curated watch list of organisations worth tracking.",
    path: "/coaching/lifework/jobs",
    statusKey: null,
    cta: "Open Jobs Explorer",
    ctaInProgress: "View Jobs Explorer",
  },
];

const SAGE_REQUIRED = 20;

// ─── First-login password banner ─────────────────────────────────────────────
const BANNER_KEY = "lw_password_banner_dismissed";

function PasswordGuidanceBanner({ userId }: { userId?: number }) {
  const storageKey = userId ? `${BANNER_KEY}_${userId}` : BANNER_KEY;
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem(storageKey);
    if (!dismissed) setVisible(true);
  }, [storageKey]);

  const dismiss = () => {
    localStorage.setItem(storageKey, "1");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      className="relative"
      style={{
        background: "var(--lw-navy-mid)",
        borderBottom: "1px solid rgba(201,151,58,0.35)",
      }}
    >
      <div className="container max-w-3xl py-4 flex items-start gap-4">
        <div
          className="flex-shrink-0 mt-0.5 p-2 rounded-full"
          style={{ background: "rgba(201,151,58,0.15)" }}
        >
          <KeyRound className="w-4 h-4" style={{ color: "var(--lw-gold)" }} />
        </div>
        <div className="flex-1 min-w-0">
          <p
            className="font-semibold mb-1"
            style={{ fontSize: "0.9rem", color: "white" }}
          >
            Setting your password
          </p>
          <p style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.72)", lineHeight: 1.55 }}>
            Lifework uses the Manus secure login portal. When you first signed in you will have been
            asked to create your own password — that password is yours to keep and use each time you
            return. If you haven't set one yet, or would like to change it, click{" "}
            <strong style={{ color: "var(--lw-gold)" }}>Sign In</strong> on the home page and choose
            {" "}"Forgot password" or "Create account" to set your credentials. Your counsellor does
            not have access to your password.
          </p>
        </div>
        <button
          onClick={dismiss}
          aria-label="Dismiss"
          className="flex-shrink-0 p-1 cursor-pointer transition-opacity hover:opacity-70"
          style={{ color: "rgba(255,255,255,0.45)" }}
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ─── Sage progress panel ──────────────────────────────────────────────────────

function SageGatePanel({
  enriched,
  required,
  total,
  unlocked,
}: {
  enriched: number;
  required: number;
  total: number;
  unlocked: boolean;
}) {
  const pct = Math.min(100, Math.round((enriched / required) * 100));
  const remaining = Math.max(0, required - enriched);

  if (unlocked) {
    return (
      <div
        className="mt-4 rounded-lg p-4 flex items-center gap-3"
        style={{
          background: "rgba(34,197,94,0.08)",
          border: "1px solid rgba(34,197,94,0.25)",
        }}
      >
        <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-green-500" />
        <div>
          <p className="text-sm font-semibold text-green-700">
            Sage stage complete — {enriched} of {total} events explored
          </p>
          <p className="text-xs text-green-600 mt-0.5">
            You have met the minimum of {required} events. You may continue chatting with Sage at any time, or proceed to the Psychometrics step.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="mt-4 rounded-lg p-4 space-y-3"
      style={{
        background: "rgba(201,151,58,0.07)",
        border: "1px solid rgba(201,151,58,0.3)",
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-2">
        <AlertCircle className="w-4 h-4 flex-shrink-0" style={{ color: "var(--lw-gold)" }} />
        <p className="text-sm font-semibold" style={{ color: "var(--lw-navy)" }}>
          {enriched === 0
            ? "Start your conversation with Sage below"
            : `${remaining} more event${remaining === 1 ? "" : "s"} to explore before Psychometrics unlocks`}
        </p>
      </div>

      {/* Progress bar */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs" style={{ color: "var(--lw-navy)", opacity: 0.7 }}>
            Events explored by Sage
          </span>
          <span className="text-xs font-bold" style={{ color: "var(--lw-gold)" }}>
            {enriched} / {required}
          </span>
        </div>
        <div className="h-2.5 rounded-full overflow-hidden" style={{ background: "rgba(201,151,58,0.15)" }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${pct}%`,
              background: "var(--lw-gold)",
            }}
          />
        </div>
        {total > required && (
          <p className="text-xs mt-1.5" style={{ color: "rgba(0,0,0,0.45)" }}>
            You have {total} events in your life history. Sage needs to explore at least {required} of them.
          </p>
        )}
      </div>

      {/* Explanatory note */}
      <p className="text-xs leading-relaxed" style={{ color: "rgba(0,0,0,0.55)" }}>
        The Psychometrics step will unlock automatically once Sage has explored {required} of your events. Keep the conversation going — each event Sage investigates adds depth to your eventual report.
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

export default function ClientDashboard() {
  const { isAuthenticated, loading, user, logout } = useAuth();
  const [, navigate] = useLocation();

  const { data: profile, isLoading: loadingProfile } = trpc.profile.getMyProfile.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  const { data: enrichmentStatus } = trpc.profile.getEnrichmentStatus.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  if (!loading && !isAuthenticated) {
    window.location.href = getLoginUrl();
    return null;
  }

  const getStatus = (statusKey: string | null, stepId?: string): string => {
    if (!profile || !statusKey) return "not_started";
    if (stepId === "psychometrics") {
      const via = (profile as any).viaStatus ?? "not_started";
      const ipip = (profile as any).ipipStatus ?? "not_started";
      if (via === "completed" && ipip === "completed") return "completed";
      if (via !== "not_started" || ipip !== "not_started") return "in_progress";
      return "not_started";
    }
    return (profile as any)[statusKey] ?? "not_started";
  };

  // Sage is "completed" when the gate is met
  const sageUnlocked = enrichmentStatus?.unlocked ?? false;
  const sageEnriched = enrichmentStatus?.enriched ?? 0;
  const sageRequired = enrichmentStatus?.required ?? SAGE_REQUIRED;
  const sageTotal = enrichmentStatus?.total ?? 0;

  // Progress counts only steps that have a meaningful statusKey
  const trackableSteps = STEPS.filter((s) => s.statusKey);
  const completedSteps = trackableSteps.filter((s) => {
    if (s.id === "sage") return sageUnlocked;
    return getStatus(s.statusKey, s.id) === "completed";
  }).length;
  const totalSteps = 6;
  const progressPct = Math.round((completedSteps / totalSteps) * 100);

  // Determine whether interview + background have been started (prerequisite for Sage)
  const interviewStarted = getStatus("interviewStatus") !== "not_started";
  const backgroundStarted = getStatus("backgroundStatus") !== "not_started";
  const sagePrereqMet = interviewStarted || backgroundStarted;

  return (
    <div className="min-h-screen" style={{ background: "var(--lw-cream)" }}>
      <PasswordGuidanceBanner userId={user?.id} />

      {/* Header */}
      <div
        className="sticky top-0 z-10"
        style={{
          background: "var(--lw-navy)",
          borderBottom: "1px solid rgba(201,151,58,0.25)",
        }}
      >
        <div className="container flex items-center justify-between h-14">
          <div className="flex items-center">
            <img
              src="https://d2xsxph8kpxj0f.cloudfront.net/107696804/kFbbE6kqNApXGDFpQJUGV7/lifework-logo-onnavy_1f7a4c72.png"
              alt="Lifework"
              className="h-8 w-auto object-contain"
            />
          </div>
          <div className="flex items-center gap-2">
            {user?.role === "admin" && (
              <button
                onClick={() => navigate("/counselor")}
                className="px-3 py-1.5 text-xs font-medium tracking-wide uppercase cursor-pointer"
                style={{
                  border: "1px solid rgba(201,151,58,0.5)",
                  color: "var(--lw-gold)",
                  background: "transparent",
                  letterSpacing: "0.08em",
                }}
              >
                Counsellor View
              </button>
            )}
            <span
              className="text-sm hidden sm:block"
              style={{ color: "rgba(255,255,255,0.6)" }}
            >
              {user?.name}
            </span>
            <button
              onClick={logout}
              className="p-1.5 cursor-pointer"
              style={{ color: "rgba(255,255,255,0.5)" }}
            >
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
              <div className="text-muted-foreground leading-relaxed space-y-3 text-sm">
                <p>
                  Your Lifework journey has six stages. Begin by completing your{" "}
                  <strong className="text-foreground">Life History Interview</strong> and{" "}
                  <strong className="text-foreground">Background &amp; History</strong> — these form the foundation of everything that follows.
                </p>
                <p>
                  You will then have a conversation with <strong className="text-foreground">Sage</strong>, our AI career coach,
                  who will have read everything you have written. Sage's role is to explore and draw out the depth and detail
                  that lies beneath the surface of your story. <strong className="text-foreground">You must complete at least {SAGE_REQUIRED} events with Sage</strong> before the psychometric assessments become available — this conversation is the heart of the process.
                </p>
                <p>
                  Once Sage has explored enough of your story, you will complete two short psychometric assessments: the{" "}
                  <strong className="text-foreground">VIA Character Strengths</strong> survey and the{" "}
                  <strong className="text-foreground">IPIP-NEO Personality Profile</strong>. These are not tests — they are lenses
                  that add a further layer of insight to what your life history has already begun to reveal.
                </p>
                <p>
                  All of this — your story, your conversation with Sage, and your psychometrics — will be drawn together by your
                  counsellor to create a comprehensive, personalised{" "}
                  <strong className="text-foreground">Lifework Report</strong>, which becomes the foundation for a deeper coaching conversation.
                </p>
              </div>
            </div>

            {/* Progress */}
            <div className="mb-8 p-5 rounded-xl bg-card border border-border">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-foreground">Overall Progress</span>
                <span className="text-sm font-bold text-[var(--lw-gold)]">
                  {completedSteps} of {totalSteps} steps complete
                </span>
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
                // Determine status
                let status: string;
                if (step.id === "sage") {
                  status = sageUnlocked ? "completed" : sageEnriched > 0 ? "in_progress" : "not_started";
                } else {
                  status = getStatus(step.statusKey, step.id);
                }
                const isCompleted = status === "completed";
                const isInProgress = status === "in_progress";

                // Determine locking
                // Walk back to find the nearest preceding step with a real statusKey
                let prevBlockerStatus = "completed";
                for (let pi = idx - 1; pi >= 0; pi--) {
                  if (STEPS[pi].statusKey) {
                    const prevId = STEPS[pi].id;
                    prevBlockerStatus = prevId === "sage"
                      ? (sageUnlocked ? "completed" : sageEnriched > 0 ? "in_progress" : "not_started")
                      : getStatus(STEPS[pi].statusKey, prevId);
                    break;
                  }
                }

                const isPsychometrics = step.id === "psychometrics";
                const isSage = step.id === "sage";

                let isLocked = false;
                if (idx > 0) {
                  if (isPsychometrics) {
                    // Psychometrics is locked until Sage gate is met
                    isLocked = !sageUnlocked;
                  } else if (isSage) {
                    // Sage is locked until at least one of interview/background has been started
                    isLocked = !sagePrereqMet;
                  } else {
                    isLocked = prevBlockerStatus === "not_started";
                  }
                }

                return (
                  <Card
                    key={step.id}
                    className={`border transition-all ${
                      isCompleted
                        ? "border-green-200 bg-green-50/50"
                        : isInProgress
                        ? "border-[var(--lw-gold)]/40 bg-[var(--lw-gold-light)]/20"
                        : isLocked
                        ? "border-border opacity-70"
                        : "border-border"
                    }`}
                  >
                    <CardContent className="pt-5 pb-5">
                      <div className="flex items-start gap-4">
                        {/* Step icon */}
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                            isCompleted
                              ? "bg-green-100 text-green-600"
                              : isInProgress
                              ? "bg-[var(--lw-gold-light)] text-[var(--lw-gold)]"
                              : isLocked
                              ? "bg-muted text-muted-foreground/40"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {isCompleted ? (
                            <CheckCircle2 className="w-5 h-5" />
                          ) : isLocked ? (
                            <Lock className="w-4 h-4" />
                          ) : (
                            step.icon
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3
                              className="font-serif font-semibold"
                              style={{
                                color: isLocked ? "rgba(0,0,0,0.35)" : "var(--foreground)",
                              }}
                            >
                              {step.title}
                            </h3>
                            {isCompleted && (
                              <CheckCircle2 className="w-4 h-4 text-green-500" />
                            )}
                            {isInProgress && (
                              <span className="text-xs bg-[var(--lw-gold)] text-white px-2 py-0.5 rounded-full">
                                In Progress
                              </span>
                            )}
                            {isLocked && isPsychometrics && (
                              <span
                                className="text-xs px-2 py-0.5 rounded-full flex items-center gap-1"
                                style={{
                                  background: "rgba(201,151,58,0.12)",
                                  color: "var(--lw-gold)",
                                  border: "1px solid rgba(201,151,58,0.3)",
                                }}
                              >
                                <Lock className="w-3 h-3" />
                                Locked
                              </span>
                            )}
                          </div>
                          <p
                            className="text-sm leading-relaxed"
                            style={{
                              color: isLocked ? "rgba(0,0,0,0.3)" : "var(--muted-foreground)",
                            }}
                          >
                            {step.description}
                          </p>

                          {/* ── Sage stage: gate panel + chat ── */}
                          {isSage && !isLocked && (
                            <div className="mt-2 space-y-4">
                              {/* Gate progress panel — always visible once Sage is accessible */}
                              <SageGatePanel
                                enriched={sageEnriched}
                                required={sageRequired}
                                total={sageTotal}
                                unlocked={sageUnlocked}
                              />
                              {/* Chat button */}
                              <ChatToPeter
                                section="life_history"
                                buttonLabel={sageEnriched === 0 ? "Begin conversation with Sage" : "Continue conversation with Sage"}
                                sectionDescription="Sage has read your Life History and Background. She would like to explore what you have written and ask some reflective questions to deepen your self-understanding."
                              />
                            </div>
                          )}

                          {/* Sage locked — prerequisite not met */}
                          {isSage && isLocked && (
                            <p
                              className="text-xs mt-2"
                              style={{ color: "rgba(0,0,0,0.4)" }}
                            >
                              Complete at least one section of your Life History Interview or Background &amp; History to unlock Sage.
                            </p>
                          )}

                          {/* Psychometrics locked — Sage gate not met */}
                          {isPsychometrics && isLocked && enrichmentStatus && (
                            <div
                              className="mt-3 rounded-lg p-3 flex items-start gap-3"
                              style={{
                                background: "rgba(201,151,58,0.07)",
                                border: "1px solid rgba(201,151,58,0.25)",
                              }}
                            >
                              <Lock className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "var(--lw-gold)" }} />
                              <div>
                                <p className="text-sm font-semibold mb-1" style={{ color: "var(--lw-navy)" }}>
                                  Complete your Sage conversation first
                                </p>
                                <p className="text-xs leading-relaxed" style={{ color: "rgba(0,0,0,0.55)" }}>
                                  Sage must explore at least <strong>{sageRequired} events</strong> from your life history before the psychometric assessments become available. You have completed <strong>{sageEnriched}</strong> so far — <strong>{Math.max(0, sageRequired - sageEnriched)} more</strong> to go. Return to Step 3 above to continue your conversation with Sage.
                                </p>
                                <div className="mt-2">
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-xs" style={{ color: "rgba(0,0,0,0.45)" }}>Sage progress</span>
                                    <span className="text-xs font-bold" style={{ color: "var(--lw-gold)" }}>
                                      {sageEnriched}/{sageRequired}
                                    </span>
                                  </div>
                                  <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(201,151,58,0.15)" }}>
                                    <div
                                      className="h-full rounded-full transition-all duration-500"
                                      style={{
                                        width: `${Math.min(100, Math.round((sageEnriched / sageRequired) * 100))}%`,
                                        background: "var(--lw-gold)",
                                      }}
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* CTA button (right side) — not for sage step */}
                        {step.id !== "sage" && (
                          <div className="flex-shrink-0 flex flex-col items-end gap-2">
                            {/* Lifework Coaching: mailto button */}
                            {step.id === "lifework_coaching" && !isLocked && (
                              <a
                                href={`mailto:jamie@penningtonhennessy.com?subject=${encodeURIComponent("I'm ready for coaching")}&body=${encodeURIComponent("Hi Jamie,\n\nI have finished my data input and want to set up a coaching date. Could you send me some possible timeslots?")}`}
                              >
                                <Button
                                  size="sm"
                                  className="bg-[var(--lw-gold)] hover:bg-[oklch(0.60_0.13_72)] text-white gap-1"
                                >
                                  {step.cta}
                                  <ArrowRight className="w-3.5 h-3.5" />
                                </Button>
                              </a>
                            )}

                            {step.path && !isLocked && (() => {
                              const ipipStatus = (profile as any)?.ipipStatus ?? "not_started";
                              const viaStatusVal = (profile as any)?.viaStatus ?? "not_started";
                              let resolvedPath = step.path!;
                              if (
                                step.id === "psychometrics" &&
                                viaStatusVal === "completed" &&
                                ipipStatus !== "completed"
                              ) {
                                resolvedPath = "/ipip-survey";
                              }
                              return (
                                <Button
                                  size="sm"
                                  variant={isCompleted ? "outline" : "default"}
                                  onClick={() => navigate(resolvedPath)}
                                  className={
                                    !isCompleted
                                      ? "bg-[var(--lw-gold)] hover:bg-[oklch(0.60 0.13 72)] text-white gap-1"
                                      : "gap-1"
                                  }
                                >
                                  {isCompleted
                                    ? "Review"
                                    : isInProgress
                                    ? step.ctaInProgress
                                    : step.cta}
                                  {!isCompleted && <ArrowRight className="w-3.5 h-3.5" />}
                                </Button>
                              );
                            })()}

                            {isLocked && !isPsychometrics && step.id !== "sage" && (
                              <span className="text-xs text-muted-foreground/50">
                                Complete previous step first
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
