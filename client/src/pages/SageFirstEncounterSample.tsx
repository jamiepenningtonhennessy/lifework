import { ArrowRight, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

const SAGE_STAGE_VIDEO_URL = "/manus-storage/lifework_stage3_sage_conversation_explainer_9ae1669b.mp4";

/**
 * A deliberately isolated, public first-screen sample. It never reads, writes,
 * authenticates, or represents a real client record.
 */
export default function SageFirstEncounterSample() {
  return (
    <div className="min-h-screen" style={{ background: "var(--lw-cream)" }}>
      <header className="border-b-2" style={{ background: "var(--lw-navy)", borderColor: "var(--lw-gold)" }}>
        <div className="container flex min-h-16 items-center justify-between gap-4 py-3">
          <div>
            <p className="font-serif text-2xl font-semibold tracking-tight text-white">Lifework</p>
            <p className="mt-0.5 text-[10px] uppercase tracking-[0.16em]" style={{ color: "var(--lw-gold)" }}>Client first-encounter preview</p>
          </div>
          <span className="rounded-full border px-3 py-1 text-[11px] font-medium" style={{ borderColor: "rgba(201,151,58,0.5)", color: "var(--lw-gold)" }}>
            Fictional · nothing is saved
          </span>
        </div>
      </header>

      <main className="container max-w-4xl py-9 sm:py-12">
        <div className="mb-8 max-w-2xl">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--lw-gold)" }}>Step 3 of 6 · first available conversation</p>
          <h1 className="font-serif text-3xl font-semibold tracking-tight" style={{ color: "var(--lw-navy)" }}>The first question, not a conclusion</h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            This is a fictional, read-only version of the first Sage screen. It contains no client data and does not start or save a conversation.
          </p>
        </div>

        <div className="mb-8 overflow-hidden rounded-xl border" style={{ borderColor: "rgba(201,151,58,0.32)", background: "var(--lw-navy)" }}>
          <video
            src={SAGE_STAGE_VIDEO_URL}
            controls
            playsInline
            preload="metadata"
            title="Meet Sage — a short introduction to your conversation"
            className="block aspect-video w-full"
          />
        </div>

        <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-serif text-xl"><Sparkles className="h-5 w-5" style={{ color: "var(--lw-gold)" }} /> When Sage first opens</CardTitle>
              <p className="text-sm leading-relaxed text-muted-foreground">Once a client has begun their life history, Sage starts by making space for the client’s own detail.</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="max-w-[88%] rounded-2xl rounded-tl-sm bg-muted px-4 py-3 text-sm leading-relaxed" style={{ color: "var(--lw-navy)" }}>
                What part of that moment felt most satisfying to you?
              </div>
              <div className="border-t pt-4" style={{ borderColor: "var(--border)" }}>
                <Textarea readOnly placeholder="The client can answer in their own words…" className="min-h-24" />
                <Button disabled className="mt-3 gap-2" style={{ background: "var(--lw-gold)", color: "var(--lw-navy)" }}>
                  Send — preview only <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="font-serif text-xl">What the client needs to know</CardTitle></CardHeader>
            <CardContent className="space-y-4 text-sm leading-relaxed text-muted-foreground">
              <p>Sage is there to help them revisit a meaningful moment with curiosity and care. She does not announce an interpretation before the client has had the chance to say what the experience meant to them.</p>
              <div className="rounded-lg p-4" style={{ background: "rgba(201,151,58,0.08)", border: "1px solid rgba(201,151,58,0.25)" }}>
                <p className="font-medium" style={{ color: "var(--lw-navy)" }}>A gentle, question-led pace</p>
                <p className="mt-1">The invitation is to be open, honest and enjoy the questions. The richer the detail, the more useful the later pattern work can be.</p>
              </div>
              <p>This page is only a private visual sample. To use Sage, a client continues through their own Lifework journey.</p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
