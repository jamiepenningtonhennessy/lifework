import { useState, useCallback, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Loader2,
  Sparkles,
  BookOpen,
  Briefcase,
  Users,
  Star,
  Target,
  Save,
  Printer,
} from "lucide-react";
import { InsightsMapping } from "@/components/InsightsMapping";
import { VIA_STRENGTHS, type ViaStrength } from "@shared/via-data";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Props {
  clientId: number;
  clientData: {
    achievements: any[];
    via: any;
    ipip: any;
    career: any[];
    family: any;
    education: any[];
    chatSessions: any[];
    report: any;
    clientFirstName?: string;
  };
}

type MainTab = "past" | "present" | "future";

// ─── Colour palette ───────────────────────────────────────────────────────────
const NAVY = "#0f1f35";
const GOLD = "#c9973a";

const ESF_COLOURS: Record<string, string> = {
  enjoyable: "#c9973a",
  satisfying: "#0f1f35",
  fulfilling: "#5b8a6e",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function parseMessages(raw: string | null | undefined): any[] {
  try { return JSON.parse(raw ?? "[]"); } catch { return []; }
}

function parseDomainScores(raw: any): Record<string, number> {
  try { return typeof raw === "string" ? JSON.parse(raw) : (raw ?? {}); } catch { return {}; }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SageTranscript({ messages, clientName }: { messages: any[]; clientName: string }) {
  const [open, setOpen] = useState(false);
  if (messages.length === 0) {
    return (
      <div className="text-xs text-muted-foreground italic py-2">
        No Sage conversation recorded for this section.
      </div>
    );
  }
  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-2.5 bg-muted/30 hover:bg-muted/50 transition-colors text-left"
      >
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Sage Conversation Transcript ({messages.length} messages)
        </span>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>
      {open && (
        <div className="p-4 space-y-3 max-h-80 overflow-y-auto bg-card">
          {messages.map((m: any, i: number) => {
            const isClient = m.role === "user";
            let stageDir = "";
            let speech = m.content ?? "";
            if (!isClient) {
              const match = speech.match(/^\[Sage ([^\]]+)\]\s*/i);
              if (match) { stageDir = match[1]; speech = speech.replace(match[0], "").trim(); }
            }
            return (
              <div key={i} className={`flex ${isClient ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] ${isClient ? "bg-[var(--lw-gold)]/10 border border-[var(--lw-gold)]/20" : "bg-muted/40 border border-border"} rounded-xl px-3 py-2`}>
                  <p className="text-xs font-semibold mb-1" style={{ color: isClient ? GOLD : NAVY }}>
                    {isClient ? clientName : "Sage"}
                  </p>
                  {stageDir && <p className="text-xs italic text-muted-foreground mb-1">[{stageDir}]</p>}
                  <p className="text-sm text-foreground leading-relaxed">{speech}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function AnalysisPanel({
  analysis,
  section,
  clientId,
  onRefresh,
}: {
  analysis: any;
  section: "lifeHistory" | "family" | "career";
  clientId: number;
  onRefresh: () => void;
}) {
  const utils = trpc.useUtils();
  const generate = trpc.counselor.generateSectionAnalysis.useMutation({
    onSuccess: () => {
      toast.success("Analysis generated.");
      utils.counselor.getSectionAnalysis.invalidate({ clientId });
      onRefresh();
    },
    onError: () => toast.error("Failed to generate analysis."),
  });

  if (!analysis) {
    return (
      <div className="border border-dashed border-[var(--lw-gold)]/40 rounded-xl p-4 text-center">
        <Sparkles className="w-6 h-6 text-[var(--lw-gold)]/60 mx-auto mb-2" />
        <p className="text-sm text-muted-foreground mb-3">No AI analysis yet for this section.</p>
        <Button
          size="sm"
          onClick={() => generate.mutate({ clientId, section, forceRegenerate: false })}
          disabled={generate.isPending}
          className="gap-1.5 bg-[var(--lw-gold)] hover:bg-[oklch(0.60_0.13_72)] text-white"
        >
          {generate.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
          {generate.isPending ? "Analysing…" : "Generate Sage Analysis"}
        </Button>
      </div>
    );
  }

  const themes = analysis.themes ?? analysis.careerThemes ?? [];
  const prompts = analysis.coachingPrompts ?? [];
  const peakMoments = analysis.peakMoments ?? analysis.standoutRoles ?? [];
  const esfPattern = analysis.esfPattern ?? analysis.transitionPatterns ?? null;
  const formativeInfluences = analysis.formativeInfluences ?? [];
  const valuesSuggested = analysis.valuesSuggested ?? [];

  return (
    <div className="space-y-4">
      {themes.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--lw-gold)] mb-2">Recurring Themes</p>
          <div className="space-y-2">
            {themes.map((t: any, i: number) => (
              <div key={i} className="p-3 rounded-lg bg-[var(--lw-gold-light)]/20 border border-[var(--lw-gold)]/20">
                <p className="text-sm font-semibold text-foreground">{t.theme ?? t.title}</p>
                {t.evidence && <p className="text-xs text-muted-foreground mt-1">{t.evidence}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
      {esfPattern && (
        <div className="p-3 rounded-lg bg-muted/30 border border-border">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Pattern Observation</p>
          <p className="text-sm text-foreground">{esfPattern}</p>
        </div>
      )}
      {peakMoments.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--lw-gold)] mb-2">
            {section === "career" ? "Standout Roles" : "Peak Moments"}
          </p>
          <ul className="space-y-1">
            {peakMoments.map((m: any, i: number) => (
              <li key={i} className="text-sm text-foreground flex gap-2">
                <span className="text-[var(--lw-gold)] mt-0.5">•</span>
                <span>{typeof m === "string" ? m : (m.role ?? m.title ?? JSON.stringify(m))}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {formativeInfluences.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--lw-gold)] mb-2">Formative Influences</p>
          <div className="space-y-2">
            {formativeInfluences.map((inf: any, i: number) => (
              <div key={i} className="p-3 rounded-lg bg-[var(--lw-gold-light)]/20 border border-[var(--lw-gold)]/20">
                <p className="text-sm font-semibold text-foreground">{inf.influence}</p>
                {inf.implication && <p className="text-xs text-muted-foreground mt-1">→ {inf.implication}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
      {valuesSuggested.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--lw-gold)] mb-2">Values Suggested</p>
          <div className="flex flex-wrap gap-2">
            {valuesSuggested.map((v: string, i: number) => (
              <span key={i} className="text-xs px-2.5 py-1 rounded-full bg-[var(--lw-gold)]/10 text-[var(--lw-gold)] border border-[var(--lw-gold)]/20 font-medium">{v}</span>
            ))}
          </div>
        </div>
      )}
      {prompts.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Coaching Prompts</p>
          <ul className="space-y-2">
            {prompts.map((q: string, i: number) => (
              <li key={i} className="flex gap-2 text-sm text-foreground">
                <span className="text-[var(--lw-gold)] font-bold mt-0.5">Q{i + 1}</span>
                <span className="italic">{q}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="flex justify-end pt-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => generate.mutate({ clientId, section, forceRegenerate: true })}
          disabled={generate.isPending}
          className="gap-1 text-xs text-muted-foreground"
        >
          {generate.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
          Refresh Analysis
        </Button>
      </div>
    </div>
  );
}

function CoachNoteField({
  label, noteKey, value, onChange, placeholder,
}: {
  label: string; noteKey: string; value: string;
  onChange: (key: string, val: string) => void; placeholder?: string;
}) {
  return (
    <div>
      <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5 block">{label}</label>
      <textarea
        className="w-full min-h-[90px] text-sm rounded-lg border border-border bg-card px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[var(--lw-gold)]/40 resize-y"
        placeholder={placeholder ?? "Coach notes…"}
        value={value}
        onChange={(e) => onChange(noteKey, e.target.value)}
      />
    </div>
  );
}

function AchievementsChart({ achievements }: { achievements: any[] }) {
  const DECADES = [
    { key: "childhood", label: "Childhood" },
    { key: "teens", label: "Teens" },
    { key: "twenties", label: "20s" },
    { key: "thirties", label: "30s" },
    { key: "forties", label: "40s" },
    { key: "fifties", label: "50s" },
    { key: "sixties_plus", label: "60s+" },
  ];
  const data = DECADES.map(({ key, label }) => {
    const group = achievements.filter((a) => a.decade === key);
    return {
      decade: label,
      enjoyable: group.filter((a) => a.esf === "enjoyable").length,
      satisfying: group.filter((a) => a.esf === "satisfying").length,
      fulfilling: group.filter((a) => a.esf === "fulfilling").length,
      untagged: group.filter((a) => !a.esf).length,
    };
  }).filter((d) => d.enjoyable + d.satisfying + d.fulfilling + d.untagged > 0);
  if (data.length === 0) return null;
  return (
    <div className="mt-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Achievements by life phase</p>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={data} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="decade" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
          <Tooltip />
          <Legend wrapperStyle={{ fontSize: 10 }} />
          <Bar dataKey="enjoyable" stackId="a" fill={ESF_COLOURS.enjoyable} name="Enjoyable" />
          <Bar dataKey="satisfying" stackId="a" fill={ESF_COLOURS.satisfying} name="Satisfying" />
          <Bar dataKey="fulfilling" stackId="a" fill={ESF_COLOURS.fulfilling} name="Fulfilling" />
          <Bar dataKey="untagged" stackId="a" fill="#9ca3af" name="Untagged" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── PAST TAB ─────────────────────────────────────────────────────────────────
function PastTab({
  clientId, achievements, family, career, education, chatSessions,
  notes, onNoteChange, analyses, onRefreshAnalyses, clientName,
}: {
  clientId: number; achievements: any[]; family: any; career: any[];
  education: any[]; chatSessions: any[]; notes: Record<string, string>;
  onNoteChange: (key: string, val: string) => void;
  analyses: Record<string, any>; onRefreshAnalyses: () => void;
  clientName: string;
}) {
  type PastSection = "lifeHistory" | "family" | "career";
  const [activeSection, setActiveSection] = useState<PastSection>("lifeHistory");

  const lifeSession = chatSessions.find((s: any) => s.section === "life_history");
  const careerSession = chatSessions.find((s: any) => s.section === "career_education");
  const lifeMessages = parseMessages(lifeSession?.messages);
  const careerMessages = parseMessages(careerSession?.messages);

  const PAST_SECTIONS: { id: PastSection; label: string; icon: React.ReactNode }[] = [
    { id: "lifeHistory", label: "Life History", icon: <BookOpen className="w-3.5 h-3.5" /> },
    { id: "family", label: "Family & Background", icon: <Users className="w-3.5 h-3.5" /> },
    { id: "career", label: "Career History", icon: <Briefcase className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="space-y-4">
      <div className="flex gap-1 border-b border-border">
        {PAST_SECTIONS.map((s) => (
          <button
            key={s.id}
            onClick={() => setActiveSection(s.id)}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeSection === s.id
                ? "border-[var(--lw-gold)] text-[var(--lw-gold)]"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {s.icon}{s.label}
          </button>
        ))}
      </div>

      {/* ── Life History ── */}
      {activeSection === "lifeHistory" && (
        <div className="space-y-6">
          <AchievementsChart achievements={achievements} />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(["enjoyable", "satisfying", "fulfilling"] as const).map((esf) => {
              const items = achievements.filter((a) => a.esf === esf);
              return (
                <div key={esf} className="border border-border rounded-xl overflow-hidden">
                  <div className="px-3 py-2 border-b border-border" style={{ background: ESF_COLOURS[esf] + "22" }}>
                    <p className="text-xs font-semibold uppercase tracking-wide capitalize" style={{ color: ESF_COLOURS[esf] }}>
                      {esf} ({items.length})
                    </p>
                  </div>
                  <div className="p-3 space-y-2 max-h-72 overflow-y-auto">
                    {items.length === 0 ? (
                      <p className="text-xs text-muted-foreground italic">None recorded.</p>
                    ) : items.map((a: any) => (
                      <div key={a.id} className="text-xs">
                        <p className="font-semibold text-foreground">{a.title}</p>
                        {a.age != null && <p className="text-muted-foreground">Age {a.age} · {a.decade}</p>}
                        {a.description && <p className="text-muted-foreground mt-0.5 line-clamp-2">{a.description}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex justify-end">
            <Button
              variant="outline" size="sm"
              onClick={() => window.open(`/api/export/esf-report/${clientId}`, "_blank")}
              className="gap-1.5 text-xs"
              style={{ borderColor: GOLD, color: GOLD }}
            >
              <Printer className="w-3.5 h-3.5" />Print ESF Life History
            </Button>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Sage — Life History Conversation</p>
            <SageTranscript messages={lifeMessages} clientName={clientName} />
          </div>
          <div className="border border-[var(--lw-gold)]/20 rounded-xl p-4 bg-[var(--lw-gold-light)]/5">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-[var(--lw-gold)]" />
              <p className="text-sm font-semibold text-foreground">Sage Analysis — Life History</p>
            </div>
            <AnalysisPanel analysis={analyses.lifeHistory} section="lifeHistory" clientId={clientId} onRefresh={onRefreshAnalyses} />
          </div>
          <CoachNoteField label="Coach Notes — Life History" noteKey="lifeHistory" value={notes.lifeHistory ?? ""} onChange={onNoteChange} placeholder="Observations, patterns noticed, questions to explore…" />
        </div>
      )}

      {/* ── Family & Background ── */}
      {activeSection === "family" && (
        <div className="space-y-6">
          <div className="border border-border rounded-xl overflow-hidden">
            <div className="px-4 py-2.5 border-b border-border bg-muted/20">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Family Background</p>
            </div>
            <div className="p-4 space-y-3">
              {!family ? (
                <p className="text-sm text-muted-foreground italic">No family background recorded.</p>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    {family.fatherOccupation && <div><p className="text-xs text-muted-foreground">Father's occupation</p><p className="font-medium text-foreground">{family.fatherOccupation}</p></div>}
                    {family.motherOccupation && <div><p className="text-xs text-muted-foreground">Mother's occupation</p><p className="font-medium text-foreground">{family.motherOccupation}</p></div>}
                    {family.siblingPosition && <div><p className="text-xs text-muted-foreground">Sibling position</p><p className="font-medium text-foreground">{family.siblingPosition}</p></div>}
                    {family.upbringingLocation && <div><p className="text-xs text-muted-foreground">Upbringing</p><p className="font-medium text-foreground">{family.upbringingLocation}</p></div>}
                  </div>
                  {family.familyNarrative && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Family narrative (verbatim)</p>
                      <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap bg-muted/20 rounded-lg p-3 border border-border">{family.familyNarrative}</p>
                    </div>
                  )}
                  {family.significantInfluences && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Significant influences (verbatim)</p>
                      <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap bg-muted/20 rounded-lg p-3 border border-border">{family.significantInfluences}</p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Sage — Life History Conversation (includes family context)</p>
            <SageTranscript messages={lifeMessages} clientName={clientName} />
          </div>
          <div className="border border-[var(--lw-gold)]/20 rounded-xl p-4 bg-[var(--lw-gold-light)]/5">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-[var(--lw-gold)]" />
              <p className="text-sm font-semibold text-foreground">Sage Analysis — Family & Background</p>
            </div>
            <AnalysisPanel analysis={analyses.family} section="family" clientId={clientId} onRefresh={onRefreshAnalyses} />
          </div>
          <CoachNoteField label="Coach Notes — Family & Background" noteKey="family" value={notes.family ?? ""} onChange={onNoteChange} placeholder="Family influences, values instilled, patterns to explore…" />
        </div>
      )}

      {/* ── Career History ── */}
      {activeSection === "career" && (
        <div className="space-y-6">
          <div className="border border-border rounded-xl overflow-hidden">
            <div className="px-4 py-2.5 border-b border-border bg-muted/20">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Career History</p>
            </div>
            <div className="divide-y divide-border">
              {career.length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground italic">No career history recorded.</p>
              ) : career.map((c: any) => (
                <div key={c.id} className="p-4">
                  <div className="flex items-start justify-between gap-3 mb-1">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{c.role ?? "Role"}</p>
                      <p className="text-xs text-muted-foreground">{c.organisation}</p>
                    </div>
                    <p className="text-xs text-muted-foreground whitespace-nowrap">{c.yearFrom ?? "?"} – {c.yearTo ?? "present"}</p>
                  </div>
                  {c.keyResponsibilities && <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{c.keyResponsibilities}</p>}
                  {c.highlights && <p className="text-xs text-foreground mt-1 leading-relaxed"><span className="font-medium text-[var(--lw-gold)]">Highlights: </span>{c.highlights}</p>}
                  {c.whyLeft && <p className="text-xs text-muted-foreground mt-1"><span className="font-medium">Why left: </span>{c.whyLeft}</p>}
                </div>
              ))}
            </div>
          </div>
          {education.length > 0 && (
            <div className="border border-border rounded-xl overflow-hidden">
              <div className="px-4 py-2.5 border-b border-border bg-muted/20">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Education</p>
              </div>
              <div className="divide-y divide-border">
                {education.map((e: any) => (
                  <div key={e.id} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-foreground">{e.qualification ?? ""} {e.subject ?? ""}</p>
                        <p className="text-xs text-muted-foreground">{e.institution}</p>
                      </div>
                      <p className="text-xs text-muted-foreground whitespace-nowrap">{e.yearFrom ?? "?"} – {e.yearTo ?? "?"}</p>
                    </div>
                    {e.highlights && <p className="text-xs text-muted-foreground mt-1">{e.highlights}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Sage — Career & Education Conversation</p>
            <SageTranscript messages={careerMessages} clientName={clientName} />
          </div>
          <div className="border border-[var(--lw-gold)]/20 rounded-xl p-4 bg-[var(--lw-gold-light)]/5">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-[var(--lw-gold)]" />
              <p className="text-sm font-semibold text-foreground">Sage Analysis — Career History</p>
            </div>
            <AnalysisPanel analysis={analyses.career} section="career" clientId={clientId} onRefresh={onRefreshAnalyses} />
          </div>
          <CoachNoteField label="Coach Notes — Career History" noteKey="career" value={notes.career ?? ""} onChange={onNoteChange} placeholder="Career themes, transition patterns, questions to explore…" />
        </div>
      )}
    </div>
  );
}

// ─── PRESENT TAB ──────────────────────────────────────────────────────────────
function PresentTab({
  clientId, via, ipip, notes, onNoteChange,
}: {
  clientId: number; via: any; ipip: any;
  notes: Record<string, string>; onNoteChange: (key: string, val: string) => void;
}) {
  const strengthsMap = new Map<string, ViaStrength>(VIA_STRENGTHS.map((s: ViaStrength) => [s.id, s]));
  const ranked: Array<{ strengthId: string; score: number }> = via?.rankedStrengths
    ? (typeof via.rankedStrengths === "string" ? JSON.parse(via.rankedStrengths) : via.rankedStrengths)
    : [];
  const domainScores = parseDomainScores(ipip?.domainScores);

  const DOMAIN_INFO: Record<string, { name: string; color: string; low: string; high: string }> = {
    N: { name: "Neuroticism", color: "#7C3AED", low: "Emotionally stable, calm", high: "Emotionally reactive, prone to stress" },
    E: { name: "Extraversion", color: "#D97706", low: "Reserved, reflective", high: "Outgoing, energetic, sociable" },
    O: { name: "Openness", color: "#059669", low: "Practical, conventional", high: "Curious, creative, open to new ideas" },
    A: { name: "Agreeableness", color: "#DB2777", low: "Competitive, sceptical", high: "Cooperative, trusting, empathetic" },
    C: { name: "Conscientiousness", color: "#2563EB", low: "Spontaneous, flexible", high: "Organised, disciplined, goal-directed" },
  };

  return (
    <div className="space-y-8">
      {ipip && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1 h-5 rounded-full" style={{ background: GOLD }} />
            <h3 className="text-base font-serif font-semibold text-foreground">Insights Discovery Mapping</h3>
          </div>
          <div className="p-4 rounded-xl border border-[var(--lw-gold)]/20 bg-[var(--lw-gold-light)]/5">
            <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
              The Insights wheel maps personality tendencies to colour energies. This is a starting point for conversation — not a label.
            </p>
            <InsightsMapping
              extraversion={domainScores.E ?? 50}
              agreeableness={domainScores.A ?? 50}
              openness={domainScores.O ?? 50}
              conscientiousness={domainScores.C ?? 50}
            />
          </div>
        </div>
      )}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-1 h-5 rounded-full" style={{ background: GOLD }} />
          <h3 className="text-base font-serif font-semibold text-foreground">VIA Character Strengths</h3>
        </div>
        {!via ? (
          <p className="text-sm text-muted-foreground italic">VIA survey not yet completed.</p>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground mb-3">Top 10 strengths — the client's most natural and energising qualities.</p>
            {ranked.slice(0, 10).map((s: any, i: number) => {
              const strength = strengthsMap.get(s.strengthId);
              const pct = Math.round((s.score / 25) * 100);
              return (
                <div key={s.strengthId} className={`p-3 rounded-xl border ${i < 5 ? "border-[var(--lw-gold)]/30 bg-[var(--lw-gold-light)]/15" : "border-border"}`}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-[var(--lw-gold)] w-5">{i + 1}</span>
                      <span className="text-sm font-semibold text-foreground">{strength?.name ?? s.strengthId}</span>
                      {strength?.virtue && <span className="text-xs text-muted-foreground">({strength.virtue})</span>}
                    </div>
                    <span className="text-xs font-bold text-[var(--lw-gold)]">{s.score}/25</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-[var(--lw-gold)] rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                  {i < 5 && strength?.atWork && (
                    <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{strength.atWork}</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
      <div>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-1 h-5 rounded-full" style={{ background: GOLD }} />
          <h3 className="text-base font-serif font-semibold text-foreground">OCEAN Personality Profile</h3>
        </div>
        {!ipip ? (
          <p className="text-sm text-muted-foreground italic">Personality assessment not yet completed.</p>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground mb-3">Big Five (IPIP-NEO) scores — 0–100 percentile. Use these as conversation starters, not definitive labels.</p>
            {Object.entries(DOMAIN_INFO).map(([key, info]) => {
              const score = domainScores[key] ?? 50;
              return (
                <div key={key} className="p-3 rounded-xl border border-border">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-foreground">{info.name}</span>
                    <span className="text-sm font-bold" style={{ color: info.color }}>{score}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden mb-1.5">
                    <div className="h-full rounded-full" style={{ width: `${score}%`, background: info.color }} />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{info.low}</span>
                    <span>{info.high}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <CoachNoteField label="Coach Notes — Present" noteKey="present" value={notes.present ?? ""} onChange={onNoteChange} placeholder="Observations on strengths, personality patterns, Insights colour energy…" />
    </div>
  );
}

// ─── FUTURE TAB ───────────────────────────────────────────────────────────────
function FutureTab({
  clientId, notes, onNoteChange,
}: {
  clientId: number; notes: Record<string, string>;
  onNoteChange: (key: string, val: string) => void;
}) {
  const utils = trpc.useUtils();
  const [focusStatement, setFocusStatement] = useState(notes.focusStatement ?? "");

  const saveFocus = trpc.counselor.saveFocusStatement.useMutation({
    onSuccess: () => toast.success("Focus statement saved."),
    onError: () => toast.error("Failed to save."),
  });

  const generateThemes = trpc.counselor.generateEmergingThemes.useMutation({
    onSuccess: () => {
      toast.success("Emerging themes generated.");
      utils.counselor.getCoachNotes.invalidate({ clientId });
    },
    onError: () => toast.error("Failed to generate themes."),
  });

  const { data: notesData } = trpc.counselor.getCoachNotes.useQuery({ clientId });
  const cachedNotes = notesData?.notes ?? {};
  const emergingThemesRaw = cachedNotes.emergingThemes;
  const emergingThemes = emergingThemesRaw
    ? (typeof emergingThemesRaw === "string" ? JSON.parse(emergingThemesRaw) : emergingThemesRaw)
    : null;

  const SAGE_QUESTIONS = [
    { id: "howDoYouKnow", label: "How do you know?", description: "Explore the evidence behind the client's self-perception and assumptions." },
    { id: "whyNow", label: "Why now?", description: "Understand the urgency and context driving the desire for change." },
    { id: "whatSuccess", label: "What would success look like?", description: "Clarify the client's vision of a positive outcome." },
  ];

  return (
    <div className="space-y-8">
      {/* Focus Statement */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-1 h-5 rounded-full" style={{ background: GOLD }} />
          <h3 className="text-base font-serif font-semibold text-foreground">Focus Statement</h3>
        </div>
        <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
          The coach-defined focus for this session. Edit and save before generating Emerging Themes.
        </p>
        <textarea
          className="w-full min-h-[80px] text-sm rounded-lg border border-[var(--lw-gold)]/40 bg-card px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[var(--lw-gold)]/40 resize-y"
          placeholder="e.g. Exploring how to move from a technical specialist role into a leadership position…"
          value={focusStatement}
          onChange={(e) => setFocusStatement(e.target.value)}
        />
        <div className="flex justify-end mt-2">
          <Button
            size="sm"
            onClick={() => { saveFocus.mutate({ clientId, focusStatement }); onNoteChange("focusStatement", focusStatement); }}
            disabled={saveFocus.isPending}
            className="gap-1.5 bg-[var(--lw-gold)] hover:bg-[oklch(0.60_0.13_72)] text-white"
          >
            {saveFocus.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Save Focus
          </Button>
        </div>
      </div>

      {/* Sage Questions */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-1 h-5 rounded-full" style={{ background: GOLD }} />
          <h3 className="text-base font-serif font-semibold text-foreground">Sage Questions</h3>
        </div>
        <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
          Three orienting questions to guide the coaching conversation. Use these as prompts — not a script.
        </p>
        <div className="space-y-3">
          {SAGE_QUESTIONS.map((q) => (
            <div key={q.id} className="p-4 rounded-xl border border-[var(--lw-gold)]/20 bg-[var(--lw-gold-light)]/5">
              <p className="text-sm font-semibold text-foreground mb-1">{q.label}</p>
              <p className="text-xs text-muted-foreground mb-3">{q.description}</p>
              <CoachNoteField label="Coach notes" noteKey={q.id} value={notes[q.id] ?? ""} onChange={onNoteChange} placeholder="Notes from this line of enquiry…" />
            </div>
          ))}
        </div>
      </div>

      {/* Emerging Themes */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-1 h-5 rounded-full" style={{ background: GOLD }} />
          <h3 className="text-base font-serif font-semibold text-foreground">Emerging Themes Briefing</h3>
        </div>
        <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
          AI synthesis drawing together life history, career, psychometrics, and focus statement into 3–5 themes. Generate after setting the Focus Statement and running section analyses.
        </p>
        {!emergingThemes ? (
          <div className="border border-dashed border-[var(--lw-gold)]/40 rounded-xl p-5 text-center">
            <Sparkles className="w-6 h-6 text-[var(--lw-gold)]/60 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground mb-3">No emerging themes generated yet.</p>
            <Button
              size="sm"
              onClick={() => generateThemes.mutate({ clientId, forceRegenerate: false })}
              disabled={generateThemes.isPending}
              className="gap-1.5 bg-[var(--lw-gold)] hover:bg-[oklch(0.60_0.13_72)] text-white"
            >
              {generateThemes.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              {generateThemes.isPending ? "Generating…" : "Generate Emerging Themes"}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {emergingThemes.coachingApproach && (
              <div className="p-4 rounded-xl border border-[var(--lw-gold)]/30 bg-[var(--lw-gold-light)]/10">
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--lw-gold)] mb-2">Recommended Approach</p>
                <p className="text-sm text-foreground leading-relaxed">{emergingThemes.coachingApproach}</p>
              </div>
            )}
            {(emergingThemes.themes ?? []).map((t: any, i: number) => (
              <div key={i} className="p-4 rounded-xl border border-border bg-card">
                <div className="flex items-start gap-3">
                  <span className="text-lg font-bold text-[var(--lw-gold)] leading-none mt-0.5">{i + 1}</span>
                  <div>
                    <p className="text-sm font-semibold text-foreground mb-1">{t.title}</p>
                    <p className="text-sm text-muted-foreground leading-relaxed mb-2">{t.synthesis}</p>
                    {t.implications && <p className="text-xs text-[var(--lw-gold)] font-medium">→ {t.implications}</p>}
                  </div>
                </div>
              </div>
            ))}
            <div className="flex justify-end">
              <Button
                variant="ghost" size="sm"
                onClick={() => generateThemes.mutate({ clientId, forceRegenerate: true })}
                disabled={generateThemes.isPending}
                className="gap-1 text-xs text-muted-foreground"
              >
                {generateThemes.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                Refresh Themes
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Session Notes */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-1 h-5 rounded-full" style={{ background: GOLD }} />
          <h3 className="text-base font-serif font-semibold text-foreground">Session Notes</h3>
        </div>
        <p className="text-xs text-muted-foreground mb-3">Free-form notes from the coaching session.</p>
        <CoachNoteField label="Session Notes" noteKey="sessionNotes" value={notes.sessionNotes ?? ""} onChange={onNoteChange} placeholder="Key moments, realisations, commitments made, follow-up actions…" />
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function CoachingSessionTab({ clientId, clientData }: Props) {
  const { achievements, via, ipip, career, family, education, chatSessions, clientFirstName } = clientData;
  const clientName = clientFirstName ?? "Client";
  const utils = trpc.useUtils();

  const [activeTab, setActiveTab] = useState<MainTab>("past");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [notesLoaded, setNotesLoaded] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  trpc.counselor.getCoachNotes.useQuery(
    { clientId },
    {
      enabled: !!clientId,
      onSuccess: (data: { notes: Record<string, string> }) => {
        if (!notesLoaded) { setNotes(data.notes ?? {}); setNotesLoaded(true); }
      },
    } as any
  );

  const { data: analysesData, refetch: refetchAnalyses } = trpc.counselor.getSectionAnalysis.useQuery(
    { clientId },
    { enabled: !!clientId }
  );
  const analyses: Record<string, any> = analysesData?.analyses ?? {};

  const saveNotes = trpc.counselor.saveCoachNotes.useMutation({
    onError: () => toast.error("Failed to save notes."),
  });

  const handleNoteChange = useCallback((key: string, val: string) => {
    setNotes((prev) => ({ ...prev, [key]: val }));
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveNotes.mutate({ clientId, notes: { [key]: val } });
    }, 1500);
  }, [clientId, saveNotes]);

  const MAIN_TABS: { id: MainTab; label: string; icon: React.ReactNode }[] = [
    { id: "past", label: "Past", icon: <BookOpen className="w-4 h-4" /> },
    { id: "present", label: "Present", icon: <Star className="w-4 h-4" /> },
    { id: "future", label: "Future", icon: <Target className="w-4 h-4" /> },
  ];

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-serif font-bold text-foreground">Coaching Session</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Past · Present · Future — coach-facing facilitation view</p>
        </div>
        {saveNotes.isPending && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Loader2 className="w-3 h-3 animate-spin" />Saving…
          </div>
        )}
      </div>
      <div className="flex gap-1 border-b border-border">
        {MAIN_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-6 py-3 text-sm font-semibold transition-colors border-b-2 -mb-px ${
              activeTab === tab.id
                ? "border-[var(--lw-gold)] text-[var(--lw-gold)]"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.icon}{tab.label}
          </button>
        ))}
      </div>
      {activeTab === "past" && (
        <PastTab
          clientId={clientId} achievements={achievements} family={family}
          career={career} education={education ?? []} chatSessions={chatSessions}
          notes={notes} onNoteChange={handleNoteChange}
          analyses={analyses} onRefreshAnalyses={() => refetchAnalyses()}
          clientName={clientName}
        />
      )}
      {activeTab === "present" && (
        <PresentTab clientId={clientId} via={via} ipip={ipip} notes={notes} onNoteChange={handleNoteChange} />
      )}
      {activeTab === "future" && (
        <FutureTab clientId={clientId} notes={notes} onNoteChange={handleNoteChange} />
      )}
    </div>
  );
}
