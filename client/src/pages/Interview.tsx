import { useState, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useLocation } from "wouter";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Loader2,
  Info,
  Lightbulb,
  BookOpen,
} from "lucide-react";
import { toast } from "sonner";

// ─── Phase definitions ────────────────────────────────────────────────────────
// The DB decade enum has 7 values. We split childhood into 3 UI phases and teens
// into 1 UI phase, all of which map to "childhood" or "teens" in the DB.
// A "subPhase" label is stored in the title prefix to distinguish them.

type DecadeEnum =
  | "childhood"
  | "teens"
  | "twenties"
  | "thirties"
  | "forties"
  | "fifties"
  | "sixties_plus";

const PHASES: {
  id: string;
  label: string;
  phase: string;
  ageRange: string;
  decade: DecadeEnum;
  subPhase: string; // stored as prefix in title to distinguish within same decade
}[] = [
  { id: "early_childhood",  label: "Early Childhood",   phase: "1st Phase", ageRange: "Ages 0–5",   decade: "childhood",    subPhase: "Early (0-5)" },
  { id: "mid_childhood",    label: "Mid Childhood",     phase: "2nd Phase", ageRange: "Ages 6–11",  decade: "childhood",    subPhase: "Mid (6-11)" },
  { id: "late_childhood",   label: "Late Childhood",    phase: "3rd Phase", ageRange: "Ages 12–18", decade: "teens",        subPhase: "Late (12-18)" },
  { id: "twenties",         label: "Your 20s",          phase: "4th Phase", ageRange: "Ages 19–29", decade: "twenties",     subPhase: "" },
  { id: "thirties",         label: "Your 30s",          phase: "5th Phase", ageRange: "Ages 30–39", decade: "thirties",     subPhase: "" },
  { id: "forties",          label: "Your 40s",          phase: "6th Phase", ageRange: "Ages 40–49", decade: "forties",      subPhase: "" },
  { id: "fifties",          label: "Your 50s",          phase: "7th Phase", ageRange: "Ages 50–59", decade: "fifties",      subPhase: "" },
  { id: "sixties_plus",     label: "Your 60s & beyond", phase: "8th Phase", ageRange: "Ages 60+",   decade: "sixties_plus", subPhase: "" },
];

const ESF_OPTIONS = [
  {
    value: "enjoyable" as const,
    label: "Enjoyable",
    tagline: '"in the moment"',
    description:
      "You were absorbed and engaged while doing it — the pleasure was in the activity itself as it happened.",
    selectedColor: "bg-blue-500 text-white border-blue-500",
    badgeColor: "bg-blue-100 text-blue-700",
    dot: "bg-blue-500",
  },
  {
    value: "satisfying" as const,
    label: "Satisfying",
    tagline: '"rewarding"',
    description:
      "Looking back, you felt a sense of reward or accomplishment — it was worth doing.",
    selectedColor: "bg-emerald-500 text-white border-emerald-500",
    badgeColor: "bg-emerald-100 text-emerald-700",
    dot: "bg-emerald-500",
  },
  {
    value: "fulfilling" as const,
    label: "Fulfilling",
    tagline: '"longer-term satisfying"',
    description:
      "It gave you a deeper, more lasting sense of meaning — the kind of satisfaction that stays with you.",
    selectedColor: "bg-purple-500 text-white border-purple-500",
    badgeColor: "bg-purple-100 text-purple-700",
    dot: "bg-purple-500",
  },
];

type Action = { id?: number; title: string; age: string; description: string; esf: string };
const emptyAction = (): Action => ({ title: "", age: "", description: "", esf: "" });

// ─── Main component ───────────────────────────────────────────────────────────

