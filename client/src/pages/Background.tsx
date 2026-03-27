import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocation } from "wouter";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, ArrowRight, Plus, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

type Tab = "family" | "education" | "career";

export default function Background() {
  const { isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState<Tab>("family");
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
          {(["family", "education", "career"] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2.5 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
                activeTab === tab
                  ? "border-[var(--lw-gold)] text-[var(--lw-gold)]"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab === "family" ? "Family Background" : tab === "education" ? "Education" : "Career History"}
            </button>
          ))}
        </div>

        {activeTab === "family" && <FamilyForm />}
        {activeTab === "education" && <EducationForm />}
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
          <Label>Father's Occupation</Label>
          <Input className="mt-1" value={form.fatherOccupation} onChange={(e) => handleChange("fatherOccupation", e.target.value)} placeholder="e.g. Engineer, Teacher" />
        </div>
        <div>
          <Label>Mother's Occupation</Label>
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
        <p className="text-xs text-muted-foreground mt-0.5 mb-1">Describe the atmosphere and culture of your family home. What were the unspoken rules? What was valued?</p>
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

function CareerForm() {
  const utils = trpc.useUtils();
  const { data: career = [], isLoading } = trpc.background.getCareer.useQuery();
  const save = trpc.background.saveCareer.useMutation({
    onSuccess: () => {
      toast.success("Career record saved.");
      utils.background.getCareer.invalidate();
      setNewEntry({ organisation: "", role: "", yearFrom: "", yearTo: "", keyResponsibilities: "", whyLeft: "", highlights: "" });
      setAdding(false);
    },
  });
  const del = trpc.background.deleteCareer.useMutation({
    onSuccess: () => utils.background.getCareer.invalidate(),
  });

  const [adding, setAdding] = useState(false);
  const [newEntry, setNewEntry] = useState({ organisation: "", role: "", yearFrom: "", yearTo: "", keyResponsibilities: "", whyLeft: "", highlights: "" });

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Add each role in your career, from earliest to most recent. Include voluntary or portfolio work.</p>
      {career.map((c) => (
        <Card key={c.id} className="border-border">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-medium text-foreground">{c.role} <span className="text-muted-foreground font-normal">at {c.organisation}</span></p>
                <p className="text-xs text-muted-foreground">{c.yearFrom}{c.yearTo ? ` – ${c.yearTo}` : " – present"}</p>
                {c.highlights && <p className="text-sm text-foreground mt-1">{c.highlights}</p>}
              </div>
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive" onClick={() => del.mutate({ id: c.id })}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
      {adding ? (
        <Card className="border-[var(--lw-gold)] border-2">
          <CardHeader className="pb-2"><CardTitle className="text-base font-serif">New Career Record</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><Label>Organisation *</Label><Input className="mt-1" value={newEntry.organisation} onChange={(e) => setNewEntry(n => ({ ...n, organisation: e.target.value }))} placeholder="Acme Ltd" /></div>
              <div><Label>Role / Title</Label><Input className="mt-1" value={newEntry.role} onChange={(e) => setNewEntry(n => ({ ...n, role: e.target.value }))} placeholder="Marketing Manager" /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>From</Label><Input className="mt-1" value={newEntry.yearFrom} onChange={(e) => setNewEntry(n => ({ ...n, yearFrom: e.target.value }))} placeholder="2010" /></div>
                <div><Label>To</Label><Input className="mt-1" value={newEntry.yearTo} onChange={(e) => setNewEntry(n => ({ ...n, yearTo: e.target.value }))} placeholder="2015 or present" /></div>
              </div>
            </div>
            <div><Label>Key responsibilities</Label><Textarea className="mt-1" rows={2} value={newEntry.keyResponsibilities} onChange={(e) => setNewEntry(n => ({ ...n, keyResponsibilities: e.target.value }))} placeholder="What did you actually do day to day?" /></div>
            <div><Label>Why did you leave?</Label><Textarea className="mt-1" rows={2} value={newEntry.whyLeft} onChange={(e) => setNewEntry(n => ({ ...n, whyLeft: e.target.value }))} placeholder="What prompted the move?" /></div>
            <div><Label>Highlights / what you enjoyed</Label><Textarea className="mt-1" rows={2} value={newEntry.highlights} onChange={(e) => setNewEntry(n => ({ ...n, highlights: e.target.value }))} placeholder="The best parts of this role were…" /></div>
            <div className="flex gap-2">
              <Button onClick={() => save.mutate({ ...newEntry, sortOrder: career.length })} disabled={!newEntry.organisation || save.isPending} className="bg-[var(--lw-gold)] hover:bg-[oklch(0.60 0.13 72)] text-white">Save</Button>
              <Button variant="outline" onClick={() => setAdding(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Button variant="outline" onClick={() => setAdding(true)} className="gap-2 w-full border-dashed">
          <Plus className="w-4 h-4" /> Add Career Record
        </Button>
      )}
    </div>
  );
}
