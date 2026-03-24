/**
 * WowReportTab — Premium AI-generated PDF report for the counsellor view.
 *
 * Generation is fire-and-forget: the generate mutation returns immediately,
 * and we poll wowReport.get every 5 seconds until status = "done" | "error".
 */

import { useState, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Sparkles,
  Download,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Loader2,
  CheckCircle2,
  Clock,
  BookOpen,
  Star,
  Brain,
  Compass,
  TrendingUp,
  HelpCircle,
  User,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";

interface WowReportTabProps {
  clientId: number;
  clientName?: string;
}

interface WowSections {
  clientName: string;
  generatedAt: string;
  summary: string;
  lifeHistoryPattern: string;
  viaSection: string;
  personalitySection: string;
  careerDirections: string;
  developmentEdge: string;
  coachingQuestions: string;
  viaRanked?: Array<{ name: string; strengthId: string; score: number; rank: number }>;
  domainScores?: Record<string, number>;
}

const SECTION_META = [
  {
    key: "lifeHistoryPattern" as keyof WowSections,
    label: "Life History Pattern",
    Icon: BookOpen,
    eyebrow: "Section One",
    description: "Recurring themes across the decades — what the life story reveals.",
  },
  {
    key: "summary" as keyof WowSections,
    label: "Lifework Summary",
    Icon: User,
    eyebrow: "Section Two",
    description: "A 250-word portrait synthesising everything we know about this client.",
  },
  {
    key: "viaSection" as keyof WowSections,
    label: "Character Strengths",
    Icon: Star,
    eyebrow: "Section Three",
    description: "Top 7 VIA strengths with narrative interpretation and synthesis.",
  },
  {
    key: "personalitySection" as keyof WowSections,
    label: "Personality Profile",
    Icon: Brain,
    eyebrow: "Section Four",
    description: "Big Five interpretation with working style synthesis.",
  },
  {
    key: "careerDirections" as keyof WowSections,
    label: "Career Directions",
    Icon: Compass,
    eyebrow: "Section Five",
    description: "3-5 tailored career directions with specific rationale.",
  },
  {
    key: "developmentEdge" as keyof WowSections,
    label: "Development Edge",
    Icon: TrendingUp,
    eyebrow: "Section Six",
    description: "Constructive growth areas framed as edges to develop.",
  },
  {
    key: "coachingQuestions" as keyof WowSections,
    label: "Coaching Questions",
    Icon: HelpCircle,
    eyebrow: "Section Seven",
    description: "6 reflective questions tailored to this client's data.",
  },
];

const BIG5_LABELS: Record<string, string> = {
  N: "Neuroticism",
  E: "Extraversion",
  O: "Openness",
  A: "Agreeableness",
  C: "Conscientiousness",
};

// Animated progress messages shown during generation
const PROGRESS_MESSAGES = [
  "Reading life history and achievements…",
  "Identifying recurring themes across the decades…",
  "Interpreting VIA character strengths…",
  "Analysing Big Five personality profile…",
  "Crafting career directions…",
  "Writing development edge narrative…",
  "Composing coaching questions…",
  "Rendering branded PDF…",
];

export default function WowReportTab({ clientId, clientName }: WowReportTabProps) {
  const [expandedSection, setExpandedSection] = useState<string | null>("summary");
  const [isPolling, setIsPolling] = useState(false);
  const [progressMsg, setProgressMsg] = useState(0);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const msgIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const utils = trpc.useUtils();

  // Fetch existing report — refetch manually when polling
  const { data: reportData } = trpc.wowReport.get.useQuery(
    { clientId },
    { refetchInterval: false }
  );

  // Generate mutation — fires and forgets, then we start polling
  const generateMutation = trpc.wowReport.generate.useMutation({
    onSuccess: (result) => {
      if (result.cached) {
        toast.info("Using existing report — click Regenerate to create a fresh one.");
        setIsPolling(false);
        return;
      }
      if ((result as any).alreadyRunning) {
        toast.info("Report is already being generated — please wait.");
        return;
      }
      // started = true: kick off polling
      startPolling();
    },
    onError: (err) => {
      toast.error(`Could not start report generation: ${err.message}`);
      setIsPolling(false);
    },
  });

  const startPolling = () => {
    setIsPolling(true);
    setProgressMsg(0);

    // Rotate progress messages every 8 seconds
    msgIntervalRef.current = setInterval(() => {
      setProgressMsg((prev) => (prev + 1) % PROGRESS_MESSAGES.length);
    }, 8000);

    // Poll every 5 seconds
    pollIntervalRef.current = setInterval(async () => {
      const fresh = await utils.wowReport.get.fetch({ clientId });
      if (fresh.status === "done") {
        stopPolling();
        utils.wowReport.get.invalidate({ clientId });
        toast.success("WOW Report generated successfully!");
      } else if (fresh.status === "error") {
        stopPolling();
        utils.wowReport.get.invalidate({ clientId });
        toast.error(`Report generation failed: ${fresh.error ?? "Unknown error"}`);
      }
    }, 5000);
  };

  const stopPolling = () => {
    setIsPolling(false);
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    if (msgIntervalRef.current) clearInterval(msgIntervalRef.current);
  };

  // Clean up on unmount
  useEffect(() => {
    return () => stopPolling();
  }, []);

  // If we mount and status is already "generating" (e.g. page refresh), resume polling
  useEffect(() => {
    if (reportData?.status === "generating" && !isPolling) {
      startPolling();
    }
  }, [reportData?.status]);

  const handleGenerate = (forceRegenerate = false) => {
    generateMutation.mutate({ clientId, forceRegenerate });
  };

  const sections: WowSections | null = reportData?.sections ?? null;
  const pdfUrl = reportData?.pdfUrl ?? null;
  const generatedAt = reportData?.generatedAt
    ? new Date(reportData.generatedAt).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  const isGenerating = isPolling || reportData?.status === "generating";
  const hasError = reportData?.status === "error";

  return (
    <div className="space-y-6">
      {/* Missing name warning */}
      {!clientName && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-700 p-4 text-sm">
          <span className="text-amber-600 dark:text-amber-400 mt-0.5">⚠</span>
          <div>
            <p className="font-medium text-amber-800 dark:text-amber-300">Client name not set</p>
            <p className="text-amber-700 dark:text-amber-400 mt-0.5">The report will use &ldquo;the client&rdquo; throughout. Click the pencil icon next to the client heading (Overview tab) to add their first name before generating.</p>
          </div>
        </div>
      )}
      {/* Header card */}
      <Card className="border-[var(--lw-gold)]/30 bg-[var(--lw-navy)] text-white overflow-hidden">
        <CardContent className="p-0">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6 p-6">
            {/* Left: branding */}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span
                  className="text-xs font-bold tracking-[0.2em] uppercase"
                  style={{ color: "var(--lw-gold)" }}
                >
                  Lifework
                </span>
                <div className="h-px w-8" style={{ backgroundColor: "var(--lw-gold)" }} />
              </div>
              <h2 className="text-2xl font-serif font-bold text-white mb-1">
                WOW Report
              </h2>
              <p className="text-sm text-white/60 max-w-md">
                A premium 7-section AI-generated career analysis for{" "}
                <span className="text-white/80 font-medium">{clientName ?? "this client"}</span>.
                Synthesises life history, VIA character strengths, and Big Five personality into
                tailored career directions and coaching questions.
              </p>
            </div>

            {/* Right: status + actions */}
            <div className="flex flex-col items-end gap-3 min-w-[200px]">
              {isGenerating ? (
                <div className="flex items-center gap-2 text-sm text-white/60">
                  <Loader2 className="w-4 h-4 animate-spin" style={{ color: "var(--lw-gold)" }} />
                  <span>Generating…</span>
                </div>
              ) : hasError ? (
                <>
                  <div className="flex items-center gap-2 text-sm text-red-400">
                    <AlertCircle className="w-4 h-4" />
                    <span>Generation failed</span>
                  </div>
                  <Button
                    size="sm"
                    className="bg-[var(--lw-gold)] hover:bg-[var(--lw-gold)]/90 text-[var(--lw-navy)] font-semibold"
                    onClick={() => handleGenerate(true)}
                  >
                    <RefreshCw className="w-4 h-4 mr-1" />
                    Try Again
                  </Button>
                </>
              ) : pdfUrl ? (
                <>
                  <div className="flex items-center gap-2 text-sm" style={{ color: "var(--lw-gold)" }}>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Report ready</span>
                  </div>
                  {generatedAt && (
                    <div className="flex items-center gap-1 text-xs text-white/40">
                      <Clock className="w-3 h-3" />
                      {generatedAt}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="bg-[var(--lw-gold)] hover:bg-[var(--lw-gold)]/90 text-[var(--lw-navy)] font-semibold"
                      onClick={() => window.open(pdfUrl, "_blank")}
                    >
                      <Download className="w-4 h-4 mr-1" />
                      Download PDF
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-white/20 text-white hover:bg-white/10"
                      onClick={() => handleGenerate(true)}
                      disabled={isGenerating}
                      title="Regenerate report"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-xs text-white/40 text-right">
                    No report generated yet.
                    <br />
                    Requires life history, VIA, and IPIP data.
                  </p>
                  <Button
                    size="sm"
                    className="bg-[var(--lw-gold)] hover:bg-[var(--lw-gold)]/90 text-[var(--lw-navy)] font-semibold"
                    onClick={() => handleGenerate(false)}
                    disabled={generateMutation.isPending}
                  >
                    {generateMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Starting…
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Generate WOW Report
                      </>
                    )}
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Generation progress bar */}
          {isGenerating && (
            <div className="px-6 pb-4">
              <div className="flex items-center gap-3 text-sm text-white/60 mb-2">
                <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" style={{ color: "var(--lw-gold)" }} />
                <span className="transition-all duration-500">
                  {PROGRESS_MESSAGES[progressMsg]}
                  <span className="text-white/30 ml-2">(typically 2–4 minutes)</span>
                </span>
              </div>
              <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    backgroundColor: "var(--lw-gold)",
                    width: "100%",
                    animation: "indeterminate 2s linear infinite",
                  }}
                />
              </div>
              <style>{`
                @keyframes indeterminate {
                  0% { transform: translateX(-100%); }
                  100% { transform: translateX(100%); }
                }
              `}</style>
            </div>
          )}

          {/* Error detail */}
          {hasError && reportData?.error && (
            <div className="px-6 pb-4">
              <p className="text-xs text-red-400/80 font-mono bg-red-950/30 rounded p-2">
                {reportData.error}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Psychometric snapshot (when report exists) */}
      {sections && (
        <>
          {/* VIA + Big Five mini-charts */}
          {(sections.viaRanked?.length || Object.keys(sections.domainScores ?? {}).length > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* VIA top 7 */}
              {sections.viaRanked && sections.viaRanked.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <Star className="w-4 h-4" style={{ color: "var(--lw-gold)" }} />
                      Top Character Strengths
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {sections.viaRanked.slice(0, 7).map((s, i) => {
                        const maxScore = sections.viaRanked![0]?.score ?? 25;
                        const pct = Math.round((s.score / maxScore) * 100);
                        return (
                          <div key={s.strengthId ?? s.name} className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground w-4 text-right">{i + 1}</span>
                            <span className="text-xs font-medium w-36 truncate">{s.name}</span>
                            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all"
                                style={{
                                  width: `${pct}%`,
                                  backgroundColor: i === 0 ? "var(--lw-gold)" : "#d4b87a",
                                }}
                              />
                            </div>
                            <span className="text-xs text-muted-foreground w-8 text-right">{s.score}</span>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Big Five */}
              {sections.domainScores && Object.keys(sections.domainScores).length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <Brain className="w-4 h-4" style={{ color: "var(--lw-navy)" }} />
                      Big Five Personality
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {(["N", "E", "O", "A", "C"] as const).map((key) => {
                        const score = sections.domainScores![key] ?? 50;
                        return (
                          <div key={key} className="flex items-center gap-2">
                            <span className="text-xs font-medium w-36 truncate">{BIG5_LABELS[key]}</span>
                            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all"
                                style={{
                                  width: `${score}%`,
                                  backgroundColor: "var(--lw-navy)",
                                }}
                              />
                            </div>
                            <span className="text-xs text-muted-foreground w-8 text-right">{score}</span>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* 7-section accordion */}
          <div className="space-y-2">
            {SECTION_META.map((meta) => {
              const content = sections[meta.key] as string;
              const isExpanded = expandedSection === meta.key;
              if (!content) return null;

              return (
                <Card
                  key={meta.key}
                  className={`overflow-hidden transition-all ${
                    isExpanded ? "border-[var(--lw-gold)]/40" : "border-border"
                  }`}
                >
                  <button
                    className="w-full text-left"
                    onClick={() => setExpandedSection(isExpanded ? null : meta.key)}
                  >
                    <div className="flex items-center justify-between p-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded flex items-center justify-center text-white flex-shrink-0"
                          style={{ backgroundColor: "var(--lw-navy)" }}
                        >
                          <meta.Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span
                              className="text-[10px] font-bold tracking-widest uppercase"
                              style={{ color: "var(--lw-gold)" }}
                            >
                              {meta.eyebrow}
                            </span>
                          </div>
                          <h3 className="text-sm font-semibold text-foreground">{meta.label}</h3>
                          {!isExpanded && (
                            <p className="text-xs text-muted-foreground mt-0.5">{meta.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs hidden sm:flex">
                          {content.split(" ").length} words
                        </Badge>
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="px-4 pb-5 pt-0">
                      <div
                        className="h-px mb-4"
                        style={{ backgroundColor: "var(--lw-gold)", opacity: 0.3 }}
                      />
                      <div className="prose prose-sm max-w-none text-foreground leading-relaxed">
                        {content.split("\n\n").map((para, i) => (
                          <p key={i} className="mb-3 text-sm leading-relaxed">
                            {para}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>

          {/* Bottom download CTA */}
          {pdfUrl && (
            <Card className="border-[var(--lw-gold)]/20 bg-[var(--lw-cream)]">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-[var(--lw-navy)]">
                    Ready to share with {clientName ?? "the client"}?
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Download the branded PDF — suitable for printing, binding, and posting.
                  </p>
                </div>
                <Button
                  className="bg-[var(--lw-navy)] hover:bg-[var(--lw-navy)]/90 text-white"
                  onClick={() => window.open(pdfUrl, "_blank")}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download PDF
                </Button>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Empty state — no report yet, not generating */}
      {!sections && !isGenerating && !hasError && (
        <Card className="border-dashed border-2 border-[var(--lw-gold)]/20">
          <CardContent className="p-10 flex flex-col items-center text-center gap-4">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center"
              style={{ backgroundColor: "var(--lw-navy)" }}
            >
              <FileText className="w-8 h-8 text-white" />
            </div>
            <div>
              <h3 className="font-serif font-semibold text-lg text-foreground mb-1">
                No WOW Report yet
              </h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                Generate a premium 7-section career analysis report. The AI synthesises the
                client's life history, VIA character strengths, and Big Five personality into a
                personalised, branded PDF.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-4 text-center mt-2 w-full max-w-sm">
              {[
                { label: "Life History", sub: "Patterns & themes" },
                { label: "Psychometrics", sub: "VIA + Big Five" },
                { label: "Career Directions", sub: "Tailored to this client" },
              ].map((item) => (
                <div
                  key={item.label}
                  className="p-3 rounded border border-[var(--lw-gold)]/20 bg-[var(--lw-cream)]"
                >
                  <p className="text-xs font-semibold text-[var(--lw-navy)]">{item.label}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{item.sub}</p>
                </div>
              ))}
            </div>
            <Button
              className="mt-2 bg-[var(--lw-navy)] hover:bg-[var(--lw-navy)]/90 text-white"
              onClick={() => handleGenerate(false)}
              disabled={generateMutation.isPending}
            >
              {generateMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Starting…
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate WOW Report
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
