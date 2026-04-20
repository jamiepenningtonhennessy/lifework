/**
 * ClaudeJsonPreviewModal
 *
 * Displays the Claude handoff JSON payload for a client in a readable,
 * collapsible, syntax-highlighted viewer.  Each top-level key is shown
 * as a collapsible section.  A "Copy all" button copies the full JSON
 * to the clipboard.
 */

import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ChevronDown,
  ChevronRight,
  Copy,
  Check,
  Download,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";

// ─── Syntax colouring ────────────────────────────────────────────────────────

/**
 * Very lightweight JSON syntax highlighter — returns an array of
 * { text, cls } tokens that we render as <span> elements.
 */
function tokenise(json: string): Array<{ text: string; cls: string }> {
  const tokens: Array<{ text: string; cls: string }> = [];
  // Regex matches: strings, numbers, booleans, null, punctuation
  const re =
    /("(?:[^"\\]|\\.)*")\s*(:)?|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|(\btrue\b|\bfalse\b|\bnull\b)|([{}\[\],])/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(json)) !== null) {
    if (m.index > last) {
      tokens.push({ text: json.slice(last, m.index), cls: "text-foreground/60" });
    }
    if (m[1] !== undefined) {
      // string — key or value?
      if (m[2] !== undefined) {
        // followed by colon → key
        tokens.push({ text: m[1], cls: "text-[var(--lw-gold)]" });
        tokens.push({ text: ":", cls: "text-foreground/60" });
      } else {
        tokens.push({ text: m[1], cls: "text-emerald-400" });
      }
    } else if (m[3] !== undefined) {
      tokens.push({ text: m[3], cls: "text-sky-400" });
    } else if (m[4] !== undefined) {
      tokens.push({ text: m[4], cls: "text-violet-400" });
    } else if (m[5] !== undefined) {
      tokens.push({ text: m[5], cls: "text-foreground/50" });
    }
    last = re.lastIndex;
  }
  if (last < json.length) {
    tokens.push({ text: json.slice(last), cls: "text-foreground/60" });
  }
  return tokens;
}

// ─── Section row ─────────────────────────────────────────────────────────────

