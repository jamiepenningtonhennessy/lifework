import { useEffect, useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocation } from "wouter";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, ArrowRight, Plus, Trash2, Loader2, Upload, FileText, X } from "lucide-react";
import { toast } from "sonner";
import { useRef } from "react";
import { FAMILY_REQUIRED_FIELDS, FAMILY_FIELD_LABELS, getFamilyBackgroundCompletion } from "@shared/familyBackground";

type Tab = "family" | "career";
type FamilyField = (typeof FAMILY_REQUIRED_FIELDS)[number];
type FamilyDraft = Record<FamilyField, string>;

function familyDraft(data?: Partial<Record<FamilyField, string | null>> | null): FamilyDraft {
  return Object.fromEntries(FAMILY_REQUIRED_FIELDS.map((field) => [field, data?.[field] ?? ""])) as FamilyDraft;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Please try again.";
}

export default function Background() {
  const { isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState<Tab>(() =>
    new URLSearchParams(window.location.search).get("tab") === "career"
      ? "career"
      : "family"
  );
  const [familyReady, setFamilyReady] = useState(false);
  const [careerBlocked, setCareerBlocked] = useState(false);
  const canContinue = familyReady && !careerBlocked;

  if (!loading && !isAuthenticated) {
    window.location.href = getLoginUrl();
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container flex items-center justify-between h-14">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="w-4 h-4 mr-1" /> Dashboard
            </Button>
            <div className="h-4 w-px bg-border" />
            <span className="font-serif font-semibold text-foreground">Background & History</span>
          </div>
          <Button size="sm" disabled={!canContinue} onClick={() => { if (canContinue) navigate("/via"); }} className="gap-1 bg-[var(--lw-gold)] hover:bg-[oklch(0.60 0.13 72)] text-white">
            Next: VIA Survey <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      <div className="container max-w-3xl py-8">
        {/* Intro video */}
        <div
          className="mb-8 overflow-hidden"
          style={{ border: "1px solid rgba(201,151,58,0.3)", background: "#000" }}
        >
          <div style={{ position: "relative", paddingBottom: "56.25%", height: 0 }}>
            <video
              src="/manus-storage/lifework_step2_background_career_explainer_839de757.mp4"
              controls
              preload="metadata"
              playsInline
              aria-label="Lifework Background and Career History explainer"
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                border: 0,
              }}
            >
              Your browser does not support embedded video.
            </video>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-8 border-b border-border">
          {(["family", "career"] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2.5 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
                activeTab === tab
                  ? "border-[var(--lw-gold)] text-[var(--lw-gold)]"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab === "family" ? "Family Background" : "Career History"}
            </button>
          ))}
        </div>

        {!canContinue && (
          <p className="mb-6 text-sm text-muted-foreground" role="status">
            {!familyReady
              ? "Complete and save all six Family Background answers before continuing to the questionnaires."
              : "Save your Career History edits before continuing. Career History itself is optional."}
          </p>
        )}
        <div hidden={activeTab !== "family"}>
          <FamilyForm onReadyChange={setFamilyReady} />
        </div>
        <div hidden={activeTab !== "career"}>
          <CareerForm onBlockedChange={setCareerBlocked} />
        </div>
      </div>
    </div>
  );
}

