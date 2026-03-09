import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  SCREENER_ITEMS,
  INTERLEAVED_ORDER,
  SCREENER_TIME_LIMIT_SECONDS,
  CogItem,
} from "../../../shared/cognitive-screener-data";

// Build ordered items list from interleaved order
const ORDERED_ITEMS: CogItem[] = INTERLEAVED_ORDER.map(
  (id) => SCREENER_ITEMS.find((item) => item.id === id)!
);

const DOMAIN_LABELS: Record<string, string> = {
  verbal: "Verbal Reasoning",
  numerical: "Numerical Reasoning",
  abstract: "Abstract Reasoning",
};

const DOMAIN_COLOURS: Record<string, string> = {
  verbal: "bg-purple-100 text-purple-800",
  numerical: "bg-amber-100 text-amber-800",
  abstract: "bg-teal-100 text-teal-800",
};

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

type Phase = "intro" | "survey" | "submitting" | "done";

export default function CognitiveScreener() {
  const [, navigate] = useLocation();
  const [phase, setPhase] = useState<Phase>("intro");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(SCREENER_TIME_LIMIT_SECONDS);
  const [startTime, setStartTime] = useState<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const saveResults = trpc.cognitive.saveResults.useMutation({
    onSuccess: () => {
      setPhase("done");
      setTimeout(() => navigate("/cognitive-results"), 1200);
    },
    onError: () => {
      toast.error("Failed to save results. Please try again.");
      setPhase("survey");
    },
  });

  // Timer
  useEffect(() => {
    if (phase !== "survey") return;
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current!);
          handleSubmit(true);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current!);
  }, [phase]);

  const handleSubmit = useCallback(
    (timedOut = false) => {
      if (phase === "submitting" || phase === "done") return;
      setPhase("submitting");
      const timeTaken = Math.round((Date.now() - startTime) / 1000);
      const stringAnswers: Record<string, number> = {};
      for (const [k, v] of Object.entries(answers)) {
        stringAnswers[k] = v;
      }
      if (timedOut) toast.info("Time's up! Submitting your answers…");
      saveResults.mutate({ answers: stringAnswers, timeTakenSeconds: timeTaken });
    },
    [answers, phase, startTime, saveResults]
  );

  const handleStart = () => {
    setStartTime(Date.now());
    setPhase("survey");
  };

  const handleOptionSelect = (optionIndex: number) => {
    setSelectedOption(optionIndex);
  };

  const handleNext = () => {
    if (selectedOption === null) {
      toast.warning("Please select an answer before continuing.");
      return;
    }
    const currentItem = ORDERED_ITEMS[currentIndex];
    setAnswers((prev) => ({ ...prev, [currentItem.id]: selectedOption }));
    setSelectedOption(null);

    if (currentIndex + 1 >= ORDERED_ITEMS.length) {
      // All answered — submit
      const finalAnswers = { ...answers, [currentItem.id]: selectedOption };
      setPhase("submitting");
      const timeTaken = Math.round((Date.now() - startTime) / 1000);
      const stringAnswers: Record<string, number> = {};
      for (const [k, v] of Object.entries(finalAnswers)) {
        stringAnswers[k] = v;
      }
      saveResults.mutate({ answers: stringAnswers, timeTakenSeconds: timeTaken });
    } else {
      setCurrentIndex((i) => i + 1);
    }
  };

  const handleSkip = () => {
    setSelectedOption(null);
    if (currentIndex + 1 >= ORDERED_ITEMS.length) {
      handleSubmit();
    } else {
      setCurrentIndex((i) => i + 1);
    }
  };

  const currentItem = ORDERED_ITEMS[currentIndex];
  const progress = ((currentIndex + 1) / ORDERED_ITEMS.length) * 100;
  const answeredCount = Object.keys(answers).length;
  const timerWarning = timeLeft < 5 * 60; // under 5 minutes

  // ─── Intro Screen ─────────────────────────────────────────────────────────
  if (phase === "intro") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-2xl w-full space-y-8">
          <div className="text-center space-y-4">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium">
              Cognitive Profile
            </div>
            <h1 className="text-4xl font-bold text-foreground">
              Reasoning Strengths Screener
            </h1>
            <p className="text-lg text-muted-foreground max-w-xl mx-auto">
              This short assessment helps identify your cognitive strengths across
              three areas — verbal, numerical, and abstract reasoning — to enrich
              your career analysis.
            </p>
          </div>

          <Card className="border-border">
            <CardContent className="p-8 space-y-6">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="space-y-1">
                  <div className="text-2xl font-bold text-primary">30</div>
                  <div className="text-sm text-muted-foreground">Questions</div>
                </div>
                <div className="space-y-1">
                  <div className="text-2xl font-bold text-primary">25 min</div>
                  <div className="text-sm text-muted-foreground">Time limit</div>
                </div>
                <div className="space-y-1">
                  <div className="text-2xl font-bold text-primary">3</div>
                  <div className="text-sm text-muted-foreground">Domains</div>
                </div>
              </div>

              <div className="space-y-3 text-sm text-muted-foreground">
                <div className="flex items-start gap-3">
                  <span className="inline-block w-5 h-5 rounded-full bg-purple-100 text-purple-800 text-xs flex items-center justify-center font-bold mt-0.5 shrink-0">V</span>
                  <div>
                    <span className="font-medium text-foreground">Verbal Reasoning</span> — vocabulary, analogies, and logical argument.
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="inline-block w-5 h-5 rounded-full bg-amber-100 text-amber-800 text-xs flex items-center justify-center font-bold mt-0.5 shrink-0">N</span>
                  <div>
                    <span className="font-medium text-foreground">Numerical Reasoning</span> — number sequences, percentages, and word problems.
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="inline-block w-5 h-5 rounded-full bg-teal-100 text-teal-800 text-xs flex items-center justify-center font-bold mt-0.5 shrink-0">A</span>
                  <div>
                    <span className="font-medium text-foreground">Abstract Reasoning</span> — patterns, sequences, and rule-based thinking.
                  </div>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
                <strong>Important:</strong> This is an indicative screener, not a clinical IQ test. Results are presented as a profile of relative strengths to inform your career conversation — not as a definitive measure of intelligence.
              </div>

              <div className="space-y-3 text-sm text-muted-foreground">
                <p className="font-medium text-foreground">Tips for best results:</p>
                <ul className="space-y-1 list-disc list-inside">
                  <li>Work somewhere quiet with no interruptions</li>
                  <li>Work through questions at a steady pace — don't rush</li>
                  <li>If you're unsure, make your best guess and move on</li>
                  <li>You cannot go back to previous questions</li>
                </ul>
              </div>

              <Button onClick={handleStart} className="w-full" size="lg">
                Begin Assessment
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // ─── Submitting / Done ────────────────────────────────────────────────────
  if (phase === "submitting" || phase === "done") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="text-center space-y-4">
          <div className="text-5xl">🧠</div>
          <h2 className="text-2xl font-bold text-foreground">
            {phase === "done" ? "Assessment complete!" : "Scoring your responses…"}
          </h2>
          <p className="text-muted-foreground">
            {phase === "done"
              ? "Taking you to your results…"
              : "Please wait a moment."}
          </p>
        </div>
      </div>
    );
  }

  // ─── Survey Screen ────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header bar */}
      <div className="sticky top-0 z-10 bg-card border-b border-border px-6 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-sm font-medium text-muted-foreground shrink-0">
            Question {currentIndex + 1} of {ORDERED_ITEMS.length}
          </span>
          <Badge
            className={`shrink-0 ${DOMAIN_COLOURS[currentItem.domain]}`}
            variant="secondary"
          >
            {DOMAIN_LABELS[currentItem.domain]}
          </Badge>
        </div>
        <div
          className={`text-lg font-mono font-bold shrink-0 ${
            timerWarning ? "text-red-600" : "text-foreground"
          }`}
        >
          {formatTime(timeLeft)}
        </div>
      </div>

      {/* Progress bar */}
      <Progress value={progress} className="h-1 rounded-none" />

      {/* Question */}
      <div className="flex-1 flex items-start justify-center p-6 pt-10">
        <div className="max-w-2xl w-full space-y-8">
          {/* Question card */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {currentItem.difficulty}
              </span>
            </div>
            <h2 className="text-xl font-semibold text-foreground leading-relaxed whitespace-pre-line">
              {currentItem.question}
            </h2>
            {currentItem.stimulus && (
              <div className="bg-muted rounded-lg p-4 font-mono text-sm whitespace-pre text-center">
                {currentItem.stimulus}
              </div>
            )}
          </div>

          {/* Options */}
          <div className="space-y-3">
            {currentItem.options.map((option, idx) => (
              <button
                key={idx}
                onClick={() => handleOptionSelect(idx)}
                className={`w-full text-left px-5 py-4 rounded-xl border-2 transition-all duration-150 text-base ${
                  selectedOption === idx
                    ? "border-primary bg-primary/5 text-foreground font-medium"
                    : "border-border bg-card text-foreground hover:border-primary/40 hover:bg-muted/50"
                }`}
              >
                <span className="inline-flex items-center gap-3">
                  <span
                    className={`w-7 h-7 rounded-full border-2 flex items-center justify-center text-sm font-bold shrink-0 ${
                      selectedOption === idx
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-muted-foreground/40 text-muted-foreground"
                    }`}
                  >
                    {String.fromCharCode(65 + idx)}
                  </span>
                  {option}
                </span>
              </button>
            ))}
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between pt-2">
            <button
              onClick={handleSkip}
              className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-2"
            >
              Skip this question
            </button>
            <Button
              onClick={handleNext}
              disabled={selectedOption === null}
              size="lg"
            >
              {currentIndex + 1 === ORDERED_ITEMS.length ? "Submit" : "Next →"}
            </Button>
          </div>

          {/* Progress summary */}
          <p className="text-center text-xs text-muted-foreground">
            {answeredCount} of {ORDERED_ITEMS.length} answered
          </p>
        </div>
      </div>
    </div>
  );
}
