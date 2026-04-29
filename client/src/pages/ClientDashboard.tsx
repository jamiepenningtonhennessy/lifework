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
  X,
  KeyRound,
  Sparkles,
} from "lucide-react";
import { ChatToPeter } from "@/components/ChatToPeter";
import { useState, useEffect } from "react";

// ─── Step definitions (5 steps) ──────────────────────────────────────────────
// "sage" is a special step — no path, uses ChatToPeter inline
// "psychometrics" groups VIA + IPIP under one card (two sub-paths)
// "career_explorer" is always the final step

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
    title: "3. Sage - Exploring your Life History",
    description:
      "Sage will read what you have written and add depth by asking you some reflective questions.",
    path: null,
    statusKey: "sageStatus", // set to "completed" when Sage insights are saved
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
];

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
// ─────────────────────────────────────────────────────────────────────────────

export default function ClientDashboard() {
  const { isAuthenticated, loading, user, logout } = useAuth();
  const [, navigate] = useLocation();

  const { data: profile, isLoading: loadingProfile } = trpc.profile.getMyProfile.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  if (!loading && !isAuthenticated) {
    window.location.href = getLoginUrl();
    return null;
  }

  const getStatus = (statusKey: string | null, stepId?: string): string => {
    if (!profile || !statusKey) return "not_started";
    // Psychometrics step is only "completed" when BOTH VIA and IPIP are done
    if (stepId === "psychometrics") {
      const via = (profile as any).viaStatus ?? "not_started";
      const ipip = (profile as any).ipipStatus ?? "not_started";
      if (via === "completed" && ipip === "completed") return "completed";
      if (via !== "not_started" || ipip !== "not_started") return "in_progress";
      return "not_started";
    }
    return (profile as any)[statusKey] ?? "not_started";
  };

  // Progress counts only steps that have a meaningful statusKey
  const trackableSteps = STEPS.filter((s) => s.statusKey);
  const completedSteps = trackableSteps.filter(
    (s) => getStatus(s.statusKey, s.id) === "completed"
  ).length;
  const totalSteps = 6; // always 6
  const progressPct = Math.round((completedSteps / totalSteps) * 100);

  return (
    <div className="min-h-screen" style={{ background: "var(--lw-cream)" }}>
      {/* First-login password guidance banner */}
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
          <div className="flex items-center gap-2">
            <img
              src="https://d2xsxph8kpxj0f.cloudfront.net/107696804/kFbbE6kqNApXGDFpQJUGV7/phsquare_98c01de4.jpg"
              alt="Pennington Hennessy"
              className="w-7 h-7 object-cover"
            />
            <span className="font-serif font-semibold" style={{ color: "white" }}>
              Lifework
            </span>
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
                  who will have read everything you have written. Sage’s role is to explore and draw out the depth and detail
                  that lies beneath the surface of your story.
                </p>
                <p>
                  This conversation can take up to two hours — and it is worth every minute. It is the bedrock of the Lifework
                  process, and the reason that Lifework has such a profound impact on the people who go through it.
                </p>
                <p>
                  Next, you will complete two short psychometric assessments: the{" "}
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
                const status = getStatus(step.statusKey, step.id);
                const isCompleted = status === "completed";
                const isInProgress = status === "in_progress";

                // For the Sage step: show as active once background is done (no hard lock)
                // Walk backwards to find the nearest preceding step that has a real statusKey
                // (steps with statusKey: null are informational-only and cannot block)
                let prevBlockerStatus = "completed";
                for (let pi = idx - 1; pi >= 0; pi--) {
                  if (STEPS[pi].statusKey) {
                    prevBlockerStatus = getStatus(STEPS[pi].statusKey, STEPS[pi].id);
                    break;
                  }
                }
                // Psychometrics (step 4) requires Sage to be fully *completed*.
                // All other steps only require the previous step to have been started (not_started blocks).
                const requiresCompletion = step.id === "psychometrics";
                const isLocked =
                  idx > 0 &&
                  (requiresCompletion
                    ? prevBlockerStatus !== "completed"
                    : prevBlockerStatus === "not_started") &&
                  step.id !== "sage"; // Sage is never hard-locked

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
                        {/* Step number / status icon */}
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
                          ) : (
                            step.icon
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3
                              className="font-serif font-semibold"
                              style={{
                                color: isLocked
                                  ? "rgba(0,0,0,0.35)"
                                  : "var(--foreground)",
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
                          </div>
                          <p
                            className="text-sm leading-relaxed"
                            style={{
                              color: isLocked
                                ? "rgba(0,0,0,0.3)"
                                : "var(--muted-foreground)",
                            }}
                          >
                            {step.description}
                          </p>

                          {/* Sage inline chat — shown when step is "sage" and not locked */}
                          {step.id === "sage" && !isLocked && (
                            <div className="mt-4">
                              <ChatToPeter
                                section="life_history"
                                buttonLabel="Chat to Sage"
                                sectionDescription="Sage has read your Life History and Background. She would like to explore what you have written and ask some reflective questions to deepen your self-understanding."
                              />
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
                              // For psychometrics: if VIA is done but IPIP not yet started,
                              // send client directly to the IPIP survey instead of back to VIA.
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

                            {isLocked && (
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
