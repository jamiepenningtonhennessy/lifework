/**
 * RoleDecoderTab
 *
 * Counsellor-only component. Paste a job description; receive a three-section
 * narrative that decodes the role against the client's alive pattern.
 *
 * Sections:
 *   1. What the role is actually asking for
 *   2. Where the client's pattern connects
 *   3. What the client needs to say in an interview
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Search, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { Streamdown } from "streamdown";

interface RoleDecoderTabProps {
  clientId: number;
  clientName?: string;
}

interface DecoderResult {
  roleCore: string;
  patternConnection: string;
  interviewLanguage: string;
}

// ─── Section card ─────────────────────────────────────────────────────────────
function SectionCard({
  number,
  title,
  subtitle,
  content,
  accentColour,
}: {
  number: string;
  title: string;
  subtitle: string;
  content: string;
  accentColour: string;
}) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div
      className="rounded-none border border-border bg-card overflow-hidden"
      style={{ borderTopColor: accentColour, borderTopWidth: "3px" }}
    >
      {/* Header */}
      <button
        className="w-full flex items-start justify-between gap-4 px-6 py-4 text-left hover:bg-muted/30 transition-colors"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
      >
        <div className="flex items-start gap-4 min-w-0">
          <span
            className="font-serif text-2xl font-bold shrink-0 leading-none mt-0.5"
            style={{ color: accentColour }}
          >
            {number}
          </span>
          <div className="min-w-0">
            <p className="font-serif font-semibold text-foreground text-base leading-snug">{title}</p>
            <p className="text-muted-foreground text-sm mt-0.5 leading-snug">{subtitle}</p>
          </div>
        </div>
        {expanded
          ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0 mt-1" />
          : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0 mt-1" />}
      </button>

      {/* Content */}
      {expanded && (
        <div className="px-6 pb-6 pt-1 border-t border-border/50">
          <div className="prose prose-sm max-w-none text-foreground/90 font-serif leading-relaxed [&_p]:mb-3 [&_p:last-child]:mb-0">
            <Streamdown>{content}</Streamdown>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function RoleDecoderTab({ clientId, clientName }: RoleDecoderTabProps) {
  const [jobDescription, setJobDescription] = useState("");
  const [result, setResult] = useState<DecoderResult | null>(null);

  const decodeMutation = trpc.roleDecoder.decode.useMutation({
    onSuccess: (data) => {
      setResult(data);
    },
    onError: (err) => {
      toast.error(err.message ?? "Something went wrong. Please try again.");
    },
  });

  const handleDecode = () => {
    if (jobDescription.trim().length < 50) {
      toast.error("Please paste the full job description (at least 50 characters).");
      return;
    }
    setResult(null);
    decodeMutation.mutate({ clientId, jobDescription: jobDescription.trim() });
  };

  const handleClear = () => {
    setJobDescription("");
    setResult(null);
    decodeMutation.reset();
  };

  const isLoading = decodeMutation.isPending;
  const firstName = clientName ?? "this client";

  return (
    <div className="py-6 space-y-6">
      {/* Intro */}
      <div className="space-y-1">
        <h2 className="font-serif text-xl font-semibold text-foreground">Role Decoder</h2>
        <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">
          Paste a job description below. The system will decode what the role is actually asking
          for beneath the HR language, show where {firstName}&apos;s pattern connects, and give
          you the specific language {firstName} would need in an interview to make that connection
          visible.
        </p>
      </div>

      {/* Input area */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-foreground" htmlFor="jd-input">
          Job description
        </label>
        <Textarea
          id="jd-input"
          value={jobDescription}
          onChange={(e) => setJobDescription(e.target.value)}
          placeholder="Paste the full job description here — title, responsibilities, requirements, about the organisation…"
          className="min-h-[220px] font-mono text-sm resize-y rounded-none"
          disabled={isLoading}
        />
        <div className="flex items-center gap-3">
          <Button
            onClick={handleDecode}
            disabled={isLoading || jobDescription.trim().length < 50}
            className="gap-2 rounded-none bg-[var(--lw-navy)] hover:bg-[var(--lw-navy)]/90 text-white"
          >
            {isLoading
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Decoding…</>
              : <><Search className="w-4 h-4" /> Decode this role</>}
          </Button>
          {(result || jobDescription) && !isLoading && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClear}
              className="text-muted-foreground hover:text-foreground"
            >
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center gap-3 py-8 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin shrink-0" />
          <span className="text-sm">
            Reading the job description and {firstName}&apos;s profile… this takes about 20–30 seconds.
          </span>
        </div>
      )}

      {/* Results */}
      {result && !isLoading && (
        <div className="space-y-4">
          {/* Divider */}
          <div className="flex items-center gap-3 py-2">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground uppercase tracking-widest font-medium">
              Decoded
            </span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <SectionCard
            number="01"
            title="What this role is actually asking for"
            subtitle="Beneath the language of the job description"
            content={result.roleCore}
            accentColour="var(--lw-navy)"
          />

          <SectionCard
            number="02"
            title={`Where ${firstName}'s pattern connects`}
            subtitle="The alignment between the role's underlying needs and the client's alive pattern"
            content={result.patternConnection}
            accentColour="var(--lw-gold)"
          />

          <SectionCard
            number="03"
            title="What to say in the interview"
            subtitle="The specific language that makes the connection visible to a hiring manager"
            content={result.interviewLanguage}
            accentColour="var(--lw-navy)"
          />

          <p className="text-xs text-muted-foreground pt-2">
            This analysis is generated from {firstName}&apos;s Lifework profile data. Review before
            sharing — the counsellor&apos;s judgement remains the primary lens.
          </p>
        </div>
      )}
    </div>
  );
}
