import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Legend,
} from "recharts";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SectionData {
  summary: string;
  examples: string[];
  questions: string[];
}

interface CoachingSummary {
  lifeHistory: SectionData;
  career: SectionData;
  via: SectionData;
  ipip: SectionData;
  reasoning: SectionData;
}

type SectionKey = keyof CoachingSummary;

interface Props {
  clientId: number;
  clientData: {
    achievements: any[];
    via: any;
    ipip: any;
    cognitive: any;
    career: any[];
    family: any;
  };
}

// ─── Colour palette ───────────────────────────────────────────────────────────

const NAVY = "#0f1f35";
const GOLD = "#c9973a";
const CREAM = "#fdf9f3";

const ESF_COLOURS: Record<string, string> = {
  enjoyable: "#c9973a",
  satisfying: "#0f1f35",
  fulfilling: "#5b8a6e",
  "?": "#9ca3af",
};

const BIG_FIVE_COLOURS = ["#7C3AED", "#2563EB", "#059669", "#D97706", "#DC2626"];

// ─── Tab definitions ──────────────────────────────────────────────────────────

const TABS: { id: SectionKey; label: string; icon: string }[] = [
  { id: "lifeHistory", label: "Life History & Family", icon: "📖" },
  { id: "career", label: "Career", icon: "💼" },
  { id: "via", label: "VIA Strengths", icon: "⭐" },
  { id: "ipip", label: "Personality", icon: "🧠" },
  { id: "reasoning", label: "Reasoning", icon: "🔢" },
];

// ─── Chart: Achievements by decade & ESF ─────────────────────────────────────

