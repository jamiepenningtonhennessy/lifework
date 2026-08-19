import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, ArrowRight, Brain, Loader2, CheckCircle2, Lock } from "lucide-react";
import { toast } from "sonner";

const SCALE = [
  { value: 1, label: "Very much unlike me" },
  { value: 2, label: "Unlike me" },
  { value: 3, label: "Neutral" },
  { value: 4, label: "Like me" },
  { value: 5, label: "Very much like me" },
];

const QUESTIONS_PER_PAGE = 10;

export default function VIASurvey() {
  const { isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [page, setPage] = useState(0);
  const [submitted, setSubmitted] = useState(false);

  const { data: viaData, isLoading: loadingQuestions } = trpc.via.getQuestions.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const { data: existingResults } = trpc.via.getMyResults.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const { data: enrichmentStatus, isLoading: loadingEnrichment } = trpc.profile.getEnrichmentStatus.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  const submitSurvey = trpc.via.submitSurvey.useMutation({
    onSuccess: () => {
      setSubmitted(true);
      toast.success("VIA survey completed!");
    },
    onError: () => toast.error("Failed to submit survey. Please try again."),
  });

  if (!loading && !isAuthenticated) {
    window.location.href = getLoginUrl();
    return null;
  }

  if (loadingQuestions || loadingEnrichment) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Gate: redirect to dashboard if Sage has not explored enough events yet
  if (enrichmentStatus && !enrichmentStatus.unlocked && !existingResults) {
    return (
      <div
        className="min-h-screen flex items-center justify-center px-4"
        style={{ background: "var(--lw-cream)" }}
      >
        <div className="max-w-md w-full text-center space-y-6">
          <div className="flex justify-center">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center"
              style={{ background: "var(--lw-navy)" }}
            >
              <Lock className="w-8 h-8" style={{ color: "var(--lw-gold)" }} />
            </div>
          </div>
          <div>
            <h1 className="text-2xl font-serif font-bold mb-2" style={{ color: "var(--lw-navy)" }}>
              Psychometrics not yet unlocked
            </h1>
            <p className="text-sm leading-relaxed" style={{ color: "rgba(0,0,0,0.6)" }}>
              You need to complete at least <strong>{enrichmentStatus.required} events</strong> with Sage before starting the VIA survey.
              You have completed <strong>{enrichmentStatus.enriched}</strong> so far.
              Please return to your dashboard and continue your conversation with Sage.
            </p>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(201,151,58,0.15)" }}>
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.min(100, Math.round((enrichmentStatus.enriched / enrichmentStatus.required) * 100))}%`,
                background: "var(--lw-gold)",
              }}
            />
          </div>
          <Button
            onClick={() => navigate("/dashboard")}
            className="gap-2"
            style={{ background: "var(--lw-gold)", color: "white" }}
          >
            Return to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const questions = viaData?.questions ?? [];
  const totalPages = Math.ceil(questions.length / QUESTIONS_PER_PAGE);
  const pageQuestions = questions.slice(page * QUESTIONS_PER_PAGE, (page + 1) * QUESTIONS_PER_PAGE);
  const answeredOnPage = pageQuestions.filter((q) => answers[q.id] !== undefined).length;
  const allAnswered = questions.every((q) => answers[q.id] !== undefined);
  const totalAnswered = Object.keys(answers).length;
  const progress = Math.round((totalAnswered / questions.length) * 100);

  if (submitted || existingResults) {
    return (
      <div
        className="min-h-screen flex items-center justify-center px-4"
        style={{ background: "var(--lw-cream)" }}
      >
        <div className="max-w-lg w-full text-center space-y-8">
          <div className="flex justify-center">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center"
              style={{ background: "var(--lw-navy)" }}
            >
              <CheckCircle2 className="w-10 h-10" style={{ color: "var(--lw-gold)" }} />
            </div>
          </div>
          <div className="space-y-3">
            <h1 className="text-3xl font-bold tracking-tight" style={{ color: "var(--lw-navy)" }}>
              VIA Character Strengths Complete
            </h1>
            <p className="text-lg" style={{ color: "var(--lw-navy-mid)" }}>
              Thank you — your responses have been saved.
            </p>
          </div>
          <div
            className="rounded-xl p-6 text-left space-y-3"
            style={{ background: "var(--lw-navy)", color: "var(--lw-cream)" }}
          >
            <div className="flex items-start gap-3">
              <Lock className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: "var(--lw-gold)" }} />
              <div className="space-y-2">
                <p className="font-semibold text-base">
                  Your results will be shared in your Wow Report session
                </p>
                <p className="text-sm opacity-80 leading-relaxed">
                  Your VIA results are held securely and will be presented to you by your
                  practitioner as part of your Lifework Wow Report — alongside your Life History
                  and other assessments. This ensures your results are always understood in
                  context, not in isolation.
                </p>
              </div>
            </div>
          </div>
          <div className="space-y-3">
            <Button
              onClick={() => navigate("/ipip-survey")}
              className="w-full gap-2 text-base py-6"
              style={{ background: "var(--lw-gold)", color: "white" }}
            >
              <Brain className="w-5 h-5" /> Continue to Personality Profile
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/dashboard")}
              style={{ color: "var(--lw-navy-mid)" }}
            >
              Back to Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--lw-cream)" }}>
      {/* Header */}
      <div className="sticky top-0 z-10" style={{ background: "var(--lw-navy)", borderBottom: "2px solid var(--lw-gold)" }}>
        <div className="container flex items-center justify-between h-14">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/background")}
              style={{ color: "rgba(255,255,255,0.7)" }} className="hover:text-white">
              <ArrowLeft className="w-4 h-4 mr-1" /> Background
            </Button>
            <div className="h-4 w-px" style={{ background: "rgba(255,255,255,0.2)" }} />
            <span className="font-serif font-semibold" style={{ color: "var(--lw-gold)" }}>VIA Character Strengths</span>
          </div>
          <span className="text-xs" style={{ color: "rgba(255,255,255,0.6)" }}>
            {totalAnswered} / {questions.length} answered
          </span>
        </div>
        {/* Progress bar */}
        <div className="h-1" style={{ background: "rgba(255,255,255,0.1)" }}>
          <div
            className="h-full transition-all duration-300"
            style={{ width: `${progress}%`, background: "var(--lw-gold)" }}
          />
        </div>
      </div>

      <div className="container max-w-2xl py-8">
        {/* Video intro on first page */}
        {page === 0 && (
          <div className="mb-6">
            <p className="text-xs uppercase tracking-widest font-medium mb-3" style={{ color: "var(--lw-gold)", letterSpacing: "0.1em" }}>Watch before you begin</p>
            <div style={{ position: "relative", paddingBottom: "56.25%", height: 0, overflow: "hidden", border: "2px solid rgba(201,151,58,0.4)" }}>
              <iframe
                src="https://drive.google.com/file/d/1bJfqf5QNyio-xtNa14AFHYE8L90-1MWr/preview"
                style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: "none" }}
                allow="autoplay"
                allowFullScreen
                title="VIA Character Strengths — Introduction"
              />
            </div>
          </div>
        )}
        {/* Intro on first page */}
        {page === 0 && (
          <div className="mb-8 p-5 rounded-xl bg-[var(--lw-gold-light)] border border-[var(--lw-gold)]/20">
            <h2 className="font-serif font-semibold text-foreground mb-2">About the VIA Survey</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              The VIA Character Strengths survey identifies your core personal qualities — the things that come naturally to you and energise you. 
              There are 120 statements. For each one, rate how much it describes you on a scale of 1 to 5. 
              Answer honestly — there are no right or wrong answers.
            </p>
          </div>
        )}

        {/* Page indicator */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-sm font-medium text-muted-foreground">
            Page {page + 1} of {totalPages}
          </p>
          <p className="text-sm text-muted-foreground">
            {answeredOnPage} / {pageQuestions.length} on this page
          </p>
        </div>

        {/* Questions */}
        <div className="space-y-6">
          {pageQuestions.map((q, idx) => (
            <div key={q.id} className="p-5 rounded-xl border border-border bg-card">
              <p className="text-sm font-medium text-foreground mb-4 leading-relaxed">
                <span className="text-muted-foreground mr-2">{page * QUESTIONS_PER_PAGE + idx + 1}.</span>
                {q.text}
              </p>
              <div className="flex gap-1 sm:gap-2 flex-wrap">
                {SCALE.map((s) => (
                  <button
                    key={s.value}
                    onClick={() => setAnswers((a) => ({ ...a, [q.id]: s.value }))}
                    className={`flex-1 min-w-[52px] py-2 px-1 rounded-lg text-xs font-medium transition-all border ${
                      answers[q.id] === s.value
                        ? "bg-[var(--lw-gold)] text-white border-[var(--lw-gold)]"
                        : "bg-background text-muted-foreground border-border hover:border-[var(--lw-gold)] hover:text-foreground"
                    }`}
                    title={s.label}
                  >
                    {s.value}
                  </button>
                ))}
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-xs text-muted-foreground">Very unlike me</span>
                <span className="text-xs text-muted-foreground">Very like me</span>
              </div>
            </div>
          ))}
        </div>

        {/* Navigation */}
        <div className="flex justify-between mt-8">
          <Button
            variant="outline"
            onClick={() => setPage((p) => p - 1)}
            disabled={page === 0}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" /> Previous
          </Button>
          {page < totalPages - 1 ? (
            <Button
              onClick={() => setPage((p) => p + 1)}
              disabled={answeredOnPage < pageQuestions.length}
              className="gap-2 bg-[var(--lw-gold)] hover:bg-[oklch(0.60 0.13 72)] text-white"
            >
              Next <ArrowRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              onClick={() => submitSurvey.mutate({ answers })}
              disabled={!allAnswered || submitSurvey.isPending}
              className="gap-2 bg-[var(--lw-gold)] hover:bg-[oklch(0.60 0.13 72)] text-white"
            >
              {submitSurvey.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              Submit Survey
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
