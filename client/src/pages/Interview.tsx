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

type Action = { id?: number; title: string; age: string; description: string; esf: string; othersObservations: string };
const emptyAction = (): Action => ({ title: "", age: "", description: "", esf: "", othersObservations: "" });

// ─── Main component ───────────────────────────────────────────────────────────

export default function Interview() {
  const { isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();

  const [phaseIndex, setPhaseIndex] = useState(0);
  const [phaseActions, setPhaseActions] = useState<Record<string, Action[]>>(() =>
    Object.fromEntries(
      PHASES.map((p) => [p.id, [emptyAction(), emptyAction(), emptyAction(), emptyAction()]]) // Always init all phases
    )
  );
  // Phase-level "Others" observation — stored in action[0].othersObservations for backward compat
  const [phaseOthers, setPhaseOthers] = useState<Record<string, string>>(() =>
    Object.fromEntries(PHASES.map((p) => [p.id, ""]))
  );
  const [showIntro, setShowIntro] = useState(true);
  const [showExample, setShowExample] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingProgress, setSavingProgress] = useState(false);
  const [hasResumed, setHasResumed] = useState(false);

  // Name & pronouns collection
  const [showNameScreen, setShowNameScreen] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [pronounsInput, setPronounsInput] = useState("");
  const [nameSaving, setNameSaving] = useState(false);

  // Age collection — used to filter phases to only relevant decades
  const [showAgeScreen, setShowAgeScreen] = useState(false);
  const [userAge, setUserAge] = useState<number | null>(null);
  const [ageInput, setAgeInput] = useState("");

  const utils = trpc.useUtils();

  // Load existing profile to pre-fill name/pronouns/age
  const { data: myProfile } = trpc.profile.getMyProfile.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  // Track whether name/age screens have been completed this session
  // (prevents re-showing them when myProfile cache is stale after save)
  const [nameScreenDone, setNameScreenDone] = useState(false);
  const [ageScreenDone, setAgeScreenDone] = useState(false);
  useEffect(() => {
    if (myProfile) {
      if (myProfile.firstName) setNameInput(myProfile.firstName);
      if (myProfile.pronouns) setPronounsInput(myProfile.pronouns);
      // Pre-fill age from dateOfBirth if available
      if (myProfile.dateOfBirth && !userAge) {
        const dob = new Date(myProfile.dateOfBirth);
        const age = Math.floor((Date.now() - dob.getTime()) / (365.25 * 24 * 3600 * 1000));
        if (age > 0 && age < 120) setUserAge(age);
      }
    }
  }, [myProfile]); // eslint-disable-line react-hooks/exhaustive-deps

  // Filter phases to only those relevant to the user's current age
  const ACTIVE_PHASES = userAge
    ? PHASES.filter((p) => {
        if (p.id === "early_childhood" || p.id === "mid_childhood" || p.id === "late_childhood") return true; // always include childhood
        if (p.id === "twenties") return userAge >= 19;
        if (p.id === "thirties") return userAge >= 30;
        if (p.id === "forties") return userAge >= 40;
        if (p.id === "fifties") return userAge >= 50;
        if (p.id === "sixties_plus") return userAge >= 60;
        return true;
      })
    : PHASES;

  const updateProfile = trpc.profile.updateProfile.useMutation({
    onSuccess: () => utils.profile.getMyProfile.invalidate(),
  });

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
          othersObservations: a.othersObservations ?? "",
        };
      });
    });
    setPhaseActions(loaded);
    // Load phase-level Others from action[0].othersObservations
    const loadedOthers: Record<string, string> = Object.fromEntries(PHASES.map((p) => [p.id, ""]));
    PHASES.forEach((phase) => {
      const items = (existing as any[]).filter((a: any) => a.decade === phase.decade);
      if (items.length > 0) {
        loadedOthers[phase.id] = items[0]?.othersObservations ?? "";
      }
    });
    setPhaseOthers(loadedOthers);
    // Auto-resume: on first load, advance to the first phase with no saved entries
    if (!hasResumed) {
      const firstIncomplete = ACTIVE_PHASES.findIndex((p) =>
        loaded[p.id].every((a) => !a.title.trim() && !a.description.trim())
      );
      const resumeIdx = firstIncomplete === -1 ? ACTIVE_PHASES.length - 1 : firstIncomplete;
      if (resumeIdx > 0) setPhaseIndex(resumeIdx);
      setHasResumed(true);
    }
  }, [existing, hasResumed]);

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

  const currentPhase = ACTIVE_PHASES[phaseIndex];
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
           // Phase-level Others stored on action[0] only; clear from other actions
          othersObservations: i === 0 ? (phaseOthers[currentPhase.id] ?? "").trim() || undefined : undefined,
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

        if (phaseIndex < ACTIVE_PHASES.length - 1) {
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

  const completedPhases = ACTIVE_PHASES.filter((p) =>
    phaseActions[p.id].some((a) => a.title.trim() || a.description.trim())
  ).length;
  const hasAnyData = completedPhases > 0;
  const firstIncompleteIdx = ACTIVE_PHASES.findIndex((p) =>
    phaseActions[p.id].every((a) => !a.title.trim() && !a.description.trim())
  );
  const resumePhase = firstIncompleteIdx === -1 ? ACTIVE_PHASES[ACTIVE_PHASES.length - 1] : ACTIVE_PHASES[firstIncompleteIdx];
  const resumeIdx = firstIncompleteIdx === -1 ? ACTIVE_PHASES.length - 1 : firstIncompleteIdx;

  // Save current phase without advancing
  const handleSaveProgress = async () => {
    setSavingProgress(true);
    try {
      const updatedActions = [...actions];
      for (let i = 0; i < actions.length; i++) {
        const a = actions[i];
        if (!a.title.trim() && !a.description.trim()) continue;
        const titleWithPrefix = currentPhase.subPhase
          ? `[${currentPhase.subPhase}] ${a.title.trim()}`
          : a.title.trim();
        const result = await saveAchievement.mutateAsync({
          id: a.id,
          title: titleWithPrefix,
          age: a.age ? parseInt(a.age) : undefined,
          description: a.description.trim() || undefined,
          esf: (a.esf as "enjoyable" | "satisfying" | "fulfilling") || undefined,
          othersObservations: i === 0 ? (phaseOthers[currentPhase.id] ?? "").trim() || undefined : undefined,
          decade: currentPhase.decade,
          sortOrder: i,
        });
        if (result?.id && !a.id) updatedActions[i] = { ...a, id: result.id };
      }
      setPhaseActions((prev) => ({ ...prev, [currentPhase.id]: updatedActions }));
      toast.success("Progress saved — you can safely close the browser and return later.");
    } catch {
      toast.error("Failed to save. Please try again.");
    } finally {
      setSavingProgress(false);
    }
  };

  // ── Name & pronouns screen ─────────────────────────────────────────────────
  if (showNameScreen) {
    const PRONOUN_OPTIONS = [
      { value: "she/her", label: "She / Her" },
      { value: "he/him", label: "He / Him" },
      { value: "they/them", label: "They / Them" },
      { value: "prefer not to say", label: "Prefer not to say" },
    ];
    const handleNameContinue = async () => {
      if (!nameInput.trim()) return;
      setNameSaving(true);
      try {
        await updateProfile.mutateAsync({
          firstName: nameInput.trim(),
          pronouns: pronounsInput || undefined,
        });
        setNameScreenDone(true);
        setShowNameScreen(false);
        // Show age screen next if we don't have age yet
        if (!userAge) {
          setShowAgeScreen(true);
        } else {
          setShowIntro(true);
        }
      } catch {
        toast.error("Failed to save. Please try again.");
      } finally {
        setNameSaving(false);
      }
    };
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
        <div className="container max-w-xl py-16">
          <p className="text-xs uppercase tracking-widest text-[var(--lw-gold)] font-semibold mb-2">Before we begin</p>
          <h1 className="text-3xl font-serif font-bold text-foreground mb-3">A couple of quick questions</h1>
          <p className="text-[15px] text-muted-foreground leading-relaxed mb-10">
            We'd like to use your first name throughout the process, and know your preferred pronouns so the report reads naturally.
          </p>
          <div className="space-y-8">
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">What is your first name?</label>
              <Input
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                placeholder="e.g. Sarah"
                className="max-w-xs text-base"
                onKeyDown={(e) => { if (e.key === "Enter" && nameInput.trim()) handleNameContinue(); }}
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-foreground mb-1">Your preferred pronouns</label>
              <p className="text-xs text-muted-foreground mb-3">This helps us write the report in the right voice.</p>
              <div className="flex flex-wrap gap-2">
                {PRONOUN_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setPronounsInput(opt.value)}
                    className={`px-4 py-2 rounded-full text-sm font-medium border-2 transition-colors ${
                      pronounsInput === opt.value
                        ? "border-[var(--lw-gold)] bg-[var(--lw-gold)] text-white"
                        : "border-border text-foreground hover:border-[var(--lw-gold)]/60"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <Button
            size="lg"
            onClick={handleNameContinue}
            disabled={!nameInput.trim() || nameSaving}
            className="mt-10 w-full gap-2 text-base py-6 bg-[var(--lw-gold)] hover:bg-[oklch(0.60_0.13_72)] text-white"
          >
            {nameSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Continue <ArrowRight className="w-5 h-5" /></>}
          </Button>
        </div>
      </div>
    );
  }

  // ── Age screen ─────────────────────────────────────────────────────────────
  if (showAgeScreen) {
    const handleAgeContinue = () => {
      const parsed = parseInt(ageInput, 10);
      if (!parsed || parsed < 10 || parsed > 110) return;
      setUserAge(parsed);
      setAgeScreenDone(true);
      setShowAgeScreen(false);
      setPhaseIndex(0);
      // Don't go back to intro — proceed directly to phase 1
    };
    return (
      <div className="min-h-screen" style={{ background: "var(--lw-cream)" }}>
        <div className="sticky top-0 z-10" style={{ background: "var(--lw-navy)", borderBottom: "2px solid var(--lw-gold)" }}>
          <div className="container flex items-center justify-between h-14">
            <Button variant="ghost" size="sm" onClick={() => { setShowAgeScreen(false); setShowNameScreen(true); }}
              style={{ color: "rgba(255,255,255,0.7)" }}
              className="hover:text-white">
              <ArrowLeft className="w-4 h-4 mr-1" /> Back
            </Button>
            <span className="font-serif font-semibold" style={{ color: "var(--lw-gold)", fontSize: "0.85rem", letterSpacing: "0.05em" }}>LIFEWORK</span>
          </div>
        </div>
        <div className="container max-w-xl py-16">
          <p className="text-xs uppercase tracking-widest text-[var(--lw-gold)] font-semibold mb-2">One more thing</p>
          <h1 className="text-3xl font-serif font-bold text-foreground mb-3">How old are you?</h1>
          <p className="text-[15px] text-muted-foreground leading-relaxed mb-10">
            We use your age to tailor the interview — we'll only ask about the decades of life you've actually lived.
          </p>
          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">Your current age</label>
            <Input
              type="number"
              min={10}
              max={110}
              value={ageInput}
              onChange={(e) => setAgeInput(e.target.value)}
              placeholder="e.g. 34"
              className="max-w-xs text-base"
              onKeyDown={(e) => { if (e.key === "Enter") handleAgeContinue(); }}
              autoFocus
            />
          </div>
          <Button
            size="lg"
            onClick={handleAgeContinue}
            disabled={!ageInput || parseInt(ageInput, 10) < 10}
            className="mt-10 w-full gap-2 text-base py-6 bg-[var(--lw-gold)] hover:bg-[oklch(0.60_0.13_72)] text-white"
          >
            Continue <ArrowRight className="w-5 h-5" />
          </Button>
        </div>
      </div>
    );
  }

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

          {/* Intro video */}
          <div
            className="mb-8 overflow-hidden"
            style={{ border: "1px solid rgba(201,151,58,0.3)", background: "#000" }}
          >
            <div style={{ position: "relative", paddingBottom: "56.25%", height: 0 }}>
              <iframe
                src="https://drive.google.com/file/d/1vYmcvxcjjK3kPiOib4l9aNlg9XSCIBSL/preview"
                allow="autoplay"
                allowFullScreen
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: "100%",
                  border: 0,
                }}
                title="Lifework introduction"
              />
            </div>
          </div>

            {/* How it works */}
          <div className="p-5 rounded-xl bg-card border border-border mb-5">
            <h2 className="font-serif font-semibold text-foreground text-lg mb-3 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-[var(--lw-gold)]" /> How it works
            </h2>
            <div className="space-y-3 text-sm text-foreground leading-relaxed">
              <p>
                Who you are now is a continuation of who you were one year, three years, five years,
                and a decade ago, right back to when you were a babe in arms — and perhaps even when
                in the womb. We want to capture this journey through a set of data points — times when
                you remember being pleased with what you had achieved.
              </p>
              <p>
                We start with childhood and work forward through the decades. Early ones are the most
                significant. It's what you personally found interesting that counts.
              </p>

            </div>
          </div>




          {hasAnyData && (
            <div className="mb-4 p-4 rounded-lg border-2 border-[var(--lw-gold)]/40 bg-[var(--lw-gold)]/5 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-foreground">You have saved progress</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {completedPhases} of {ACTIVE_PHASES.length} phases started — resume from <strong>{resumePhase.label}</strong>
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => { setPhaseIndex(resumeIdx); setShowIntro(false); }}
                className="bg-[var(--lw-gold)] hover:bg-[oklch(0.60 0.13 72)] text-white gap-1.5 whitespace-nowrap flex-shrink-0"
              >
                Resume <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          )}
          <Button
            size="lg"
            onClick={() => {
              if (!nameScreenDone) {
                // Always show name/pronouns screen first (pre-filled if already set)
                setShowIntro(false);
                setShowNameScreen(true);
              } else if (!ageScreenDone && !userAge) {
                setShowIntro(false);
                setShowAgeScreen(true);
              } else {
                setPhaseIndex(0);
                setShowIntro(false);
              }
            }}
            className={`w-full gap-2 text-base py-6 ${
              hasAnyData
                ? 'bg-transparent border-2 border-[var(--lw-gold)] text-[var(--lw-gold)] hover:bg-[var(--lw-gold)]/10'
                : 'bg-[var(--lw-gold)] hover:bg-[oklch(0.60 0.13 72)] text-white'
            }`}
          >
            {hasAnyData ? 'Start from the beginning' : <>​Begin — Early Childhood (Ages 0–5) <ArrowRight className="w-5 h-5" /></>}
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
            {phaseIndex === 0 ? "Introduction" : ACTIVE_PHASES[phaseIndex - 1].label}
          </Button>
          <div className="flex items-center gap-3">
            <span className="text-xs hidden sm:block" style={{ color: "rgba(255,255,255,0.6)" }}>
              Phase {phaseIndex + 1} of {ACTIVE_PHASES.length}
            </span>
            <div className="flex gap-1 items-center">
              {ACTIVE_PHASES.map((p, i) => (
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
          <strong>4 actions</strong> for this stage using several short phrases — the more detail the better.
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
        {/* Phase-level Others box — shown once after all 4 actions */}
        <div className="mt-5 p-5 rounded-xl border-2 border-border bg-card">
          <label className="text-sm text-muted-foreground block mb-1.5">
            A final question — what did others say about you during this phase? (perhaps a teacher's comment, a colleague's observation, a manager's feedback)
          </label>
          <Textarea
            value={phaseOthers[currentPhase.id] ?? ""}
            onChange={(e) => setPhaseOthers((prev) => ({ ...prev, [currentPhase.id]: e.target.value }))}
            placeholder='e.g. "My teacher said I was always organising the other children" or "My manager said I was the one who always found a way through"'
            rows={2}
            className="text-sm resize-none"
          />
        </div>
        {/* Navigation */}
        <div className="mt-8 flex items-center justify-between gap-2">
          <Button
            variant="outline"
            onClick={() =>
              phaseIndex === 0 ? setShowIntro(true) : setPhaseIndex((i) => i - 1)
            }
          >
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </Button>

          <div className="flex flex-col items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSaveProgress}
              disabled={savingProgress}
              className="text-xs border-[var(--lw-gold)]/50 text-[var(--lw-gold)] hover:bg-[var(--lw-gold)]/10 gap-1"
            >
              {savingProgress ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
              Save progress
            </Button>
            <p className="text-xs text-muted-foreground">
              {completedPhases} of {PHASES.length} phases started
            </p>
          </div>

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
