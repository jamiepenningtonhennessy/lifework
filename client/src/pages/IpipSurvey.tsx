import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, CheckCircle2, Brain } from "lucide-react";
import {
  IPIP_QUESTIONS,
  IPIP_DOMAINS,
  IPIP_FACETS,
  type IpipDomainKey,
} from "../../../shared/ipip-data";

const SCALE_LABELS = [
  { value: 1, label: "Very Inaccurate" },
  { value: 2, label: "Moderately Inaccurate" },
  { value: 3, label: "Neither" },
  { value: 4, label: "Moderately Accurate" },
  { value: 5, label: "Very Accurate" },
];

// Group questions by domain (24 questions each for N and E, then O, A, C)
// We'll show one domain per page = 5 pages of 24 questions each
const DOMAIN_ORDER: IpipDomainKey[] = ["N", "E", "O", "A", "C"];

function getQuestionsForDomain(domainKey: IpipDomainKey) {
  const facetKeys = IPIP_FACETS.filter((f) => f.domain === domainKey).map((f) => f.key);
  return IPIP_QUESTIONS.filter((q) => facetKeys.includes(q.facet));
}

export default function IpipSurvey() {
  const [, setLocation] = useLocation();
  const [domainIndex, setDomainIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitting, setSubmitting] = useState(false);

  const submitMutation = trpc.ipip.submit.useMutation({
    onSuccess: () => {
      toast.success("Personality profile complete!");
      setLocation("/ipip-results");
    },
    onError: (err) => {
      toast.error("Could not save your responses. Please try again.");
      console.error(err);
      setSubmitting(false);
    },
  });

  const currentDomainKey = DOMAIN_ORDER[domainIndex];
  const currentDomain = IPIP_DOMAINS.find((d) => d.key === currentDomainKey)!;
  const currentQuestions = getQuestionsForDomain(currentDomainKey);

  const totalAnswered = Object.keys(answers).length;
  const progressPct = Math.round((totalAnswered / 120) * 100);

  const currentPageAnswered = currentQuestions.every((q) => answers[q.id] !== undefined);

  function setAnswer(questionId: number, value: number) {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  }

  function handleNext() {
    if (!currentPageAnswered) {
      toast.warning("Please answer all questions on this page before continuing.");
      return;
    }
    if (domainIndex < 4) {
      setDomainIndex((i) => i + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  function handleBack() {
    if (domainIndex > 0) {
      setDomainIndex((i) => i - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  function handleSubmit() {
    if (totalAnswered < 120) {
      toast.warning("Please answer all 120 questions before submitting.");
      return;
    }
    setSubmitting(true);
    submitMutation.mutate({ answers });
  }

  const isLastPage = domainIndex === 4;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            <span className="font-semibold text-sm">Personality Profile</span>
          </div>
          <div className="flex-1 max-w-xs">
            <Progress value={progressPct} className="h-2" />
          </div>
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {totalAnswered} / 120
          </span>
        </div>
        {/* Domain tabs */}
        <div className="max-w-3xl mx-auto px-4 pb-2 flex gap-1.5 overflow-x-auto">
          {DOMAIN_ORDER.map((dk, i) => {
            const d = IPIP_DOMAINS.find((x) => x.key === dk)!;
            const qs = getQuestionsForDomain(dk);
            const done = qs.every((q) => answers[q.id] !== undefined);
            return (
              <button
                key={dk}
                onClick={() => setDomainIndex(i)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                  i === domainIndex
                    ? "bg-primary text-primary-foreground"
                    : done
                    ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {done && <CheckCircle2 className="h-3 w-3" />}
                {d.name}
              </button>
            );
          })}
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Intro (first page only) */}
        {domainIndex === 0 && totalAnswered === 0 && (
          <Card className="mb-8 border-primary/20 bg-primary/5">
            <CardContent className="pt-6">
              <div className="flex gap-3">
                <Brain className="h-6 w-6 text-primary mt-0.5 shrink-0" />
                <div>
                  <h2 className="font-semibold text-foreground mb-2">About this assessment</h2>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    This is the IPIP-NEO-120, a scientifically validated personality questionnaire
                    measuring 30 facets of personality across five broad dimensions. It takes most
                    people around 15–20 minutes to complete.
                  </p>
                  <p className="text-sm text-muted-foreground leading-relaxed mt-2">
                    For each statement, indicate how accurately it describes you — not how you would
                    like to be, but how you actually are. There are no right or wrong answers.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Domain header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <Badge
              className="text-white font-semibold"
              style={{ backgroundColor: currentDomain.color }}
            >
              Part {domainIndex + 1} of 5
            </Badge>
            <h1 className="text-xl font-bold text-foreground">{currentDomain.name}</h1>
          </div>
          <p className="text-sm text-muted-foreground">{currentDomain.description}</p>
        </div>

        {/* Questions */}
        <div className="space-y-4">
          {currentQuestions.map((q, qi) => {
            const selected = answers[q.id];
            return (
              <Card
                key={q.id}
                className={`transition-colors ${
                  selected !== undefined ? "border-primary/30 bg-primary/5" : "border-border"
                }`}
              >
                <CardContent className="pt-4 pb-4">
                  <p className="text-sm font-medium text-foreground mb-4">
                    <span className="text-muted-foreground mr-2">{qi + 1}.</span>
                    {q.text}
                  </p>
                  <div className="grid grid-cols-5 gap-1.5">
                    {SCALE_LABELS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setAnswer(q.id, opt.value)}
                        className={`flex flex-col items-center gap-1 p-2 rounded-lg border text-center transition-all ${
                          selected === opt.value
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border hover:border-primary/50 hover:bg-muted/50"
                        }`}
                      >
                        <span className="text-lg font-bold leading-none">{opt.value}</span>
                        <span className="text-[10px] leading-tight">{opt.label}</span>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Navigation */}
        <div className="flex justify-between items-center mt-8 pt-6 border-t border-border">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={domainIndex === 0}
            className="gap-2"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>

          <span className="text-sm text-muted-foreground">
            {domainIndex + 1} of 5
          </span>

          {isLastPage ? (
            <Button
              onClick={handleSubmit}
              disabled={submitting || totalAnswered < 120}
              className="gap-2"
            >
              {submitting ? "Saving..." : "Submit Profile"}
              <CheckCircle2 className="h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={handleNext} className="gap-2">
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
