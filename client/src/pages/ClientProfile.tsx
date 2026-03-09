import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
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
} from "lucide-react";
import { Streamdown } from "streamdown";
import { toast } from "sonner";

type Tab = "overview" | "interview" | "background" | "via" | "report" | "virtual-peter";

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
    { id: "report", label: "Analysis Report", icon: <Brain className="w-4 h-4" /> },
    { id: "virtual-peter", label: "Virtual Peter", icon: <GitCompare className="w-4 h-4" /> },
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
                className="gap-1 bg-[var(--plum)] hover:bg-[var(--plum-dark)] text-white"
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
            <h1 className="text-2xl font-serif font-bold text-foreground">
              {data.profile.firstName && data.profile.lastName
                ? `${data.profile.firstName} ${data.profile.lastName}`
                : "Client Profile"}
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              {data.profile.currentRole && data.profile.currentOrg
                ? `${data.profile.currentRole} at ${data.profile.currentOrg}`
                : data.profile.currentRole ?? ""}
            </p>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mb-6 border-b border-border overflow-x-auto">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px whitespace-nowrap ${
                  activeTab === tab.id
                    ? "border-[var(--plum)] text-[var(--plum)]"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
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
                    { label: "Analysis", status: data.profile.analysisStatus },
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
                    className="bg-[var(--plum)] hover:bg-[var(--plum-dark)] text-white"
                  >
                    Save Notes
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === "interview" && (
            <div className="max-w-3xl space-y-3">
              {data.messages.length === 0 ? (
                <p className="text-muted-foreground text-sm">No interview messages yet.</p>
              ) : (
                data.messages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[80%] rounded-xl px-4 py-3 text-sm leading-relaxed ${
                      msg.role === "user"
                        ? "bg-[var(--plum)] text-white"
                        : "bg-card border border-border text-foreground"
                    }`}>
                      {msg.role === "assistant" ? <Streamdown>{msg.content}</Streamdown> : msg.content}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

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
            <div className="max-w-3xl">
              {!data.via ? (
                <p className="text-muted-foreground text-sm">VIA survey not yet completed.</p>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground mb-4">Top 10 character strengths:</p>
                  {(data.via.rankedStrengths as any[]).slice(0, 10).map((s: any, i: number) => {
                    const strength = strengthsMap.get(s.strengthId);
                    const pct = Math.round((s.score / 25) * 100);
                    return (
                      <div key={s.strengthId} className={`p-4 rounded-xl border ${i < 5 ? "border-[var(--plum)]/30 bg-[var(--plum-light)]/20" : "border-border"}`}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-[var(--plum)] w-5">{i + 1}</span>
                            <span className="text-sm font-semibold text-foreground">{strength?.name ?? s.strengthId}</span>
                            {strength?.virtue && <span className="text-xs text-muted-foreground capitalize">({strength.virtue})</span>}
                          </div>
                          <span className="text-sm font-bold text-[var(--plum)]">{s.score}/25</span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-[var(--plum)] rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                        {strength?.description && <p className="text-xs text-muted-foreground mt-2">{strength.description}</p>}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
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
                    className="bg-[var(--plum)] hover:bg-[var(--plum-dark)] text-white gap-2"
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
              <div className="mb-6 p-5 rounded-xl bg-[var(--plum-light)]/15 border border-[var(--plum)]/20">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full bg-[var(--plum)] flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h3 className="font-serif font-semibold text-foreground mb-1">Virtual Peter — Parallel Clients</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Peter Daws maintained a mental library of 449 clients whose life histories he knew well.
                      This feature replicates that knowledge: it analyses this client's achievements and themes,
                      then finds the most similar historical clients from Peter's database — matched by life pattern,
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
                  className="bg-[var(--plum)] hover:bg-[var(--plum-dark)] text-white gap-2"
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
                          hc.tier === 1 ? "border-[var(--plum)]/40" : "border-border"
                        }`}
                      >
                        {/* Card header - always visible */}
                        <button
                          className="w-full text-left p-4 flex items-start gap-4 hover:bg-muted/30 transition-colors"
                          onClick={() => setExpandedMatchId(isExpanded ? null : match.id)}
                        >
                          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[var(--plum-light)]/30 flex items-center justify-center text-sm font-bold text-[var(--plum)]">
                            {match.rank}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
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
                                    className="h-full bg-[var(--plum)] rounded-full"
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
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Why This Match?</p>
                                <div className="bg-[var(--plum-light)]/10 border border-[var(--plum)]/20 rounded-lg p-3">
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
                                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Conversation Starters</p>
                                    <div className="space-y-2">
                                      {questions.map((q: string, qi: number) => (
                                        <div key={qi} className="flex gap-2.5 items-start">
                                          <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[var(--plum)] text-white text-xs flex items-center justify-center font-medium mt-0.5">{qi + 1}</span>
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
                                    <span key={t} className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-[var(--plum-light)]/20 text-[var(--plum)] border border-[var(--plum)]/20">
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
                                    <p key={i} className="text-xs text-muted-foreground pl-3 border-l-2 border-[var(--plum)]/30 italic leading-relaxed">
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
        </div>
      )}
    </div>
  );
}
