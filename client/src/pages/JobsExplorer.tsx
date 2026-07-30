/**
 * Jobs Explorer — client-facing page
 *
 * Four tabs:
 *   1. Companies to Watch  — the personalised monitor list
 *   2. Open Roles          — scored live vacancies
 *   3. Early Signals       — latent departure / vacancy signals
 *   4. Saved               — jobs the client has bookmarked
 *
 * Plus a collapsible Preferences form (client constraints).
 */

import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Building2,
  Briefcase,
  Newspaper,
  Bookmark,
  BookmarkCheck,
  ExternalLink,
  Settings2,
  Loader2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Star,
  TrendingUp,
  MapPin,
  Clock,
  RefreshCw,
  FileText,
  Upload,
  Copy,
  Check,
  Wand2,
  Eye,
} from "lucide-react";

// ─── Score badge ─────────────────────────────────────────────────────────────

function ScoreBadge({ score }: { score: number | null }) {
  if (score === null) return null;
  const colour =
    score >= 8 ? "bg-emerald-100 text-emerald-800" :
    score >= 6 ? "bg-amber-100 text-amber-800" :
    "bg-slate-100 text-slate-600";
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-full ${colour}`}>
      <Star className="w-3 h-3" />
      {score}/10
    </span>
  );
}

// ─── Relevance badge ──────────────────────────────────────────────────────────

function RelevanceBadge({ relevance }: { relevance: number | null }) {
  if (relevance === null) return null;
  const labels = ["Low", "Possible", "On-thesis", "Bullseye"];
  const colours = [
    "bg-slate-100 text-slate-500",
    "bg-blue-100 text-blue-700",
    "bg-amber-100 text-amber-700",
    "bg-emerald-100 text-emerald-800",
  ];
  const idx = Math.min(Math.max(relevance, 0), 3);
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-full ${colours[idx]}`}>
      <TrendingUp className="w-3 h-3" />
      {labels[idx]}
    </span>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ icon: Icon, title, body }: { icon: React.ElementType; title: string; body: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
      <div className="w-12 h-12 rounded-full bg-[var(--lw-cream)] flex items-center justify-center">
        <Icon className="w-6 h-6 text-[var(--lw-navy)] opacity-40" />
      </div>
      <p className="font-serif text-[var(--lw-navy)] font-semibold">{title}</p>
      <p className="text-sm text-muted-foreground max-w-xs">{body}</p>
    </div>
  );
}

// ─── Save-job dialog ──────────────────────────────────────────────────────────

