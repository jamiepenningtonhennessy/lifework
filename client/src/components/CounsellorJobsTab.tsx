/**
 * CounsellorJobsTab — read-only Jobs Explorer view for the counsellor client profile page.
 *
 * Shows:
 *   - Target spec summary (if generated)
 *   - Monitor list (companies to watch)
 *   - Open Roles (scored matches)
 *   - Early Signals
 *   - Saved jobs
 *   - Trigger pipeline button (stages 1+2)
 */

import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Building2,
  Briefcase,
  Newspaper,
  Bookmark,
  ExternalLink,
  Loader2,
  RefreshCw,
  Star,
  TrendingUp,
  MapPin,
  Clock,
  FileText,
} from "lucide-react";
import { toast } from "sonner";

// ─── Score badge ──────────────────────────────────────────────────────────────

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

// ─── Target spec panel ────────────────────────────────────────────────────────

interface TargetSpec {
  summary?: string;
  seniority_band?: string;
  role_families?: { title: string; why: string }[];
  functions?: string[];
  sectors?: { sector: string; weight: string }[];
  organisation_archetypes?: string[];
  geography?: { base?: string; acceptable?: string[]; hard_constraints?: string[] };
  differentiators?: string[];
  deal_breakers?: string[];
  search_terms?: string[];
}

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

// ─── Spec edit form state ────────────────────────────────────────────────────
interface SpecFormState {
  summary: string;
  seniority_band: string;
  role_families: { title: string; why: string }[];
  functions: string;
  sectors: { sector: string; weight: string }[];
  organisation_archetypes: string;
  geography_base: string;
  geography_constraints: string;
  differentiators: string;
  deal_breakers: string;
  search_terms: string;
}

function specToForm(spec: TargetSpec): SpecFormState {
  return {
    summary: spec.summary ?? "",
    seniority_band: spec.seniority_band ?? "",
    role_families: spec.role_families?.length ? spec.role_families : [{ title: "", why: "" }],
    functions: (spec.functions ?? []).join(", "),
    sectors: spec.sectors?.length ? spec.sectors : [{ sector: "", weight: "medium" }],
    organisation_archetypes: (spec.organisation_archetypes ?? []).join(", "),
    geography_base: spec.geography?.base ?? "",
    geography_constraints: (spec.geography?.hard_constraints ?? []).join(", "),
    differentiators: (spec.differentiators ?? []).join("\n"),
    deal_breakers: (spec.deal_breakers ?? []).join("\n"),
    search_terms: (spec.search_terms ?? []).join(", "),
  };
}

function formToSpec(f: SpecFormState): TargetSpec {
  const splitComma = (s: string) => s.split(",").map(x => x.trim()).filter(Boolean);
  const splitLine = (s: string) => s.split("\n").map(x => x.trim()).filter(Boolean);
  return {
    summary: f.summary,
    seniority_band: f.seniority_band,
    role_families: f.role_families.filter(r => r.title.trim()),
    functions: splitComma(f.functions),
    sectors: f.sectors.filter(s => s.sector.trim()),
    organisation_archetypes: splitComma(f.organisation_archetypes),
    geography: {
      base: f.geography_base,
      acceptable: [],
      hard_constraints: splitComma(f.geography_constraints),
    },
    differentiators: splitLine(f.differentiators),
    deal_breakers: splitLine(f.deal_breakers),
    search_terms: splitComma(f.search_terms),
  };
}