function AchievementsChart({ achievements }: { achievements: any[] }) {
  const DECADES = ["0-5", "6-11", "12-18", "20s", "30s", "40s", "50s", "60s+"];
  const data = DECADES.map((decade) => {
    const group = achievements.filter((a) => a.decade === decade);
    return {
      decade,
      enjoyable: group.filter((a) => a.esf === "enjoyable").length,
      satisfying: group.filter((a) => a.esf === "satisfying").length,
      fulfilling: group.filter((a) => a.esf === "fulfilling").length,
      untagged: group.filter((a) => !a.esf).length,
    };
  }).filter((d) => d.enjoyable + d.satisfying + d.fulfilling + d.untagged > 0);

  if (data.length === 0) return <p className="text-sm text-muted-foreground italic">No achievement data recorded.</p>;

  return (
    <div className="mt-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Achievements by life phase</p>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="decade" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
          <Tooltip />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Bar dataKey="enjoyable" stackId="a" fill={ESF_COLOURS.enjoyable} name="Enjoyable" />
          <Bar dataKey="satisfying" stackId="a" fill={ESF_COLOURS.satisfying} name="Satisfying" />
          <Bar dataKey="fulfilling" stackId="a" fill={ESF_COLOURS.fulfilling} name="Fulfilling" />
          <Bar dataKey="untagged" stackId="a" fill={ESF_COLOURS["?"]} name="Untagged" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Chart: VIA top 10 ────────────────────────────────────────────────────────

function ViaChart({ via }: { via: any }) {
  if (!via?.rankedStrengths) return <p className="text-sm text-muted-foreground italic">VIA survey not completed.</p>;
  const top10 = (via.rankedStrengths as any[]).slice(0, 10).map((s: any, i: number) => ({
    name: s.strength,
    rank: 10 - i,
  }));
  return (
    <div className="mt-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Top 10 character strengths</p>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={top10} layout="vertical" margin={{ top: 0, right: 20, left: 100, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis type="number" domain={[0, 10]} tick={{ fontSize: 11 }} />
          <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={100} />
          <Tooltip formatter={(v: number) => [`Rank ${11 - v}`, "Rank"]} />
          <Bar dataKey="rank" radius={[0, 4, 4, 0]}>
            {top10.map((_, i) => (
              <Cell key={i} fill={i < 3 ? GOLD : NAVY} opacity={1 - i * 0.06} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Chart: Big Five ──────────────────────────────────────────────────────────

const BIG_FIVE = [
  { key: "O", name: "Openness" },
  { key: "C", name: "Conscientiousness" },
  { key: "E", name: "Extraversion" },
  { key: "A", name: "Agreeableness" },
  { key: "N", name: "Neuroticism" },
];

function IpipChart({ ipip }: { ipip: any }) {
  if (!ipip?.domainScores) return <p className="text-sm text-muted-foreground italic">IPIP survey not completed.</p>;
  const data = BIG_FIVE.map((d, i) => ({
    name: d.name,
    score: Math.round(((ipip.domainScores as any)[d.key] ?? 0) * 100),
    color: BIG_FIVE_COLOURS[i],
  }));
  return (
    <div className="mt-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Big Five personality profile</p>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} margin={{ top: 0, right: 20, left: -10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
          <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
          <Tooltip formatter={(v: number) => [`${v}%`, ""]} />
          <Bar dataKey="score" radius={[4, 4, 0, 0]}>
            {data.map((d, i) => (
              <Cell key={i} fill={d.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Chart: Reasoning scores ──────────────────────────────────────────────────

function ReasoningChart({ cognitive }: { cognitive: any }) {
  if (!cognitive?.scores) return <p className="text-sm text-muted-foreground italic">Reasoning screener not completed.</p>;
  const s = cognitive.scores as any;
  const data = [
    { name: "Verbal", score: s.verbal ?? 0, max: 10 },
    { name: "Numerical", score: s.numerical ?? 0, max: 10 },
    { name: "Abstract", score: s.abstract ?? 0, max: 10 },
  ];
  return (
    <div className="mt-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Reasoning screener scores (out of 10)</p>
      <ResponsiveContainer width="100%" height={160}>
        <BarChart data={data} margin={{ top: 0, right: 20, left: -10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="name" tick={{ fontSize: 12 }} />
          <YAxis domain={[0, 10]} tick={{ fontSize: 11 }} />
          <Tooltip />
          <Bar dataKey="score" radius={[4, 4, 0, 0]}>
            {data.map((_, i) => (
              <Cell key={i} fill={[GOLD, NAVY, "#5b8a6e"][i]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <p className="text-xs text-muted-foreground mt-2 text-center">
        Total: {s.total ?? "?"} / {s.totalMax ?? 30}
        {s.percentile != null ? ` · Percentile: ${s.percentile}th` : ""}
      </p>
    </div>
  );
}

// ─── Section panel ────────────────────────────────────────────────────────────

function SectionPanel({
  section,
  chart,
}: {
  section: SectionData;
  chart?: React.ReactNode;
}) {
  const [questionsOpen, setQuestionsOpen] = useState(false);

  return (
    <div className="space-y-6">
      {/* Chart */}
      {chart && (
        <div
          className="rounded-lg border p-4"
          style={{ background: CREAM, borderColor: "#e8e0d0" }}
        >
          {chart}
        </div>
      )}

      {/* Summary */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: GOLD }}>
          Summary
        </p>
        <div className="prose prose-sm max-w-none text-foreground leading-relaxed">
          {section.summary.split("\n\n").map((para, i) => (
            <p key={i} className="mb-3 last:mb-0">
              {para}
            </p>
          ))}
        </div>
      </div>

      {/* Examples */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: GOLD }}>
          From their data
        </p>
        <ul className="space-y-2">
          {section.examples.map((ex, i) => (
            <li
              key={i}
              className="flex gap-3 text-sm leading-relaxed rounded-lg p-3"
              style={{ background: "#f0ebe3", borderLeft: `3px solid ${GOLD}` }}
            >
              <span className="shrink-0 font-bold text-xs mt-0.5" style={{ color: GOLD }}>
                {i + 1}
              </span>
              <span>{ex}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Questions */}
      <div>
        <button
          onClick={() => setQuestionsOpen((o) => !o)}
          className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide mb-3 hover:opacity-70 transition-opacity"
          style={{ color: NAVY }}
        >
          <span
            className="inline-block transition-transform"
            style={{ transform: questionsOpen ? "rotate(90deg)" : "rotate(0deg)" }}
          >
            ▶
          </span>
          Questions to explore ({section.questions.length})
        </button>
        {questionsOpen && (
          <ul className="space-y-2">
            {section.questions.map((q, i) => (
              <li
                key={i}
                className="flex gap-3 text-sm leading-relaxed rounded-lg p-3 border"
                style={{ borderColor: "#d1c9bc", background: "#fff" }}
              >
                <span
                  className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white"
                  style={{ background: NAVY }}
                >
                  {i + 1}
                </span>
                <span className="italic">{q}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function CoachingSessionTab({ clientId, clientData }: Props) {
  const [activeSection, setActiveSection] = useState<SectionKey>("lifeHistory");
  const [isGenerating, setIsGenerating] = useState(false);

  const { data: cached, refetch } = trpc.counselor.getCoachingSummary.useQuery({ clientId });
  const generate = trpc.counselor.generateCoachingSummary.useMutation({
    onSuccess: () => {
      refetch();
      setIsGenerating(false);
      toast.success("Coaching summary generated.");
    },
    onError: (err) => {
      setIsGenerating(false);
      toast.error(`Failed to generate: ${err.message}`);
    },
  });

  const summary: CoachingSummary | null = cached?.summary ?? null;

  const handleGenerate = (force = false) => {
    setIsGenerating(true);
    generate.mutate({ clientId, forceRegenerate: force });
  };

  const currentSection = summary?.[activeSection];

  const handlePrintEsf = () => {
    window.open(`/api/export/esf-report/${clientId}`, "_blank");
  };

  const chartFor = (key: SectionKey) => {
    if (key === "lifeHistory") return <AchievementsChart achievements={clientData.achievements} />;
    if (key === "via") return <ViaChart via={clientData.via} />;
    if (key === "ipip") return <IpipChart ipip={clientData.ipip} />;
    if (key === "reasoning") return <ReasoningChart cognitive={clientData.cognitive} />;
    return undefined;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold" style={{ color: NAVY }}>
            Guided Coaching Session
          </h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            Walk the client through each section one at a time — revealing insights progressively.
          </p>
        </div>
        <div className="flex gap-2">
          {summary && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleGenerate(true)}
              disabled={isGenerating}
            >
              Regenerate
            </Button>
          )}
          {!summary && (
            <Button
              size="sm"
              onClick={() => handleGenerate(false)}
              disabled={isGenerating}
              style={{ background: NAVY, color: "#fff" }}
            >
              {isGenerating ? "Generating… (30–60s)" : "Generate Coaching Summary"}
            </Button>
          )}
        </div>
      </div>

      {/* Generating state */}
      {isGenerating && (
        <div
          className="rounded-lg border p-6 text-center"
          style={{ background: CREAM, borderColor: "#e8e0d0" }}
        >
          <div className="animate-pulse space-y-2">
            <p className="text-sm font-medium" style={{ color: NAVY }}>
              Analysing client data across all five sections…
            </p>
            <p className="text-xs text-muted-foreground">
              This takes 30–60 seconds. The result is cached — you won't need to regenerate unless new data is added.
            </p>
          </div>
        </div>
      )}

      {/* No summary yet */}
      {!summary && !isGenerating && (
        <div
          className="rounded-lg border p-8 text-center"
          style={{ background: CREAM, borderColor: "#e8e0d0" }}
        >
          <p className="text-2xl mb-3">📋</p>
          <p className="text-sm font-medium mb-1" style={{ color: NAVY }}>
            No coaching summary yet
          </p>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Click "Generate Coaching Summary" to create a guided session plan with summaries, examples, and reflective questions for each section.
          </p>
        </div>
      )}

      {/* Summary available */}
      {summary && !isGenerating && (
        <>
          {/* Section tabs */}
          <div className="flex gap-1 flex-wrap border-b" style={{ borderColor: "#e8e0d0" }}>
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveSection(tab.id)}
                className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors relative"
                style={{
                  color: activeSection === tab.id ? NAVY : "#6b7280",
                  borderBottom: activeSection === tab.id ? `2px solid ${GOLD}` : "2px solid transparent",
                  marginBottom: "-1px",
                }}
              >
                <span>{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>

          {/* ESF print button — shown only on Life History tab */}
          {activeSection === "lifeHistory" && (
            <div className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrintEsf}
                style={{ borderColor: GOLD, color: GOLD }}
              >
                🖨 Print ESF Life History
              </Button>
            </div>
          )}

          {/* Section content */}
          {currentSection && (
            <SectionPanel
              section={currentSection}
              chart={chartFor(activeSection)}
            />
          )}
        </>
      )}
    </div>
  );
}
