import { useRef, useState } from "react";
import { FileText, Loader2, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { MAX_JOB_SPEC_BYTES, type JobSpecFeedback } from "@shared/jobSpecReview";

const ACCEPTED_TYPES = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"] as const;

function fitLabel(fit: JobSpecFeedback["overallFit"]) {
  return { strong: "Strong evidence alignment", promising: "Promising alignment", stretch: "A considered stretch", "limited-evidence": "Limited evidence so far" }[fit];
}

export function JobSpecReviewPanel() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const utils = trpc.useUtils();
  const { data: reviews = [], isLoading } = trpc.jobSpecReview.list.useQuery({});
  const upload = trpc.jobSpecReview.uploadAndAnalyse.useMutation({
    onSuccess: () => {
      toast.success("Alistair has reviewed the job specification.");
      utils.jobSpecReview.list.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });
  const remove = trpc.jobSpecReview.remove.useMutation({
    onSuccess: () => utils.jobSpecReview.list.invalidate(),
    onError: (error) => toast.error(error.message),
  });

  const handleFile = async (file?: File) => {
    if (!file) return;
    if (!ACCEPTED_TYPES.includes(file.type as typeof ACCEPTED_TYPES[number]) || file.size > MAX_JOB_SPEC_BYTES) {
      toast.error("Please choose a PDF or DOCX job specification no larger than 10 MB.");
      return;
    }
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    upload.mutate({ fileBase64: base64, fileName: file.name, mimeType: file.type as typeof ACCEPTED_TYPES[number] });
  };

  return (
    <section className="border border-[var(--lw-gold)]/35 bg-white px-5 py-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="lw-eyebrow mb-2" style={{ color: "var(--lw-gold)" }}>A role under consideration</p>
          <h2 className="font-serif text-2xl font-semibold" style={{ color: "var(--lw-navy)" }}>Ask Alistair to read a job specification</h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">Upload a PDF or DOCX job specification. Alistair will compare it with your documented strengths, Lifework evidence, CV and Role Specification—highlighting evidence to lead with and questions to clarify. This is evidence-led guidance, not a hiring prediction.</p>
        </div>
        <Button onClick={() => inputRef.current?.click()} disabled={upload.isPending} className="shrink-0" style={{ background: "var(--lw-gold)", color: "var(--lw-navy)" }}>
          {upload.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
          {upload.isPending ? "Alistair is reviewing…" : "Upload job specification"}
        </Button>
      </div>
      <input ref={inputRef} type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" className="hidden" onChange={(event) => { handleFile(event.target.files?.[0]); event.currentTarget.value = ""; }} />
      <p className="mt-3 text-xs text-muted-foreground">PDF or DOCX · maximum 10 MB · up to 10 retained reviews · you may remove a review at any time.</p>

      {isLoading ? <div className="mt-5"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div> : reviews.length > 0 && (
        <div className="mt-6 space-y-4 border-t border-border pt-5">
          {reviews.map((review) => {
            const feedback = review.feedbackJson ? JSON.parse(review.feedbackJson) as JobSpecFeedback : null;
            return <article key={review.id} className="border border-border bg-[var(--lw-cream)]/40 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <FileText className="mt-0.5 h-4 w-4" style={{ color: "var(--lw-gold)" }} />
                  <div><p className="font-medium text-foreground">{feedback?.roleTitle || review.originalName}</p><p className="text-xs text-muted-foreground">{feedback?.organisation || review.originalName} · {new Date(review.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</p></div>
                </div>
                <Button variant="ghost" size="icon" aria-label={`Remove ${review.originalName}`} onClick={() => remove.mutate({ id: review.id })} disabled={remove.isPending}><Trash2 className="h-4 w-4 text-muted-foreground" /></Button>
              </div>
              {review.status === "error" && <p className="mt-3 text-sm text-destructive">{review.errorMessage || "Alistair could not complete this review."}</p>}
              {feedback && <div className="mt-4 space-y-4 text-sm">
                <div className="border-l-2 pl-3" style={{ borderColor: "var(--lw-gold)" }}><p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--lw-gold)" }}>{fitLabel(feedback.overallFit)}</p><p className="mt-1 leading-relaxed text-foreground">{feedback.fitSummary}</p></div>
                <div><p className="font-medium text-foreground">Evidence to lead with</p><ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">{feedback.evidenceToLeadWith.map((item) => <li key={item}>{item}</li>)}</ul></div>
                <button className="text-sm underline" style={{ color: "var(--lw-gold)" }} onClick={() => setIsExpanded((current) => !current)}>{isExpanded ? "Hide detailed alignment" : "Show detailed alignment"}</button>
                {isExpanded && <div className="space-y-4"><div className="space-y-2">{feedback.alignment.map((row) => <div key={row.requirement} className="border-t border-border pt-2"><p className="font-medium text-foreground">{row.requirement}</p><p className="mt-1 text-muted-foreground">{row.clientEvidence}</p><p className="mt-1 text-xs capitalize" style={{ color: row.assessment === "strong" ? "#5E7F4E" : "var(--lw-gold)" }}>{row.assessment.replaceAll("-", " ")}</p></div>)}</div><div><p className="font-medium text-foreground">Questions to clarify</p><ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">{feedback.questionsToClarify.map((item) => <li key={item}>{item}</li>)}</ul></div><div><p className="font-medium text-foreground">Suggested positioning</p><p className="mt-1 leading-relaxed text-muted-foreground">{feedback.positioningAdvice}</p></div><p className="border-l-2 border-amber-600/60 pl-3 text-muted-foreground"><strong>Caution:</strong> {feedback.importantCaution}</p></div>}
              </div>}
            </article>;
          })}
        </div>
      )}
    </section>
  );
}