function TargetSpecPanel({ clientId }: { clientId: number }) {
  const utils = trpc.useUtils();
  const { data: row, isLoading } = trpc.jobs.getTargetSpec.useQuery({ clientId });
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<SpecFormState | null>(null);
  const saveSpec = trpc.jobs.saveTargetSpec.useMutation({
    onSuccess: () => {
      utils.jobs.getTargetSpec.invalidate({ clientId });
      setEditing(false);
      toast.success("Target spec saved.");
    },
    onError: (e) => toast.error(e.message),
  });
  if (isLoading) return <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />;
  if (!row) {
    return (
      <p className="text-sm text-muted-foreground italic">
        No target spec generated yet. Run stage 1 ("Refresh spec & list") to generate one.
      </p>
    );
  }
  const spec = (typeof row.spec === "string" ? JSON.parse(row.spec) : row.spec) as TargetSpec;

  const setField = (key: keyof SpecFormState, value: string) =>
    setForm(f => f ? { ...f, [key]: value } : f);

  if (editing && form) {
    const inputCls = "w-full text-sm border border-border rounded-md px-3 py-2 bg-background focus:outline-none focus:ring-1 focus:ring-ring";
    const labelCls = "block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1";
    return (
      <div className="space-y-5">
        <p className="text-xs text-muted-foreground">Changes take effect on the next pipeline run (stages 2–5).</p>

        {/* Summary */}
        <div>
          <label className={labelCls}>Summary</label>
          <textarea className={`${inputCls} min-h-[80px]`} value={form.summary} onChange={e => setField("summary", e.target.value)} />
        </div>

        {/* Seniority */}
        <div>
          <label className={labelCls}>Seniority Band</label>
          <input className={inputCls} value={form.seniority_band} onChange={e => setField("seniority_band", e.target.value)} placeholder="e.g. Senior / Director" />
        </div>

        {/* Role families */}
        <div>
          <label className={labelCls}>Role Families</label>
          <div className="space-y-2">
            {form.role_families.map((rf, i) => (
              <div key={i} className="flex gap-2 items-start">
                <div className="flex-1 space-y-1">
                  <input
                    className={inputCls}
                    placeholder="Role title (e.g. Commercial Lawyer)"
                    value={rf.title}
                    onChange={e => setForm(f => f ? { ...f, role_families: f.role_families.map((r, j) => j === i ? { ...r, title: e.target.value } : r) } : f)}
                  />
                  <input
                    className={inputCls}
                    placeholder="Why this role fits the client"
                    value={rf.why}
                    onChange={e => setForm(f => f ? { ...f, role_families: f.role_families.map((r, j) => j === i ? { ...r, why: e.target.value } : r) } : f)}
                  />
                </div>
                <button type="button" className="mt-1 text-muted-foreground hover:text-destructive text-xs" onClick={() => setForm(f => f ? { ...f, role_families: f.role_families.filter((_, j) => j !== i) } : f)}>×</button>
              </div>
            ))}
            <button type="button" className="text-xs text-[var(--lw-gold)] hover:underline" onClick={() => setForm(f => f ? { ...f, role_families: [...f.role_families, { title: "", why: "" }] } : f)}>+ Add role family</button>
          </div>
        </div>

        {/* Functions */}
        <div>
          <label className={labelCls}>Functions <span className="normal-case font-normal">(comma-separated)</span></label>
          <input className={inputCls} value={form.functions} onChange={e => setField("functions", e.target.value)} placeholder="e.g. Strategy & Operations, Consulting, Legal" />
        </div>

        {/* Sectors */}
        <div>
          <label className={labelCls}>Sectors</label>
          <div className="space-y-2">
            {form.sectors.map((s, i) => (
              <div key={i} className="flex gap-2 items-center">
                <input
                  className={`${inputCls} flex-1`}
                  placeholder="Sector name"
                  value={s.sector}
                  onChange={e => setForm(f => f ? { ...f, sectors: f.sectors.map((sec, j) => j === i ? { ...sec, sector: e.target.value } : sec) } : f)}
                />
                <select
                  className="text-sm border border-border rounded-md px-2 py-2 bg-background"
                  value={s.weight}
                  onChange={e => setForm(f => f ? { ...f, sectors: f.sectors.map((sec, j) => j === i ? { ...sec, weight: e.target.value } : sec) } : f)}
                >
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
                <button type="button" className="text-muted-foreground hover:text-destructive text-xs" onClick={() => setForm(f => f ? { ...f, sectors: f.sectors.filter((_, j) => j !== i) } : f)}>×</button>
              </div>
            ))}
            <button type="button" className="text-xs text-[var(--lw-gold)] hover:underline" onClick={() => setForm(f => f ? { ...f, sectors: [...f.sectors, { sector: "", weight: "medium" }] } : f)}>+ Add sector</button>
          </div>
        </div>

        {/* Organisation archetypes */}
        <div>
          <label className={labelCls}>Organisation Archetypes <span className="normal-case font-normal">(comma-separated)</span></label>
          <input className={inputCls} value={form.organisation_archetypes} onChange={e => setField("organisation_archetypes", e.target.value)} placeholder="e.g. Law firm, In-house legal, Consultancy" />
        </div>

        {/* Geography */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Geography Base</label>
            <input className={inputCls} value={form.geography_base} onChange={e => setField("geography_base", e.target.value)} placeholder="e.g. London" />
          </div>
          <div>
            <label className={labelCls}>Hard Constraints <span className="normal-case font-normal">(comma-separated)</span></label>
            <input className={inputCls} value={form.geography_constraints} onChange={e => setField("geography_constraints", e.target.value)} placeholder="e.g. No relocation" />
          </div>
        </div>

        {/* Differentiators */}
        <div>
          <label className={labelCls}>Differentiators <span className="normal-case font-normal">(one per line)</span></label>
          <textarea className={`${inputCls} min-h-[80px]`} value={form.differentiators} onChange={e => setField("differentiators", e.target.value)} placeholder="Key strengths and standout qualities" />
        </div>

        {/* Deal breakers */}
        <div>
          <label className={labelCls}>Deal Breakers <span className="normal-case font-normal">(one per line)</span></label>
          <textarea className={`${inputCls} min-h-[80px]`} value={form.deal_breakers} onChange={e => setField("deal_breakers", e.target.value)} placeholder="Roles or environments to exclude" />
        </div>

        {/* Search terms */}
        <div>
          <label className={labelCls}>Search Terms <span className="normal-case font-normal">(comma-separated)</span></label>
          <input className={inputCls} value={form.search_terms} onChange={e => setField("search_terms", e.target.value)} placeholder="e.g. Commercial Lawyer, In-house Counsel, Legal Counsel" />
        </div>

        <div className="flex gap-2 pt-2">
          <Button size="sm" onClick={() => saveSpec.mutate({ clientId, spec: formToSpec(form) as Record<string, unknown> })} disabled={saveSpec.isPending}>
            {saveSpec.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
            Save spec
          </Button>
          <Button size="sm" variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-start">
        <p className="text-xs text-muted-foreground">Generated {row.generatedAt ? new Date(row.generatedAt).toLocaleDateString("en-GB") : "—"}</p>
        <Button size="sm" variant="outline" className="text-xs h-7 px-2" onClick={() => {
          setForm(specToForm(spec));
          setEditing(true);
        }}>Edit spec</Button>
      </div>

      {spec.summary && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Summary</p>
          <p className="text-sm text-muted-foreground leading-relaxed">{spec.summary}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {spec.role_families?.length ? (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Role Families</p>
            <div className="space-y-1">
              {spec.role_families.map((r) => (
                <div key={r.title}>
                  <Badge variant="secondary" className="text-xs mb-0.5">{r.title}</Badge>
                  {r.why && <p className="text-xs text-muted-foreground pl-1">{r.why}</p>}
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div className="space-y-3">
          <SpecBadgeList label="Functions" items={spec.functions ?? []} />
          {spec.sectors?.length ? (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Sectors</p>
              <div className="flex flex-wrap gap-1">
                {spec.sectors.map((s) => (
                  <Badge key={s.sector} variant={s.weight === "high" ? "default" : "outline"} className="text-xs">
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
              <p className="text-xs text-muted-foreground">{spec.geography.base}</p>
              {spec.geography.hard_constraints?.length ? (
                <p className="text-xs text-destructive/80 mt-0.5">Hard constraints: {spec.geography.hard_constraints.join(", ")}</p>
              ) : null}
            </div>
          )}
        </div>
      </div>

      <SpecBadgeList label="Organisation Archetypes" items={spec.organisation_archetypes ?? []} variant="outline" />
      <SpecBadgeList label="Differentiators" items={spec.differentiators ?? []} variant="outline" />
      <SpecBadgeList label="Deal Breakers" items={spec.deal_breakers ?? []} variant="outline" />
      <SpecBadgeList label="Search Terms" items={spec.search_terms ?? []} variant="secondary" />
    </div>
  );
}

// ─── Monitor list panel ───────────────────────────────────────────────────────

function MonitorListPanel({ clientId }: { clientId: number }) {
  const { data, isLoading } = trpc.jobs.getMonitorList.useQuery({ clientId });

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;
  if (!data || data.length === 0) return <p className="text-sm text-muted-foreground italic py-4">No monitor list yet.</p>;

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">{data.length} companies</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {data.map((row) => (
          <div key={row.id} className="border border-border rounded p-3 space-y-1">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-medium">{row.company.name}</p>
              <ScoreBadge score={row.score} />
            </div>
            <div className="flex flex-wrap gap-1">
              {row.company.tier && <Badge variant="secondary" className="text-xs capitalize">{row.company.tier.replace(/_/g, " ")}</Badge>}
              {row.company.sector && <Badge variant="outline" className="text-xs capitalize">{row.company.sector.replace(/_/g, " ")}</Badge>}
            </div>
            {row.reason && <p className="text-xs text-muted-foreground">{row.reason}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Open roles panel ─────────────────────────────────────────────────────────

function OpenRolesPanel({ clientId }: { clientId: number }) {
  const { data, isLoading } = trpc.jobs.getMatches.useQuery({ clientId, minScore: 4, limit: 50, offset: 0 });
  const rows = data?.rows ?? [];
  const total = data?.total ?? 0;

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;
  if (!data || rows.length === 0) return <p className="text-sm text-muted-foreground italic py-4">No live matches yet.</p>;

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">{total} matches (showing first 50)</p>
      {rows.map((row) => (
        <div key={row.id} className="border border-border rounded p-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-medium">{row.listing.title}</p>
              <p className="text-xs text-muted-foreground">{row.company.name}</p>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <ScoreBadge score={row.score} />
              {row.listing.url && (
                <a href={row.listing.url} target="_blank" rel="noopener noreferrer">
                  <Button size="sm" variant="ghost" className="h-6 px-1.5">
                    <ExternalLink className="w-3 h-3" />
                  </Button>
                </a>
              )}
            </div>
          </div>
          {row.listing.location && (
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <MapPin className="w-3 h-3" /> {row.listing.location}
            </p>
          )}
          {row.rationale && (
            <p className="text-xs text-muted-foreground mt-1 italic">"{row.rationale}"</p>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Signals panel ────────────────────────────────────────────────────────────

function SignalsPanel({ clientId }: { clientId: number }) {
  const { data, isLoading } = trpc.jobs.getSignals.useQuery({ clientId, minRelevance: 1 });

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;
  if (!data || data.length === 0) return <p className="text-sm text-muted-foreground italic py-4">No signals yet.</p>;

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">{data.length} signals</p>
      {data.map((signal) => (
        <div key={signal.id} className="border border-border rounded p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium leading-snug">{signal.headline}</p>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {signal.company && <span className="text-xs text-muted-foreground">{signal.company}</span>}
                <RelevanceBadge relevance={signal.relevance} />
                {signal.onMonitorList && <Badge className="text-xs bg-amber-100 text-amber-800">On watch list</Badge>}
              </div>
            </div>
            {signal.url && (
              <a href={signal.url} target="_blank" rel="noopener noreferrer">
                <Button size="sm" variant="ghost" className="h-6 px-1.5 flex-shrink-0">
                  <ExternalLink className="w-3 h-3" />
                </Button>
              </a>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Saved panel ──────────────────────────────────────────────────────────────

function SavedPanel({ clientId }: { clientId: number }) {
  const { data, isLoading } = trpc.jobs.getSaved.useQuery({ clientId });

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;
  if (!data || data.length === 0) return <p className="text-sm text-muted-foreground italic py-4">Nothing saved yet.</p>;

  const statusColour: Record<string, string> = {
    exploring: "bg-blue-100 text-blue-700",
    applied: "bg-emerald-100 text-emerald-800",
    not_for_me: "bg-slate-100 text-slate-500",
  };

  return (
    <div className="space-y-2">
      {data.map((saved) => (
        <div key={saved.id} className="border border-border rounded p-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-medium">{saved.title}</p>
              {saved.organisation && <p className="text-xs text-muted-foreground">{saved.organisation}</p>}
            </div>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColour[saved.status ?? "exploring"]}`}>
              {saved.status === "not_for_me" ? "Not for me" : saved.status === "applied" ? "Applied" : "Exploring"}
            </span>
          </div>
          {saved.notes && <p className="text-xs text-muted-foreground mt-1">{saved.notes}</p>}
        </div>
      ))}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function CounsellorJobsTab({
  clientId,
  clientName,
}: {
  clientId: number;
  clientName?: string;
}) {
    const utils = trpc.useUtils();
  const storageKey = `jobs-run-${clientId}`;

  // Persist activeRunId in localStorage so it survives tab switches and page scrolls
  const [activeRunId, setActiveRunIdState] = useState<number | null>(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      return stored ? Number(stored) : null;
    } catch { return null; }
  });
  const setActiveRunId = (id: number | null) => {
    setActiveRunIdState(id);
    try {
      if (id === null) localStorage.removeItem(storageKey);
      else localStorage.setItem(storageKey, String(id));
    } catch { /* ignore */ }
  };

  // Show bar immediately when run starts, before first poll
  const [runStarted, setRunStarted] = useState(activeRunId !== null);

  const { data: pipelineStatus } = trpc.jobs.getPipelineStatus.useQuery(
    { runId: activeRunId! },
    {
      enabled: activeRunId !== null,
      refetchInterval: (query) => {
        const status = query.state.data?.status;
        return status === "done" || status === "error" ? false : 2000;
      },
    }
  );

  // When run completes, invalidate data and clear the run
  useEffect(() => {
    if (!pipelineStatus) return;
    if (pipelineStatus.status === "done") {
      toast.success("Pipeline complete — data refreshed.");
      utils.jobs.getTargetSpec.invalidate({ clientId });
      utils.jobs.getMonitorList.invalidate({ clientId });
      utils.jobs.getMatches.invalidate({ clientId });
      utils.jobs.getSignals.invalidate({ clientId });
      setActiveRunId(null);
      setRunStarted(false);
    } else if (pipelineStatus.status === "error") {
      // Keep bar visible with error state — don't clear immediately
      setActiveRunIdState(null);
      try { localStorage.removeItem(storageKey); } catch { /* ignore */ }
    }
  }, [pipelineStatus?.status]);

  const triggerPipeline = trpc.jobs.triggerPipeline.useMutation({
    onSuccess: (data) => {
      setActiveRunId(data.runId);
      setRunStarted(true);
      toast.info(data.fullPipeline ? "Running all 5 stages in the background…" : "Refreshing spec & monitor list…");
    },
    onError: (err) => toast.error(`Could not start pipeline: ${err.message}`),
  });

  return (
    <div className="space-y-6">
      {/* Header + trigger */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-lg font-serif font-semibold">
            Jobs Explorer {clientName ? `— ${clientName}` : ""}
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Read-only view of this client's market monitor.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            disabled={triggerPipeline.isPending}
            onClick={() => triggerPipeline.mutate({ clientId, fullPipeline: false })}
          >
            {triggerPipeline.isPending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <RefreshCw className="w-3.5 h-3.5" />
            )}
            Refresh spec & list
          </Button>
          <Button
            size="sm"
            className="gap-1.5 bg-[var(--lw-gold)] hover:bg-[oklch(0.60_0.13_72)] text-white"
            disabled={triggerPipeline.isPending}
            onClick={() => triggerPipeline.mutate({ clientId, fullPipeline: true })}
          >
            {triggerPipeline.isPending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <RefreshCw className="w-3.5 h-3.5" />
            )}
            Run full pipeline (all 5 stages)
          </Button>
        </div>
      </div>

      {/* Pipeline progress indicator — shown as soon as run starts, persists across scrolls */}
      {runStarted && (!pipelineStatus || (pipelineStatus.status !== "done" && pipelineStatus.status !== "error")) && (
        <div className="rounded-lg border border-border bg-muted/40 px-4 py-3 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 font-medium">
              <Loader2 className="w-4 h-4 animate-spin text-[var(--lw-gold)]" />
              {!pipelineStatus || pipelineStatus.status === "pending" ? "Starting pipeline…" : (
                (() => {
                  const labels = ["Generating target spec", "Building monitor list", "Scanning job listings", "Scanning news signals", "Sending alerts"];
                  const idx = Math.max(0, (pipelineStatus.currentStage ?? 1) - 1);
                  return `Stage ${pipelineStatus.currentStage} of ${pipelineStatus.totalStages}: ${labels[idx] ?? "Running"}…`;
                })()
              )}
            </span>
            <span className="text-xs text-muted-foreground">
              {pipelineStatus?.currentStage ?? 0} / {pipelineStatus?.totalStages ?? 5}
            </span>
          </div>
          <div className="w-full bg-border rounded-full h-1.5 overflow-hidden">
            <div
              className="h-full bg-[var(--lw-gold)] rounded-full transition-all duration-700"
              style={{ width: `${Math.round(((pipelineStatus?.currentStage ?? 0) / (pipelineStatus?.totalStages ?? 5)) * 100)}%` }}
            />
          </div>
        </div>
      )}
      {activeRunId !== null && pipelineStatus?.status === "error" && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <strong>Pipeline failed at stage {pipelineStatus.currentStage}:</strong>{" "}
          {pipelineStatus.errorMessage ?? "Unknown error"}
        </div>
      )}

      {/* Target spec */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-serif flex items-center gap-2">
            <FileText className="w-4 h-4" /> Target Specification
          </CardTitle>
        </CardHeader>
        <CardContent>
          <TargetSpecPanel clientId={clientId} />
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="companies">
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="companies" className="gap-1.5 text-xs">
            <Building2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Companies</span>
          </TabsTrigger>
          <TabsTrigger value="roles" className="gap-1.5 text-xs">
            <Briefcase className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Open Roles</span>
          </TabsTrigger>
          <TabsTrigger value="signals" className="gap-1.5 text-xs">
            <Newspaper className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Signals</span>
          </TabsTrigger>
          <TabsTrigger value="saved" className="gap-1.5 text-xs">
            <Bookmark className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Saved</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="companies" className="mt-4">
          <MonitorListPanel clientId={clientId} />
        </TabsContent>
        <TabsContent value="roles" className="mt-4">
          <OpenRolesPanel clientId={clientId} />
        </TabsContent>
        <TabsContent value="signals" className="mt-4">
          <SignalsPanel clientId={clientId} />
        </TabsContent>
        <TabsContent value="saved" className="mt-4">
          <SavedPanel clientId={clientId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