function SectionRow({
  label,
  value,
}: {
  label: string;
  value: unknown;
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const pretty = useMemo(() => JSON.stringify(value, null, 2), [value]);
  const tokens = useMemo(() => tokenise(pretty), [pretty]);

  const lineCount = pretty.split("\n").length;
  const charCount = pretty.length;

  const handleCopy = () => {
    navigator.clipboard.writeText(pretty).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
      toast.success(`"${label}" copied to clipboard.`);
    });
  };

  return (
    <div className="border border-white/10 rounded-lg overflow-hidden">
      {/* Header row */}
      <button
        className="w-full flex items-center gap-3 px-4 py-3 bg-white/5 hover:bg-white/10 transition-colors text-left"
        onClick={() => setOpen(o => !o)}
      >
        {open ? (
          <ChevronDown className="w-4 h-4 text-[var(--lw-gold)] shrink-0" />
        ) : (
          <ChevronRight className="w-4 h-4 text-[var(--lw-gold)] shrink-0" />
        )}
        <span className="font-mono text-sm font-semibold text-[var(--lw-gold)] flex-1">
          {label}
        </span>
        <Badge
          variant="outline"
          className="text-xs border-white/20 text-white/40 font-mono hidden sm:flex"
        >
          {lineCount} lines
        </Badge>
        <Badge
          variant="outline"
          className="text-xs border-white/20 text-white/40 font-mono"
        >
          {charCount > 1024
            ? `${(charCount / 1024).toFixed(1)} KB`
            : `${charCount} B`}
        </Badge>
        <button
          className="ml-2 p-1 rounded hover:bg-white/10 text-white/40 hover:text-white transition-colors"
          onClick={e => {
            e.stopPropagation();
            handleCopy();
          }}
          title={`Copy ${label}`}
        >
          {copied ? (
            <Check className="w-3.5 h-3.5 text-emerald-400" />
          ) : (
            <Copy className="w-3.5 h-3.5" />
          )}
        </button>
      </button>

      {/* Content */}
      {open && (
        <div className="bg-[#0d1117] border-t border-white/10">
          <pre className="p-4 text-xs font-mono leading-relaxed overflow-x-auto whitespace-pre">
            {tokens.map((t, i) => (
              <span key={i} className={t.cls}>
                {t.text}
              </span>
            ))}
          </pre>
        </div>
      )}
    </div>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────

interface ClaudeJsonPreviewModalProps {
  open: boolean;
  onClose: () => void;
  clientId: number;
  clientName?: string;
  /** Called when user clicks the Download button inside the modal */
  onDownload: () => void;
  downloadBuilding: boolean;
}

export default function ClaudeJsonPreviewModal({
  open,
  onClose,
  clientId,
  clientName,
  onDownload,
  downloadBuilding,
}: ClaudeJsonPreviewModalProps) {
  const [allCopied, setAllCopied] = useState(false);

  const { data, isLoading, error } = trpc.claudeExport.getJson.useQuery(
    { clientId },
    { enabled: open, staleTime: 60_000 }
  );

  const payload = data?.payload as Record<string, unknown> | undefined;

  const fullJson = useMemo(
    () => (payload ? JSON.stringify(payload, null, 2) : ""),
    [payload]
  );

  const topLevelKeys = useMemo(
    () => (payload ? Object.keys(payload) : []),
    [payload]
  );

  const totalSize = fullJson.length;

  const handleCopyAll = () => {
    if (!fullJson) return;
    navigator.clipboard.writeText(fullJson).then(() => {
      setAllCopied(true);
      setTimeout(() => setAllCopied(false), 2000);
      toast.success("Full JSON copied to clipboard.");
    });
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-4xl w-full bg-[var(--lw-navy)] border-[var(--lw-gold)]/30 text-white p-0 gap-0 flex flex-col max-h-[90vh]">
        {/* Header */}
        <DialogHeader className="px-6 pt-5 pb-4 border-b border-white/10 shrink-0">
          <div className="flex items-center justify-between gap-4">
            <div>
              <DialogTitle className="text-lg font-serif font-bold text-white">
                Claude Handoff JSON
              </DialogTitle>
              <p className="text-xs text-white/50 mt-0.5">
                {clientName ? `${clientName} · ` : ""}
                {topLevelKeys.length > 0 && (
                  <>
                    {topLevelKeys.length} top-level keys ·{" "}
                    {totalSize > 1024
                      ? `${(totalSize / 1024).toFixed(1)} KB`
                      : `${totalSize} B`}
                  </>
                )}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                size="sm"
                variant="outline"
                className="border-white/20 text-white/70 hover:bg-white/10 text-xs"
                onClick={handleCopyAll}
                disabled={!payload || isLoading}
              >
                {allCopied ? (
                  <Check className="w-3.5 h-3.5 mr-1 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5 mr-1" />
                )}
                {allCopied ? "Copied!" : "Copy all"}
              </Button>
              <Button
                size="sm"
                className="bg-[var(--lw-gold)] hover:bg-[var(--lw-gold)]/90 text-[var(--lw-navy)] font-semibold text-xs"
                onClick={onDownload}
                disabled={downloadBuilding || !payload}
              >
                {downloadBuilding ? (
                  <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                ) : (
                  <Download className="w-3.5 h-3.5 mr-1" />
                )}
                {downloadBuilding ? "Building…" : "Download .json"}
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Body */}
        <ScrollArea className="flex-1 min-h-0">
          <div className="p-6 space-y-2">
            {isLoading && (
              <div className="flex items-center justify-center py-16 gap-3 text-white/50">
                <Loader2 className="w-5 h-5 animate-spin" style={{ color: "var(--lw-gold)" }} />
                <span className="text-sm">Building payload…</span>
              </div>
            )}

            {error && (
              <div className="flex items-start gap-3 rounded-lg border border-red-500/30 bg-red-950/30 p-4 text-sm text-red-300">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium">Could not load JSON</p>
                  <p className="text-red-400/80 mt-0.5">{error.message}</p>
                </div>
              </div>
            )}

            {payload &&
              topLevelKeys.map(key => (
                <SectionRow key={key} label={key} value={payload[key]} />
              ))}
          </div>
        </ScrollArea>

        {/* Footer hint */}
        {payload && (
          <div className="px-6 py-3 border-t border-white/10 shrink-0">
            <p className="text-xs text-white/30 text-center">
              Upload the downloaded .json file to Claude together with the report template prompt.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
