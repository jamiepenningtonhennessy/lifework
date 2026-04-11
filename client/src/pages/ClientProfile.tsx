import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useLocation, useParams } from "wouter";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import {
  ArrowLeft,
  Loader2,
  Brain,
  Star,
  FileText,
  MessageSquare,
  Users,
  Briefcase,
  GraduationCap,
  RefreshCw,
  Download,
  GitCompare,
  Tag,
  Sparkles,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Upload,
  Pencil,
  Compass,
  Unlock,
  Lock,
} from "lucide-react";
import { Streamdown } from "streamdown";
import { toast } from "sonner";
import CoachingSessionTab from "@/components/CoachingSessionTab";
import { InsightsMapping } from "@/components/InsightsMapping";
import WowReportTab from "@/components/WowReportTab";

type Tab = "overview" | "interview" | "background" | "via" | "ocean" | "insights" | "report" | "virtual-peter" | "coaching-annex" | "coaching-session" | "wow-report";

export default function ClientProfile() {
  const { isAuthenticated, loading, user } = useAuth();
  const [, navigate] = useLocation();
  const params = useParams<{ id: string }>();
  const clientId = parseInt(params.id ?? "0");
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [counselorNotes, setCounselorNotes] = useState("");
  const utils = trpc.useUtils();

  const { data, isLoading } = trpc.counselor.getClientProfile.useQuery(
    { clientId },
    { enabled: isAuthenticated && user?.role === "admin" && !!clientId }
  );

  const { data: viaData } = trpc.via.getQuestions.useQuery();
  const strengthsMap = new Map(viaData?.strengths.map((s) => [s.id, s]) ?? []);

  const triggerAnalysis = trpc.counselor.triggerAnalysis.useMutation({
    onSuccess: () => {
      toast.success("Analysis generated successfully.");
      utils.counselor.getClientProfile.invalidate({ clientId });
    },
    onError: () => toast.error("Failed to generate analysis."),
  });

  const saveNotes = trpc.counselor.saveNotes.useMutation({
    onSuccess: () => toast.success("Notes saved."),
  });

  // Virtual Peter state
  const [expandedMatchId, setExpandedMatchId] = useState<number | null>(null);
  const [matchNotes, setMatchNotes] = useState<Record<number, string>>({});
  const { data: existingMatches, refetch: refetchMatches } = trpc.virtualPeter.getMatches.useQuery(
    { clientId },
    { enabled: isAuthenticated && user?.role === "admin" && !!clientId }
  );
  const findMatches = trpc.virtualPeter.findMatches.useMutation({
    onSuccess: () => {
      toast.success("Parallel clients found.");
      refetchMatches();
    },
    onError: () => toast.error("Failed to find parallel clients."),
  });
  const updateMatchNotesMutation = trpc.virtualPeter.updateMatchNotes.useMutation({
    onSuccess: () => toast.success("Notes saved."),
    onError: () => toast.error("Failed to save notes."),
  });

  const unlockCareerExplorer = trpc.counselor.unlockCareerExplorer.useMutation({
    onSuccess: () => {
      toast.success("Career Explorer unlocked for this client.");
      utils.counselor.getClientProfile.invalidate({ clientId });
    },
    onError: () => toast.error("Failed to unlock Career Explorer."),
  });

  const lockCareerExplorer = trpc.counselor.lockCareerExplorer.useMutation({
    onSuccess: () => {
      toast.success("Career Explorer locked.");
      utils.counselor.getClientProfile.invalidate({ clientId });
    },
    onError: () => toast.error("Failed to lock Career Explorer."),
  });

  // Client name editing
  const [editingName, setEditingName] = useState(false);
  const [nameFirst, setNameFirst] = useState("");
  const [nameLast, setNameLast] = useState("");
  const updateClientName = trpc.counselor.updateClientName.useMutation({
    onSuccess: () => {
      toast.success("Name updated.");
      setEditingName(false);
      utils.counselor.getClientProfile.invalidate({ clientId });
    },
    onError: () => toast.error("Failed to update name."),
  });

  const enrichFromSageMutation = trpc.counselor.enrichClientFromSage.useMutation({
    onSuccess: (result) => {
      toast.success(`Enrichment complete — ${result.enriched} record${result.enriched !== 1 ? 's' : ''} updated`);
      utils.counselor.getClientProfile.invalidate({ clientId });
    },
    onError: () => toast.error("Enrichment failed — please try again"),
  });

  const regenerateStage1Mutation = trpc.counselor.regenerateCanonicalStage1.useMutation({
    onSuccess: () => {
      toast.success("Life history analysis regenerated — both reports will use the new version");
      utils.counselor.getClientProfile.invalidate({ clientId });
    },
    onError: () => toast.error("Regeneration failed — please try again"),
  });

  // Achievement inline editing
  const [editingAchievementId, setEditingAchievementId] = useState<number | null>(null);
  const [achievementDraft, setAchievementDraft] = useState<{
    title: string;
    description: string;
    age: string;
    esf: string;
    sageEnrichment: string;
    counsellorNotes: string;
  } | null>(null);

  const updateAchievementMutation = trpc.counselor.updateAchievement.useMutation({
    onSuccess: () => {
      toast.success("Achievement updated.");
      setEditingAchievementId(null);
      setAchievementDraft(null);
      utils.counselor.getClientProfile.invalidate({ clientId });
    },
    onError: () => toast.error("Failed to save changes."),
  });

  function startEditAchievement(a: any) {
    setEditingAchievementId(a.id);
    setAchievementDraft({
      title: a.title ?? "",
      description: a.description ?? "",
      age: a.age != null ? String(a.age) : "",
      esf: a.esf ?? "",
      sageEnrichment: a.sageEnrichment ?? "",
      counsellorNotes: a.counsellorNotes ?? "",
    });
  }

  function saveAchievementEdit(id: number) {
    if (!achievementDraft) return;
    updateAchievementMutation.mutate({
      id,
      title: achievementDraft.title || undefined,
      description: achievementDraft.description || null,
      age: achievementDraft.age ? parseInt(achievementDraft.age) : null,
      esf: (achievementDraft.esf as any) || null,
      sageEnrichment: achievementDraft.sageEnrichment || null,
      counsellorNotes: achievementDraft.counsellorNotes || null,
    });
  }

  if (!loading && !isAuthenticated) {
    window.location.href = getLoginUrl();
    return null;
  }

  if (!loading && user?.role !== "admin") {
    return <div className="min-h-screen flex items-center justify-center"><p className="text-muted-foreground">Access denied.</p></div>;
  }

  const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "overview", label: "Overview", icon: <Users className="w-4 h-4" /> },
    { id: "interview", label: "Interview", icon: <MessageSquare className="w-4 h-4" /> },
    { id: "background", label: "Background", icon: <Briefcase className="w-4 h-4" /> },
    { id: "via", label: "VIA Strengths", icon: <Star className="w-4 h-4" /> },
    { id: "ocean", label: "OCEAN", icon: <Brain className="w-4 h-4" /> },
    { id: "insights", label: "Insights", icon: <Compass className="w-4 h-4" /> },
    { id: "report", label: "Analysis Report", icon: <Brain className="w-4 h-4" /> },
    { id: "virtual-peter", label: "Parallel Clients", icon: <GitCompare className="w-4 h-4" /> },
  { id: "coaching-annex", label: "Coaching Annex", icon: <FileText className="w-4 h-4" /> },
  { id: "coaching-session", label: "Coaching Session", icon: <Sparkles className="w-4 h-4" /> },
  { id: "wow-report", label: "WOW Report", icon: <Sparkles className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container flex items-center justify-between h-14">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/counselor")}>
              <ArrowLeft className="w-4 h-4 mr-1" /> Clients
            </Button>
            <div className="h-4 w-px bg-border" />
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            ) : (
              <span className="font-serif font-semibold text-foreground">
                {data?.profile ? "Client Profile" : "Client"}
              </span>
            )}
          </div>
          {data?.profile && (
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => window.open(`/api/export/report/${clientId}`, '_blank')}
                className="gap-1"
              >
                <Download className="w-3.5 h-3.5" />
                Export PDF
              </Button>
              <Button
                size="sm"
                onClick={() => triggerAnalysis.mutate({ clientId })}
                disabled={triggerAnalysis.isPending}
                className="gap-1 bg-[var(--lw-gold)] hover:bg-[oklch(0.60 0.13 72)] text-white"
              >
                {triggerAnalysis.isPending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="w-3.5 h-3.5" />
                )}
                {data?.report ? "Regenerate Analysis" : "Generate Analysis"}
              </Button>
            </div>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : !data?.profile ? (
        <div className="container py-16 text-center">
          <p className="text-muted-foreground">Client not found.</p>
        </div>
      ) : (
        <div className="container py-8">
          {/* Client header */}
          <div className="mb-6">
            {editingName ? (
              <div className="flex items-center gap-2 flex-wrap">
                <Input
                  className="w-36 h-8 text-sm"
                  placeholder="First name"
                  value={nameFirst}
                  onChange={(e) => setNameFirst(e.target.value)}
                  autoFocus
                />
                <Input
                  className="w-36 h-8 text-sm"
                  placeholder="Last name"
                  value={nameLast}
                  onChange={(e) => setNameLast(e.target.value)}
                />
                <Button
                  size="sm"
                  className="h-8 bg-[var(--lw-gold)] hover:bg-[oklch(0.60_0.13_72)] text-white"
                  disabled={!nameFirst.trim() || updateClientName.isPending}
                  onClick={() => updateClientName.mutate({ clientId, firstName: nameFirst.trim(), lastName: nameLast.trim() || undefined })}
                >
                  {updateClientName.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Save"}
                </Button>
                <Button size="sm" variant="ghost" className="h-8" onClick={() => setEditingName(false)}>Cancel</Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-serif font-bold text-foreground">
                  {data.profile.firstName && data.profile.lastName
                    ? `${data.profile.firstName} ${data.profile.lastName}`
                    : data.profile.firstName
                    ? data.profile.firstName
                    : "Client Profile"}
                </h1>
                <button
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  title="Edit client name"
                  onClick={() => {
                    setNameFirst(data.profile.firstName ?? "");
                    setNameLast(data.profile.lastName ?? "");
                    setEditingName(true);
                  }}
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
            <p className="text-muted-foreground text-sm mt-1">
              {data.profile.currentRole && data.profile.currentOrg
                ? `${data.profile.currentRole} at ${data.profile.currentOrg}`
                : data.profile.currentRole ?? ""}
            </p>
          </div>

          {/* Tabs */}
          <div className="mb-6 border-b border-border">
            <div className="flex flex-wrap">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px whitespace-nowrap ${
                    activeTab === tab.id
                      ? "border-[var(--lw-gold)] text-[var(--lw-gold)]"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tab content */}
          {activeTab === "overview" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-base font-serif">Status</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {[
                    { label: "Interview", status: data.profile.interviewStatus },
                    { label: "VIA Survey", status: data.profile.viaStatus },
                    { label: "OCEAN", status: data.profile.ipipStatus ?? "not_started" },
                    { label: "WOW Report", status: data.report?.wowReportStatus === "done" ? "completed" : data.report?.wowReportStatus === "generating" || data.report?.wowReportStatus === "pending" ? "in_progress" : "not_started" },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">{item.label}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${
                        item.status === "completed" ? "bg-green-100 text-green-700" :
                        item.status === "in_progress" ? "bg-blue-100 text-blue-700" :
                        "bg-muted text-muted-foreground"
                      }`}>
                        {item.status?.replace("_", " ") ?? "Not started"}
                      </span>
                    </div>
                  ))}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-base font-serif">Data Summary</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Interview messages</span>
                    <span className="font-medium">{data.messages.length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Achievements recorded</span>
                    <span className="font-medium">{data.achievements.length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Education records</span>
                    <span className="font-medium">{data.education.length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Career records</span>
                    <span className="font-medium">{data.career.length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">VIA completed</span>
                    <span className="font-medium">{data.via ? "Yes" : "No"}</span>
                  </div>
                </CardContent>
              </Card>
              {/* Counselor notes */}
              <Card className="md:col-span-2">
                <CardHeader className="pb-2"><CardTitle className="text-base font-serif">Counselor Notes</CardTitle></CardHeader>
                <CardContent>
                  <Textarea
                    rows={5}
                    value={counselorNotes || (data.report?.counselorNotes ?? "")}
                    onChange={(e) => setCounselorNotes(e.target.value)}
                    placeholder="Private notes for the feedback session…"
                    className="mb-3"
                  />
                  <Button
                    size="sm"
                    onClick={() => saveNotes.mutate({ clientId, notes: counselorNotes })}
                    disabled={saveNotes.isPending}
                    className="bg-[var(--lw-gold)] hover:bg-[oklch(0.60 0.13 72)] text-white"
                  >
                    Save Notes
                  </Button>
                </CardContent>
              </Card>
              {/* Career Explorer unlock control */}
              <Card className="md:col-span-2">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-serif flex items-center gap-2">
                    <Compass className="w-4 h-4" style={{ color: "var(--lw-gold)" }} />
                    Career Explorer
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {data.profile?.careerExplorerUnlocked ? (
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-emerald-700 font-medium flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4" /> Unlocked — client has access to Sage
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">The client can now use the Career Explorer to explore careers in the context of their full Lifework profile.</p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={lockCareerExplorer.isPending}
                        onClick={() => lockCareerExplorer.mutate({ clientId })}
                        className="text-xs ml-4 flex-shrink-0"
                      >
                        {lockCareerExplorer.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Lock"}
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Not yet unlocked.</p>
                        <p className="text-xs text-muted-foreground mt-1">Unlock after the coaching call so the client can explore careers with Sage using their full Lifework profile as context.</p>
                      </div>
                      <Button
                        size="sm"
                        disabled={unlockCareerExplorer.isPending}
                        onClick={() => unlockCareerExplorer.mutate({ clientId })}
                        className="bg-[var(--lw-navy)] text-white hover:opacity-90 gap-2 ml-4 flex-shrink-0"
                      >
                        {unlockCareerExplorer.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <>
                          <Unlock className="w-3.5 h-3.5" /> Unlock Career Explorer
                        </>}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === "interview" && (() => {
            // ── Phase definitions mirrored from Interview.tsx ──────────────────
            const LIFE_PHASES = [
              { label: "Early Childhood",   ageRange: "Ages 0–5",   decade: "childhood",    subPhase: "Early (0-5)" },
              { label: "Mid Childhood",     ageRange: "Ages 6–11",  decade: "childhood",    subPhase: "Mid (6-11)" },
              { label: "Late Childhood",    ageRange: "Ages 12–18", decade: "teens",        subPhase: "Late (12-18)" },
              { label: "Your 20s",          ageRange: "Ages 19–29", decade: "twenties",     subPhase: "" },
              { label: "Your 30s",          ageRange: "Ages 30–39", decade: "thirties",     subPhase: "" },
              { label: "Your 40s",          ageRange: "Ages 40–49", decade: "forties",      subPhase: "" },
              { label: "Your 50s",          ageRange: "Ages 50–59", decade: "fifties",      subPhase: "" },
              { label: "Your 60s & beyond", ageRange: "Ages 60+",   decade: "sixties_plus", subPhase: "" },
            ] as const;

            const ESF_COLORS: Record<string, string> = {
              enjoyable:  "bg-blue-100 text-blue-700",
              satisfying: "bg-emerald-100 text-emerald-700",
              fulfilling: "bg-purple-100 text-purple-700",
            };

            const achievements = data.achievements ?? [];
            const chatSessions = (data as any).chatSessions ?? [];
            const hasAny = achievements.length > 0;
            const enrichedCount = achievements.filter((a: any) => a.sageEnrichment).length;

            return (
              <div className="max-w-3xl space-y-8">
                {/* Sage enrichment action bar — show if legacy interview messages OR chat sessions with summaries exist */}
                {((data.messages && data.messages.length > 0) || chatSessions.some((s: any) => s.summary)) && (
                  <div className="flex items-center justify-between p-3 rounded-xl border border-[var(--lw-gold)]/30 bg-[var(--lw-gold)]/5">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-[var(--lw-gold)]" />
                      <span className="text-sm text-foreground">
                        {enrichedCount > 0
                          ? `${enrichedCount} of ${achievements.length} records Sage-enriched`
                          : "Chat to Sage conversation available — enrich achievement records"}
                      </span>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-[var(--lw-gold)]/40 text-[var(--lw-gold)] hover:bg-[var(--lw-gold)]/10"
                      onClick={() => enrichFromSageMutation.mutate({ clientId: Number(params.id) })}
                      disabled={enrichFromSageMutation.isPending}
                    >
                      {enrichFromSageMutation.isPending ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" />Enriching...</> : <><Sparkles className="w-3 h-3 mr-1" />{enrichedCount > 0 ? "Re-enrich" : "Enrich from Sage"}</>}
                    </Button>
                  </div>
                )}

                {/* ── Regenerate canonical Stage 1 button ── */}
                <div className="flex items-center justify-between p-3 rounded-xl border border-blue-500/20 bg-blue-500/5">
                  <div className="flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 text-blue-400" />
                    <div className="flex flex-col">
                      <span className="text-sm text-foreground">
                        Canonical life history analysis — shared by the counsellor report and WoW report.
                      </span>
                      {data?.report?.canonicalStage1GeneratedAt ? (
                        <span className="text-xs text-muted-foreground mt-0.5">
                          Last analysed: {new Date(data.report.canonicalStage1GeneratedAt).toLocaleString()}
                        </span>
                      ) : (
                        <span className="text-xs text-amber-400 mt-0.5">Not yet generated — click to generate now</span>
                      )}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-blue-500/40 text-blue-400 hover:bg-blue-500/10 whitespace-nowrap ml-3"
                    onClick={() => regenerateStage1Mutation.mutate({ clientId: Number(params.id) })}
                    disabled={regenerateStage1Mutation.isPending}
                  >
                    {regenerateStage1Mutation.isPending
                      ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" />Generating...</>
                      : <><RefreshCw className="w-3 h-3 mr-1" />Regenerate Life History Analysis</>}
                  </Button>
                </div>

                {!hasAny && (
                  <p className="text-muted-foreground text-sm">No life history entries recorded yet.</p>
                )}

                {/* ── Structured life history by phase ── */}
                {LIFE_PHASES.map((phase) => {
                  const items = achievements.filter((a: any) => {
                    if (a.decade !== phase.decade) return false;
                    if (phase.subPhase) return a.title?.startsWith(`[${phase.subPhase}] `);
                    return !a.title?.match(/^\[.+\] /);
                  });
                  if (items.length === 0) return null;
                  return (
                    <div key={`${phase.decade}-${phase.subPhase}`}>
                      {/* Phase header */}
                      <div className="flex items-baseline gap-3 mb-3">
                        <h3 className="font-serif font-semibold text-foreground text-base">{phase.label}</h3>
                        <span className="text-xs text-muted-foreground">{phase.ageRange}</span>
                      </div>
                      <div className="space-y-3">
                        {items.map((a: any) => {
                          const displayTitle = phase.subPhase
                            ? (a.title ?? "").replace(`[${phase.subPhase}] `, "")
                            : (a.title ?? "");
                          const isEditing = editingAchievementId === a.id;
                          const draft = isEditing ? achievementDraft : null;

                          return (
                            <div key={a.id} className={`rounded-xl border bg-card ${
                              isEditing ? 'border-[var(--lw-gold)]/60 ring-1 ring-[var(--lw-gold)]/20' :
                              a.sageEnrichment ? 'border-[var(--lw-gold)]/40' : 'border-border'
                            }`}>
                              {/* ── View mode ── */}
                              {!isEditing && (
                                <div className="p-4">
                                  <div className="flex items-start justify-between gap-3 mb-1">
                                    <p className="font-semibold text-sm text-foreground leading-snug">{displayTitle}</p>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                      {a.sageEnrichment && (
                                        <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-[var(--lw-gold)]/15 text-[var(--lw-gold)] border border-[var(--lw-gold)]/30">Sage-enriched</span>
                                      )}
                                      {a.age != null && (
                                        <span className="text-xs text-muted-foreground">Age {a.age}</span>
                                      )}
                                      {a.esf && (
                                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold capitalize ${
                                          ESF_COLORS[a.esf] ?? "bg-muted text-muted-foreground"
                                        }`}>{a.esf}</span>
                                      )}
                                      <button
                                        onClick={() => startEditAchievement(a)}
                                        className="ml-1 p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                                        title="Edit this achievement"
                                      >
                                        <Pencil className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </div>
                                  {a.description && (
                                    <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{a.description}</p>
                                  )}
                                  {a.sageEnrichment && (
                                    <div className="mt-3 pt-3 border-t border-[var(--lw-gold)]/20">
                                      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--lw-gold)] mb-1">Sage conversation</p>
                                      <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">{a.sageEnrichment}</p>
                                    </div>
                                  )}
                                  {a.counsellorNotes && (
                                    <div className="mt-3 pt-3 border-t border-border">
                                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Counsellor notes</p>
                                      <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{a.counsellorNotes}</p>
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* ── Edit mode ── */}
                              {isEditing && draft && (
                                <div className="p-4 space-y-3">
                                  <p className="text-xs font-semibold uppercase tracking-wide text-[var(--lw-gold)] mb-2">Editing achievement</p>

                                  <div>
                                    <label className="text-xs text-muted-foreground mb-1 block">Title</label>
                                    <input
                                      className="w-full text-sm border border-border rounded px-2 py-1.5 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-[var(--lw-gold)]/50"
                                      value={draft.title}
                                      onChange={e => setAchievementDraft(d => d ? { ...d, title: e.target.value } : d)}
                                    />
                                  </div>

                                  <div className="flex gap-3">
                                    <div className="w-20">
                                      <label className="text-xs text-muted-foreground mb-1 block">Age</label>
                                      <input
                                        type="number"
                                        className="w-full text-sm border border-border rounded px-2 py-1.5 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-[var(--lw-gold)]/50"
                                        value={draft.age}
                                        onChange={e => setAchievementDraft(d => d ? { ...d, age: e.target.value } : d)}
                                      />
                                    </div>
                                    <div className="flex-1">
                                      <label className="text-xs text-muted-foreground mb-1 block">ESF</label>
                                      <select
                                        className="w-full text-sm border border-border rounded px-2 py-1.5 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-[var(--lw-gold)]/50"
                                        value={draft.esf}
                                        onChange={e => setAchievementDraft(d => d ? { ...d, esf: e.target.value } : d)}
                                      >
                                        <option value="">Not set</option>
                                        <option value="enjoyable">Enjoyable</option>
                                        <option value="satisfying">Satisfying</option>
                                        <option value="fulfilling">Fulfilling</option>
                                      </select>
                                    </div>
                                  </div>

                                  <div>
                                    <label className="text-xs text-muted-foreground mb-1 block">Client description</label>
                                    <textarea
                                      rows={3}
                                      className="w-full text-sm border border-border rounded px-2 py-1.5 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-[var(--lw-gold)]/50 resize-y"
                                      value={draft.description}
                                      onChange={e => setAchievementDraft(d => d ? { ...d, description: e.target.value } : d)}
                                    />
                                  </div>

                                  <div>
                                    <label className="text-xs text-muted-foreground mb-1 block">Sage conversation <span className="text-[var(--lw-gold)]">&#9679;</span></label>
                                    <textarea
                                      rows={3}
                                      className="w-full text-sm border border-[var(--lw-gold)]/30 rounded px-2 py-1.5 bg-[var(--lw-gold)]/5 text-foreground focus:outline-none focus:ring-1 focus:ring-[var(--lw-gold)]/50 resize-y"
                                      value={draft.sageEnrichment}
                                      onChange={e => setAchievementDraft(d => d ? { ...d, sageEnrichment: e.target.value } : d)}
                                    />
                                  </div>

                                  <div>
                                    <label className="text-xs text-muted-foreground mb-1 block">Counsellor notes <span className="text-xs text-muted-foreground">(private — feeds into analysis)</span></label>
                                    <textarea
                                      rows={3}
                                      className="w-full text-sm border border-border rounded px-2 py-1.5 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-[var(--lw-gold)]/50 resize-y"
                                      placeholder="Add your own observations, patterns noticed, or follow-up questions..."
                                      value={draft.counsellorNotes}
                                      onChange={e => setAchievementDraft(d => d ? { ...d, counsellorNotes: e.target.value } : d)}
                                    />
                                  </div>

                                  <div className="flex gap-2 pt-1">
                                    <Button
                                      size="sm"
                                      className="bg-[var(--lw-gold)] text-white hover:bg-[var(--lw-gold)]/90"
                                      onClick={() => saveAchievementEdit(a.id)}
                                      disabled={updateAchievementMutation.isPending}
                                    >
                                      {updateAchievementMutation.isPending ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" />Saving...</> : "Save changes"}
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => { setEditingAchievementId(null); setAchievementDraft(null); }}
                                      disabled={updateAchievementMutation.isPending}
                                    >
                                      Cancel
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}

                {/* ── Chat to Peter summaries ── */}
                {chatSessions.filter((s: any) => s.summary).length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <MessageSquare className="w-4 h-4 text-[var(--lw-gold)]" />
                      <h3 className="font-serif font-semibold text-foreground text-base">Chat to Sage — Summaries</h3>
                    </div>
                    <div className="space-y-3">
                      {chatSessions
                        .filter((s: any) => s.summary)
                        .map((s: any) => (
                          <div key={s.id} className="p-4 rounded-xl border border-[var(--lw-gold)]/20 bg-[var(--lw-gold-light)]/10">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-xs font-semibold uppercase tracking-wide text-[var(--lw-gold)]">
                                {s.section === "life_history" ? "Life History" : "Career & Education"}
                              </span>
                              {s.createdAt && (
                                <span className="text-xs text-muted-foreground">
                                  · {new Date(s.createdAt).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{s.summary}</p>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {activeTab === "background" && (
            <div className="max-w-3xl space-y-6">
              {/* Family */}
              {data.family && (
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-base font-serif flex items-center gap-2"><Users className="w-4 h-4" /> Family Background</CardTitle></CardHeader>
                  <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    {data.family.fatherOccupation && <div><span className="text-muted-foreground">Father: </span>{data.family.fatherOccupation}</div>}
                    {data.family.motherOccupation && <div><span className="text-muted-foreground">Mother: </span>{data.family.motherOccupation}</div>}
                    {data.family.siblingPosition && <div><span className="text-muted-foreground">Sibling position: </span>{data.family.siblingPosition}</div>}
                    {data.family.upbringingLocation && <div><span className="text-muted-foreground">Upbringing: </span>{data.family.upbringingLocation}</div>}
                    {data.family.familyNarrative && <div className="sm:col-span-2"><span className="text-muted-foreground">Narrative: </span>{data.family.familyNarrative}</div>}
                    {data.family.significantInfluences && <div className="sm:col-span-2"><span className="text-muted-foreground">Influences: </span>{data.family.significantInfluences}</div>}
                  </CardContent>
                </Card>
              )}
              {/* Education */}
              {data.education.length > 0 && (
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-base font-serif flex items-center gap-2"><GraduationCap className="w-4 h-4" /> Education</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    {data.education.map((e) => (
                      <div key={e.id} className="text-sm border-b border-border pb-3 last:border-0 last:pb-0">
                        <p className="font-medium">{e.institution}</p>
                        <p className="text-muted-foreground">{[e.qualification, e.subject].filter(Boolean).join(" — ")} {e.yearFrom && `(${e.yearFrom}–${e.yearTo ?? ""})`}</p>
                        {e.highlights && <p className="mt-1">{e.highlights}</p>}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
              {/* Career */}
              {data.career.length > 0 && (
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-base font-serif flex items-center gap-2"><Briefcase className="w-4 h-4" /> Career History</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    {data.career.map((c) => (
                      <div key={c.id} className="text-sm border-b border-border pb-3 last:border-0 last:pb-0">
                        <p className="font-medium">{c.role} <span className="text-muted-foreground font-normal">at {c.organisation}</span></p>
                        <p className="text-muted-foreground text-xs">{c.yearFrom}–{c.yearTo ?? "present"}</p>
                        {c.highlights && <p className="mt-1">{c.highlights}</p>}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {activeTab === "via" && (
            <CounsellorAnalysisTab
              clientId={clientId}
              type="via"
              storedAnalysis={(data.report as any)?.counsellorViaAnalysis ?? null}
              hasData={!!data.via}
              notReadyMessage="VIA survey not yet completed."
              viaData={data.via}
              strengthsMap={strengthsMap}
            />
          )}

          {activeTab === "ocean" && (
            <CounsellorAnalysisTab
              clientId={clientId}
              type="ocean"
              storedAnalysis={(data.report as any)?.counsellorOceanAnalysis ?? null}
              hasData={!!data.ipip}
              notReadyMessage="OCEAN assessment not yet completed."
              ipipData={data.ipip}
            />
          )}

          {activeTab === "insights" && (
            <InsightsTab ipip={data.ipip} />
          )}


          {activeTab === "report" && (
            <div className="max-w-3xl">
              {!data.report ? (
                <div className="text-center py-12 border-2 border-dashed border-border rounded-xl">
                  <Brain className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground mb-4">No analysis report generated yet.</p>
                  <Button
                    onClick={() => triggerAnalysis.mutate({ clientId })}
                    disabled={triggerAnalysis.isPending}
                    className="bg-[var(--lw-gold)] hover:bg-[oklch(0.60 0.13 72)] text-white gap-2"
                  >
                    {triggerAnalysis.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />}
                    Generate Analysis
                  </Button>
                </div>
              ) : (
                <div className="prose-report">
                  <Streamdown>{data.report.fullReportMarkdown ?? ""}</Streamdown>
                </div>
              )}
            </div>
          )}

          {activeTab === "virtual-peter" && (
            <div className="max-w-4xl">
              {/* Header explanation */}
              <div className="mb-6 p-5 rounded-xl bg-[var(--lw-gold-light)]/15 border border-[var(--lw-gold)]/20">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full bg-[var(--lw-gold)] flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h3 className="font-serif font-semibold text-foreground mb-1">Parallel Clients</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Bernard Haldane's Dependable Strengths methodology was built on recognising patterns across many life histories.
                      This feature replicates that insight: it analyses this client's achievements and themes,
                      then finds the most similar historical clients from the Lifework database — matched by life pattern,
                      not by psychometric scores.
                    </p>
                    <p className="text-xs text-muted-foreground mt-2 italic">
                      Each card shows a historical client's career outcome and the thematic patterns that matched.
                      Use these as conversation starters: "Does this person's story feel familiar to you?"
                    </p>
                  </div>
                </div>
              </div>

              {/* Run matching button */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  {existingMatches && existingMatches.length > 0 ? (
                    <p className="text-sm text-muted-foreground">
                      {existingMatches.length} parallel clients found
                      {existingMatches[0]?.createdAt && ` · Last run ${new Date(existingMatches[0].createdAt).toLocaleDateString()}`}
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground">No matches yet. Run the analysis to find parallel clients.</p>
                  )}
                </div>
                <Button
                  onClick={() => findMatches.mutate({ clientId, topN: 8 })}
                  disabled={findMatches.isPending}
                  className="bg-[var(--lw-gold)] hover:bg-[oklch(0.60 0.13 72)] text-white gap-2"
                >
                  {findMatches.isPending ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Analysing patterns &amp; writing insights…</>
                  ) : (
                    <><GitCompare className="w-4 h-4" /> {existingMatches?.length ? "Re-run Matching" : "Find Parallel Clients"}</>
                  )}
                </Button>
              </div>

              {/* Match cards */}
              {existingMatches && existingMatches.length > 0 && (
                <div className="space-y-3">
                  {existingMatches.map((match) => {
                    const hc = match.historicalClient;
                    if (!hc) return null;
                    const tags = (() => {
                      try {
                        return typeof hc.embedding === "string" ? JSON.parse(hc.embedding) : hc.embedding as any;
                      } catch { return null; }
                    })();
                    const narrativeSamples = (() => {
                      try {
                        return typeof hc.narrativeSample === "string" ? JSON.parse(hc.narrativeSample) : hc.narrativeSample as string[];
                      } catch { return []; }
                    })();
                    const isExpanded = expandedMatchId === match.id;
                    const similarityPct = Math.round(parseFloat(match.similarityScore) * 100);
                    const tierLabel = hc.tier === 1 ? "Best Match" : hc.tier === 2 ? "Good Match" : "Possible Match";
                    const tierColor = hc.tier === 1 ? "bg-emerald-100 text-emerald-700" : hc.tier === 2 ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700";

                    return (
                      <div
                        key={match.id}
                        className={`border rounded-xl overflow-hidden transition-all ${
                          hc.tier === 1 ? "border-[var(--lw-gold)]/40" : "border-border"
                        }`}
                      >
                        {/* Card header - always visible */}
                        <button
                          className="w-full text-left p-4 flex items-start gap-4 hover:bg-muted/30 transition-colors"
                          onClick={() => setExpandedMatchId(isExpanded ? null : match.id)}
                        >
                          <div className="flex-shrink-0 flex flex-col items-center gap-0.5">
                            <div className="w-10 h-10 rounded-full bg-[var(--lw-navy)] flex items-center justify-center text-sm font-bold text-[var(--lw-gold)]">
                              {match.rank}
                            </div>
                            {match.personaName && (
                              <span className="text-[10px] font-semibold text-[var(--lw-navy)] tracking-wide">{match.personaName}</span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              {match.personaName && (
                                <span className="font-semibold text-[var(--lw-navy)] text-base">{match.personaName}</span>
                              )}
                              <span className="font-medium text-foreground text-sm">{hc.careerDescription}</span>
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${tierColor}`}>{tierLabel}</span>
                            </div>
                            {tags?.summary && (
                              <p className="text-xs text-muted-foreground italic">{tags.summary}</p>
                            )}
                            <div className="flex items-center gap-3 mt-2">
                              <div className="flex items-center gap-1.5">
                                <div className="h-1.5 w-20 bg-muted rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-[var(--lw-gold)] rounded-full"
                                    style={{ width: `${similarityPct}%` }}
                                  />
                                </div>
                                <span className="text-xs text-muted-foreground">{similarityPct}% match</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex-shrink-0 text-muted-foreground">
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </div>
                        </button>

                        {/* Expanded detail */}
                        {isExpanded && (
                          <div className="px-4 pb-4 border-t border-border/50 pt-4 space-y-4">

                            {/* Why this match? */}
                            {match.matchNarrative && (
                              <div className="space-y-2">
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                  {match.personaName ? `Why ${match.personaName}?` : "Why This Match?"}
                                </p>
                                <div className="bg-[var(--lw-gold-light)]/10 border border-[var(--lw-gold)]/20 rounded-lg p-3">
                                  <p className="text-sm text-foreground leading-relaxed">{match.matchNarrative}</p>
                                </div>
                              </div>
                            )}

                            {/* Conversation starters */}
                            {match.conversationStarters && (() => {
                              try {
                                const questions: string[] = typeof match.conversationStarters === "string"
                                  ? JSON.parse(match.conversationStarters)
                                  : match.conversationStarters;
                                return questions.length > 0 ? (
                                  <div className="space-y-2">
                                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                      {match.personaName ? `Conversation Starters — using ${match.personaName}'s story` : "Conversation Starters"}
                                    </p>
                                    <div className="space-y-2">
                                      {questions.map((q: string, qi: number) => (
                                        <div key={qi} className="flex gap-2.5 items-start">
                                          <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[var(--lw-gold)] text-white text-xs flex items-center justify-center font-medium mt-0.5">{qi + 1}</span>
                                          <p className="text-sm text-foreground leading-relaxed">{q}</p>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                ) : null;
                              } catch { return null; }
                            })()}

                            {/* Semantic tags */}
                            {tags && (
                              <div className="space-y-2">
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Pattern Tags</p>
                                <div className="flex flex-wrap gap-1.5">
                                  {tags.themes?.map((t: string) => (
                                    <span key={t} className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-[var(--lw-gold-light)]/20 text-[var(--lw-gold)] border border-[var(--lw-gold)]/20">
                                      <Tag className="w-2.5 h-2.5" />{t}
                                    </span>
                                  ))}
                                </div>
                                <div className="flex flex-wrap gap-2 mt-1">
                                  {tags.environment && (
                                    <span className="text-xs text-muted-foreground">Environment: <span className="text-foreground font-medium">{tags.environment}</span></span>
                                  )}
                                  {tags.motivation && (
                                    <span className="text-xs text-muted-foreground">Motivation: <span className="text-foreground font-medium">{tags.motivation}</span></span>
                                  )}
                                  {tags.sector?.length > 0 && (
                                    <span className="text-xs text-muted-foreground">Sector: <span className="text-foreground font-medium">{tags.sector.join(", ")}</span></span>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Life history samples */}
                            {narrativeSamples && narrativeSamples.length > 0 && (
                              <div className="space-y-2">
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Life History Samples</p>
                                <div className="space-y-1.5">
                                  {narrativeSamples.slice(0, 3).map((sample: string, i: number) => (
                                    <p key={i} className="text-xs text-muted-foreground pl-3 border-l-2 border-[var(--lw-gold)]/30 italic leading-relaxed">
                                      {sample.slice(0, 180)}{sample.length > 180 ? "…" : ""}
                                    </p>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Counsellor notes */}
                            <div className="space-y-2">
                              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Counsellor Notes on this Match</p>
                              <p className="text-xs text-muted-foreground italic">Use this space to note why this parallel client is or isn't relevant.</p>
                              <Textarea
                                rows={2}
                                value={matchNotes[match.id] ?? (match.counsellorNotes ?? "")}
                                onChange={(e) => setMatchNotes(prev => ({ ...prev, [match.id]: e.target.value }))}
                                placeholder="e.g. Similar pattern of organising others from childhood…"
                                className="text-xs"
                              />
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-xs h-7"
                                onClick={() => updateMatchNotesMutation.mutate({
                                  matchId: match.id,
                                  notes: matchNotes[match.id] ?? (match.counsellorNotes ?? ""),
                                })}
                                disabled={updateMatchNotesMutation.isPending}
                              >
                                Save Note
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Empty state */}
              {(!existingMatches || existingMatches.length === 0) && !findMatches.isPending && (
                <div className="text-center py-16 border-2 border-dashed border-border rounded-xl">
                  <GitCompare className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground mb-2">No parallel clients found yet.</p>
                  <p className="text-sm text-muted-foreground mb-4 max-w-sm mx-auto">
                    Generate an analysis report first, then run the matching to find historical clients
                    with similar life patterns.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Coaching Annex tab */}
          {activeTab === "coaching-annex" && (
            <CoachingAnnexTab clientId={clientId} />
          )}

          {/* Coaching Session tab */}
          {activeTab === "coaching-session" && (
            <CoachingSessionTab
              clientId={clientId}
              clientData={{
                achievements: data.achievements,
                via: data.via,
                ipip: data.ipip,
                career: data.career,
                family: data.family,
                education: data.education,
                chatSessions: (data as any).chatSessions ?? [],
                report: data.report,
                clientFirstName: data.profile.firstName ?? undefined,
              }}
            />
          )}

          {/* WOW Report tab */}
          {activeTab === "wow-report" && (
            <div className="py-4">
              <WowReportTab
                clientId={clientId}
                clientName={data.profile.firstName ?? undefined}
              />
            </div>
          )}
        </div>
      )}
    </div>
   );
}
// ─── Coaching Annex Tab Component ────────────────────────────────────────────
function CoachingAnnexTab({ clientId }: { clientId: number }) {
  const utils = trpc.useUtils();
  const [transcript, setTranscript] = useState("");
  const [editingDraft, setEditingDraft] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  const { data: annex, isLoading } = trpc.coachingAnnex.getAnnex.useQuery({ clientId });

  // Sync editing state when annex loads
  const [syncedDraft, setSyncedDraft] = useState(false);
  if (!syncedDraft && annex?.draftAnnex) {
    setEditingDraft(annex.draftAnnex);
    setSyncedDraft(true);
  }

  const saveTranscript = trpc.coachingAnnex.saveTranscript.useMutation({
    onSuccess: () => {
      toast.success("Transcript saved.");
      utils.coachingAnnex.getAnnex.invalidate({ clientId });
    },
    onError: () => toast.error("Failed to save transcript."),
  });

  const generateDraft = trpc.coachingAnnex.generateDraft.useMutation({
    onSuccess: (result) => {
      toast.success("Draft annex generated.");
      setEditingDraft(result.draftAnnex);
      setSyncedDraft(false);
      utils.coachingAnnex.getAnnex.invalidate({ clientId });
    },
    onError: (e) => toast.error(e.message ?? "Failed to generate draft."),
  });

  const saveDraft = trpc.coachingAnnex.saveDraft.useMutation({
    onSuccess: () => {
      toast.success("Draft saved.");
      setIsEditing(false);
      utils.coachingAnnex.getAnnex.invalidate({ clientId });
    },
    onError: () => toast.error("Failed to save draft."),
  });

  const approveAnnex = trpc.coachingAnnex.approveAnnex.useMutation({
    onSuccess: () => {
      toast.success("Annex approved and appended to report.");
      utils.coachingAnnex.getAnnex.invalidate({ clientId });
    },
    onError: () => toast.error("Failed to approve annex."),
  });

  const currentDraft = annex?.draftAnnex ?? "";
  const isApproved = annex?.status === "approved";

  return (
    <div className="max-w-3xl space-y-6">
      {/* Header */}
      <div className="p-5 rounded-xl bg-[var(--lw-gold-light)]/15 border border-[var(--lw-gold)]/20">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-full bg-[var(--lw-gold)] flex items-center justify-center flex-shrink-0 mt-0.5">
            <FileText className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="font-serif font-semibold text-foreground mb-1">Coaching Session Annex</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Upload or paste the coaching session transcript (from Sybill or any source). The platform will draft
              a reflective closing annex in your voice — drawing on the transcript and the client's full Lifework
              profile. Review, edit if needed, then approve to append it to the client's report.
            </p>
          </div>
        </div>
      </div>

      {/* Status badge */}
      {isApproved && (
        <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-2.5">
          <CheckCircle2 className="w-4 h-4" />
          <span>Annex approved and appended to report{annex?.approvedAt ? ` · ${new Date(annex.approvedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}` : ""}.</span>
        </div>
      )}

      {/* Step 1: Transcript */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-[var(--lw-navy)] text-white text-xs font-bold flex items-center justify-center flex-shrink-0">1</span>
          <h4 className="font-semibold text-foreground">Paste Coaching Session Transcript</h4>
        </div>
        {annex?.transcriptText ? (
          <div className="rounded-lg border border-border bg-muted/30 p-4">
            <p className="text-xs text-muted-foreground mb-2">Transcript saved ({annex.transcriptText.length.toLocaleString()} characters)</p>
            <p className="text-sm text-muted-foreground line-clamp-3 italic">{annex.transcriptText.slice(0, 300)}…</p>
            <button
              className="mt-3 text-xs text-[var(--lw-gold)] hover:underline"
              onClick={() => setTranscript(annex.transcriptText ?? "")}
            >Replace transcript</button>
          </div>
        ) : (
          <Textarea
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            placeholder="Paste the full Sybill transcript here…"
            className="min-h-[180px] font-mono text-xs"
          />
        )}
        {!annex?.transcriptText && (
          <Button
            size="sm"
            disabled={!transcript.trim() || saveTranscript.isPending}
            onClick={() => saveTranscript.mutate({ clientId, transcriptText: transcript })}
            className="bg-[var(--lw-navy)] text-white hover:opacity-90 gap-2"
          >
            {saveTranscript.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
            Save Transcript
          </Button>
        )}
        {annex?.transcriptText && transcript && (
          <Button
            size="sm"
            disabled={saveTranscript.isPending}
            onClick={() => saveTranscript.mutate({ clientId, transcriptText: transcript })}
            className="bg-[var(--lw-navy)] text-white hover:opacity-90 gap-2"
          >
            {saveTranscript.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
            Replace Transcript
          </Button>
        )}
      </div>

      {/* Step 2: Generate draft */}
      {annex?.transcriptText && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-[var(--lw-navy)] text-white text-xs font-bold flex items-center justify-center flex-shrink-0">2</span>
            <h4 className="font-semibold text-foreground">Generate Draft Annex</h4>
          </div>
          <p className="text-sm text-muted-foreground">
            The platform will read the transcript alongside the client's full Lifework profile and draft a
            reflective closing annex in your voice.
          </p>
          <Button
            size="sm"
            disabled={generateDraft.isPending}
            onClick={() => generateDraft.mutate({ clientId })}
            className="bg-[var(--lw-gold)] hover:bg-[oklch(0.60 0.13 72)] text-white gap-2"
          >
            {generateDraft.isPending ? (
              <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Drafting annex…</>
            ) : (
              <><Sparkles className="w-3.5 h-3.5" /> {currentDraft ? "Regenerate Draft" : "Generate Draft Annex"}</>
            )}
          </Button>
        </div>
      )}

      {/* Step 3: Review and edit */}
      {currentDraft && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-[var(--lw-navy)] text-white text-xs font-bold flex items-center justify-center flex-shrink-0">3</span>
              <h4 className="font-semibold text-foreground">Review &amp; Edit Draft</h4>
            </div>
            {!isEditing && !isApproved && (
              <Button size="sm" variant="outline" onClick={() => { setEditingDraft(currentDraft); setIsEditing(true); }} className="gap-1.5">
                <Pencil className="w-3.5 h-3.5" /> Edit
              </Button>
            )}
          </div>

          {isEditing ? (
            <div className="space-y-2">
              <Textarea
                value={editingDraft}
                onChange={(e) => setEditingDraft(e.target.value)}
                className="min-h-[400px] font-mono text-xs"
              />
              <div className="flex gap-2">
                <Button size="sm" disabled={saveDraft.isPending} onClick={() => saveDraft.mutate({ clientId, draftAnnex: editingDraft })} className="bg-[var(--lw-navy)] text-white hover:opacity-90">
                  {saveDraft.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Save Edits"}
                </Button>
                <Button size="sm" variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-card p-5">
              <Streamdown>{currentDraft}</Streamdown>
            </div>
          )}
        </div>
      )}

      {/* Step 4: Approve */}
      {currentDraft && !isApproved && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-[var(--lw-navy)] text-white text-xs font-bold flex items-center justify-center flex-shrink-0">4</span>
            <h4 className="font-semibold text-foreground">Approve &amp; Append to Report</h4>
          </div>
          <p className="text-sm text-muted-foreground">
            Once approved, this annex will appear as the final section of the client's printed report.
            You can still edit the draft before approving.
          </p>
          <Button
            size="sm"
            disabled={approveAnnex.isPending}
            onClick={() => approveAnnex.mutate({ clientId, approvedAnnex: isEditing ? editingDraft : currentDraft })}
            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
          >
            {approveAnnex.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
            Approve Annex
          </Button>
        </div>
      )}

      {/* Approved view */}
      {isApproved && annex?.approvedAnnex && (
        <div className="space-y-3">
          <h4 className="font-semibold text-foreground">Approved Annex</h4>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/30 p-5">
            <Streamdown>{annex.approvedAnnex}</Streamdown>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => approveAnnex.mutate({ clientId, approvedAnnex: currentDraft })}
            className="text-xs"
          >
            Re-approve with current draft
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── IPIP Personality Tab ─────────────────────────────────────────────────────
const IPIP_DOMAINS_INFO = [
  { key: "N", name: "Neuroticism", color: "#7C3AED", lowLabel: "Emotionally stable, calm", highLabel: "Emotionally reactive, prone to stress",
    facets: [
      { key: "N1", name: "Anxiety" }, { key: "N2", name: "Anger" }, { key: "N3", name: "Depression" },
      { key: "N4", name: "Self-Consciousness" }, { key: "N5", name: "Immoderation" }, { key: "N6", name: "Vulnerability" },
    ]},
  { key: "E", name: "Extraversion", color: "#D97706", lowLabel: "Reserved, reflective", highLabel: "Outgoing, energetic, sociable",
    facets: [
      { key: "E1", name: "Friendliness" }, { key: "E2", name: "Gregariousness" }, { key: "E3", name: "Assertiveness" },
      { key: "E4", name: "Activity Level" }, { key: "E5", name: "Excitement-Seeking" }, { key: "E6", name: "Cheerfulness" },
    ]},
  { key: "O", name: "Openness to Experience", color: "#059669", lowLabel: "Practical, conventional", highLabel: "Curious, creative, open to new ideas",
    facets: [
      { key: "O1", name: "Imagination" }, { key: "O2", name: "Artistic Interests" }, { key: "O3", name: "Emotionality" },
      { key: "O4", name: "Adventurousness" }, { key: "O5", name: "Intellect" }, { key: "O6", name: "Liberalism" },
    ]},
  { key: "A", name: "Agreeableness", color: "#DB2777", lowLabel: "Competitive, sceptical", highLabel: "Cooperative, trusting, empathetic",
    facets: [
      { key: "A1", name: "Trust" }, { key: "A2", name: "Morality" }, { key: "A3", name: "Altruism" },
      { key: "A4", name: "Cooperation" }, { key: "A5", name: "Modesty" }, { key: "A6", name: "Sympathy" },
    ]},
  { key: "C", name: "Conscientiousness", color: "#2563EB", lowLabel: "Spontaneous, flexible", highLabel: "Organised, disciplined, goal-directed",
    facets: [
      { key: "C1", name: "Self-Efficacy" }, { key: "C2", name: "Orderliness" }, { key: "C3", name: "Dutifulness" },
      { key: "C4", name: "Achievement-Striving" }, { key: "C5", name: "Self-Discipline" }, { key: "C6", name: "Cautiousness" },
    ]},
];

function IpipTab({ ipip }: { ipip: any }) {
  const [expandedDomain, setExpandedDomain] = useState<string | null>(null);
  if (!ipip) {
    return (
      <div className="max-w-3xl text-center py-12 border-2 border-dashed border-border rounded-xl">
        <Users className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
        <p className="text-muted-foreground">Personality assessment not yet completed.</p>
      </div>
    );
  }
  const domainScores: Record<string, number> = (() => {
    try { return typeof ipip.domainScores === "string" ? JSON.parse(ipip.domainScores) : (ipip.domainScores ?? {}); }
    catch { return {}; }
  })();
  const facetScores: Record<string, number> = (() => {
    try { return typeof ipip.facetScores === "string" ? JSON.parse(ipip.facetScores) : (ipip.facetScores ?? {}); }
    catch { return {}; }
  })();

  return (
    <div className="max-w-3xl space-y-4">
      <div className="p-4 rounded-xl bg-[var(--lw-gold-light)]/15 border border-[var(--lw-gold)]/20 mb-2">
        <p className="text-sm text-muted-foreground">
          Big Five (IPIP-NEO) personality profile. Scores are 0–100 percentile within the general population.
          Click any domain to expand the six facet scores.
        </p>
      </div>
      {IPIP_DOMAINS_INFO.map((domain) => {
        const score = domainScores[domain.key] ?? 50;
        const isExpanded = expandedDomain === domain.key;
        return (
          <div key={domain.key} className="border border-border rounded-xl overflow-hidden">
            <button
              className="w-full text-left p-4 hover:bg-muted/20 transition-colors"
              onClick={() => setExpandedDomain(isExpanded ? null : domain.key)}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-serif font-semibold text-foreground">{domain.name}</span>
                  <span className="text-xs text-muted-foreground">{isExpanded ? "▲" : "▼"}</span>
                </div>
                <span className="text-sm font-bold" style={{ color: domain.color }}>{score}</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden mb-1">
                <div className="h-full rounded-full transition-all" style={{ width: `${score}%`, backgroundColor: domain.color }} />
              </div>
              <div className="flex justify-between text-[11px] text-muted-foreground">
                <span>{domain.lowLabel}</span>
                <span>{domain.highLabel}</span>
              </div>
            </button>
            {isExpanded && (
              <div className="px-4 pb-4 pt-2 border-t border-border/50 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {domain.facets.map((facet) => {
                  const fs = facetScores[facet.key] ?? 50;
                  return (
                    <div key={facet.key} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-foreground">{facet.name}</span>
                        <span className="text-xs font-bold" style={{ color: domain.color }}>{fs}</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${fs}%`, backgroundColor: domain.color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
      <InsightsMapping
        extraversion={domainScores["E"] ?? 50}
        agreeableness={domainScores["A"] ?? 50}
        openness={domainScores["O"] ?? 50}
        conscientiousness={domainScores["C"] ?? 50}
      />
    </div>
  );
}


// ─── Counsellor Analysis Tab ──────────────────────────────────────────────────
// Generic tab that shows stored counsellor-layer analysis (VIA or OCEAN).
// If no analysis exists yet, shows the raw survey data + a "Generate Analysis" button.
// Once generated, the markdown is rendered inline (no PDF).

function CounsellorAnalysisTab({
  clientId,
  type,
  storedAnalysis,
  hasData,
  notReadyMessage,
  viaData,
  strengthsMap,
  ipipData,
}: {
  clientId: number;
  type: "via" | "ocean";
  storedAnalysis: string | null;
  hasData: boolean;
  notReadyMessage: string;
  viaData?: any;
  strengthsMap?: Map<string, any>;
  ipipData?: any;
}) {
  const utils = trpc.useUtils();
  const [showRaw, setShowRaw] = useState(false);
  // Local state holds the analysis immediately after generation (before query refetch completes)
  const [localAnalysis, setLocalAnalysis] = useState<string | null>(null);

  const generateVia = trpc.counselor.generateCounsellorVia.useMutation({
    onSuccess: (data) => {
      setLocalAnalysis(data.analysis);
      toast.success("VIA analysis generated.");
      utils.counselor.getClientProfile.invalidate({ clientId });
    },
    onError: (e) => toast.error(e.message ?? "Failed to generate VIA analysis."),
  });

  const generateOcean = trpc.counselor.generateCounsellorOcean.useMutation({
    onSuccess: (data) => {
      setLocalAnalysis(data.analysis);
      toast.success("OCEAN analysis generated.");
      utils.counselor.getClientProfile.invalidate({ clientId });
    },
    onError: (e) => toast.error(e.message ?? "Failed to generate OCEAN analysis."),
  });

  const isPending = type === "via" ? generateVia.isPending : generateOcean.isPending;
  // Use locally-captured analysis first (instant), fall back to DB-fetched prop
  const displayAnalysis = localAnalysis ?? storedAnalysis;

  function handleGenerate(force = false) {
    if (type === "via") generateVia.mutate({ clientId, forceRegenerate: force });
    else generateOcean.mutate({ clientId, forceRegenerate: force });
  }

  if (!hasData) {
    return (
      <div className="max-w-3xl text-center py-12 border-2 border-dashed border-border rounded-xl">
        <Brain className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
        <p className="text-muted-foreground">{notReadyMessage}</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-6">
      {/* Action bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {displayAnalysis && (
            <button
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setShowRaw(!showRaw)}
            >
              {showRaw ? "Show analysis" : "Show raw survey data"}
            </button>
          )}
        </div>
        <div className="flex gap-2">
          {/* VIA: single Generate button that greys out permanently after use */}
          {type === "via" && (
            <Button
              size="sm"
              disabled={isPending || !!displayAnalysis}
              onClick={() => handleGenerate(false)}
              className={`gap-1.5 ${
                displayAnalysis
                  ? "bg-muted text-muted-foreground cursor-not-allowed opacity-50"
                  : "bg-[var(--lw-gold)] hover:bg-[oklch(0.60_0.13_72)] text-white"
              }`}
            >
              {isPending ? (
                <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating analysis… (1–2 min)</>
              ) : displayAnalysis ? (
                <><Sparkles className="w-3.5 h-3.5" /> VIA Analysis Generated</>
              ) : (
                <><Sparkles className="w-3.5 h-3.5" /> Generate VIA Analysis</>
              )}
            </Button>
          )}
          {/* OCEAN: same one-time pattern as VIA */}
          {type === "ocean" && (
            <Button
              size="sm"
              disabled={isPending || !!displayAnalysis}
              onClick={() => handleGenerate(false)}
              className={`gap-1.5 ${
                displayAnalysis
                  ? "bg-muted text-muted-foreground cursor-not-allowed opacity-50"
                  : "bg-[var(--lw-gold)] hover:bg-[oklch(0.60_0.13_72)] text-white"
              }`}
            >
              {isPending ? (
                <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating analysis… (1–2 min)</>
              ) : displayAnalysis ? (
                <><Sparkles className="w-3.5 h-3.5" /> OCEAN Analysis Generated</>
              ) : (
                <><Sparkles className="w-3.5 h-3.5" /> Generate OCEAN Analysis</>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Generating state */}
      {isPending && (
        <div className="flex items-center gap-3 p-5 rounded-xl border border-[var(--lw-gold)]/30 bg-[var(--lw-gold-light)]/10">
          <Loader2 className="w-5 h-5 animate-spin text-[var(--lw-gold)] flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-foreground">Generating analysis…</p>
            <p className="text-xs text-muted-foreground mt-0.5">This runs 3 LLM calls and takes 1–2 minutes. Please wait.</p>
          </div>
        </div>
      )}

      {/* Analysis content */}
      {displayAnalysis && !showRaw && (
        <div className="prose-report">
          <Streamdown>{displayAnalysis}</Streamdown>
        </div>
      )}

      {/* Raw survey data (toggle) */}
      {displayAnalysis && showRaw && type === "via" && viaData && strengthsMap && (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="px-4 py-3 bg-[var(--lw-navy)] border-b border-border">
            <h3 className="text-sm font-semibold text-white tracking-wide">VIA Character Strengths — Full Profile (all 24 strengths)</h3>
          </div>
          <div className="divide-y divide-border">
            {(viaData.rankedStrengths as any[]).map((s: any, i: number) => {
              const strength = strengthsMap.get(s.strengthId);
              const pct = Math.round((s.score / 25) * 100);
              const isTop5 = i < 5;
              return (
                <div key={s.strengthId} className={`flex items-center gap-3 px-4 py-2.5 ${isTop5 ? "bg-[var(--lw-gold-light)]/15" : ""}`}>
                  <span className={`text-sm font-bold w-6 text-right flex-shrink-0 ${isTop5 ? "text-[var(--lw-gold)]" : "text-muted-foreground"}`}>{i + 1}</span>
                  <span className={`text-sm font-medium flex-1 ${isTop5 ? "text-foreground font-semibold" : "text-foreground"}`}>{strength?.name ?? s.strengthId}</span>
                  {strength?.virtue && <span className="text-xs text-muted-foreground capitalize hidden sm:inline">{strength.virtue}</span>}
                  <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden flex-shrink-0">
                    <div className={`h-full rounded-full ${isTop5 ? "bg-[var(--lw-gold)]" : "bg-muted-foreground/40"}`} style={{ width: `${pct}%` }} />
                  </div>
                  <span className={`text-sm font-bold w-10 text-right flex-shrink-0 ${isTop5 ? "text-[var(--lw-gold)]" : "text-muted-foreground"}`}>{s.score}/25</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {displayAnalysis && showRaw && type === "ocean" && ipipData && (
        <IpipTab ipip={ipipData} />
      )}

      {/* No analysis yet — show raw data with generate prompt */}
      {!displayAnalysis && !isPending && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-[var(--lw-gold-light)]/10 border border-[var(--lw-gold)]/20">
            <p className="text-sm text-muted-foreground">
              No counsellor analysis generated yet. Click <strong>Generate {type === "via" ? "VIA" : "OCEAN"} Analysis</strong> above
              to run the full {type === "via" ? "5-stage VIA framework" : "4-stage OCEAN lens"} against this client's data.
              This is a one-time operation — the result is stored permanently and can be regenerated if needed.
            </p>
          </div>
          {type === "via" && viaData && strengthsMap && (
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="px-4 py-3 bg-[var(--lw-navy)] border-b border-border">
                <h3 className="text-sm font-semibold text-white tracking-wide">VIA Character Strengths — Full Profile (all 24 strengths)</h3>
              </div>
              <div className="divide-y divide-border">
                {(viaData.rankedStrengths as any[]).map((s: any, i: number) => {
                  const strength = strengthsMap.get(s.strengthId);
                  const pct = Math.round((s.score / 25) * 100);
                  const isTop5 = i < 5;
                  return (
                    <div key={s.strengthId} className={`flex items-center gap-3 px-4 py-2.5 ${isTop5 ? "bg-[var(--lw-gold-light)]/15" : ""}`}>
                      <span className={`text-sm font-bold w-6 text-right flex-shrink-0 ${isTop5 ? "text-[var(--lw-gold)]" : "text-muted-foreground"}`}>{i + 1}</span>
                      <span className={`text-sm font-medium flex-1 ${isTop5 ? "text-foreground font-semibold" : "text-foreground"}`}>{strength?.name ?? s.strengthId}</span>
                      {strength?.virtue && <span className="text-xs text-muted-foreground capitalize hidden sm:inline">{strength.virtue}</span>}
                      <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden flex-shrink-0">
                        <div className={`h-full rounded-full ${isTop5 ? "bg-[var(--lw-gold)]" : "bg-muted-foreground/40"}`} style={{ width: `${pct}%` }} />
                      </div>
                      <span className={`text-sm font-bold w-10 text-right flex-shrink-0 ${isTop5 ? "text-[var(--lw-gold)]" : "text-muted-foreground"}`}>{s.score}/25</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {type === "ocean" && ipipData && <IpipTab ipip={ipipData} />}
        </div>
      )}
    </div>
  );
}

// ─── Insights Tab ─────────────────────────────────────────────────────────────
// Dedicated tab for the Insights Discovery colour-energy mapping.
// Extracted from IpipTab so it has its own space.

function InsightsTab({ ipip }: { ipip: any }) {
  if (!ipip) {
    return (
      <div className="max-w-3xl text-center py-12 border-2 border-dashed border-border rounded-xl">
        <Compass className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
        <p className="text-muted-foreground">OCEAN assessment not yet completed — Insights mapping requires Big Five scores.</p>
      </div>
    );
  }
  const domainScores: Record<string, number> = (() => {
    try { return typeof ipip.domainScores === "string" ? JSON.parse(ipip.domainScores) : (ipip.domainScores ?? {}); }
    catch { return {}; }
  })();

  return (
    <div className="max-w-3xl space-y-4">
      <div className="p-4 rounded-xl bg-[var(--lw-gold-light)]/15 border border-[var(--lw-gold)]/20">
        <p className="text-sm text-muted-foreground">
          Insights Discovery colour-energy profile — inferred from the client's Big Five (IPIP-NEO) scores.
          This is an approximation, not a validated Insights assessment.
        </p>
      </div>
      <InsightsMapping
        extraversion={domainScores["E"] ?? 50}
        agreeableness={domainScores["A"] ?? 50}
        openness={domainScores["O"] ?? 50}
        conscientiousness={domainScores["C"] ?? 50}
      />
    </div>
  );
}