function SaveJobDialog({
  listingId,
  signalId,
  title,
  organisation,
  onSaved,
}: {
  listingId?: number;
  signalId?: number;
  title: string;
  organisation?: string;
  onSaved: () => void;
}) {
  const [notes, setNotes] = useState("");
  const [open, setOpen] = useState(false);
  const saveJob = trpc.jobs.saveJob.useMutation({
    onSuccess: () => { onSaved(); setOpen(false); },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1.5 text-xs">
          <Bookmark className="w-3.5 h-3.5" /> Save
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-serif text-[var(--lw-navy)]">Save this opportunity</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-sm font-medium">{title}</p>
          {organisation && <p className="text-xs text-muted-foreground">{organisation}</p>}
          <div className="space-y-1">
            <Label className="text-xs">Notes (optional)</Label>
            <Textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Why this interests you, who to contact, next steps…"
              className="text-sm"
            />
          </div>
          <Button
            className="w-full bg-[var(--lw-navy)] text-white hover:opacity-90"
            disabled={saveJob.isPending}
            onClick={() =>
              saveJob.mutate({ listingId, signalId, title, organisation, notes: notes || undefined })
            }
          >
            {saveJob.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save opportunity"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Tailor Application Modal ────────────────────────────────────────────────

function TailorApplicationModal({
  listingId,
  listingTitle,
  companyName,
}: {
  listingId: number;
  listingTitle: string;
  companyName: string;
}) {
  const [open, setOpen] = useState(false);
  const [copiedCv, setCopiedCv] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const { data: existingCv } = trpc.jobs.getClientCv.useQuery({});
  const uploadCv = trpc.jobs.uploadCv.useMutation();
  const uploadCoverLetter = trpc.jobs.uploadCoverLetter.useMutation();
  const tailor = trpc.jobs.tailorApplication.useMutation();
  const utils = trpc.useUtils();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowedTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    if (!allowedTypes.includes(file.type)) {
      alert("Please upload a PDF or Word document (.pdf or .docx)");
      return;
    }
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const base64 = (ev.target?.result as string).split(",")[1];
      await uploadCv.mutateAsync({
        fileBase64: base64,
        fileName: file.name,
        mimeType: file.type as "application/pdf" | "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      });
      utils.jobs.getClientCv.invalidate();
    };
    reader.readAsDataURL(file);
  };

  const handleCoverLetterChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowedTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    if (!allowedTypes.includes(file.type)) {
      alert("Please upload a PDF or Word document (.pdf or .docx)");
      return;
    }
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const base64 = (ev.target?.result as string).split(",")[1];
      await uploadCoverLetter.mutateAsync({
        fileBase64: base64,
        fileName: file.name,
        mimeType: file.type as "application/pdf" | "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      });
      utils.jobs.getClientCv.invalidate();
    };
    reader.readAsDataURL(file);
  };

  const handleTailor = () => {
    tailor.mutate({ listingId });
  };

  const copyToClipboard = async (text: string, type: "cv" | "email") => {
    await navigator.clipboard.writeText(text);
    if (type === "cv") { setCopiedCv(true); setTimeout(() => setCopiedCv(false), 2000); }
    else { setCopiedEmail(true); setTimeout(() => setCopiedEmail(false), 2000); }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) tailor.reset(); }}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1.5 text-xs border-[var(--lw-gold)] text-[var(--lw-navy)] hover:bg-[var(--lw-gold)] hover:bg-opacity-10">
          <Wand2 className="w-3.5 h-3.5" /> Tailor
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif text-[var(--lw-navy)] text-lg">
            Tailor your application
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            {listingTitle} &mdash; {companyName}
          </p>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* Step 1: CV upload */}
          <div className="border border-[var(--lw-navy)] border-opacity-15 rounded p-4 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-[var(--lw-navy)] text-white flex items-center justify-center text-xs font-bold flex-shrink-0">1</div>
              <p className="text-sm font-semibold text-[var(--lw-navy)]">Your CV</p>
            </div>
            {existingCv ? (
              <div className="flex items-center gap-3">
                <FileText className="w-4 h-4 text-[var(--lw-gold)] flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{existingCv.originalName}</p>
                  <p className="text-xs text-muted-foreground">
                    Uploaded {new Date(existingCv.uploadedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                </div>
                <label className="cursor-pointer">
                  <input type="file" accept=".pdf,.docx" className="hidden" onChange={handleFileChange} />
                  <Button size="sm" variant="outline" className="text-xs gap-1" asChild>
                    <span><Upload className="w-3 h-3" /> Replace</span>
                  </Button>
                </label>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Upload your CV once and it will be used for all applications. PDF or Word document, max 10 MB.</p>
                <label className="cursor-pointer block">
                  <input type="file" accept=".pdf,.docx" className="hidden" onChange={handleFileChange} />
                  <div className="border-2 border-dashed border-[var(--lw-navy)] border-opacity-20 rounded p-6 text-center hover:border-opacity-40 transition-colors">
                    {uploadCv.isPending ? (
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="w-6 h-6 animate-spin text-[var(--lw-navy)] opacity-50" />
                        <p className="text-xs text-muted-foreground">Uploading and reading your CV...</p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2">
                        <Upload className="w-6 h-6 text-[var(--lw-navy)] opacity-40" />
                        <p className="text-sm font-medium text-[var(--lw-navy)]">Click to upload your CV</p>
                        <p className="text-xs text-muted-foreground">PDF or .docx, max 10 MB</p>
                      </div>
                    )}
                  </div>
                </label>
              </div>
            )}
          </div>

          {/* Step 1b: Covering letter style sample (optional) */}
          <div className="border border-[var(--lw-navy)] border-opacity-15 rounded p-4 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-[var(--lw-navy)] bg-opacity-20 text-[var(--lw-navy)] flex items-center justify-center text-xs font-bold flex-shrink-0">1b</div>
              <div>
                <p className="text-sm font-semibold text-[var(--lw-navy)]">Your covering letter style <span className="font-normal text-muted-foreground">(optional)</span></p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Upload a covering letter you have written before. We will match your natural writing voice — your sentence rhythm, vocabulary, and structure — when drafting the new one. We do not copy the content, only the style.
            </p>
            {existingCv?.coveringLetterName ? (
              <div className="flex items-center gap-3">
                <FileText className="w-4 h-4 text-[var(--lw-gold)] flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{existingCv.coveringLetterName}</p>
                  <p className="text-xs text-muted-foreground">Style sample saved</p>
                </div>
                <label className="cursor-pointer">
                  <input type="file" accept=".pdf,.docx" className="hidden" onChange={handleCoverLetterChange} />
                  <Button size="sm" variant="outline" className="text-xs gap-1" asChild>
                    <span><Upload className="w-3 h-3" /> Replace</span>
                  </Button>
                </label>
              </div>
            ) : (
              <label className="cursor-pointer block">
                <input type="file" accept=".pdf,.docx" className="hidden" onChange={handleCoverLetterChange} disabled={!existingCv} />
                <div className={`border-2 border-dashed rounded p-4 text-center transition-colors ${
                  !existingCv ? "border-muted opacity-50 cursor-not-allowed" : "border-[var(--lw-navy)] border-opacity-20 hover:border-opacity-40"
                }`}>
                  {uploadCoverLetter.isPending ? (
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-[var(--lw-navy)] opacity-50" />
                      <p className="text-xs text-muted-foreground">Reading covering letter...</p>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-2">
                      <Upload className="w-4 h-4 text-[var(--lw-navy)] opacity-40" />
                      <p className="text-xs text-[var(--lw-navy)]">{existingCv ? "Click to upload a covering letter sample" : "Upload your CV above first"}</p>
                    </div>
                  )}
                </div>
              </label>
            )}
            {uploadCoverLetter.isError && (
              <p className="text-xs text-red-600">{uploadCoverLetter.error?.message}</p>
            )}
          </div>

          {/* Step 2: Generate */}
          <div className="border border-[var(--lw-navy)] border-opacity-15 rounded p-4 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-[var(--lw-navy)] text-white flex items-center justify-center text-xs font-bold flex-shrink-0">2</div>
              <p className="text-sm font-semibold text-[var(--lw-navy)]">Generate tailored materials</p>
            </div>
            <p className="text-xs text-muted-foreground">
              We will rewrite your CV to emphasise the experience most relevant to this role and firm, and draft a covering email that opens with your genuine professional narrative{existingCv?.coveringLetterName ? " — written in your own style" : ""}.
            </p>
            <Button
              className="bg-[var(--lw-navy)] text-white hover:opacity-90 gap-2"
              disabled={!existingCv || tailor.isPending || tailor.isSuccess}
              onClick={handleTailor}
            >
              {tailor.isPending ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Generating — this takes 15–30 seconds...</>
              ) : tailor.isSuccess ? (
                <><Check className="w-4 h-4" /> Generated</>
              ) : (
                <><Wand2 className="w-4 h-4" /> Generate tailored CV &amp; covering email</>
              )}
            </Button>
            {!existingCv && (
              <p className="text-xs text-amber-600">Please upload your CV above first.</p>
            )}
            {tailor.isError && (
              <p className="text-xs text-red-600">{tailor.error?.message ?? "Something went wrong. Please try again."}</p>
            )}
          </div>

          {/* Step 3: Results */}
          {tailor.isSuccess && tailor.data && (
            <div className="space-y-4">
              {/* Tailored CV */}
              <div className="border border-[var(--lw-navy)] border-opacity-15 rounded p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-[var(--lw-navy)]">Tailored CV</p>
                  <Button
                    size="sm" variant="outline" className="gap-1.5 text-xs"
                    onClick={() => copyToClipboard(tailor.data!.rewrittenCv, "cv")}
                  >
                    {copiedCv ? <><Check className="w-3 h-3" /> Copied</> : <><Copy className="w-3 h-3" /> Copy</>}
                  </Button>
                </div>
                <pre className="text-xs whitespace-pre-wrap font-sans text-[var(--lw-navy)] bg-[var(--lw-cream)] rounded p-3 max-h-72 overflow-y-auto">
                  {tailor.data.rewrittenCv}
                </pre>
              </div>
              {/* Covering email */}
              <div className="border border-[var(--lw-navy)] border-opacity-15 rounded p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-[var(--lw-navy)]">Covering Email</p>
                  <Button
                    size="sm" variant="outline" className="gap-1.5 text-xs"
                    onClick={() => copyToClipboard(tailor.data!.coveringEmail, "email")}
                  >
                    {copiedEmail ? <><Check className="w-3 h-3" /> Copied</> : <><Copy className="w-3 h-3" /> Copy</>}
                  </Button>
                </div>
                <pre className="text-xs whitespace-pre-wrap font-sans text-[var(--lw-navy)] bg-[var(--lw-cream)] rounded p-3 max-h-72 overflow-y-auto">
                  {tailor.data.coveringEmail}
                </pre>
              </div>
              <p className="text-xs text-muted-foreground italic">
                These materials are tailored to this specific role. Review and personalise before sending — the AI works from your existing CV and profile, but you know your story best.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Last refreshed banner ──────────────────────────────────────────────────

function LastRefreshedBanner({ clientId }: { clientId?: number }) {
  const { data } = trpc.jobs.getLastPipelineRun.useQuery({ clientId });
  const text = data?.completedAt
    ? `Last refreshed: ${new Date(data.completedAt).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}`
    : "Not yet refreshed — your counsellor will run the first scan for you.";
  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <RefreshCw className="w-3.5 h-3.5 flex-shrink-0" />
      <span>{text}</span>
    </div>
  );
}

// ─── Preferences form ─────────────────────────────────────────────────────────

function PreferencesPanel({ clientId, readOnly }: { clientId?: number; readOnly?: boolean }) {
  const [open, setOpen] = useState(false);
  const utils = trpc.useUtils();
  const { data: constraints } = trpc.jobs.getConstraints.useQuery({ clientId });
  const setConstraints = trpc.jobs.setConstraints.useMutation({
    onSuccess: () => utils.jobs.getConstraints.invalidate({ clientId }),
  });

  const [excludeEmployers, setExcludeEmployers] = useState<string>("");
  const [excludeCompanies, setExcludeCompanies] = useState<string>("");
  const [excludeSectors, setExcludeSectors] = useState<string>("");
  const [minSalary, setMinSalary] = useState<string>("");
  const [permanentOnly, setPermanentOnly] = useState(false);
  const [excludeLocations, setExcludeLocations] = useState<string>("");
  const [roleIntent, setRoleIntent] = useState<string>("");

  // Populate from saved constraints
  const [initialised, setInitialised] = useState(false);
  if (constraints && !initialised) {
    setExcludeEmployers((constraints.excludeCurrentEmployers as string[] | null)?.join(", ") ?? "");
    setExcludeCompanies((constraints.excludeCompanies as string[] | null)?.join(", ") ?? "");
    setExcludeSectors((constraints.excludeSectors as string[] | null)?.join(", ") ?? "");
    setMinSalary(constraints.minTotalGbp ? String(constraints.minTotalGbp) : "");
    setPermanentOnly(constraints.permanentOnly ?? false);
    setExcludeLocations((constraints.hardExcludeLocations as string[] | null)?.join(", ") ?? "");
    setRoleIntent((constraints as { roleIntent?: string | null }).roleIntent ?? "");
    setInitialised(true);
  }

  const splitCsv = (s: string) =>
    s
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);

  const handleSave = () => {
    setConstraints.mutate({
      excludeCurrentEmployers: splitCsv(excludeEmployers),
      excludeCompanies: splitCsv(excludeCompanies),
      excludeSectors: splitCsv(excludeSectors),
      minTotalGbp: minSalary ? parseInt(minSalary, 10) : 0,
      permanentOnly,
      hardExcludeLocations: splitCsv(excludeLocations),
      roleIntent: roleIntent.trim() || undefined,
    });
    setOpen(false);
  };

  return (
    <div className="border border-[var(--lw-navy)] border-opacity-20 rounded">
      <button
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-[var(--lw-navy)]"
        onClick={() => setOpen(!open)}
      >
        <span className="flex items-center gap-2">
          <Settings2 className="w-4 h-4" /> Refine your search
        </span>
        {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-4 border-t border-[var(--lw-navy)] border-opacity-10">
          <p className="text-xs text-muted-foreground pt-3">
            These preferences are applied when scoring opportunities. Separate multiple values with commas.
          </p>
          <div className="space-y-1">
            <Label className="text-xs font-semibold">What kind of role are you looking for?</Label>
            <p className="text-xs text-muted-foreground">Describe in one or two sentences — this shapes your entire search. E.g. "I am looking for legal operations or AI programme management roles within law firms or in-house legal teams."</p>
            <textarea
              value={roleIntent}
              onChange={(e) => setRoleIntent(e.target.value)}
              placeholder="I am looking for..."
              rows={3}
              maxLength={500}
              className="w-full text-sm border border-input rounded-md px-3 py-2 bg-background text-foreground resize-none focus:outline-none focus:ring-1 focus:ring-[var(--lw-navy)]"
            />
            <p className="text-xs text-muted-foreground text-right">{roleIntent.length}/500</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-xs">Current employers to exclude</Label>
              <Input
                value={excludeEmployers}
                onChange={(e) => setExcludeEmployers(e.target.value)}
                placeholder="e.g. Clifford Chance, Linklaters"
                className="text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Other companies to exclude</Label>
              <Input
                value={excludeCompanies}
                onChange={(e) => setExcludeCompanies(e.target.value)}
                placeholder="e.g. Baker McKenzie"
                className="text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Sectors to exclude</Label>
              <Input
                value={excludeSectors}
                onChange={(e) => setExcludeSectors(e.target.value)}
                placeholder="e.g. investment banking"
                className="text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Minimum total package (£)</Label>
              <Input
                type="number"
                value={minSalary}
                onChange={(e) => setMinSalary(e.target.value)}
                placeholder="e.g. 150000"
                className="text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Locations to exclude</Label>
              <Input
                value={excludeLocations}
                onChange={(e) => setExcludeLocations(e.target.value)}
                placeholder="e.g. New York, Dubai"
                className="text-sm"
              />
            </div>
            <div className="flex items-center gap-3 pt-5">
              <Switch
                checked={permanentOnly}
                onCheckedChange={setPermanentOnly}
                id="perm-only"
              />
              <Label htmlFor="perm-only" className="text-xs cursor-pointer">
                Permanent roles only (exclude fixed-term)
              </Label>
            </div>
          </div>
          <div className="flex justify-end">
            <Button
              size="sm"
              className="bg-[var(--lw-navy)] text-white hover:opacity-90"
              disabled={setConstraints.isPending}
              onClick={handleSave}
            >
              {setConstraints.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Save preferences"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Tab: Companies to Watch ──────────────────────────────────────────────────

function CompaniesTab({ clientId }: { clientId?: number }) {
  const { data, isLoading } = trpc.jobs.getMonitorList.useQuery({ clientId });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-[var(--lw-navy)] opacity-50" />
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <EmptyState
        icon={Building2}
        title="Your watch list is being prepared"
        body="Once your Lifework report is complete, your counsellor will generate a personalised list of employers to monitor. Check back soon."
      />
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        {data.length} employers selected from the Pennington Hennessy universe based on your profile.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {data.map((row) => (
          <Card key={row.id} className="border border-[var(--lw-navy)] border-opacity-10">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-[var(--lw-navy)] text-sm truncate">{row.company.name}</p>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {row.company.tier && (
                      <Badge variant="secondary" className="text-xs capitalize">
                        {row.company.tier.replace(/_/g, " ")}
                      </Badge>
                    )}
                    {row.company.sector && (
                      <Badge variant="outline" className="text-xs capitalize">
                        {row.company.sector.replace(/_/g, " ")}
                      </Badge>
                    )}
                  </div>
                </div>
                <ScoreBadge score={row.score} />
              </div>
              {row.reason && (
                <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{row.reason}</p>
              )}
              {row.company.careersUrl && (
                <a
                  href={row.company.careersUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-[var(--lw-gold)] hover:underline mt-2"
                >
                  <ExternalLink className="w-3 h-3" /> Careers page
                </a>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ─── Tab: Open Roles ──────────────────────────────────────────────────────────

function OpenRolesTab({ clientId }: { clientId?: number }) {
  const utils = trpc.useUtils();
  const [minScore, setMinScore] = useState(7);
  const [page, setPage] = useState(0);
  const [selectedCompanyIds, setSelectedCompanyIds] = useState<number[]>([]);
  const PAGE_SIZE = 25;
  const handleScoreChange = (val: number) => { setMinScore(val); setPage(0); };
  const handleCompanyToggle = (id: number) => {
    setSelectedCompanyIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
    setPage(0);
  };
  const { data: companiesData } = trpc.jobs.getMatchCompanies.useQuery({ clientId, minScore });
  const companies = companiesData ?? [];
  const { data, isLoading } = trpc.jobs.getMatches.useQuery({
    clientId,
    minScore,
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
    companyIds: selectedCompanyIds.length > 0 ? selectedCompanyIds : undefined,
  });

  const rows = data?.rows ?? [];
  const total = data?.total ?? 0;
  const hasMore = (page + 1) * PAGE_SIZE < total;
  const start = page * PAGE_SIZE + 1;
  const end = Math.min((page + 1) * PAGE_SIZE, total);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-[var(--lw-navy)] opacity-50" />
      </div>
    );
  }

  if (!data || rows.length === 0) {
    return (
      <div className="space-y-4">
        {/* Score filter */}
        <div className="flex items-center gap-3 text-sm">
          <span className="text-muted-foreground whitespace-nowrap">Min score:</span>
          {[5, 6, 7, 8, 9].map((s) => (
            <button
              key={s}
              onClick={() => handleScoreChange(s)}
              className={`px-2.5 py-0.5 rounded text-xs font-medium border transition-colors ${
                minScore === s
                  ? "bg-[var(--lw-navy)] text-white border-[var(--lw-navy)]"
                  : "bg-white text-[var(--lw-navy)] border-[var(--lw-navy)] border-opacity-30 hover:border-opacity-60"
              }`}
            >
              {s}+
            </button>
          ))}
        </div>
        <EmptyState
          icon={Briefcase}
          title="No roles at this score threshold"
          body="Try lowering the minimum score to see more matches, or run the pipeline to refresh listings."
        />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Score filter + result count */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-xs text-muted-foreground">
          Showing {start}–{end} of {total} {total === 1 ? "role" : "roles"} scoring {minScore}+
          {selectedCompanyIds.length > 0 ? ` at ${selectedCompanyIds.length} selected ${selectedCompanyIds.length === 1 ? "company" : "companies"}` : ""}.
        </p>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Min score:</span>
          {[5, 6, 7, 8, 9].map((s) => (
            <button
              key={s}
              onClick={() => handleScoreChange(s)}
              className={`px-2.5 py-0.5 rounded text-xs font-medium border transition-colors ${
                minScore === s
                  ? "bg-[var(--lw-navy)] text-white border-[var(--lw-navy)]"
                  : "bg-white text-[var(--lw-navy)] border-[var(--lw-navy)] border-opacity-30 hover:border-opacity-60"
              }`}
            >
              {s}+
            </button>
          ))}
        </div>
      </div>

      {/* Main layout: company filter sidebar + roles list */}
      <div className="flex gap-4 items-start">
        {/* Company filter panel */}
        {companies.length > 0 && (
          <div className="w-52 flex-shrink-0 border border-[var(--lw-navy)] border-opacity-10 rounded-lg bg-white">
            <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--lw-navy)] border-opacity-10">
              <span className="text-xs font-semibold text-[var(--lw-navy)]">Filter by company</span>
              {selectedCompanyIds.length > 0 && (
                <button
                  onClick={() => { setSelectedCompanyIds([]); setPage(0); }}
                  className="text-xs text-muted-foreground hover:text-[var(--lw-navy)] underline"
                >
                  Clear
                </button>
              )}
            </div>
            <ScrollArea className="h-[420px]">
              <div className="p-2 space-y-0.5">
                {companies.map((c) => (
                  <label
                    key={c.companyId}
                    className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer hover:bg-[var(--lw-navy)] hover:bg-opacity-5 transition-colors ${
                      selectedCompanyIds.includes(c.companyId) ? "bg-[var(--lw-gold)] bg-opacity-10" : ""
                    }`}
                  >
                    <Checkbox
                      checked={selectedCompanyIds.includes(c.companyId)}
                      onCheckedChange={() => handleCompanyToggle(c.companyId)}
                      className="w-3.5 h-3.5 flex-shrink-0"
                    />
                    <span className="text-xs text-[var(--lw-navy)] leading-tight flex-1 min-w-0 truncate">{c.companyName}</span>
                    <span className="text-xs text-muted-foreground flex-shrink-0">{c.matchCount}</span>
                  </label>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Roles list */}
        <div className="flex-1 min-w-0 space-y-3">
        {rows.map((row) => (
          <Card key={row.id} className="border border-[var(--lw-navy)] border-opacity-10">
            <CardContent className="p-4">
              <div className="space-y-2">
                {/* Top row: title + score + action buttons always visible */}
                <div className="flex items-start gap-2">
                  <p className="font-semibold text-[var(--lw-navy)] text-sm leading-snug flex-1 min-w-0">{row.listing.title}</p>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <ScoreBadge score={row.score} />
                    {row.listing.url && (
                      <a href={row.listing.url} target="_blank" rel="noopener noreferrer">
                        <Button size="icon" variant="ghost" className="w-7 h-7 text-muted-foreground hover:text-[var(--lw-navy)]" title="View job posting">
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Button>
                      </a>
                    )}
                    <TailorApplicationModal
                      listingId={row.listing.id}
                      listingTitle={row.listing.title}
                      companyName={row.company.name}
                    />
                    <SaveJobDialog
                      listingId={row.listing.id}
                      title={row.listing.title}
                      organisation={row.company.name}
                      onSaved={() => utils.jobs.getSaved.invalidate()}
                    />
                  </div>
                </div>
                {/* Company + meta */}
                <p className="text-xs text-muted-foreground">{row.company.name}</p>
                <div className="flex flex-wrap gap-2">
                  {row.listing.location && (
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="w-3 h-3" /> {row.listing.location}
                    </span>
                  )}
                  {row.listing.fetchedAt && (
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" /> {new Date(row.listing.fetchedAt).toLocaleDateString("en-GB")}
                    </span>
                  )}
                  {row.company.sector && (
                    <Badge variant="outline" className="text-xs capitalize">
                      {row.company.sector.replace(/_/g, " ")}
                    </Badge>
                  )}
                </div>
                {row.rationale && (
                  <p className="text-xs text-muted-foreground leading-relaxed italic">
                    "{row.rationale}"
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )        )}
        </div>{/* end roles list */}
      </div>{/* end flex wrapper */}
      {/* Pagination controls */}
      <div className="flex items-center justify-between pt-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPage((p) => Math.max(0, p - 1))}
          disabled={page === 0}
          className="text-xs"
        >
          ← Previous
        </Button>
        <span className="text-xs text-muted-foreground">
          Page {page + 1} of {Math.ceil(total / PAGE_SIZE) || 1}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPage((p) => p + 1)}
          disabled={!hasMore}
          className="text-xs"
        >
          Next →
        </Button>
      </div>
    </div>
  );
}

// ─── Tab: Early Signals ───────────────────────────────────────────────────────

function SignalsTab({ clientId }: { clientId?: number }) {
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.jobs.getSignals.useQuery({ clientId, minRelevance: 1 });

  const eventLabel: Record<string, string> = {
    departure: "Departure",
    vacancy: "Vacancy",
    appointment: "Appointment",
    other: "Signal",
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-[var(--lw-navy)] opacity-50" />
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <EmptyState
        icon={Newspaper}
        title="No signals yet"
        body="The nightly scan monitors senior departures and newly created roles at your target employers. Relevant signals will appear here."
      />
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        {data.length} {data.length === 1 ? "signal" : "signals"} from the past 120 days.
      </p>
      <div className="space-y-3">
        {data.map((signal) => (
          <Card key={signal.id} className="border border-[var(--lw-navy)] border-opacity-10">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-start gap-2 flex-wrap">
                    <p className="text-sm font-medium text-[var(--lw-navy)] leading-snug">
                      {signal.headline}
                    </p>
                    <RelevanceBadge relevance={signal.relevance} />
                  </div>
                  <div className="flex flex-wrap gap-2 mt-1.5">
                    {signal.company && (
                      <span className="text-xs font-medium text-[var(--lw-navy)] opacity-70">
                        {signal.company}
                      </span>
                    )}
                    {signal.event && (
                      <Badge
                        variant={signal.event === "departure" ? "destructive" : "secondary"}
                        className="text-xs"
                      >
                        {eventLabel[signal.event] ?? signal.event}
                      </Badge>
                    )}
                    {signal.onMonitorList && (
                      <Badge className="text-xs bg-[var(--lw-gold)] text-white">On your watch list</Badge>
                    )}
                    {signal.publishedAt && (
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        {new Date(signal.publishedAt).toLocaleDateString("en-GB")}
                      </span>
                    )}
                  </div>
                  {signal.role && (
                    <p className="text-xs text-muted-foreground mt-1">Role: {signal.role}</p>
                  )}
                  {signal.person && (
                    <p className="text-xs text-muted-foreground">Person: {signal.person}</p>
                  )}
                </div>
                <div className="flex flex-col gap-2 flex-shrink-0">
                  {signal.url && (
                    <a href={signal.url} target="_blank" rel="noopener noreferrer">
                      <Button size="sm" variant="outline" className="gap-1.5 text-xs">
                        <ExternalLink className="w-3.5 h-3.5" /> Source
                      </Button>
                    </a>
                  )}
                  <SaveJobDialog
                    signalId={signal.id}
                    title={signal.headline ?? "Signal"}
                    organisation={signal.company ?? undefined}
                    onSaved={() => utils.jobs.getSaved.invalidate()}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ─── Tab: Saved ───────────────────────────────────────────────────────────────

function SavedTab({ clientId }: { clientId?: number }) {
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.jobs.getSaved.useQuery({ clientId });
  const updateSaved = trpc.jobs.updateSaved.useMutation({
    onSuccess: () => utils.jobs.getSaved.invalidate({ clientId }),
  });
  const deleteSaved = trpc.jobs.deleteSaved.useMutation({
    onSuccess: () => utils.jobs.getSaved.invalidate({ clientId }),
  });

  const [editingNotes, setEditingNotes] = useState<Record<number, string>>({});

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-[var(--lw-navy)] opacity-50" />
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <EmptyState
        icon={Bookmark}
        title="Nothing saved yet"
        body="Save roles from Open Roles or Early Signals to track them here. Add notes, update your status, and keep a record of your progress."
      />
    );
  }

  const statusColour: Record<string, string> = {
    exploring: "bg-blue-100 text-blue-700",
    applied: "bg-emerald-100 text-emerald-800",
    not_for_me: "bg-slate-100 text-slate-500",
  };

  const statusLabel: Record<string, string> = {
    exploring: "Exploring",
    applied: "Applied",
    not_for_me: "Not for me",
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        {data.length} saved {data.length === 1 ? "opportunity" : "opportunities"}.
      </p>
      <div className="space-y-3">
        {data.map((saved) => (
          <Card key={saved.id} className="border border-[var(--lw-navy)] border-opacity-10">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-start gap-2 flex-wrap">
                    <BookmarkCheck className="w-4 h-4 text-[var(--lw-gold)] flex-shrink-0 mt-0.5" />
                    <p className="font-semibold text-[var(--lw-navy)] text-sm">{saved.title}</p>
                  </div>
                  {saved.organisation && (
                    <p className="text-xs text-muted-foreground mt-0.5 ml-6">{saved.organisation}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Select
                    value={saved.status ?? "exploring"}
                    onValueChange={(val) =>
                      updateSaved.mutate({ id: saved.id, status: val as "exploring" | "applied" | "not_for_me" })
                    }
                  >
                    <SelectTrigger className="h-7 text-xs w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="exploring">Exploring</SelectItem>
                      <SelectItem value="applied">Applied</SelectItem>
                      <SelectItem value="not_for_me">Not for me</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-muted-foreground hover:text-red-500"
                    onClick={() => deleteSaved.mutate({ id: saved.id })}
                    disabled={deleteSaved.isPending}
                  >
                    ×
                  </Button>
                </div>
              </div>
              <div className="space-y-1">
                <Textarea
                  rows={2}
                  value={editingNotes[saved.id] ?? saved.notes ?? ""}
                  onChange={(e) =>
                    setEditingNotes((prev) => ({ ...prev, [saved.id]: e.target.value }))
                  }
                  onBlur={() => {
                    const notes = editingNotes[saved.id];
                    if (notes !== undefined && notes !== saved.notes) {
                      updateSaved.mutate({ id: saved.id, notes });
                    }
                  }}
                  placeholder="Add notes — who to contact, next steps, how you heard about it…"
                  className="text-xs resize-none"
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ─── Quality labels (shared with counsellor view) ─────────────────────────────

const QUALITY_LABELS: Record<string, string> = {
  autonomy: "Autonomy",
  structured_learning: "Structured Learning",
  social_impact: "Social Impact",
  commercial_intensity: "Commercial Intensity",
  collaboration: "Collaboration",
  innovation: "Innovation",
  prestige: "Prestige",
  scale_and_stability: "Scale & Stability",
};

function SpecBadgeList({ label, items, variant = "secondary" }: { label: string; items: string[]; variant?: "secondary" | "outline" }) {
  if (!items?.length) return null;
  return (
    <div>
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">{label}</p>
      <div className="flex flex-wrap gap-1">
        {items.map((t) => <Badge key={t} variant={variant} className="text-xs">{t}</Badge>)}
      </div>
    </div>
  );
}

// ─── Target Spec display (client-facing read-only) ────────────────────────────

type SpecShape = {
  summary?: string;
  seniority_band?: string;
  role_families?: { title: string; why: string }[];
  functions?: string[];
  sectors?: { sector: string; weight: string }[];
  organisation_archetypes?: string[];
  geography?: { base?: string; acceptable?: string[]; hard_constraints?: string[] };
  differentiators?: string[];
  quality_preferences?: string[];
  deal_breakers?: string[];
  search_terms?: string[];
};

function TargetSpecDisplay({ spec }: { spec: SpecShape }) {
  return (
    <div className="space-y-5">
      {spec.summary && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Summary</p>
          <p className="text-sm text-[var(--lw-navy)] leading-relaxed">{spec.summary}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {spec.role_families?.length ? (
          <div className="md:col-span-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Role Families</p>
            <div className="space-y-3">
              {spec.role_families.map((r) => (
                <div key={r.title} className="border-l-2 border-[var(--lw-gold)] pl-3">
                  <p className="text-sm font-semibold text-[var(--lw-navy)]">{r.title}</p>
                  {r.why && <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{r.why}</p>}
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div className="space-y-4">
          <SpecBadgeList label="Functions" items={spec.functions ?? []} />
          {spec.sectors?.length ? (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Sectors</p>
              <div className="flex flex-wrap gap-1">
                {spec.sectors.map((s) => (
                  <Badge
                    key={s.sector}
                    className={`text-xs ${
                      s.weight === "high"
                        ? "bg-[var(--lw-navy)] text-white"
                        : s.weight === "medium"
                        ? "bg-[var(--lw-gold)] text-white"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {s.sector} · {s.weight}
                  </Badge>
                ))}
              </div>
            </div>
          ) : null}
          {spec.seniority_band && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Seniority</p>
              <Badge variant="secondary" className="text-xs capitalize">{spec.seniority_band}</Badge>
            </div>
          )}
          {spec.geography?.base && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Geography</p>
              <p className="text-sm text-[var(--lw-navy)]">{spec.geography.base}</p>
              {spec.geography.hard_constraints?.length ? (
                <p className="text-xs text-muted-foreground mt-0.5">Constraints: {spec.geography.hard_constraints.join(", ")}</p>
              ) : null}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <SpecBadgeList label="Organisation Types" items={spec.organisation_archetypes ?? []} variant="outline" />
          {spec.quality_preferences?.length ? (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Culture Preferences</p>
              <div className="flex flex-wrap gap-1">
                {spec.quality_preferences.map((q) => (
                  <Badge key={q} className="text-xs bg-violet-100 text-violet-800 hover:bg-violet-100">
                    {QUALITY_LABELS[q] ?? q}
                  </Badge>
                ))}
              </div>
            </div>
          ) : null}
          <SpecBadgeList label="Differentiators" items={spec.differentiators ?? []} variant="outline" />
          <SpecBadgeList label="Deal Breakers" items={spec.deal_breakers ?? []} variant="outline" />
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function JobsExplorer() {
  const { user, loading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const { data: specRow, isLoading: specLoading } = trpc.jobs.getTargetSpec.useQuery({});

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--lw-navy)] opacity-50" />
      </div>
    );
  }

  if (!user) {
    navigate("/");
    return null;
  }

  const spec = specRow?.spec as SpecShape | undefined;

  return (
    <div className="min-h-screen bg-[var(--lw-cream)]">
      {/* Header */}
      <div className="bg-[var(--lw-navy)] text-white px-6 py-8">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <img
              src="https://d2xsxph8kpxj0f.cloudfront.net/107696804/kFbbE6kqNApXGDFpQJUGV7/phsquare_98c01de4.jpg"
              alt="Pennington Hennessy"
              className="w-8 h-8 object-contain"
            />
            <span className="text-xs tracking-widest uppercase opacity-60 font-sans">Lifework</span>
          </div>
          <h1 className="font-serif text-2xl font-semibold">Your Career Target</h1>
          <p className="text-sm opacity-70 mt-1">
            How your counsellor has profiled your next move, based on your Lifework report.
          </p>
        </div>
      </div>

      {/* Body */}
      <div className="max-w-3xl mx-auto px-4 py-8">
        {specLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-[var(--lw-navy)] opacity-50" />
          </div>
        ) : !spec ? (
          <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
            <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center shadow-sm">
              <FileText className="w-7 h-7 text-[var(--lw-navy)] opacity-30" />
            </div>
            <div className="space-y-1">
              <p className="font-serif text-[var(--lw-navy)] text-lg font-semibold">Being prepared</p>
              <p className="text-sm text-muted-foreground max-w-sm">
                Your counsellor is working on your career target profile. It will appear here once your Lifework report has been reviewed.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Spec card */}
            <div className="bg-white rounded-xl border border-[var(--lw-navy)] border-opacity-10 shadow-sm p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-serif text-[var(--lw-navy)] text-lg font-semibold">Target Specification</h2>
                {specRow?.generatedAt && (
                  <p className="text-xs text-muted-foreground">
                    Generated {new Date(specRow.generatedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
                  </p>
                )}
              </div>
              <TargetSpecDisplay spec={spec} />
            </div>

            {/* Explanatory note */}
            <div className="bg-[var(--lw-gold)] bg-opacity-10 border border-[var(--lw-gold)] border-opacity-30 rounded-lg px-5 py-4">
              <p className="text-sm text-[var(--lw-navy)] leading-relaxed">
                <span className="font-semibold">What this means for you.</span> This specification is the lens through which your counsellor is monitoring the market on your behalf. It shapes which employers are on your watch list and which opportunities are flagged as relevant. If anything looks wrong or has changed, speak to your counsellor.
              </p>
            </div>
          </div>
        )}

        <div className="pt-8">
          <button
            onClick={() => navigate("/dashboard")}
            className="text-xs text-[var(--lw-navy)] opacity-60 hover:opacity-100 underline"
          >
            ← Back to dashboard
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Counsellor Portal View ───────────────────────────────────────────────────
// Renders the full Jobs Explorer exactly as the client sees it, but with a
// counsellor banner at the top and clientId threaded through every query.

export function CounsellorPortalView({
  clientId,
  clientName,
  onBack,
}: {
  clientId: number;
  clientName?: string;
  onBack: () => void;
}) {
  return (
    <div className="min-h-screen bg-[var(--lw-cream)]">
      {/* Counsellor banner */}
      <div className="bg-[var(--lw-gold)] text-white px-4 py-2 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Eye className="w-4 h-4" />
          <span>Viewing as {clientName ?? `Client #${clientId}`} — this is their exact portal view</span>
        </div>
        <button
          onClick={onBack}
          className="text-xs underline opacity-80 hover:opacity-100"
        >
          ← Return to profile
        </button>
      </div>

      {/* Exact client header */}
      <div className="bg-[var(--lw-navy)] text-white px-6 py-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-1">
            <img
              src="https://d2xsxph8kpxj0f.cloudfront.net/107696804/kFbbE6kqNApXGDFpQJUGV7/phsquare_98c01de4.jpg"
              alt="Pennington Hennessy"
              className="w-8 h-8 object-contain"
            />
            <span className="text-xs tracking-widest uppercase opacity-60 font-sans">Lifework</span>
          </div>
          <h1 className="font-serif text-2xl font-semibold">Jobs Explorer</h1>
          <p className="text-sm opacity-70 mt-1">
            {clientName ? `${clientName}'s personalised market monitor` : "Personalised market monitor"} — live roles, early signals, and employers to watch.
          </p>
        </div>
      </div>

      {/* Exact client body */}
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-5">
        <LastRefreshedBanner clientId={clientId} />
        <PreferencesPanel clientId={clientId} readOnly />
        <Tabs defaultValue="companies">
          <TabsList className="grid grid-cols-4 w-full bg-white border border-[var(--lw-navy)] border-opacity-10">
            <TabsTrigger value="companies" className="gap-1.5 text-xs sm:text-sm">
              <Building2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Companies</span>
            </TabsTrigger>
            <TabsTrigger value="roles" className="gap-1.5 text-xs sm:text-sm">
              <Briefcase className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Open Roles</span>
            </TabsTrigger>
            <TabsTrigger value="signals" className="gap-1.5 text-xs sm:text-sm">
              <Newspaper className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Signals</span>
            </TabsTrigger>
            <TabsTrigger value="saved" className="gap-1.5 text-xs sm:text-sm">
              <Bookmark className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Saved</span>
            </TabsTrigger>
          </TabsList>
          <TabsContent value="companies" className="mt-4"><CompaniesTab clientId={clientId} /></TabsContent>
          <TabsContent value="roles" className="mt-4"><OpenRolesTab clientId={clientId} /></TabsContent>
          <TabsContent value="signals" className="mt-4"><SignalsTab clientId={clientId} /></TabsContent>
          <TabsContent value="saved" className="mt-4"><SavedTab clientId={clientId} /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
