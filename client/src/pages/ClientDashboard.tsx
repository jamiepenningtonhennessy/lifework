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
} from "lucide-react";

const STEPS = [
  {
    id: "interview",
    icon: <MessageSquare className="w-5 h-5" />,
    title: "Life History Interview",
    description: "An AI-guided conversation exploring your achievements across the decades of your life.",
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
    id: "analysis",
    icon: <Brain className="w-5 h-5" />,
    title: "Career Analysis Report",
    description: "Your counsellor will generate an AI-powered analysis weaving together all your data.",
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
    getStatus("interviewStatus") === "completed" && getStatus("viaStatus") === "completed";

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container flex items-center justify-between h-14">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-[var(--plum)] flex items-center justify-center">
              <span className="text-white text-xs font-bold">PT</span>
            </div>
            <span className="font-serif font-semibold text-foreground">Plum Trees</span>
          </div>
          <div className="flex items-center gap-2">
            {user?.role === "admin" && (
              <Button variant="outline" size="sm" onClick={() => navigate("/counselor")}>
                Counselor View
              </Button>
            )}
            <span className="text-sm text-muted-foreground hidden sm:block">{user?.name}</span>
            <Button variant="ghost" size="sm" onClick={logout} className="gap-1 text-muted-foreground">
              <LogOut className="w-4 h-4" />
            </Button>
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
              <p className="text-muted-foreground">
                Your career analysis journey. Complete each step at your own pace.
              </p>
            </div>

            {/* Progress */}
            <div className="mb-8 p-5 rounded-xl bg-card border border-border">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-foreground">Overall Progress</span>
                <span className="text-sm font-bold text-[var(--plum)]">{completedSteps} of {totalSteps} steps complete</span>
              </div>
              <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-[var(--plum)] rounded-full transition-all duration-500"
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
                        ? "border-[var(--plum)]/40 bg-[var(--plum-light)]/20"
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
                              ? "bg-[var(--plum-light)] text-[var(--plum)]"
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
                              <span className="text-xs bg-[var(--plum)] text-white px-2 py-0.5 rounded-full">In Progress</span>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
                        </div>
                        <div className="flex-shrink-0">
                          {step.id === "analysis" ? (
                            isCompleted ? (
                              <Button size="sm" variant="outline" onClick={() => navigate("/via/results")}>
                                View Report
                              </Button>
                            ) : generateAnalysis.isPending ? (
                              <Button size="sm" disabled>
                                <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> Generating...
                              </Button>
                            ) : canGenerateAnalysis ? (
                              <Button
                                size="sm"
                                onClick={() => generateAnalysis.mutate()}
                                className="bg-[var(--plum)] hover:bg-[var(--plum-dark)] text-white gap-1"
                              >
                                Generate Analysis <ArrowRight className="w-3.5 h-3.5" />
                              </Button>
                            ) : (
                              <span className="text-xs text-muted-foreground">Complete steps 1–3 first</span>
                            )
                          ) : step.path ? (
                            <Button
                              size="sm"
                              variant={isCompleted ? "outline" : "default"}
                              onClick={() => navigate(step.path!)}
                              className={!isCompleted ? "bg-[var(--plum)] hover:bg-[var(--plum-dark)] text-white gap-1" : "gap-1"}
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

            {/* VIA Results shortcut if completed */}
            {getStatus("viaStatus") === "completed" && (
              <div className="mt-6 p-4 rounded-xl bg-[var(--gold-light)] border border-[var(--gold)]/30">
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
