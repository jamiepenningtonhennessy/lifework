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

import { useState } from "react";
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

function TargetSpecPanel({ clientId }: { clientId: number }) {
  const { data: row, isLoading } = trpc.jobs.getTargetSpec.useQuery({ clientId });

  if (isLoading) return <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />;
  if (!row) {
    return (
      <p className="text-sm text-muted-foreground italic">
        No target spec generated yet. Click "Run pipeline" to generate one.
      </p>
    );
  }

  // The spec is stored as a JSON blob — cast it
  const spec = row.spec as {
    targetTitles?: string[];
    targetSectors?: string[];
    targetLocations?: string[];
    seniorityBand?: string;
    rationale?: string;
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
        {spec.targetTitles && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Target Titles</p>
            <div className="flex flex-wrap gap-1">
              {spec.targetTitles.map((t) => (
                <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>
              ))}
            </div>
          </div>
        )}
        {spec.targetSectors && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Target Sectors</p>
            <div className="flex flex-wrap gap-1">
              {spec.targetSectors.map((s) => (
                <Badge key={s} variant="outline" className="text-xs">{s}</Badge>
              ))}
            </div>
          </div>
        )}
        {spec.targetLocations && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Locations</p>
            <div className="flex flex-wrap gap-1">
              {spec.targetLocations.map((l) => (
                <Badge key={l} variant="outline" className="text-xs">{l}</Badge>
              ))}
            </div>
          </div>
        )}
        {spec.seniorityBand && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Seniority</p>
            <Badge variant="secondary" className="text-xs capitalize">{spec.seniorityBand}</Badge>
          </div>
        )}
      </div>
      {spec.rationale && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Rationale</p>
          <p className="text-sm text-muted-foreground leading-relaxed">{spec.rationale}</p>
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        Generated {row.generatedAt ? new Date(row.generatedAt).toLocaleDateString("en-GB") : "—"}
      </p>
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
  const { data, isLoading } = trpc.jobs.getMatches.useQuery({ clientId, minScore: 4 });

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;
  if (!data || data.length === 0) return <p className="text-sm text-muted-foreground italic py-4">No live matches yet.</p>;

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">{data.length} matches</p>
      {data.map((row) => (
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
  const triggerPipeline = trpc.jobs.triggerPipeline.useMutation({
    onSuccess: () => {
      toast.success("Pipeline stages 1 & 2 triggered — target spec and monitor list will refresh shortly.");
      utils.jobs.getTargetSpec.invalidate({ clientId });
      utils.jobs.getMonitorList.invalidate({ clientId });
    },
    onError: (err) => toast.error(`Pipeline failed: ${err.message}`),
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
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5"
          disabled={triggerPipeline.isPending}
          onClick={() => triggerPipeline.mutate({ clientId })}
        >
          {triggerPipeline.isPending ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <RefreshCw className="w-3.5 h-3.5" />
          )}
          Run pipeline (stages 1 & 2)
        </Button>
      </div>

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
