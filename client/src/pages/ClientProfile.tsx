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
} from "lucide-react";
import { Streamdown } from "streamdown";
import { toast } from "sonner";

type Tab = "overview" | "interview" | "background" | "via" | "report";

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
        </div>
      )}
    </div>
  );
}