function FamilyForm({ onReadyChange }: { onReadyChange: (ready: boolean) => void }) {
  const utils = trpc.useUtils();
  const query = trpc.background.getFamily.useQuery();
  const save = trpc.background.saveFamily.useMutation();
  const [form, setForm] = useState<FamilyDraft>(() => familyDraft());
  const [dirty, setDirty] = useState(false);
  const dirtyRef = useRef(false);
  const revision = useRef(0);
  const [confirming, setConfirming] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  // Cold-cache data arrives after mount. Never replace local edits on a refetch.
  useEffect(() => {
    if (query.data !== undefined && !dirtyRef.current) setForm(familyDraft(query.data));
  }, [query.data]);

  const pending = save.isPending || confirming;
  const loadFailed = query.isError || (!query.isLoading && query.data === undefined);
  const completion = getFamilyBackgroundCompletion(form);
  const savedComplete = getFamilyBackgroundCompletion(query.data).complete;
  const ready = savedComplete && completion.complete && !dirty && !pending && !loadFailed && !query.isLoading && !query.isFetching && !saveError;

  useEffect(() => { onReadyChange(ready); }, [ready, onReadyChange]);

  const handleChange = (field: FamilyField, value: string) => {
    dirtyRef.current = true;
    revision.current += 1;
    setDirty(true);
    setSavedNotice(null);
    setForm((current) => ({ ...current, [field]: value }));
  };

  async function handleSave(complete: boolean) {
    if (pending || loadFailed || query.isLoading || query.data === undefined || query.isFetching || (complete && !completion.complete)) return;
    const snapshot = familyDraft(Object.fromEntries(FAMILY_REQUIRED_FIELDS.map((field) => [field, form[field].trim()])));
    const savedRevision = revision.current;
    dirtyRef.current = true;
    setDirty(true);
    setConfirming(true);
    setSaveError(null);
    setSavedNotice(null);
    try {
      await save.mutateAsync({ ...snapshot, complete });
      // Keep Next disabled until a fresh, authoritative read confirms these answers.
      await utils.background.getFamily.invalidate();
      const confirmed = await query.refetch({ throwOnError: true });
      if (!confirmed.data || FAMILY_REQUIRED_FIELDS.some((field) => (confirmed.data?.[field] ?? "").trim() !== snapshot[field])) {
        throw new Error("Your saved answers could not be confirmed. Please retry saving; your edits are still here.");
      }
      await Promise.all([
        utils.profile.getEnrichmentStatus.invalidate(),
        utils.profile.getMyProfile.invalidate(),
      ]);
      if (revision.current === savedRevision) {
        dirtyRef.current = false;
        setDirty(false);
        setForm(familyDraft(confirmed.data));
        setSavedNotice(getFamilyBackgroundCompletion(confirmed.data).complete
          ? "All six family answers are saved. You can continue to the questionnaires."
          : "Progress saved. Complete the remaining family answers before the questionnaires.");
      }
      toast.success("Family background saved.");
    } catch (error) {
      setSaveError(`Could not save or confirm your family background. ${errorMessage(error)} Your edits have been kept.`);
    } finally {
      setConfirming(false);
    }
  }

  if (query.isLoading && query.data === undefined) return <div role="status" className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /><span className="sr-only">Loading Family Background…</span></div>;

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground leading-relaxed">
        Understanding your family background helps reveal the context in which your values and early motivations were formed.
      </p>
      <p className="text-sm text-muted-foreground leading-relaxed">
        All six answers are required before the questionnaires. You can save partial progress at any time.
        If you do not know, a question does not apply, or you would rather not share, “Not known”, “Not applicable”, and “Prefer not to say” are valid answers.
      </p>
      {loadFailed && <div role="alert" className="text-sm text-destructive space-y-2">
        <p>Could not load your saved family background. Saving is disabled to protect any existing answers. Your edits have been kept.</p>
        <Button variant="outline" onClick={() => { void query.refetch(); }} disabled={query.isFetching}>Retry loading Family Background</Button>
      </div>}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="family-fatherOccupation">Parent / Guardian 1 — Occupation</Label>
          <Input id="family-fatherOccupation" aria-required="true" className="mt-1" value={form.fatherOccupation} onChange={(e) => handleChange("fatherOccupation", e.target.value)} placeholder="e.g. Engineer, Teacher" />
        </div>
        <div>
          <Label htmlFor="family-motherOccupation">Parent / Guardian 2 — Occupation</Label>
          <Input id="family-motherOccupation" aria-required="true" className="mt-1" value={form.motherOccupation} onChange={(e) => handleChange("motherOccupation", e.target.value)} placeholder="e.g. Nurse, Homemaker" />
        </div>
        <div>
          <Label htmlFor="family-siblingPosition">Sibling Position</Label>
          <Input id="family-siblingPosition" aria-required="true" className="mt-1" value={form.siblingPosition} onChange={(e) => handleChange("siblingPosition", e.target.value)} placeholder="e.g. Eldest of 3, Only child" />
        </div>
        <div>
          <Label htmlFor="family-upbringingLocation">Where did you grow up?</Label>
          <Input id="family-upbringingLocation" aria-required="true" className="mt-1" value={form.upbringingLocation} onChange={(e) => handleChange("upbringingLocation", e.target.value)} placeholder="e.g. Rural Scotland, London suburbs" />
        </div>
      </div>
      <div>
        <Label htmlFor="family-familyNarrative">Family narrative</Label>
        <p className="text-xs text-muted-foreground mt-0.5 mb-1">What were three rules that I would need to know to be a happy and well-regarded member of your household? And what might your family motto have been, if you had been asked for one?</p>
        <Textarea id="family-familyNarrative" aria-required="true" className="mt-1" rows={4} value={form.familyNarrative} onChange={(e) => handleChange("familyNarrative", e.target.value)} placeholder="Our family was…" />
      </div>
      <div>
        <Label htmlFor="family-significantInfluences">Significant early influences</Label>
        <p className="text-xs text-muted-foreground mt-0.5 mb-1">People, books, events, or experiences that shaped who you became.</p>
        <Textarea id="family-significantInfluences" aria-required="true" className="mt-1" rows={3} value={form.significantInfluences} onChange={(e) => handleChange("significantInfluences", e.target.value)} placeholder="My grandfather was a huge influence because…" />
      </div>
      {!completion.complete && <p className="text-sm text-muted-foreground" role="status">Still required: {completion.missingFields.map((field) => FAMILY_FIELD_LABELS[field]).join("; ")}.</p>}
      {dirty && <p className="text-sm text-muted-foreground">You have unsaved family answers.</p>}
      {saveError && <p role="alert" className="text-sm text-destructive">{saveError}</p>}
      {savedNotice && <p role="status" className="text-sm text-green-700">{savedNotice}</p>}
      <div className="flex flex-wrap gap-3">
        <Button variant="outline" onClick={() => { void handleSave(false); }} disabled={pending || loadFailed || query.isFetching}>
          Save progress
        </Button>
        <Button onClick={() => { void handleSave(true); }} disabled={pending || loadFailed || query.isFetching || !completion.complete} className="bg-[var(--lw-gold)] hover:bg-[oklch(0.60 0.13 72)] text-white">
          {pending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
          Save Family Background
        </Button>
      </div>
    </div>
  );
}

