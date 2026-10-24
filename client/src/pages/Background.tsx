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

type Tab = "family" | "career";

export default function Background() {
  const { isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState<Tab>(() =>
    new URLSearchParams(window.location.search).get("tab") === "career"
      ? "career"
      : "family"
  );
  const utils = trpc.useUtils();

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
          <Button size="sm" onClick={() => navigate("/via")} className="gap-1 bg-[var(--lw-gold)] hover:bg-[oklch(0.60 0.13 72)] text-white">
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
            <iframe
              src="https://drive.google.com/file/d/1FQ9fnNAvFIvwPqqmwC_t7ODEOhj0w1ld/preview"
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
              title="Career, education and family"
            />
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

        {activeTab === "family" && <FamilyForm />}
        {activeTab === "career" && <CareerForm />}
      </div>
    </div>
  );
}

function FamilyForm() {
  const utils = trpc.useUtils();
  const { data: family, isLoading } = trpc.background.getFamily.useQuery();
  const save = trpc.background.saveFamily.useMutation({
    onSuccess: () => {
      toast.success("Family background saved.");
      utils.background.getFamily.invalidate();
    },
  });

  const [form, setForm] = useState({
    fatherOccupation: "",
    motherOccupation: "",
    siblingPosition: "",
    upbringingLocation: "",
    familyNarrative: "",
    significantInfluences: "",
  });

  // Populate form when data loads
  useState(() => {
    if (family) setForm({
      fatherOccupation: family.fatherOccupation ?? "",
      motherOccupation: family.motherOccupation ?? "",
      siblingPosition: family.siblingPosition ?? "",
      upbringingLocation: family.upbringingLocation ?? "",
      familyNarrative: family.familyNarrative ?? "",
      significantInfluences: family.significantInfluences ?? "",
    });
  });

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;

  const handleChange = (field: string, value: string) => setForm((f) => ({ ...f, [field]: value }));

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground leading-relaxed">
        Understanding your family background helps reveal the context in which your values and early motivations were formed.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label>Parent / Guardian 1 — Occupation</Label>
          <Input className="mt-1" value={form.fatherOccupation} onChange={(e) => handleChange("fatherOccupation", e.target.value)} placeholder="e.g. Engineer, Teacher" />
        </div>
        <div>
          <Label>Parent / Guardian 2 — Occupation</Label>
          <Input className="mt-1" value={form.motherOccupation} onChange={(e) => handleChange("motherOccupation", e.target.value)} placeholder="e.g. Nurse, Homemaker" />
        </div>
        <div>
          <Label>Sibling Position</Label>
          <Input className="mt-1" value={form.siblingPosition} onChange={(e) => handleChange("siblingPosition", e.target.value)} placeholder="e.g. Eldest of 3, Only child" />
        </div>
        <div>
          <Label>Where did you grow up?</Label>
          <Input className="mt-1" value={form.upbringingLocation} onChange={(e) => handleChange("upbringingLocation", e.target.value)} placeholder="e.g. Rural Scotland, London suburbs" />
        </div>
      </div>
      <div>
        <Label>Family narrative</Label>
        <p className="text-xs text-muted-foreground mt-0.5 mb-1">What were three rules that I would need to know to be a happy and well-regarded member of your household? And what might your family motto have been, if you had been asked for one?</p>
        <Textarea className="mt-1" rows={4} value={form.familyNarrative} onChange={(e) => handleChange("familyNarrative", e.target.value)} placeholder="Our family was…" />
      </div>
      <div>
        <Label>Significant early influences</Label>
        <p className="text-xs text-muted-foreground mt-0.5 mb-1">People, books, events, or experiences that shaped who you became.</p>
        <Textarea className="mt-1" rows={3} value={form.significantInfluences} onChange={(e) => handleChange("significantInfluences", e.target.value)} placeholder="My grandfather was a huge influence because…" />
      </div>
      <Button onClick={() => save.mutate(form)} disabled={save.isPending} className="bg-[var(--lw-gold)] hover:bg-[oklch(0.60 0.13 72)] text-white">
        {save.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
        Save Family Background
      </Button>
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

function CareerForm() {
  const utils = trpc.useUtils();
  const { data: careerReflection, isLoading } = trpc.background.getCareerReflection.useQuery();
  const [reflection, setReflection] = useState("");
  const save = trpc.background.saveCareerReflection.useMutation({
    onSuccess: () => {
      toast.success("Career reflections saved.");
      utils.background.getCareerReflection.invalidate();
    },
  });

  useEffect(() => {
    setReflection(careerReflection?.careerReflection ?? "");
  }, [careerReflection?.careerReflection]);

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-6">
      <CvUploadCard />
      <div>
        <Label htmlFor="career-reflection" className="text-base font-serif text-foreground">What you have really enjoyed in your career</Label>
        <p className="text-sm text-muted-foreground leading-relaxed mt-1.5 mb-3">
          Now tell us what you have really enjoyed in your career. Not the usual action-driven verbs of “achieved” and “led”, but the reflective ones, such as “I enjoyed working on my own when at BT because they valued my expertise” or “I was sad to leave the Co-op because they were incredibly kind to me”. We are exploring what is going on when you are truly fulfilled, so the more thoughts you have, the better.
        </p>
        <Textarea
          id="career-reflection"
          rows={12}
          value={reflection}
          onChange={(event) => setReflection(event.target.value)}
          placeholder="Write freely about the moments, people, ways of working and places that gave you most energy…"
        />
      </div>
      <Button
        onClick={() => save.mutate({ careerReflection: reflection })}
        disabled={save.isPending}
        className="bg-[var(--lw-gold)] hover:bg-[oklch(0.60 0.13 72)] text-white"
      >
        {save.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
        Save Career Reflections
      </Button>
    </div>
  );
}
