import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Loader2 } from "lucide-react";
import {
  interpretDomain,
  CogDomain,
  ScreenerScores,
} from "../../../shared/cognitive-screener-data";

const DOMAIN_CONFIG: {
  key: CogDomain;
  label: string;
  colour: string;
  barColour: string;
  letter: string;
}[] = [
  {
    key: "verbal",
    label: "Verbal Reasoning",
    colour: "bg-purple-50 border-purple-200",
    barColour: "bg-purple-500",
    letter: "V",
  },
  {
    key: "numerical",
    label: "Numerical Reasoning",
    colour: "bg-amber-50 border-amber-200",
    barColour: "bg-amber-500",
    letter: "N",
  },
  {
    key: "abstract",
    label: "Abstract Reasoning",
    colour: "bg-teal-50 border-teal-200",
    barColour: "bg-teal-500",
    letter: "A",
  },
];

function ScoreBar({
  score,
  max = 10,
  colour,
}: {
  score: number;
  max?: number;
  colour: string;
}) {
  const pct = (score / max) * 100;
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${colour}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-sm font-bold text-foreground w-12 text-right">
        {score}/{max}
      </span>
    </div>
  );
}

export default function CognitiveResults() {
  const [, navigate] = useLocation();

  const { data: result, isLoading } = trpc.cognitive.getResults.useQuery();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  if (!result || !result.scores) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold">No results found</h2>
          <p className="text-muted-foreground">
            It looks like you haven't completed the screener yet.
          </p>
          <Button onClick={() => navigate("/cognitive-screener")}>
            Take the Assessment
          </Button>
        </div>
      </div>
    );
  }

  const scores = result.scores as ScreenerScores;
  const timeTaken = result.timeTakenSeconds;

  const formatTime = (s: number | null | undefined) => {
    if (!s) return null;
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}m ${sec}s`;
  };

  return (
    <div className="min-h-screen bg-background py-12 px-6">
      <div className="max-w-3xl mx-auto space-y-10">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium">
            Your Cognitive Profile
          </div>
          <h1 className="text-4xl font-bold text-foreground">
            Reasoning Strengths Results
          </h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            These results are indicative — they show your relative strengths
            across three reasoning domains to inform your career conversation,
            not as a definitive measure of intelligence.
          </p>
        </div>

        {/* Overall score */}
        <Card className="border-border text-center">
          <CardContent className="py-8 space-y-4">
            <div className="space-y-1">
              <div className="text-6xl font-bold text-primary">
                {scores.total}
                <span className="text-3xl text-muted-foreground">/30</span>
              </div>
              <div className="text-sm text-muted-foreground">Total Score</div>
            </div>
            <div className="flex items-center justify-center gap-6 text-sm">
              <div>
                <span className="font-semibold text-foreground">
                  ~{scores.percentile}th percentile
                </span>
                <span className="text-muted-foreground ml-1">(indicative)</span>
              </div>
              {timeTaken && (
                <div className="text-muted-foreground">
                  Completed in {formatTime(timeTaken)}
                </div>
              )}
            </div>
            <Progress
              value={(scores.total / 30) * 100}
              className="max-w-xs mx-auto h-3"
            />
          </CardContent>
        </Card>

        {/* Domain breakdown */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-foreground">
            Domain Breakdown
          </h2>
          {DOMAIN_CONFIG.map(({ key, label, colour, barColour, letter }) => {
            const domainScore = scores[key];
            const interp = interpretDomain(key, domainScore);
            return (
              <Card key={key} className={`border ${colour}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${colour}`}
                      >
                        {letter}
                      </span>
                      <CardTitle className="text-lg">{label}</CardTitle>
                    </div>
                    <span className="text-2xl font-bold text-foreground">
                      {domainScore}/10
                    </span>
                  </div>
                  <ScoreBar
                    score={domainScore}
                    max={10}
                    colour={barColour}
                  />
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <span className="inline-block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                      {interp.label}
                    </span>
                    <p className="text-sm text-foreground leading-relaxed">
                      {interp.description}
                    </p>
                  </div>
                  <div className="bg-white/60 rounded-lg p-3 border border-white/80">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                      Career Implication
                    </p>
                    <p className="text-sm text-foreground leading-relaxed">
                      {interp.careerImplication}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Disclaimer */}
        <div className="bg-muted/50 rounded-xl p-5 text-sm text-muted-foreground space-y-2">
          <p className="font-semibold text-foreground">About this assessment</p>
          <p>
            This screener is an indicative tool designed to surface relative
            cognitive strengths for discussion in your career analysis session.
            It is not a clinically validated IQ test. Results should be
            interpreted alongside your life history, values, and personality
            profile — not in isolation.
          </p>
          <p>
            If you would like a full clinical cognitive assessment, your
            counsellor can discuss options including the MAB-II (Multidimensional
            Aptitude Battery), which is the instrument used in the original
            Lifework methodology.
          </p>
        </div>

        {/* Navigation */}
        <div className="flex justify-between items-center pt-4">
          <Button
            variant="outline"
            onClick={() => navigate("/dashboard")}
          >
            ← Back to Dashboard
          </Button>
          <Button onClick={() => navigate("/dashboard")}>
            Continue →
          </Button>
        </div>
      </div>
    </div>
  );
}