function EducationForm() {
  const utils = trpc.useUtils();
  const { data: education = [], isLoading } = trpc.background.getEducation.useQuery();
  const save = trpc.background.saveEducation.useMutation({
    onSuccess: () => {
      toast.success("Education record saved.");
      utils.background.getEducation.invalidate();
      setNewEntry({ institution: "", qualification: "", subject: "", yearFrom: "", yearTo: "", highlights: "" });
      setAdding(false);
    },
  });
  const del = trpc.background.deleteEducation.useMutation({
    onSuccess: () => utils.background.getEducation.invalidate(),
  });

  const [adding, setAdding] = useState(false);
  const [newEntry, setNewEntry] = useState({ institution: "", qualification: "", subject: "", yearFrom: "", yearTo: "", highlights: "" });

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Add your educational history, from school through to any professional qualifications.</p>
      {education.map((ed) => (
        <Card key={ed.id} className="border-border">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-medium text-foreground">{ed.institution}</p>
                <p className="text-sm text-muted-foreground">{[ed.qualification, ed.subject].filter(Boolean).join(" — ")}</p>
                <p className="text-xs text-muted-foreground">{ed.yearFrom}{ed.yearTo ? ` – ${ed.yearTo}` : ""}</p>
                {ed.highlights && <p className="text-sm text-foreground mt-1">{ed.highlights}</p>}
              </div>
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive" onClick={() => del.mutate({ id: ed.id })}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
      {adding ? (
        <Card className="border-[var(--lw-gold)] border-2">
          <CardHeader className="pb-2"><CardTitle className="text-base font-serif">New Education Record</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><Label>Institution *</Label><Input className="mt-1" value={newEntry.institution} onChange={(e) => setNewEntry(n => ({ ...n, institution: e.target.value }))} placeholder="University of Edinburgh" /></div>
              <div><Label>Qualification</Label><Input className="mt-1" value={newEntry.qualification} onChange={(e) => setNewEntry(n => ({ ...n, qualification: e.target.value }))} placeholder="BSc, A-Levels, MBA" /></div>
              <div><Label>Subject</Label><Input className="mt-1" value={newEntry.subject} onChange={(e) => setNewEntry(n => ({ ...n, subject: e.target.value }))} placeholder="Psychology" /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>From</Label><Input className="mt-1" value={newEntry.yearFrom} onChange={(e) => setNewEntry(n => ({ ...n, yearFrom: e.target.value }))} placeholder="1995" /></div>
                <div><Label>To</Label><Input className="mt-1" value={newEntry.yearTo} onChange={(e) => setNewEntry(n => ({ ...n, yearTo: e.target.value }))} placeholder="1998" /></div>
              </div>
            </div>
            <div><Label>Highlights / notes</Label><Textarea className="mt-1" rows={2} value={newEntry.highlights} onChange={(e) => setNewEntry(n => ({ ...n, highlights: e.target.value }))} placeholder="Key experiences, achievements, or what you enjoyed most." /></div>
            <div className="flex gap-2">
              <Button onClick={() => save.mutate({ ...newEntry, sortOrder: education.length })} disabled={!newEntry.institution || save.isPending} className="bg-[var(--lw-gold)] hover:bg-[oklch(0.60 0.13 72)] text-white">Save</Button>
              <Button variant="outline" onClick={() => setAdding(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Button variant="outline" onClick={() => setAdding(true)} className="gap-2 w-full border-dashed">
          <Plus className="w-4 h-4" /> Add Education Record
        </Button>
      )}
    </div>
  );
}

function CvUploadCard() {
  const utils = trpc.useUtils();
  const { data: profile } = trpc.profile.getMyProfile.useQuery();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const uploadCv = trpc.profile.uploadCv.useMutation({
    onSuccess: () => {
      toast.success("CV uploaded and processed.");
      utils.profile.getMyProfile.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const removeCv = trpc.profile.removeCv.useMutation({
    onSuccess: () => {
      toast.success("CV removed.");
      utils.profile.getMyProfile.invalidate();
    },
  });

  async function handleFile(file: File) {
    const ALLOWED = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/msword",
    ];
    if (!ALLOWED.includes(file.type)) {
      toast.error("Please upload a PDF or Word (.docx) file.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File must be under 10 MB.");
      return;
    }
    setUploading(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      let binary = "";
      for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
      const fileBase64 = btoa(binary);
      await uploadCv.mutateAsync({ fileBase64, mimeType: file.type, originalName: file.name });
    } finally {
      setUploading(false);
    }
  }

  const hasCv = !!(profile?.cvUrl);

  return (
    <div
      className="mb-6 p-4"
      style={{ border: "1px solid rgba(201,151,58,0.35)", background: "rgba(201,151,58,0.04)" }}
    >
      <div className="flex items-center gap-2 mb-2">
        <FileText className="w-4 h-4" style={{ color: "var(--lw-gold)" }} />
        <span className="text-sm font-semibold" style={{ color: "var(--navy)" }}>Upload your CV</span>
      </div>
      <p className="text-xs text-muted-foreground mb-3">
        Upload a PDF or Word document and we will extract your career history automatically.
        Your CV will be used alongside everything else we learn about you to give you the best possible career guidance.
      </p>

      {hasCv ? (
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <FileText className="w-4 h-4 flex-shrink-0" style={{ color: "var(--lw-gold)" }} />
            <a
              href={profile!.cvUrl!}
              target="_blank"
              rel="noreferrer"
              className="text-sm truncate"
              style={{ color: "var(--navy)", textDecoration: "underline" }}
            >
              {profile!.cvOriginalName ?? "CV uploaded"}
            </a>
          </div>
          <button
            onClick={() => removeCv.mutate()}
            disabled={removeCv.isPending}
            className="text-xs flex items-center gap-1 px-2 py-1"
            style={{ color: "#888", border: "1px solid #ddd", background: "transparent", cursor: "pointer" }}
          >
            <X className="w-3 h-3" /> Remove
          </button>
          <button
            onClick={() => fileRef.current?.click()}
            className="text-xs px-2 py-1"
            style={{ color: "var(--navy)", border: "1px solid rgba(201,151,58,0.5)", background: "transparent", cursor: "pointer" }}
          >
            Replace
          </button>
        </div>
      ) : (
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-2 px-4 py-2 text-sm"
          style={{
            background: uploading ? "#ccc" : "var(--navy)",
            color: "var(--cream)",
            border: "none",
            cursor: uploading ? "default" : "pointer",
            letterSpacing: "0.05em",
          }}
        >
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          {uploading ? "Processing…" : "Upload CV (PDF or Word)"}
        </button>
      )}

      <input
        ref={fileRef}
        type="file"
        accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }}
      />
    </div>
  );
}

function CareerForm({ onBlockedChange }: { onBlockedChange: (blocked: boolean) => void }) {
  const utils = trpc.useUtils();
  const query = trpc.background.getCareerReflection.useQuery();
  const [reflection, setReflection] = useState("");
  const [dirty, setDirty] = useState(false);
  const dirtyRef = useRef(false);
  const revision = useRef(0);
  const [confirming, setConfirming] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const save = trpc.background.saveCareerReflection.useMutation();
  const pending = save.isPending || confirming;
  const loadFailed = query.isError || (!query.isLoading && query.data === undefined);

  useEffect(() => {
    if (query.data !== undefined && !dirtyRef.current) setReflection(query.data?.careerReflection ?? "");
  }, [query.data]);

  // Career History is optional: an empty saved record or a load failure alone is not a prerequisite.
  useEffect(() => { onBlockedChange(dirty || pending || !!saveError); }, [dirty, pending, saveError, onBlockedChange]);

  async function handleSave() {
    if (pending || loadFailed || query.isLoading || query.isFetching || query.data === undefined) return;
    const snapshot = reflection;
    const savedRevision = revision.current;
    dirtyRef.current = true;
    setDirty(true);
    setConfirming(true);
    setSaveError(null);
    try {
      await save.mutateAsync({ careerReflection: snapshot });
      await utils.background.getCareerReflection.invalidate();
      const confirmed = await query.refetch({ throwOnError: true });
      if (!confirmed.data || (confirmed.data.careerReflection ?? "").trim() !== snapshot.trim()) {
        throw new Error("Your saved reflections could not be confirmed. Please retry.");
      }
      await utils.profile.getMyProfile.invalidate();
      if (revision.current === savedRevision) {
        dirtyRef.current = false;
        setDirty(false);
        setReflection(confirmed.data.careerReflection ?? "");
      }
      toast.success("Career reflections saved.");
    } catch (error) {
      setSaveError(`Could not save or confirm your career reflections. ${errorMessage(error)} Your edits have been kept.`);
    } finally {
      setConfirming(false);
    }
  }

  if (query.isLoading && query.data === undefined) return <div role="status" className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /><span className="sr-only">Loading Career History…</span></div>;

  return (
    <div className="space-y-6">
      <CvUploadCard />
      <p className="text-sm text-muted-foreground">Career History is optional. If you make edits, save them before continuing.</p>
      {loadFailed && <div role="alert" className="text-sm text-destructive space-y-2">
        <p>Could not load your saved career reflections. Saving is disabled to protect existing answers. Your edits have been kept.</p>
        <Button variant="outline" onClick={() => { void query.refetch(); }} disabled={query.isFetching}>Retry loading Career History</Button>
      </div>}
      <div>
        <Label htmlFor="career-reflection" className="text-base font-serif text-foreground">What you have really enjoyed in your career</Label>
        <p className="text-sm text-muted-foreground leading-relaxed mt-1.5 mb-3">
          Now tell us what you have really enjoyed in your career. Not the usual action-driven verbs of “achieved” and “led”, but the reflective ones, such as “I enjoyed working on my own when at BT because they valued my expertise” or “I was sad to leave the Co-op because they were incredibly kind to me”. We are exploring what is going on when you are truly fulfilled, so the more thoughts you have, the better.
        </p>
        <Textarea
          id="career-reflection"
          rows={12}
          value={reflection}
          onChange={(event) => {
            dirtyRef.current = true;
            revision.current += 1;
            setDirty(true);
            setReflection(event.target.value);
          }}
          placeholder="Write freely about the moments, people, ways of working and places that gave you most energy…"
        />
      </div>
      {dirty && <p className="text-sm text-muted-foreground">You have unsaved career reflections.</p>}
      {saveError && <p role="alert" className="text-sm text-destructive">{saveError}</p>}
      <Button
        onClick={() => { void handleSave(); }}
        disabled={pending || loadFailed || query.isFetching}
        className="bg-[var(--lw-gold)] hover:bg-[oklch(0.60 0.13 72)] text-white"
      >
        {pending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
        Save Career Reflections
      </Button>
    </div>
  );
}
