import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, CalendarDays, CheckCircle2, Lock, Mail, Sparkles, Loader2 } from "lucide-react";
import { useLocation } from "wouter";

const FINAL_STAGE_VIDEO_URL = "/manus-storage/lifework_final_alistair_report_and_coaching_explainer_81089006.mp4";
const COACHING_EMAIL_HREF = "mailto:coach@lifeworkpath.com?subject=Lifework%20coaching%20meeting&body=Hello%2C%0A%0AI%20have%20completed%20my%20Lifework%20evidence-gathering%20stages%20and%20would%20like%20to%20arrange%20a%20coaching%20meeting.%0A%0AMy%20name%20is%3A%20";

export default function FinalCoachingStage() {
  const { isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();
  const { data: viaResults, isLoading: loadingVia } = trpc.via.getMyResults.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const { data: ipipResults, isLoading: loadingIpip } = trpc.ipip.getMyResults.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  if (!loading && !isAuthenticated) {
    window.location.href = getLoginUrl();
    return null;
  }

  if (loading || loadingVia || loadingIpip) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--lw-cream)" }}>
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: "var(--lw-gold)" }} />
      </div>
    );
  }

  const bothPsychometricsComplete = Boolean(viaResults && ipipResults);

  if (!bothPsychometricsComplete) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "var(--lw-cream)" }}>
        <div className="max-w-md w-full text-center space-y-6">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full" style={{ background: "var(--lw-navy)" }}>
            <Lock className="h-7 w-7" style={{ color: "var(--lw-gold)" }} />
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: "var(--lw-gold)" }}>Final stage</p>
            <h1 className="font-serif text-3xl font-semibold" style={{ color: "var(--lw-navy)" }}>Complete both lenses first</h1>
            <p className="mt-3 text-sm leading-relaxed" style={{ color: "var(--lw-navy-mid)" }}>
              This stage opens once your VIA Character Strengths and Personality Profile are both complete. Their results will then be read alongside your life history — never in isolation.
            </p>
          </div>
          <Button onClick={() => navigate("/dashboard")} className="gap-2" style={{ background: "var(--lw-gold)", color: "white" }}>
            <ArrowLeft className="h-4 w-4" /> Return to dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--lw-cream)" }}>
      <header className="sticky top-0 z-10 border-b-2" style={{ background: "var(--lw-navy)", borderColor: "var(--lw-gold)" }}>
        <div className="container flex h-14 items-center justify-between gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")} className="gap-1" style={{ color: "rgba(255,255,255,0.78)" }}>
            <ArrowLeft className="h-4 w-4" /> Dashboard
          </Button>
          <div className="min-w-0 text-right">
            <p className="text-[10px] uppercase tracking-[0.15em]" style={{ color: "var(--lw-gold)" }}>Stage 5 of 6</p>
            <p className="truncate text-sm font-medium text-white">Your WoW report and coaching meeting</p>
          </div>
        </div>
      </header>

      <main className="container max-w-4xl py-9 sm:py-12">
        <div className="mb-8 max-w-2xl">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.15em]" style={{ color: "var(--lw-gold)" }}>Your evidence is now complete</p>
          <h1 className="font-serif text-4xl font-semibold tracking-tight sm:text-5xl" style={{ color: "var(--lw-navy)" }}>
            Now we draw the whole picture together.
          </h1>
          <p className="mt-4 text-base leading-relaxed" style={{ color: "var(--lw-navy-mid)" }}>
            You have completed your life history, the conversation with Sage, and both psychometric lenses. The next step is to arrange a coaching meeting; your report is then prepared as the foundation for that conversation.
          </p>
        </div>

        <div className="overflow-hidden rounded-xl border" style={{ borderColor: "rgba(201,151,58,0.38)", background: "var(--lw-navy)" }}>
          <video
            src={FINAL_STAGE_VIDEO_URL}
            controls
            playsInline
            preload="metadata"
            className="block aspect-video w-full"
            title="Your Lifework report and coaching conversation — a short introduction"
          />
        </div>
        <p className="mt-3 text-sm leading-relaxed" style={{ color: "var(--lw-navy-mid)" }}>
          This short introduction explains how Alistair brings the evidence together, and how your coach uses the report to prepare a thoughtful, question-led conversation.
        </p>

        <Card className="mt-8 overflow-hidden border-[var(--lw-gold)]/30">
          <CardContent className="grid gap-7 p-6 sm:grid-cols-[1fr_auto] sm:items-center sm:p-8">
            <div>
              <div className="mb-3 flex items-center gap-2" style={{ color: "var(--lw-gold)" }}>
                <CalendarDays className="h-5 w-5" />
                <span className="text-xs font-semibold uppercase tracking-[0.15em]">Arrange your meeting</span>
              </div>
              <h2 className="font-serif text-3xl font-semibold" style={{ color: "var(--lw-navy)" }}>Book the conversation that brings your report to life.</h2>
              <p className="mt-3 max-w-xl text-sm leading-relaxed" style={{ color: "var(--lw-navy-mid)" }}>
                Email the Lifework coaching team to agree a date. Once the meeting is booked, your report will be sent to you and your coach, who will arrive ready to explore the patterns, possibilities and questions it raises.
              </p>
            </div>
            <a href={COACHING_EMAIL_HREF} className="shrink-0">
              <Button className="gap-2 px-5 py-6 text-base" style={{ background: "var(--lw-gold)", color: "white" }}>
                <Mail className="h-5 w-5" /> Email coach@lifeworkpath.com
              </Button>
            </a>
          </CardContent>
        </Card>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {[
            ["Evidence", "Your life history, Sage conversation and two psychometric lenses are held together."],
            ["Recognition", "Alistair’s WoW report names the patterns and questions worth bringing into the room."],
            ["Conversation", "Your coach comes prepared to explore with you — not to prescribe your next move."],
          ].map(([title, detail]) => (
            <div key={title} className="rounded-xl border p-5" style={{ borderColor: "rgba(17,34,56,0.13)", background: "rgba(255,255,255,0.52)" }}>
              <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-full" style={{ background: "rgba(184,156,114,0.16)", color: "var(--lw-gold)" }}>
                {title === "Evidence" ? <CheckCircle2 className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
              </div>
              <h3 className="font-serif text-xl font-semibold" style={{ color: "var(--lw-navy)" }}>{title}</h3>
              <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--lw-navy-mid)" }}>{detail}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
