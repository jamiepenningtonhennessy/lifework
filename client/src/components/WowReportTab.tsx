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
import SageCounsellorPanel from "@/components/SageCounsellorPanel";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Palette,
  BrainCircuit,
  Presentation,
  Lock,
  Unlock,
} from "lucide-react";
import { toast } from "sonner";
import { Streamdown } from "streamdown";
import { InsightsMapping } from "@/components/InsightsMapping";
import ClaudeJsonPreviewModal from "@/components/ClaudeJsonPreviewModal";
import { VIA_STRENGTHS } from "@shared/via-data";

type WowReportType = "standard" | "student" | "career_changer" | "job_returner" | "retirement";

const REPORT_TYPE_OPTIONS: { value: WowReportType; label: string; description: string }[] = [
  { value: "standard",       label: "Standard Career Analysis",  description: "Full career analysis — suitable for most clients." },
  { value: "student",        label: "First Career — Student",     description: "Chapters 6–8 reframed for someone starting their first career." },
  { value: "career_changer", label: "Career Change",              description: "Chapters 6–8 address the transition from an unsatisfying career." },
  { value: "job_returner",   label: "Returning to Work",          description: "Chapters 6–8 address re-entry after a career break." },
  { value: "retirement",     label: "Retirement & Legacy",        description: "Chapters 6–8 reframed as 'What To Do With What You Know'." },
];

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
  behaviouralStyle: string;
  primaryColour?: string;
  secondaryColour?: string;
  jungianType?: string;
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
    eyebrow: "Chapter 2",
    description: "Recurring themes across the decades — what the life story reveals.",
  },
  {
    key: "summary" as keyof WowSections,
    label: "Lifework Summary",
    Icon: User,
    eyebrow: "Chapter 1",
    description: "A 250-word portrait synthesising everything we know about this client.",
  },
  {
    key: "viaSection" as keyof WowSections,
    label: "Character Strengths",
    Icon: Star,
    eyebrow: "Chapter 3",
    description: "Top 7 VIA strengths with narrative interpretation and synthesis.",
  },
  {
    key: "personalitySection" as keyof WowSections,
    label: "Personality Profile",
    Icon: Brain,
    eyebrow: "Chapter 4",
    description: "Big Five interpretation with working style synthesis.",
  },
  {
    key: "behaviouralStyle" as keyof WowSections,
    label: "Behavioural Style",
    Icon: Palette,
    eyebrow: "Chapter 5",
    description: "Insights colour energy profile — how this client shows up in professional settings.",
  },
  {
    key: "developmentEdge" as keyof WowSections,
    label: "Development Edge",
    Icon: TrendingUp,
    eyebrow: "Chapter 6",
    description: "Constructive growth areas framed as edges to develop.",
  },
  {
    key: "coachingQuestions" as keyof WowSections,
    label: "Conclusions",
    Icon: HelpCircle,
    eyebrow: "Chapter 7",
    description: "Final synthesis — dependable strengths, career meaning, and forward-looking close.",
  },
  {
    key: "careerDirections" as keyof WowSections,
    label: "Career Directions",
    Icon: Compass,
    eyebrow: "Chapter 8",
    description: "3-5 tailored career directions with specific rationale.",
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
  "Writing conclusions and synthesis…",
  "Rendering branded PDF…",
];

