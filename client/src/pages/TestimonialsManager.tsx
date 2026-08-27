import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { Check, ChevronLeft, FileCheck2, Loader2, Pencil, Plus, Quote, Trash2 } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";

type TestimonialForm = {
  quote: string;
  attribution: string;
  sourceReference: string;
  consentConfirmed: boolean;
};

const EMPTY_FORM: TestimonialForm = {
  quote: "",
  attribution: "",
  sourceReference: "",
  consentConfirmed: false,
};

function StatusPill({ status }: { status: "draft" | "approved" | "archived" }) {
  const presentation = {
    draft: { label: "Draft", background: "rgba(201,151,58,0.14)", color: "#8C631A" },
    approved: { label: "Approved", background: "rgba(37,99,62,0.12)", color: "#25633E" },
    archived: { label: "Archived", background: "rgba(26,39,68,0.10)", color: "#506078" },
  }[status];

  return (
    <span className="rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em]" style={presentation}>
      {presentation.label}
    </span>
  );
}

export default function TestimonialsManager() {
  const [, navigate] = useLocation();
  const { user, loading } = useAuth();
  const utils = trpc.useUtils();
  const [form, setForm] = useState<TestimonialForm>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<number | null>(null);
  const isAdmin = user?.role === "admin";
  const testimonials = trpc.verifiedTestimonials.list.useQuery(undefined, { enabled: isAdmin });

  const refresh = () => {
    void utils.verifiedTestimonials.list.invalidate();
    void utils.verifiedTestimonials.publicList.invalidate();
  };

  const create = trpc.verifiedTestimonials.create.useMutation({
    onSuccess: () => {
      setForm(EMPTY_FORM);
      refresh();
    },
  });
  const update = trpc.verifiedTestimonials.update.useMutation({
    onSuccess: () => {
      setEditingId(null);
      setForm(EMPTY_FORM);
      refresh();
    },
  });
  const approve = trpc.verifiedTestimonials.approve.useMutation({ onSuccess: refresh });
  const archive = trpc.verifiedTestimonials.archive.useMutation({ onSuccess: refresh });
  const remove = trpc.verifiedTestimonials.remove.useMutation({ onSuccess: refresh });

  const isSaving = create.isPending || update.isPending;
  const mutationError = create.error ?? update.error ?? approve.error ?? archive.error ?? remove.error;

  const updateField = <K extends keyof TestimonialForm>(field: K, value: TestimonialForm[K]) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const save = () => {
    if (editingId) {
      update.mutate({ id: editingId, ...form });
    } else {
      create.mutate(form);
    }
  };

  const edit = (testimonial: NonNullable<typeof testimonials.data>[number]) => {
    setEditingId(testimonial.id);
    setForm({
      quote: testimonial.quote,
      attribution: testimonial.attribution,
      sourceReference: testimonial.sourceReference,
      consentConfirmed: testimonial.consentConfirmed,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center" style={{ background: "var(--lw-cream)" }}><Loader2 className="h-7 w-7 animate-spin" style={{ color: "var(--lw-gold)" }} /></div>;
  }

  if (!isAdmin) {
    return (
      <main className="flex min-h-screen items-center justify-center p-6" style={{ background: "var(--lw-cream)" }}>
        <div className="max-w-md border p-8 text-center" style={{ background: "white", borderColor: "rgba(201,151,58,0.35)" }}>
          <FileCheck2 className="mx-auto h-8 w-8" style={{ color: "var(--lw-gold)" }} />
          <h1 className="mt-4 font-serif text-3xl font-semibold" style={{ color: "var(--lw-navy)" }}>Administrator access required</h1>
          <p className="mt-3 text-sm leading-relaxed" style={{ color: "var(--lw-ink-muted)" }}>Verified client feedback can only be managed by a Lifework administrator.</p>
          <Button className="mt-6" onClick={() => navigate("/counselor")}>Return to counsellor view</Button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen pb-16" style={{ background: "var(--lw-cream)" }}>
      <header className="border-b" style={{ background: "var(--lw-navy)", borderColor: "rgba(201,151,58,0.3)" }}>
        <div className="container flex min-h-16 items-center justify-between gap-4">
          <button onClick={() => navigate("/counselor")} className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.11em]" style={{ color: "rgba(255,255,255,0.72)" }}>
            <ChevronLeft className="h-4 w-4" /> Counsellor view
          </button>
          <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--lw-gold)" }}><FileCheck2 className="h-4 w-4" /> Verified feedback</span>
        </div>
      </header>

      <section className="border-b px-4 py-12 sm:py-16" style={{ background: "var(--lw-navy)", borderColor: "rgba(201,151,58,0.3)" }}>
        <div className="container max-w-6xl">
          <p className="lw-eyebrow" style={{ color: "var(--lw-gold)" }}>Administrator-only publishing workflow</p>
          <h1 className="mt-4 max-w-3xl font-serif text-4xl font-semibold leading-tight text-white sm:text-5xl">Verified client feedback</h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed" style={{ color: "rgba(255,255,255,0.72)" }}>
            Record the original source and confirm permission before approving a quotation for the public webinar page. Only approved records are visible publicly.
          </p>
        </div>
      </section>

      <div className="container mt-10 grid max-w-6xl gap-10 lg:grid-cols-[0.9fr_1.1fr]">
        <section className="border p-6 sm:p-8" style={{ background: "white", borderColor: "rgba(201,151,58,0.4)" }}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="lw-eyebrow" style={{ color: "var(--lw-gold)" }}>{editingId ? "Update record" : "New record"}</p>
              <h2 className="mt-3 font-serif text-3xl font-semibold" style={{ color: "var(--lw-navy)" }}>{editingId ? "Edit feedback" : "Add verified feedback"}</h2>
            </div>
            <Quote className="h-6 w-6" style={{ color: "var(--lw-gold)" }} />
          </div>
          <p className="mt-3 text-sm leading-relaxed" style={{ color: "var(--lw-ink-muted)" }}>New and edited records are saved as drafts. Any material change to an approved record requires approval again.</p>

          <div className="mt-7 space-y-5">
            <label className="block text-sm font-semibold" style={{ color: "var(--lw-navy)" }}>
              Approved quotation
              <Textarea value={form.quote} onChange={(event) => updateField("quote", event.target.value)} className="mt-2 min-h-32" placeholder="Paste the client-approved wording exactly as recorded." />
            </label>
            <label className="block text-sm font-semibold" style={{ color: "var(--lw-navy)" }}>
              Display attribution
              <Input value={form.attribution} onChange={(event) => updateField("attribution", event.target.value)} className="mt-2" placeholder="For example: First name, initial" />
            </label>
            <label className="block text-sm font-semibold" style={{ color: "var(--lw-navy)" }}>
              Source record
              <Textarea value={form.sourceReference} onChange={(event) => updateField("sourceReference", event.target.value)} className="mt-2 min-h-24" placeholder="Record where permission and the original feedback can be verified, e.g. signed consent or dated email." />
            </label>
            <label className="flex cursor-pointer items-start gap-3 border p-4 text-sm leading-relaxed" style={{ borderColor: "rgba(201,151,58,0.35)", color: "var(--lw-ink-muted)" }}>
              <input type="checkbox" checked={form.consentConfirmed} onChange={(event) => updateField("consentConfirmed", event.target.checked)} className="mt-0.5 h-4 w-4 accent-[var(--lw-gold)]" />
              <span>I confirm that the person has given permission for this wording and attribution to be displayed publicly.</span>
            </label>
            {mutationError && <p className="text-sm text-red-700">{mutationError.message}</p>}
            <div className="flex flex-wrap gap-3">
              <Button onClick={save} disabled={isSaving || !form.quote.trim() || !form.attribution.trim() || !form.sourceReference.trim()} className="gap-2" style={{ background: "var(--lw-gold)", color: "var(--lw-navy)" }}>
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}{editingId ? "Save as draft" : "Add draft"}
              </Button>
              {editingId && <Button variant="outline" onClick={() => { setEditingId(null); setForm(EMPTY_FORM); }}>Cancel edit</Button>}
            </div>
          </div>
        </section>

        <section>
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="lw-eyebrow" style={{ color: "var(--lw-gold)" }}>Publication register</p>
              <h2 className="mt-3 font-serif text-3xl font-semibold" style={{ color: "var(--lw-navy)" }}>All records</h2>
            </div>
            <span className="text-sm" style={{ color: "var(--lw-ink-muted)" }}>{testimonials.data?.length ?? 0} total</span>
          </div>
          {testimonials.isLoading ? (
            <div className="mt-6 flex min-h-48 items-center justify-center border" style={{ background: "white", borderColor: "rgba(201,151,58,0.35)" }}><Loader2 className="h-6 w-6 animate-spin" style={{ color: "var(--lw-gold)" }} /></div>
          ) : testimonials.data?.length === 0 ? (
            <div className="mt-6 border p-8" style={{ background: "rgba(255,255,255,0.7)", borderColor: "rgba(201,151,58,0.35)" }}><p className="font-serif text-2xl" style={{ color: "var(--lw-navy)" }}>No feedback records yet.</p><p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--lw-ink-muted)" }}>Add a draft only when you can record the original source and public-display permission.</p></div>
          ) : (
            <div className="mt-6 space-y-4">
              {testimonials.data?.map((testimonial) => (
                <article key={testimonial.id} className="border p-5 sm:p-6" style={{ background: "white", borderColor: "rgba(201,151,58,0.35)" }}>
                  <div className="flex flex-wrap items-center justify-between gap-3"><StatusPill status={testimonial.status} /><span className="text-xs" style={{ color: "var(--lw-ink-muted)" }}>{testimonial.consentConfirmed ? "Permission recorded" : "Permission not yet recorded"}</span></div>
                  <blockquote className="mt-5 font-serif text-xl leading-snug" style={{ color: "var(--lw-navy)" }}>“{testimonial.quote}”</blockquote>
                  <p className="mt-3 text-sm font-semibold" style={{ color: "var(--lw-gold)" }}>— {testimonial.attribution}</p>
                  <p className="mt-5 border-l-2 pl-3 text-xs leading-relaxed" style={{ borderColor: "var(--lw-gold)", color: "var(--lw-ink-muted)" }}><strong>Source:</strong> {testimonial.sourceReference}</p>
                  <div className="mt-5 flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => edit(testimonial)} className="gap-1.5"><Pencil className="h-3.5 w-3.5" />Edit</Button>
                    {testimonial.status !== "approved" && <Button size="sm" disabled={!testimonial.consentConfirmed || !testimonial.sourceReference.trim() || approve.isPending} onClick={() => approve.mutate({ id: testimonial.id })} className="gap-1.5" style={{ background: "var(--lw-gold)", color: "var(--lw-navy)" }}><Check className="h-3.5 w-3.5" />Approve for public page</Button>}
                    {testimonial.status !== "archived" && <Button size="sm" variant="outline" disabled={archive.isPending} onClick={() => archive.mutate({ id: testimonial.id })}>Archive</Button>}
                    <Button size="sm" variant="ghost" disabled={remove.isPending} onClick={() => { if (window.confirm("Remove this testimonial record permanently?")) remove.mutate({ id: testimonial.id }); }} className="gap-1.5 text-red-700 hover:text-red-700"><Trash2 className="h-3.5 w-3.5" />Remove</Button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
