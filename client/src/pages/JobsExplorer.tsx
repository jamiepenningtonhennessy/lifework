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

import { useState } from "react";
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

// ─── Preferences form ─────────────────────────────────────────────────────────

function PreferencesPanel() {
  const [open, setOpen] = useState(false);
  const utils = trpc.useUtils();
  const { data: constraints } = trpc.jobs.getConstraints.useQuery({});
  const setConstraints = trpc.jobs.setConstraints.useMutation({
    onSuccess: () => utils.jobs.getConstraints.invalidate(),
  });

  const [excludeEmployers, setExcludeEmployers] = useState<string>("");
  const [excludeCompanies, setExcludeCompanies] = useState<string>("");
  const [excludeSectors, setExcludeSectors] = useState<string>("");
  const [minSalary, setMinSalary] = useState<string>("");
  const [permanentOnly, setPermanentOnly] = useState(false);
  const [excludeLocations, setExcludeLocations] = useState<string>("");

  // Populate from saved constraints
  const [initialised, setInitialised] = useState(false);
  if (constraints && !initialised) {
    setExcludeEmployers((constraints.excludeCurrentEmployers as string[] | null)?.join(", ") ?? "");
    setExcludeCompanies((constraints.excludeCompanies as string[] | null)?.join(", ") ?? "");
    setExcludeSectors((constraints.excludeSectors as string[] | null)?.join(", ") ?? "");
    setMinSalary(constraints.minTotalGbp ? String(constraints.minTotalGbp) : "");
    setPermanentOnly(constraints.permanentOnly ?? false);
    setExcludeLocations((constraints.hardExcludeLocations as string[] | null)?.join(", ") ?? "");
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
          <Settings2 className="w-4 h-4" /> Search preferences
        </span>
        {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-4 border-t border-[var(--lw-navy)] border-opacity-10">
          <p className="text-xs text-muted-foreground pt-3">
            These preferences are applied when scoring opportunities. Separate multiple values with commas.
          </p>
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

function CompaniesTab() {
  const { data, isLoading } = trpc.jobs.getMonitorList.useQuery({});

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

function OpenRolesTab() {
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.jobs.getMatches.useQuery({ minScore: 5 });

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
        icon={Briefcase}
        title="No live roles yet"
        body="The nightly scan hasn't found any matching vacancies yet. Roles are fetched directly from employer career portals and scored against your profile."
      />
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        {data.length} live {data.length === 1 ? "role" : "roles"} scoring 5+ against your profile.
      </p>
      <div className="space-y-3">
        {data.map((row) => (
          <Card key={row.id} className="border border-[var(--lw-navy)] border-opacity-10">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-start gap-2 flex-wrap">
                    <p className="font-semibold text-[var(--lw-navy)] text-sm">{row.listing.title}</p>
                    <ScoreBadge score={row.score} />
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{row.company.name}</p>
                  <div className="flex flex-wrap gap-2 mt-1.5">
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
                    <p className="text-xs text-muted-foreground mt-2 leading-relaxed italic">
                      "{row.rationale}"
                    </p>
                  )}
                </div>
                <div className="flex flex-col gap-2 flex-shrink-0">
                  {row.listing.url && (
                    <a
                      href={row.listing.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button size="sm" variant="outline" className="gap-1.5 text-xs">
                        <ExternalLink className="w-3.5 h-3.5" /> View
                      </Button>
                    </a>
                  )}
                  <SaveJobDialog
                    listingId={row.listing.id}
                    title={row.listing.title}
                    organisation={row.company.name}
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

// ─── Tab: Early Signals ───────────────────────────────────────────────────────

function SignalsTab() {
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.jobs.getSignals.useQuery({ minRelevance: 1 });

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

function SavedTab() {
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.jobs.getSaved.useQuery({});
  const updateSaved = trpc.jobs.updateSaved.useMutation({
    onSuccess: () => utils.jobs.getSaved.invalidate(),
  });
  const deleteSaved = trpc.jobs.deleteSaved.useMutation({
    onSuccess: () => utils.jobs.getSaved.invalidate(),
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

// ─── Main page ────────────────────────────────────────────────────────────────

export default function JobsExplorer() {
  const { user, loading: authLoading } = useAuth();
  const [, navigate] = useLocation();

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

  return (
    <div className="min-h-screen bg-[var(--lw-cream)]">
      {/* Header */}
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
            Your personalised market monitor — live roles, early signals, and employers to watch.
          </p>
        </div>
      </div>

      {/* Body */}
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-5">
        {/* Preferences */}
        <PreferencesPanel />

        {/* Tabs */}
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

          <TabsContent value="companies" className="mt-4">
            <CompaniesTab />
          </TabsContent>
          <TabsContent value="roles" className="mt-4">
            <OpenRolesTab />
          </TabsContent>
          <TabsContent value="signals" className="mt-4">
            <SignalsTab />
          </TabsContent>
          <TabsContent value="saved" className="mt-4">
            <SavedTab />
          </TabsContent>
        </Tabs>

        {/* Back link */}
        <div className="pt-2">
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
