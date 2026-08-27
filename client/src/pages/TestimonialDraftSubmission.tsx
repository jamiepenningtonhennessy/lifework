import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { CheckCircle2, FileCheck2, Loader2, Quote } from "lucide-react";
import { useState } from "react";

type DraftForm = {
  quote: string;
  attribution: string;
  sourceReference: string;
  consentConfirmed: boolean;
  website: string;
};

const EMPTY_FORM: DraftForm = {
  quote: "",
  attribution: "",
  sourceReference: "",
  consentConfirmed: false,
  website: "",
};

export default function TestimonialDraftSubmission() {
  const [form, setForm] = useState<DraftForm>(EMPTY_FORM);
  const [submitted, setSubmitted] = useState(false);
  const submitDraft = trpc.verifiedTestimonials.submitDraft.useMutation({
    onSuccess: (result) => {
      if (result.submitted) {
        setForm(EMPTY_FORM);
        setSubmitted(true);
      }
    },
  });

  const updateField = <K extends keyof DraftForm>(field: K, value: DraftForm[K]) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const canSubmit = form.quote.trim().length >= 12
    && form.attribution.trim().length > 0
    && form.sourceReference.trim().length > 0
    && form.consentConfirmed;

  return (
    <main className="min-h-screen pb-16" style={{ background: "var(--lw-cream)" }}>
      <header className="border-b" style={{ background: "var(--lw-navy)", borderColor: "rgba(201,151,58,0.3)" }}>
        <div className="container flex min-h-16 items-center gap-3">
          <FileCheck2 className="h-5 w-5" style={{ color: "var(--lw-gold)" }} />
          <span className="text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--lw-gold)" }}>Lifework feedback</span>
        </div>
      </header>

      <section className="border-b px-4 py-12 sm:py-16" style={{ background: "var(--lw-navy)", borderColor: "rgba(201,151,58,0.3)" }}>
        <div className="container max-w-4xl">
          <p className="lw-eyebrow" style={{ color: "var(--lw-gold)" }}>Draft submission</p>
          <h1 className="mt-4 max-w-3xl font-serif text-4xl font-semibold leading-tight text-white sm:text-5xl">Share feedback for review</h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed" style={{ color: "rgba(255,255,255,0.72)" }}>
            Please record the wording exactly, the intended display attribution, and where permission can be checked. Your submission is saved as a draft only; a Lifework administrator must review and approve it before it can appear publicly.
          </p>
        </div>
      </section>

      <section className="container mt-10 max-w-3xl">
        {submitted ? (
          <div className="border p-8 text-center sm:p-12" style={{ background: "white", borderColor: "rgba(201,151,58,0.4)" }}>
            <CheckCircle2 className="mx-auto h-10 w-10" style={{ color: "#25633E" }} />
            <h2 className="mt-5 font-serif text-3xl font-semibold" style={{ color: "var(--lw-navy)" }}>Draft received</h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed" style={{ color: "var(--lw-ink-muted)" }}>
              Thank you. This feedback is now awaiting administrator review and cannot be published from this page.
            </p>
            <Button className="mt-7" onClick={() => setSubmitted(false)} style={{ background: "var(--lw-gold)", color: "var(--lw-navy)" }}>Submit another draft</Button>
          </div>
        ) : (
          <section className="border p-6 sm:p-8" style={{ background: "white", borderColor: "rgba(201,151,58,0.4)" }}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="lw-eyebrow" style={{ color: "var(--lw-gold)" }}>New draft</p>
                <h2 className="mt-3 font-serif text-3xl font-semibold" style={{ color: "var(--lw-navy)" }}>Add client feedback</h2>
              </div>
              <Quote className="h-6 w-6" style={{ color: "var(--lw-gold)" }} />
            </div>
            <p className="mt-3 text-sm leading-relaxed" style={{ color: "var(--lw-ink-muted)" }}>This page cannot approve, publish, edit or view submitted feedback.</p>

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
              <input aria-hidden="true" autoComplete="off" tabIndex={-1} value={form.website} onChange={(event) => updateField("website", event.target.value)} className="absolute -left-[10000px] h-px w-px opacity-0" name="website" />
              {submitDraft.error && <p className="text-sm text-red-700">{submitDraft.error.message}</p>}
              <Button onClick={() => submitDraft.mutate(form)} disabled={!canSubmit || submitDraft.isPending} className="gap-2" style={{ background: "var(--lw-gold)", color: "var(--lw-navy)" }}>
                {submitDraft.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileCheck2 className="h-4 w-4" />} Submit draft for review
              </Button>
            </div>
          </section>
        )}
      </section>
    </main>
  );
}
