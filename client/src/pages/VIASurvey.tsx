import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, ArrowRight, Loader2, CheckCircle2 } from "lucide-react";
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

  const { data: viaData, isLoading: loadingQuestions } = trpc.via.getQuestions.useQuery();
  const { data: existingResults } = trpc.via.getMyResults.useQuery(undefined, {
    enabled: isAuthenticated,
  });

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

  if (loadingQuestions) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
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
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-8">
        <div className="max-w-md text-center">
          <div className="w-16 h-16 rounded-full bg-[var(--lw-gold-light)] flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-8 h-8 text-[var(--lw-gold)]" />
          </div>
          <h1 className="text-3xl font-serif font-bold text-foreground mb-3">
            VIA Survey Complete
          </h1>
          <p className="text-muted-foreground mb-8">
            Your character strengths have been recorded. Your counsellor will incorporate these into your career analysis.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button onClick={() => navigate("/via/results")} className="bg-[var(--lw-gold)] hover:bg-[oklch(0.60 0.13 72)] text-white gap-2">
              View My Results <ArrowRight className="w-4 h-4" />
            </Button>
            <Button variant="outline" onClick={() => navigate("/dashboard")}>
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
