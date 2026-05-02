/**
 * LinkedInRewriterTab.tsx
 *
 * Counsellor-only tab that generates a LinkedIn profile rewrite from the
 * client's Lifework data.
 *
 * Outputs:
 *   - Headline (220 chars)
 *   - About section (3 paragraphs, first person)
 *   - Experience framing guide (per-role notes in markdown)
 *
 * Optional: paste the client's existing LinkedIn profile for a polish pass.
 */

import { useState } from "react";
import { Linkedin, Loader2, Copy, Check, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Streamdown } from "streamdown";

interface LinkedInRewriterTabProps {
  clientId: number;
  clientName?: string;
}

// ─── Copy-to-clipboard button ─────────────────────────────────────────────────

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success(`${label} copied to clipboard`);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy to clipboard");
    }
  };
  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
      title={`Copy ${label}`}
    >
      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

// ─── Output card ──────────────────────────────────────────────────────────────

interface OutputCardProps {
  number: string;
  title: string;
  subtitle: string;
  content: string;
  accentColour: string;
  isMarkdown?: boolean;
  charCount?: number;
}

function OutputCard({ number, title, subtitle, content, accentColour, isMarkdown, charCount }: OutputCardProps) {
  return (
    <div className="border border-border rounded-none overflow-hidden">
      {/* Header */}
      <div
        className="px-4 py-3 flex items-start justify-between gap-4"
        style={{ borderLeft: `3px solid ${accentColour}` }}
      >
        <div className="flex items-start gap-3 min-w-0">
          <span
            className="text-xs font-mono font-semibold shrink-0 mt-0.5"
            style={{ color: accentColour }}
          >
            {number}
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground leading-tight">{title}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {charCount !== undefined && (
            <span className={`text-xs font-mono ${charCount > 220 ? "text-destructive" : "text-muted-foreground"}`}>
              {charCount}/220
            </span>
          )}
          <CopyButton text={content} label={title} />
        </div>
      </div>
      {/* Content */}
      <div className="px-4 py-4 bg-muted/20 border-t border-border">
        {isMarkdown ? (
          <div className="prose prose-sm max-w-none text-foreground [&_h2]:text-sm [&_h2]:font-semibold [&_h2]:mt-4 [&_h2]:mb-1 [&_p]:text-sm [&_p]:leading-relaxed [&_ul]:text-sm [&_li]:leading-relaxed [&_strong]:font-semibold">
            <Streamdown>{content}</Streamdown>
          </div>
        ) : (
          <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{content}</p>
        )}
      </div>
    </div>
  );
}

// ─── Collapsible existing profile input ──────────────────────────────────────

function ExistingProfileInput({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-border rounded-none">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <span className="font-medium">
          Optional: paste existing LinkedIn profile for a polish pass
        </span>
        {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>
      {open && (
        <div className="px-4 pb-4 border-t border-border">
          <p className="text-xs text-muted-foreground mt-3 mb-2 leading-relaxed">
            If the client already has a LinkedIn profile, paste it here. The system will preserve
            any accurate facts and achievements, but reframe the language to express the Lifework
            pattern. Leave blank to generate from scratch.
          </p>
          <Textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Paste the client's existing LinkedIn About section, headline, and/or Experience entries here…"
            className="min-h-[160px] font-mono text-xs resize-y rounded-none"
            disabled={disabled}
          />
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface RewriteResult {
  headline: string;
  aboutSection: string;
  experienceGuide: string;
}

export default function LinkedInRewriterTab({ clientId, clientName }: LinkedInRewriterTabProps) {
  const [existingProfile, setExistingProfile] = useState("");
  const [result, setResult] = useState<RewriteResult | null>(null);

  const generateMutation = trpc.linkedInRewriter.generate.useMutation({
    onSuccess: (data) => {
      setResult(data);
    },
    onError: (err) => {
      toast.error(err.message ?? "Something went wrong. Please try again.");
    },
  });

  const handleGenerate = () => {
    setResult(null);
    generateMutation.mutate({
      clientId,
      existingProfile: existingProfile.trim() || undefined,
    });
  };

  const handleClear = () => {
    setExistingProfile("");
    setResult(null);
    generateMutation.reset();
  };

  const handleCopyAll = async () => {
    if (!result) return;
    const allText = [
      "HEADLINE\n" + result.headline,
      "\nABOUT\n" + result.aboutSection,
      "\nEXPERIENCE FRAMING GUIDE\n" + result.experienceGuide,
    ].join("\n");
    try {
      await navigator.clipboard.writeText(allText);
      toast.success("All sections copied to clipboard");
    } catch {
      toast.error("Could not copy to clipboard");
    }
  };

  const isLoading = generateMutation.isPending;
  const firstName = clientName ?? "this client";

  return (
    <div className="py-6 space-y-6">
      {/* Intro */}
      <div className="space-y-1">
        <h2 className="font-serif text-xl font-semibold text-foreground">LinkedIn Rewriter</h2>
        <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">
          Generate a LinkedIn profile that expresses who {firstName} genuinely is — drawn from
          their Lifework data. The system produces a positioning headline, a three-paragraph About
          section in first person, and a per-role framing guide for the Experience section.
        </p>
      </div>

      {/* Optional existing profile */}
      <ExistingProfileInput
        value={existingProfile}
        onChange={setExistingProfile}
        disabled={isLoading}
      />

      {/* Generate button */}
      <div className="flex items-center gap-3">
        <Button
          onClick={handleGenerate}
          disabled={isLoading}
          className="gap-2 rounded-none bg-[var(--lw-navy)] hover:bg-[var(--lw-navy)]/90 text-white"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Generating…
            </>
          ) : (
            <>
              <Linkedin className="w-4 h-4" /> Generate LinkedIn profile
            </>
          )}
        </Button>
        {result && !isLoading && (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyAll}
              className="gap-1.5 rounded-none"
            >
              <Copy className="w-3.5 h-3.5" /> Copy all
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClear}
              className="text-muted-foreground hover:text-foreground"
            >
              Clear
            </Button>
          </>
        )}
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center gap-3 py-8 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin shrink-0" />
          <span className="text-sm">
            Reading {firstName}&apos;s Lifework profile and drafting the LinkedIn copy… this takes
            about 20–30 seconds.
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
              Generated
            </span>
            <div className="h-px flex-1 bg-border" />
          </div>

          {/* Headline */}
          <OutputCard
            number="01"
            title="Headline"
            subtitle="Positioning statement — 220 characters max, appears beneath the client's name"
            content={result.headline}
            accentColour="var(--lw-navy)"
            charCount={result.headline.length}
          />

          {/* About */}
          <OutputCard
            number="02"
            title="About section"
            subtitle="Three paragraphs in first person — pattern, strengths in combination, forward direction"
            content={result.aboutSection}
            accentColour="var(--lw-gold)"
          />

          {/* Experience guide */}
          <OutputCard
            number="03"
            title="Experience framing guide"
            subtitle="Per-role notes on what to foreground, lead bullet starters, and what to avoid"
            content={result.experienceGuide}
            accentColour="var(--lw-navy)"
            isMarkdown
          />

          <p className="text-xs text-muted-foreground pt-2">
            Generated from {firstName}&apos;s Lifework profile data. Review before sharing —
            the counsellor&apos;s judgement remains the primary lens. The client should adapt the
            Experience bullets to their own voice and verify all facts.
          </p>
        </div>
      )}
    </div>
  );
}