export default function WowReportTab({ clientId, clientName }: WowReportTabProps) {
  const [expandedSection, setExpandedSection] = useState<string | null>("summary");
  const [isPolling, setIsPolling] = useState(false);
  const [progressMsg, setProgressMsg] = useState(0);
  const [selectedReportType, setSelectedReportType] = useState<WowReportType>("standard");
  const [selectedWritingStyle, setSelectedWritingStyle] = useState<"house" | "mark" | "clive-james" | "michael-lewis">("house");
  const [sageOpen, setSageOpen] = useState(false);
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

  // Sync selectedReportType and writingStyle with the stored values when the report loads
  useEffect(() => {
    if (reportData?.reportType && reportData.reportType !== selectedReportType) {
      setSelectedReportType(reportData.reportType as WowReportType);
    }
    if (reportData?.writingStyle && reportData.writingStyle !== selectedWritingStyle) {
      setSelectedWritingStyle(reportData.writingStyle as "house" | "mark" | "clive-james" | "michael-lewis");
    }
  }, [reportData?.reportType, reportData?.writingStyle]);

  const handleGenerate = (forceRegenerate = false, overrideType?: WowReportType, overrideStyle?: "house" | "mark" | "clive-james" | "michael-lewis") => {
    generateMutation.mutate({ clientId, forceRegenerate, reportType: overrideType ?? selectedReportType, writingStyle: overrideStyle ?? selectedWritingStyle });
  };

  // Rebuild PDF from stored sections without re-running the LLM pipeline
  const [slidesBuilding, setSlidesBuilding] = useState(false);
  const handleGenerateSlides = async () => {
    setSlidesBuilding(true);
    try {
      const res = await fetch("/api/download/coaching-slides", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ clientId }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Unknown error" }));
        toast.error("Could not generate slides: " + (err.error ?? res.statusText));
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "Lifework-Coaching-Slides.pptx";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Coaching slides downloaded.");
    } catch (err: any) {
      toast.error("Could not generate slides: " + (err?.message ?? "Unknown error"));
    } finally {
      setSlidesBuilding(false);
    }
  };
  // Keep a stub so the button reference below still compiles
  const generateSlidesMutation = { isPending: slidesBuilding };

  const [claudeJsonPreviewOpen, setClaudeJsonPreviewOpen] = useState(false);
  const [claudeExportBuilding, setClaudeExportBuilding] = useState(false);
  const handleDownloadClaudeJson = async () => {
    setClaudeExportBuilding(true);
    try {
      const res = await fetch("/api/download/claude-export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ clientId }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Unknown error" }));
        toast.error("Could not build Claude export: " + (err.error ?? res.statusText));
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      // Try to get filename from Content-Disposition header
      const cd = res.headers.get("Content-Disposition") ?? "";
      const match = cd.match(/filename="([^"]+)"/);
      a.download = match?.[1] ?? `Lifework-${clientName ?? "client"}-Claude.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Claude handoff JSON downloaded.");
    } catch (err: any) {
      toast.error("Could not build Claude export: " + (err?.message ?? "Unknown error"));
    } finally {
      setClaudeExportBuilding(false);
    }
  };

  const setLockMutation = trpc.wowReport.setLock.useMutation({
    onSuccess: (result) => {
      utils.wowReport.get.invalidate({ clientId });
      toast.success(result.locked ? "Report locked — regeneration disabled." : "Report unlocked — you can now regenerate.");
    },
    onError: (err) => toast.error("Could not update lock: " + err.message),
  });

  const printEnhancedViaMutation = trpc.counselor.generateCounsellorViaPdf.useMutation({
    onSuccess: async (result) => {
      try {
        const res = await fetch(result.url);
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `Enhanced-VIA-${clientName ?? "client"}.pdf`;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success("Enhanced VIA Report downloaded.");
      } catch { window.open(result.url, "_blank"); }
    },
    onError: (err) => toast.error("Could not generate Enhanced VIA: " + err.message),
  });

  const printEnhancedOceanMutation = trpc.counselor.generateCounsellorOceanPdf.useMutation({
    onSuccess: async (result) => {
      try {
        const res = await fetch(result.url);
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `Enhanced-OCEAN-${clientName ?? "client"}.pdf`;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success("Enhanced OCEAN Report downloaded.");
      } catch { window.open(result.url, "_blank"); }
    },
    onError: (err) => toast.error("Could not generate Enhanced OCEAN: " + err.message),
  });

  const printCounsellorReportMutation = trpc.counselor.generateCounsellorReportPdf.useMutation({
    onSuccess: async (result) => {
      try {
        const res = await fetch(result.url);
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `Counsellor-Analysis-${clientName ?? "client"}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success("Counsellor Report downloaded.");
      } catch {
        window.open(result.url, "_blank");
      }
    },
    onError: (err) => toast.error("Could not generate Counsellor Report: " + err.message),
  });

  const rebuildPdfMutation = trpc.wowReport.rebuildPdf.useMutation({
    onSuccess: (result) => {
      utils.wowReport.get.invalidate({ clientId });
      toast.success("PDF rebuilt in " + (result.writingStyle === "mark" ? "Mark" : result.writingStyle === "clive-james" ? "Clive James" : result.writingStyle === "michael-lewis" ? "Michael Lewis" : "House") + " style — ready to download.");
    },
    onError: (err) => {
      toast.error("Could not rebuild PDF: " + err.message);
    },
  });

  const sections: WowSections | null = reportData?.sections ?? null;
  const pdfUrl = reportData?.pdfUrl ?? null;
  const isLocked = !!(reportData as any)?.locked;
  // Report exists if we have JSON sections (even without a PDF URL)
  const reportExists = !!(reportData?.exists);
  /** True when the stored PDF was built with a different style than currently selected */
  const pdfStyleMismatch = !!pdfUrl && selectedWritingStyle !== ((reportData as any)?.writingStyle ?? "house") as "house" | "mark" | "clive-james" | "michael-lewis";

  const handleDownloadPdf = async () => {
    if (!pdfUrl) return;
    if (pdfStyleMismatch) {
      rebuildPdfMutation.mutate({ clientId, writingStyle: selectedWritingStyle });
      return;
    }
    // Fetch via same-origin to force a real download (avoids cross-origin anchor block)
    try {
      const res = await fetch(pdfUrl);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `WOW-Report-${clientName ?? "client"}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      // Fallback: open in new tab
      window.open(pdfUrl, "_blank");
    }
    // Auto-lock on first download if not already locked
    if (!reportData?.locked) {
      setLockMutation.mutate({ clientId, locked: true });
    }
  };
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
      {/* Claude JSON preview modal */}
      <ClaudeJsonPreviewModal
        open={claudeJsonPreviewOpen}
        onClose={() => setClaudeJsonPreviewOpen(false)}
        clientId={clientId}
        clientName={clientName}
        onDownload={handleDownloadClaudeJson}
        downloadBuilding={claudeExportBuilding}
      />

      {/* Alistair counsellor panel */}
      <SageCounsellorPanel
        clientId={clientId}
        clientName={clientName}
        open={sageOpen}
        onClose={() => setSageOpen(false)}
      />

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
                tailored career directions and a personal conclusions narrative.
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
                    onClick={() => handleGenerate(true, undefined, selectedWritingStyle)}
                  >
                    <RefreshCw className="w-4 h-4 mr-1" />
                    Try Again
                  </Button>
                </>
              ) : reportExists ? (
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
                  {/* Report type badge */}
                  {reportData?.reportType && reportData.reportType !== "standard" && (
                    <Badge className="text-xs" style={{ backgroundColor: "var(--lw-gold)/20", color: "var(--lw-gold)", borderColor: "var(--lw-gold)/30" }}>
                      {REPORT_TYPE_OPTIONS.find(o => o.value === reportData.reportType)?.label ?? reportData.reportType}
                    </Badge>
                  )}
                  <div className="flex gap-2 flex-wrap justify-end">
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-[var(--lw-gold)]/60 text-[var(--lw-gold)] hover:bg-[var(--lw-gold)]/10 text-xs"
                      onClick={() => printCounsellorReportMutation.mutate({ clientId })}
                      disabled={printCounsellorReportMutation.isPending}
                      title="Generate and download the Counsellor Career Analysis Brief PDF"
                    >
                      {printCounsellorReportMutation.isPending ? (
                        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                      ) : (
                        <FileText className="w-3 h-3 mr-1" />
                      )}
                      {printCounsellorReportMutation.isPending ? "Building…" : "Print Counsellor Report"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-emerald-600/60 text-emerald-700 hover:bg-emerald-50 text-xs"
                      onClick={() => printEnhancedViaMutation.mutate({ clientId })}
                      disabled={printEnhancedViaMutation.isPending}
                      title="Generate and download the Enhanced VIA Character Strengths PDF"
                    >
                      {printEnhancedViaMutation.isPending ? (
                        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                      ) : (
                        <FileText className="w-3 h-3 mr-1" />
                      )}
                      {printEnhancedViaMutation.isPending ? "Building…" : "Print Enhanced VIA"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-blue-600/60 text-blue-700 hover:bg-blue-50 text-xs"
                      onClick={() => printEnhancedOceanMutation.mutate({ clientId })}
                      disabled={printEnhancedOceanMutation.isPending}
                      title="Generate and download the Enhanced OCEAN Personality Analysis PDF"
                    >
                      {printEnhancedOceanMutation.isPending ? (
                        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                      ) : (
                        <FileText className="w-3 h-3 mr-1" />
                      )}
                      {printEnhancedOceanMutation.isPending ? "Building…" : "Print Enhanced OCEAN"}
                    </Button>
                    <Button
                      size="sm"
                      className="bg-[var(--lw-gold)] hover:bg-[var(--lw-gold)]/90 text-[var(--lw-navy)] font-semibold"
                      onClick={handleDownloadPdf}
                      disabled={rebuildPdfMutation.isPending}
                      title={pdfStyleMismatch ? `PDF will be rebuilt in ${selectedWritingStyle === "mark" ? "Mark" : "House"} style before download` : "Download PDF"}
                    >
                      {rebuildPdfMutation.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Download className="w-4 h-4 mr-1" />}
                      {pdfStyleMismatch ? "Rebuild & Download" : "Download PDF"}
                    </Button>
                    <Button
                      size="sm"
                      className="bg-[var(--lw-gold)] hover:bg-[var(--lw-gold)]/90 text-[var(--lw-navy)] font-semibold text-xs"
                      onClick={() => window.open(`/api/report/html/${clientId}`, '_blank')}
                      title="View the full Lifework WOW Report in the brand template — printable to PDF"
                    >
                      <BookOpen className="w-3 h-3 mr-1" />
                      View Report
                    </Button>
                    <Button
                      size="sm"
                      className="bg-[var(--lw-gold)] hover:bg-[var(--lw-gold)]/90 text-[var(--lw-navy)] font-semibold text-xs"
                      onClick={() => {
                        const a = document.createElement('a');
                        a.href = `/api/report/pdf/${clientId}`;
                        a.click();
                      }}
                      title="Download a pixel-perfect branded PDF of this report"
                    >
                      <Download className="w-3 h-3 mr-1" />
                      Download Report PDF
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-[var(--lw-gold)]/60 text-[var(--lw-gold)] hover:bg-[var(--lw-gold)]/10 text-xs"
                      onClick={handleGenerateSlides}
                      disabled={generateSlidesMutation.isPending}
                      title="Generate a branded coaching session PowerPoint deck"
                    >
                      {generateSlidesMutation.isPending ? (
                        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                      ) : (
                        <Presentation className="w-3 h-3 mr-1" />
                      )}
                      {generateSlidesMutation.isPending ? "Building slides…" : "Coaching Slides"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-violet-500/60 text-violet-400 hover:bg-violet-500/10 text-xs"
                      onClick={() => setClaudeJsonPreviewOpen(true)}
                      title="Preview the Claude handoff JSON payload before downloading"
                    >
                      <FileText className="w-3 h-3 mr-1" />
                      Preview JSON
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-violet-500/60 text-violet-400 hover:bg-violet-500/10 text-xs"
                      onClick={handleDownloadClaudeJson}
                      disabled={claudeExportBuilding}
                      title="Download the Claude handoff JSON — upload to Claude to generate the formatted report"
                    >
                      {claudeExportBuilding ? (
                        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                      ) : (
                        <Download className="w-3 h-3 mr-1" />
                      )}
                      {claudeExportBuilding ? "Building JSON…" : "JSON for Claude"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-white/20 text-white hover:bg-white/10 text-xs"
                      onClick={() => setSageOpen(true)}
                      title="Consult Alistair about this client before your session"
                    >
                      <BrainCircuit className="w-3 h-3 mr-1" />
                      Ask Alistair
                    </Button>
                    {isLocked ? (
                      <div className="flex items-center gap-1 text-xs px-2 py-1 rounded border border-amber-400/40 text-amber-300/80 bg-amber-900/20">
                        <Lock className="w-3 h-3" />
                        <span>Locked</span>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-white/20 text-white hover:bg-white/10 text-xs"
                        onClick={() => handleGenerate(true, undefined, selectedWritingStyle)}
                        disabled={isGenerating}
                        title="Regenerate this report using the current report type and writing style"
                      >
                        <RefreshCw className="w-3 h-3 mr-1" />
                        Regenerate
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      className={isLocked
                        ? "border-amber-400/40 text-amber-300/80 hover:bg-amber-900/20 text-xs"
                        : "border-white/20 text-white/60 hover:bg-white/10 text-xs"}
                      onClick={() => setLockMutation.mutate({ clientId, locked: !isLocked })}
                      disabled={setLockMutation.isPending}
                      title={isLocked ? "Unlock: allow regeneration" : "Lock: prevent accidental regeneration"}
                    >
                      {isLocked ? <Unlock className="w-3 h-3 mr-1" /> : <Lock className="w-3 h-3 mr-1" />}
                      {isLocked ? "Unlock" : "Lock"}
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
                    onClick={() => handleGenerate(false, undefined, selectedWritingStyle)}
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

          {/* Report type + writing style selectors */}
          {!isGenerating && (
            <div className="px-6 pb-5 border-t border-white/10 pt-4 space-y-4">
              {/* Report Variant row */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1">
                  <p className="text-xs font-semibold tracking-wide uppercase mb-1" style={{ color: "var(--lw-gold)" }}>Report Variant</p>
                  <p className="text-xs text-white/40">
                    {REPORT_TYPE_OPTIONS.find(o => o.value === selectedReportType)?.description}
                  </p>
                </div>
                <Select
                  value={selectedReportType}
                  onValueChange={(v) => setSelectedReportType(v as WowReportType)}
                  disabled={isGenerating}
                >
                  <SelectTrigger className="w-[220px] bg-white/5 border-white/20 text-white text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {REPORT_TYPE_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {pdfUrl && selectedReportType !== (reportData?.reportType ?? "standard") && (
                  <Button
                    size="sm"
                    className="bg-[var(--lw-gold)] hover:bg-[var(--lw-gold)]/90 text-[var(--lw-navy)] font-semibold whitespace-nowrap"
                    onClick={() => handleGenerate(true, selectedReportType, selectedWritingStyle)}
                    disabled={isGenerating}
                  >
                    <RefreshCw className="w-3 h-3 mr-1" />
                    Regenerate as {REPORT_TYPE_OPTIONS.find(o => o.value === selectedReportType)?.label}
                  </Button>
                )}
              </div>
              {/* Writing Style row */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1">
                  <p className="text-xs font-semibold tracking-wide uppercase mb-1" style={{ color: "var(--lw-gold)" }}>Writing Style</p>
                  <p className="text-xs text-white/40">
                    {selectedWritingStyle === "mark"
                      ? "Mark Brandon — conversational, dry British wit, punchy sentences, no jargon."
                      : selectedWritingStyle === "clive-james"
                      ? "Clive James — precise, ironic, warm underneath; epigrammatic closes, evidence-led wit."
                      : selectedWritingStyle === "michael-lewis"
                      ? "Michael Lewis — cinematic openings, conventional-wisdom-vs-data, short declarative revelations."
                      : "House Style — direct, evidence-led, second person, structured with subheadings."}
                  </p>
                </div>
                <Select
                  value={selectedWritingStyle}
                  onValueChange={(v) => setSelectedWritingStyle(v as "house" | "mark" | "clive-james" | "michael-lewis")}
                  disabled={isGenerating}
                >
                  <SelectTrigger className="w-[220px] bg-white/5 border-white/20 text-white text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="house">House Style</SelectItem>
                    <SelectItem value="mark">Mark</SelectItem>
                    <SelectItem value="clive-james">Clive James</SelectItem>
                    <SelectItem value="michael-lewis">Michael Lewis</SelectItem>
                  </SelectContent>
                </Select>
                {pdfStyleMismatch && (
                  <div className="flex flex-col gap-1">
                    <Button
                      size="sm"
                      className="bg-[var(--lw-gold)] hover:bg-[var(--lw-gold)]/90 text-[var(--lw-navy)] font-semibold whitespace-nowrap"
                      onClick={() => rebuildPdfMutation.mutate({ clientId, writingStyle: selectedWritingStyle })}
                      disabled={rebuildPdfMutation.isPending || isGenerating}
                    >
                      {rebuildPdfMutation.isPending ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <RefreshCw className="w-3 h-3 mr-1" />}
                      Rebuild PDF in {selectedWritingStyle === "mark" ? "Mark" : selectedWritingStyle === "clive-james" ? "Clive James" : selectedWritingStyle === "michael-lewis" ? "Michael Lewis" : "House"} Style
                    </Button>
                    <p className="text-xs text-white/40">Rebuilds PDF from current sections (fast — no LLM)</p>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-white/40 hover:text-white/70 text-xs h-6 px-1"
                      onClick={() => handleGenerate(true, undefined, selectedWritingStyle)}
                      disabled={isGenerating}
                    >
                      <Sparkles className="w-3 h-3 mr-1" />
                      Full regenerate (re-run LLM)
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}

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
              {reportData.error.startsWith("Cannot generate WOW Report") ? (
                <div className="bg-amber-950/40 border border-amber-500/30 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                    <p className="text-sm font-semibold text-amber-300">Report cannot be generated yet</p>
                  </div>
                  <p className="text-xs text-amber-200/60 mb-3">The following items must be completed before the WOW Report can be generated:</p>
                  <ul className="space-y-1.5">
                    {reportData.error
                      .split("\n")
                      .filter((line: string) => line.startsWith("\u2022"))
                      .map((line: string, i: number) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-amber-100/80">
                          <span className="text-amber-400 flex-shrink-0 mt-0.5">•</span>
                          <span>{line.replace(/^\u2022\s*/, "")}</span>
                        </li>
                      ))}
                  </ul>
                </div>
              ) : (
                <p className="text-xs text-red-400/80 font-mono bg-red-950/30 rounded p-2">
                  {reportData.error}
                </p>
              )}
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

              // Variant-aware label overrides
              const activeType = reportData?.reportType ?? "standard";
              let displayLabel = meta.label;
              let displayDescription = meta.description;
              if (activeType === "retirement") {
                if (meta.key === "careerDirections") {
                  displayLabel = "What To Do With What You Know";
                  displayDescription = "Three directions for the next chapter — purposeful deployment of a lifetime of capability.";
                } else if (meta.key === "developmentEdge") {
                  displayLabel = "What To Watch";
                  displayDescription = "Patterns and tendencies that, if unexamined, could limit the quality of the next chapter.";
                }
              } else if (activeType === "student") {
                if (meta.key === "careerDirections") {
                  displayLabel = "Where You Are Headed";
                  displayDescription = "Three career directions grounded in what you have already demonstrated — not abstract potential.";
                } else if (meta.key === "developmentEdge") {
                  displayLabel = "What To Build First";
                  displayDescription = "The habits and capabilities to develop in the first three years that will shape the rest of your career.";
                }
              } else if (activeType === "job_returner") {
                if (meta.key === "careerDirections") {
                  displayLabel = "What You Bring Back";
                  displayDescription = "Three re-entry directions that acknowledge both what remains fully current and what the break has added.";
                } else if (meta.key === "developmentEdge") {
                  displayLabel = "What To Rebuild";
                  displayDescription = "The specific priorities for re-establishing confidence, credibility, and momentum during the return.";
                }
              }

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
                          <h3 className="text-sm font-semibold text-foreground">{displayLabel}</h3>
                          {!isExpanded && (
                            <p className="text-xs text-muted-foreground mt-0.5">{displayDescription}</p>
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
                      {/* Top-5 VIA strength cards — shown only for the Character Strengths section */}
                      {meta.key === "viaSection" && sections.viaRanked && sections.viaRanked.length > 0 && (() => {
                        const top5 = sections.viaRanked!.slice(0, 5);
                        const maxScore = top5[0]?.score ?? 25;
                        return (
                          <div className="flex flex-col gap-3 mb-6">
                            {top5.map((s, i) => {
                              const meta2 = VIA_STRENGTHS.find(v => v.id === s.strengthId);
                              const pct = Math.round((s.score / maxScore) * 100);
                              return (
                                <div
                                  key={s.strengthId}
                                  className="rounded-lg p-4"
                                  style={{ backgroundColor: "var(--lw-cream)", border: "1px solid var(--lw-gold)" }}
                                >
                                  <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-3">
                                      <span
                                        className="text-lg font-bold w-6 text-center"
                                        style={{ color: "var(--lw-gold)" }}
                                      >
                                        {i + 1}
                                      </span>
                                      <span className="font-bold text-sm" style={{ color: "var(--lw-navy)" }}>
                                        {meta2?.name ?? s.name}
                                      </span>
                                      {meta2?.virtue && (
                                        <span className="text-xs text-muted-foreground">({meta2.virtue})</span>
                                      )}
                                    </div>
                                    <span className="text-sm font-semibold" style={{ color: "var(--lw-gold)" }}>
                                      {s.score}/{maxScore}
                                    </span>
                                  </div>
                                  <div className="w-full rounded-full h-1.5 mb-2" style={{ backgroundColor: "#e5ddd0" }}>
                                    <div
                                      className="h-1.5 rounded-full"
                                      style={{ width: `${pct}%`, backgroundColor: "var(--lw-gold)" }}
                                    />
                                  </div>
                                  {meta2?.description && (
                                    <p className="text-xs text-muted-foreground leading-relaxed">{meta2.description}</p>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()}

                      {/* Behavioural Style — render full InsightsMapping panel instead of AI prose */}
                      {meta.key === "behaviouralStyle" && sections.domainScores ? (
                        <InsightsMapping
                          extraversion={sections.domainScores["E"] ?? 50}
                          agreeableness={sections.domainScores["A"] ?? 50}
                          openness={sections.domainScores["O"] ?? 50}
                          conscientiousness={sections.domainScores["C"] ?? 50}
                        />
                      ) : (
                        <div className="prose prose-sm max-w-none text-foreground leading-relaxed [&_h1]:font-serif [&_h1]:text-[var(--lw-navy)] [&_h2]:font-serif [&_h2]:text-[var(--lw-navy)] [&_h3]:font-serif [&_h3]:text-[var(--lw-navy)] [&_strong]:text-foreground [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 wow-report-content">
                          <Streamdown>{content}</Streamdown>
                        </div>
                      )}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>

          {/* Bottom download + rewrite CTA */}
          {reportExists && (
            <Card className="border-[var(--lw-gold)]/20 bg-[var(--lw-cream)]">
              <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-[var(--lw-navy)]">
                    Ready to share with {clientName ?? "the client"}?
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {pdfUrl
                      ? "Download the branded PDF — suitable for printing, binding, and posting."
                      : "PDF not yet rendered — click Rebuild PDF to generate it from stored sections."}
                  </p>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {pdfUrl ? (
                    <Button
                      className="bg-[var(--lw-navy)] hover:bg-[var(--lw-navy)]/90 text-white"
                      onClick={handleDownloadPdf}
                      disabled={rebuildPdfMutation.isPending}
                      title={pdfStyleMismatch ? `PDF will be rebuilt in ${selectedWritingStyle === "mark" ? "Mark" : "House"} style before download` : "Download PDF"}
                    >
                      {rebuildPdfMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
                      {pdfStyleMismatch ? "Rebuild & Download PDF" : "Download PDF"}
                    </Button>
                  ) : (
                    <Button
                      className="bg-[var(--lw-navy)] hover:bg-[var(--lw-navy)]/90 text-white"
                      onClick={() => rebuildPdfMutation.mutate({ clientId, writingStyle: selectedWritingStyle })}
                      disabled={rebuildPdfMutation.isPending}
                    >
                      {rebuildPdfMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                      Rebuild PDF
                    </Button>
                  )}
                  {!isLocked && (
                    <Button
                      variant="outline"
                      className="border-[var(--lw-navy)]/30 text-[var(--lw-navy)] hover:bg-[var(--lw-navy)]/5 text-sm"
                      onClick={() => handleGenerate(true, undefined, selectedWritingStyle)}
                      disabled={isGenerating}
                      title="Regenerate this report in the current writing style"
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Rewrite in New Style
                    </Button>
                  )}
                </div>
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
              onClick={() => handleGenerate(false, undefined, selectedWritingStyle)}
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