export default function Interview() {
  const { isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();

  const [phaseIndex, setPhaseIndex] = useState(0);
  const [phaseActions, setPhaseActions] = useState<Record<string, Action[]>>(() =>
    Object.fromEntries(
      PHASES.map((p) => [p.id, [emptyAction(), emptyAction(), emptyAction(), emptyAction()]])
    )
  );
  const [showIntro, setShowIntro] = useState(true);
  const [showExample, setShowExample] = useState(false);
  const [saving, setSaving] = useState(false);

  const utils = trpc.useUtils();

  // Load existing achievements from the achievements router
  const { data: existing } = trpc.achievements.list.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  // Populate form from saved data
  useEffect(() => {
    if (!existing || existing.length === 0) return;
    const loaded: Record<string, Action[]> = Object.fromEntries(
      PHASES.map((p) => [p.id, [emptyAction(), emptyAction(), emptyAction(), emptyAction()]])
    );
    // For each phase, collect matching achievements
    PHASES.forEach((phase) => {
      const items = existing.filter((a: any) => {
        if (a.decade !== phase.decade) return false;
        // For phases that share a decade (childhood sub-phases), match ONLY by exact prefix
        if (phase.subPhase) {
          return a.title?.startsWith(`[${phase.subPhase}] `);
        }
        // For adult decades, exclude any items that have a subPhase prefix
        return !a.title?.match(/^\[.+\] /);
      });
      items.slice(0, 4).forEach((a: any, i: number) => {
        const rawTitle = phase.subPhase
          ? (a.title ?? "").replace(`[${phase.subPhase}] `, "")
          : (a.title ?? "");
        loaded[phase.id][i] = {
          id: a.id,
          title: rawTitle,
          age: a.age != null ? String(a.age) : "",
          description: a.description ?? "",
          esf: a.esf ?? "",
        };
      });
    });
    setPhaseActions(loaded);
  }, [existing]);

  const saveAchievement = trpc.achievements.save.useMutation({
    onSuccess: () => utils.achievements.list.invalidate(),
  });

  const completeInterview = trpc.interview.completeInterview.useMutation({
    onSuccess: () => {
      toast.success("Life history complete!");
      navigate("/dashboard");
    },
  });

  if (!loading && !isAuthenticated) {
    window.location.href = getLoginUrl();
    return null;
  }

  const currentPhase = PHASES[phaseIndex];
  const actions = phaseActions[currentPhase.id];

  const updateAction = (idx: number, field: keyof Action, value: string) => {
    setPhaseActions((prev) => {
      const updated = [...prev[currentPhase.id]];
      updated[idx] = { ...updated[idx], [field]: value };
      return { ...prev, [currentPhase.id]: updated };
    });
  };

  const handleSaveAndNext = async () => {
    setSaving(true);
    try {
      // Work over all 4 slots (including empty ones, to handle deletions gracefully)
      const updatedActions = [...actions];

      for (let i = 0; i < actions.length; i++) {
        const a = actions[i];
        const hasContent = a.title.trim() || a.description.trim();
        if (!hasContent) continue; // skip blank slots

        // Prefix title with subPhase so we can distinguish early/mid/late childhood
        const titleWithPrefix = currentPhase.subPhase
          ? `[${currentPhase.subPhase}] ${a.title.trim()}`
          : a.title.trim();

        const result = await saveAchievement.mutateAsync({
          id: a.id,          // pass existing id → UPDATE; undefined → INSERT
          title: titleWithPrefix,
          age: a.age ? parseInt(a.age) : undefined,
          description: a.description.trim() || undefined,
          esf: (a.esf as "enjoyable" | "satisfying" | "fulfilling") || undefined,
          decade: currentPhase.decade,
          sortOrder: i,
        });

        // Store the returned id so the next save on the same session does an UPDATE
        if (result?.id && !a.id) {
          updatedActions[i] = { ...a, id: result.id };
        }
      }

      // Update local state with the new ids (prevents duplicate inserts if user navigates back)
      setPhaseActions((prev) => ({ ...prev, [currentPhase.id]: updatedActions }));

      if (phaseIndex < PHASES.length - 1) {
        setPhaseIndex((i) => i + 1);
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        await completeInterview.mutateAsync();
      }
    } catch {
      toast.error("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const completedPhases = PHASES.filter((p) =>
    phaseActions[p.id].some((a) => a.title.trim() || a.description.trim())
  ).length;

  // ── Introduction screen ───────────────────────────────────────────────────────
  if (showIntro) {
    return (
      <div className="min-h-screen" style={{ background: "var(--lw-cream)" }}>
        <div className="sticky top-0 z-10" style={{ background: "var(--lw-navy)", borderBottom: "2px solid var(--lw-gold)" }}>
          <div className="container flex items-center justify-between h-14">
            <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}
              style={{ color: "rgba(255,255,255,0.7)" }}
              className="hover:text-white">
              <ArrowLeft className="w-4 h-4 mr-1" /> Dashboard
            </Button>
            <span className="font-serif font-semibold" style={{ color: "var(--lw-gold)", fontSize: "0.85rem", letterSpacing: "0.05em" }}>LIFEWORK</span>
          </div>
        </div>

        <div className="container max-w-2xl py-10">
          <p className="text-xs uppercase tracking-widest text-[var(--lw-gold)] font-semibold mb-2">
            Life History
          </p>
          <h1 className="text-3xl font-serif font-bold text-foreground mb-5">
            The story of who you are
          </h1>

          {/* Peter's opening framing — verbatim */}
          <div className="space-y-4 text-[15px] leading-relaxed text-foreground mb-8">
            <p>
              Who you are now is a continuation of who you were one year, three years, five years,
              and a decade ago, right back to when you were a babe in arms — and perhaps even when
              in the womb.
            </p>
            <p>
              To enable more effective coaching, it is therefore good to understand more about your
              past: what you did, when and why. To capture this information in a simple, structured
              way, we use a life history format.
            </p>
          </div>

          {/* How it works */}
          <div className="p-5 rounded-xl bg-card border border-border mb-5">
            <h2 className="font-serif font-semibold text-foreground text-lg mb-3 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-[var(--lw-gold)]" /> How it works
            </h2>
            <div className="space-y-3 text-sm text-foreground leading-relaxed">
              <p>
                Although you will have many adult experiences that are noteworthy, it is your{" "}
                <strong>earlier life that underpins "you"</strong>. We start with childhood and work
                forward through the decades.
              </p>
              <p>
                Think of the things you have done where there is perhaps{" "}
                <strong>some skill indicated</strong> — where you were pleased personally with what
                you did. Don't take any notice of what others thought. It's what you personally
                found interesting that counts.
              </p>
              <p>
                You will record <strong>4 actions for each stage</strong>. Each action should take
                no more than 5 minutes to record, so the whole exercise should only take about an
                hour.
              </p>
            </div>
          </div>

          {/* ESF Definitions */}
          <div className="p-5 rounded-xl bg-[var(--lw-gold-light)]/30 border border-[var(--lw-gold)]/20 mb-5">
            <h2 className="font-serif font-semibold text-foreground text-lg mb-3 flex items-center gap-2">
              <Info className="w-5 h-5 text-[var(--lw-gold)]" /> Enjoyable, Satisfying, or Fulfilling?
            </h2>
            <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
              For each action you record, you must say whether it was Enjoyable, Satisfying, or
              Fulfilling. The differences are subtle but really worth noting. You must choose one of
              the three for each action, and{" "}
              <strong>all three must be used at least a few times</strong>.
            </p>
            <div className="space-y-3">
              {ESF_OPTIONS.map((opt) => (
                <div key={opt.value} className="flex gap-3 items-start">
                  <div className={`w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 ${opt.dot}`} />
                  <div>
                    <span className="text-sm font-semibold text-foreground">{opt.label}</span>
                    <span className="text-sm text-muted-foreground italic ml-2">{opt.tagline}</span>
                    <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed">
                      {opt.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Hints & Tips */}
          <div className="p-5 rounded-xl bg-amber-50 border border-amber-200 mb-5">
            <h2 className="font-serif font-semibold text-foreground text-lg mb-3 flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-amber-600" /> Hints and Tips
            </h2>
            <ul className="space-y-2.5 text-sm text-foreground">
              <li className="flex gap-2 leading-relaxed">
                <span className="text-amber-500 mt-0.5 flex-shrink-0">•</span>
                <span>
                  Indicate briefly what sort of things you were <strong>thinking</strong> as well as
                  doing — both contribute to an action's success.
                </span>
              </li>
              <li className="flex gap-2 leading-relaxed">
                <span className="text-amber-500 mt-0.5 flex-shrink-0">•</span>
                <span>
                  When several people were involved in something, it helps to know{" "}
                  <strong>what your role was</strong> in the group to help make it all work.
                </span>
              </li>
              <li className="flex gap-2 leading-relaxed">
                <span className="text-amber-500 mt-0.5 flex-shrink-0">•</span>
                <span>
                  <strong>Please do not try to be modest.</strong> We are looking at natural talents
                  and abilities, and you have a responsibility to be clear and open about these.
                </span>
              </li>
              <li className="flex gap-2 leading-relaxed">
                <span className="text-amber-500 mt-0.5 flex-shrink-0">•</span>
                <span>
                  Use phrases — don't worry about complete sentences.{" "}
                  <strong>Keep phrases short</strong> (no longer than a line).
                </span>
              </li>
            </ul>
          </div>

          {/* Worked example */}
          <div className="mb-8">
            <button
              onClick={() => setShowExample((v) => !v)}
              className="text-sm text-[var(--lw-gold)] font-medium underline underline-offset-2 mb-3 block"
            >
              {showExample ? "Hide example ↑" : "See a worked example ↓"}
            </button>
            {showExample && (
              <div className="p-5 rounded-xl border-2 border-[var(--lw-gold)]/30 bg-[var(--lw-gold-light)]/20">
                <p className="text-xs uppercase tracking-widest text-[var(--lw-gold)] font-semibold mb-4">
                  Example — Early Childhood
                </p>
                <div className="grid grid-cols-[110px_1fr] gap-y-3 gap-x-4 text-sm">
                  <span className="font-semibold text-muted-foreground uppercase text-xs tracking-wide pt-0.5">
                    Action
                  </span>
                  <span className="font-semibold text-foreground text-base">Playing Teacher</span>

                  <span className="font-semibold text-muted-foreground uppercase text-xs tracking-wide pt-0.5">
                    Age
                  </span>
                  <span className="text-foreground">6</span>

                  <span className="font-semibold text-muted-foreground uppercase text-xs tracking-wide pt-0.5">
                    ESF
                  </span>
                  <span>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-100 text-purple-700 text-xs font-semibold">
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                      Fulfilling — "longer-term satisfying"
                    </span>
                  </span>

                  <span className="font-semibold text-muted-foreground uppercase text-xs tracking-wide pt-0.5">
                    Description
                  </span>
                  <span className="text-foreground leading-relaxed">
                    Set up school for my stuffed animals — lined them up on chairs in front of the
                    board — if a friend were visiting, she would join the school as one of the pupils
                    — took the lessons by writing on the board — recorded the marks in a book — gave
                    silver and gold stars for good work — usually taught maths or English — planned
                    timetable out for each day — worked out what each animal would be interested in
                    learning.
                  </span>
                </div>
              </div>
            )}
          </div>

          <Button
            size="lg"
            onClick={() => setShowIntro(false)}
            className="w-full bg-[var(--lw-gold)] hover:bg-[oklch(0.60 0.13 72)] text-white gap-2 text-base py-6"
          >
            Begin — Early Childhood (Ages 0–5) <ArrowRight className="w-5 h-5" />
          </Button>
        </div>
      </div>
    );
  }

  // ── Phase entry form ──────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen" style={{ background: "var(--lw-cream)" }}>
      {/* Sticky header with progress */}
      <div className="sticky top-0 z-10" style={{ background: "var(--lw-navy)", borderBottom: "2px solid var(--lw-gold)" }}>
        <div className="container flex items-center justify-between h-14">
          <Button
            variant="ghost"
            size="sm"
            style={{ color: "rgba(255,255,255,0.7)" }}
            className="hover:text-white"
            onClick={() =>
              phaseIndex === 0 ? setShowIntro(true) : setPhaseIndex((i) => i - 1)
            }
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            {phaseIndex === 0 ? "Introduction" : PHASES[phaseIndex - 1].label}
          </Button>
          <div className="flex items-center gap-3">
            <span className="text-xs hidden sm:block" style={{ color: "rgba(255,255,255,0.6)" }}>
              Phase {phaseIndex + 1} of {PHASES.length}
            </span>
            <div className="flex gap-1 items-center">
              {PHASES.map((p, i) => (
                <div
                  key={p.id}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i < phaseIndex
                      ? "w-4 bg-green-500"
                      : i === phaseIndex
                      ? "w-6 bg-[var(--lw-gold)]"
                      : "w-1.5 bg-muted"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="container max-w-2xl py-8">
        {/* Phase header */}
        <div className="mb-6">
          <p className="text-xs uppercase tracking-widest text-[var(--lw-gold)] font-semibold mb-1">
            {currentPhase.phase}
          </p>
          <h1 className="text-2xl font-serif font-bold text-foreground mb-1">
            {currentPhase.label}
          </h1>
          <p className="text-sm text-muted-foreground">{currentPhase.ageRange}</p>
        </div>

        {/* Reminder banner */}
        <div className="p-4 rounded-lg bg-[var(--lw-gold-light)]/20 border border-[var(--lw-gold)]/15 mb-6 text-sm text-foreground leading-relaxed">
          Think of things where <strong>some skill was indicated</strong> — where you were
          personally pleased with what you did. Don't take any notice of what others thought. Record{" "}
          <strong>4 actions</strong> for this stage using short phrases.
        </div>

        {/* ESF quick-reference pills */}
        <div className="flex gap-2 mb-7 flex-wrap">
          {ESF_OPTIONS.map((opt) => (
            <div
              key={opt.value}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border bg-card"
            >
              <div className={`w-2 h-2 rounded-full ${opt.dot}`} />
              <span className="font-semibold">{opt.label}</span>
              <span className="text-muted-foreground">{opt.tagline}</span>
            </div>
          ))}
        </div>

        {/* 4 Action cards */}
        <div className="space-y-5">
          {actions.map((action, idx) => (
            <div
              key={idx}
              className={`p-5 rounded-xl border-2 transition-colors ${
                action.title || action.description
                  ? "border-[var(--lw-gold)]/30 bg-card"
                  : "border-border bg-card"
              }`}
            >
              {/* Card header */}
              <div className="flex items-center gap-2 mb-4">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                    action.title || action.description
                      ? "bg-[var(--lw-gold)] text-white"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {idx + 1}
                </div>
                <span className="text-sm font-medium text-muted-foreground">Action {idx + 1}</span>
                {(action.title || action.description) && action.esf && (
                  <span
                    className={`ml-auto text-xs px-2.5 py-0.5 rounded-full font-semibold capitalize ${
                      ESF_OPTIONS.find((o) => o.value === action.esf)?.badgeColor ?? ""
                    }`}
                  >
                    {action.esf}
                  </span>
                )}
              </div>

              {/* Action title + Age */}
              <div className="grid grid-cols-[1fr_88px] gap-3 mb-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">
                    Action / Title
                  </label>
                  <Input
                    value={action.title}
                    onChange={(e) => updateAction(idx, "title", e.target.value)}
                    placeholder={
                      idx === 0 && phaseIndex === 0
                        ? 'e.g. "Playing Teacher"'
                        : "A short name for this action"
                    }
                    className="text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">
                    Age
                  </label>
                  <Input
                    type="number"
                    value={action.age}
                    onChange={(e) => updateAction(idx, "age", e.target.value)}
                    placeholder="e.g. 6"
                    className="text-sm"
                    min={0}
                    max={99}
                  />
                </div>
              </div>

              {/* Description */}
              <div className="mb-4">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">
                  Description{" "}
                  <span className="font-normal normal-case text-muted-foreground">
                    — what you were doing and thinking (short phrases)
                  </span>
                </label>
                <Textarea
                  value={action.description}
                  onChange={(e) => updateAction(idx, "description", e.target.value)}
                  placeholder={
                    idx === 0 && phaseIndex === 0
                      ? 'e.g. "Set up school for my stuffed animals — lined them up on chairs — took the lessons by writing on the board — gave silver and gold stars for good work…"'
                      : "Describe what you were doing and thinking. Short phrases are fine."
                  }
                  rows={3}
                  className="text-sm resize-none"
                />
              </div>

              {/* ESF selector */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-2">
                  Was this action…
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {ESF_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() =>
                        updateAction(idx, "esf", action.esf === opt.value ? "" : opt.value)
                      }
                      className={`p-3 rounded-lg border-2 text-left transition-all ${
                        action.esf === opt.value
                          ? opt.selectedColor
                          : "border-border bg-background hover:border-[var(--lw-gold)]/40"
                      }`}
                    >
                      <div className="font-semibold text-sm mb-0.5">{opt.label}</div>
                      <div
                        className={`text-xs leading-tight ${
                          action.esf === opt.value ? "opacity-80" : "text-muted-foreground"
                        }`}
                      >
                        {opt.tagline}
                      </div>
                    </button>
                  ))}
                </div>
                {action.esf && (
                  <p className="text-xs text-muted-foreground mt-2 italic leading-relaxed">
                    {ESF_OPTIONS.find((o) => o.value === action.esf)?.description}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Navigation */}
        <div className="mt-8 flex items-center justify-between">
          <Button
            variant="outline"
            onClick={() =>
              phaseIndex === 0 ? setShowIntro(true) : setPhaseIndex((i) => i - 1)
            }
          >
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            {completedPhases} of {PHASES.length} phases started
          </p>

          <Button
            onClick={handleSaveAndNext}
            disabled={saving}
            className="bg-[var(--lw-gold)] hover:bg-[oklch(0.60 0.13 72)] text-white gap-1.5"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : phaseIndex < PHASES.length - 1 ? (
              <>
                Save & Continue <ArrowRight className="w-4 h-4" />
              </>
            ) : (
              <>
                Complete Life History <CheckCircle2 className="w-4 h-4" />
              </>
            )}
          </Button>
        </div>

        {phaseIndex >= 3 && (
          <p className="text-center text-xs text-muted-foreground mt-4">
            If this decade doesn't apply to you yet, you can leave it blank and continue.
          </p>
        )}
      </div>
    </div>
  );
}
