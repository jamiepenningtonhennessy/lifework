import { useLocation, useParams } from "wouter";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  Compass,
  Eye,
  FileText,
  LockKeyhole,
  MessageSquare,
  PlayCircle,
  ShieldCheck,
  Sparkles,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DashboardBody } from "./ClientDashboard";

type AuditScreen = "dashboard" | "interview" | "background" | "via" | "ipip" | "alistair" | "video";

const AUDIT_ROOT = "/counselor/client-audit";
const HOMEPAGE_FILM = "/manus-storage/lifework_homepage_editorial_slidefilm_retimed_48dd0749.mp4";

const fictionalProfile = {
  firstName: "Example",
  lastName: "Client",
  interviewStatus: "completed",
  backgroundStatus: "completed",
  viaStatus: "completed",
  ipipStatus: "completed",
  careerExplorerUnlocked: true,
};

const fictionalEnrichmentStatus = {
  total: 24,
  enriched: 8,
  requiredEvents: 20,
  unlocked: true,
  sageConversationCompleted: true,
  hasMinimumEvents: true,
  remainingEvents: 0,
};

const auditPath = (screen: AuditScreen) =>
  screen === "dashboard" ? AUDIT_ROOT : `${AUDIT_ROOT}/${screen}`;

function isAuditScreen(value: string | undefined): value is AuditScreen {
  return ["dashboard", "interview", "background", "via", "ipip", "alistair", "video"].includes(value ?? "");
}

function AuditBanner({ screen }: { screen: AuditScreen }) {
  const [, navigate] = useLocation();

  return (
    <div
      className="border-b"
      style={{ background: "var(--lw-gold)", borderColor: "rgba(17,34,56,0.18)", color: "var(--lw-navy)" }}
    >
      <div className="container flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-2 text-sm">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <span className="font-semibold">Counsellor audit mode</span>
            <span className="hidden sm:inline"> — fictional sample data; nothing is saved or sent to a client.</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate(auditPath("dashboard"))}
            disabled={screen === "dashboard"}
            className="border-[var(--lw-navy)]/45 bg-transparent text-[var(--lw-navy)] hover:bg-white/35"
          >
            <ClipboardList className="mr-1.5 h-3.5 w-3.5" /> Dashboard
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate(auditPath("video"))}
            disabled={screen === "video"}
            className="border-[var(--lw-navy)]/45 bg-transparent text-[var(--lw-navy)] hover:bg-white/35"
          >
            <PlayCircle className="mr-1.5 h-3.5 w-3.5" /> Hosted video
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate("/counselor")}
            className="border-[var(--lw-navy)]/45 bg-transparent text-[var(--lw-navy)] hover:bg-white/35"
          >
            Return to counsellor desk
          </Button>
        </div>
      </div>
    </div>
  );
}

function AuditScreenHeader({ title, eyebrow, next }: { title: string; eyebrow: string; next?: { label: string; screen: AuditScreen } }) {
  const [, navigate] = useLocation();

  return (
    <div className="sticky top-0 z-10 border-b-2" style={{ background: "var(--lw-navy)", borderColor: "var(--lw-gold)" }}>
      <div className="container flex h-14 items-center justify-between gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(auditPath("dashboard"))}
          style={{ color: "rgba(255,255,255,0.78)" }}
          className="hover:text-white"
        >
          <ArrowLeft className="mr-1 h-4 w-4" /> Dashboard
        </Button>
        <div className="min-w-0 text-right">
          <p className="text-[10px] uppercase tracking-[0.14em]" style={{ color: "var(--lw-gold)" }}>{eyebrow}</p>
          <p className="truncate text-sm font-medium text-white">{title}</p>
        </div>
        {next ? (
          <Button
            size="sm"
            onClick={() => navigate(auditPath(next.screen))}
            className="hidden gap-1 sm:inline-flex"
            style={{ background: "var(--lw-gold)", color: "var(--lw-navy)" }}
          >
            {next.label} <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        ) : <div className="hidden w-24 sm:block" />}
      </div>
    </div>
  );
}

function AuditIntro({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="container max-w-4xl py-9 sm:py-12">
      <div className="mb-8 max-w-2xl">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--lw-gold)" }}>Fictional client walkthrough</p>
        <h1 className="font-serif text-3xl font-semibold tracking-tight" style={{ color: "var(--lw-navy)" }}>{title}</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">This is a visual, non-persistent audit of the screen a client would see. Form controls are illustrative only and do not affect any client record.</p>
      </div>
      {children}
    </div>
  );
}

function AuditDashboard() {
  const [, navigate] = useLocation();
  const auditNavigate = (clientPath: string) => {
    const screenByClientPath: Record<string, AuditScreen> = {
      "/interview": "interview",
      "/background": "background",
      "/via": "via",
      "/ipip-survey": "ipip",
      "/career-explorer": "alistair",
    };
    navigate(auditPath(screenByClientPath[clientPath] ?? "dashboard"));
  };

  return (
    <DashboardBody
      profile={fictionalProfile}
      enrichmentStatus={fictionalEnrichmentStatus}
      loadingProfile={false}
      displayName="Example Client"
      onNavigate={auditNavigate}
      showAdminLink={false}
      isPreview
      allowPreviewNavigation
      sagePreviewContext="This is a fictional audit client. They describe feeling most fulfilled when they make a complex question understandable, bring different people into a constructive conversation, and help a group decide what to do next. Ask one direct, open coaching question at a time. Do not state interpretations as conclusions before asking the question."
    />
  );
}

function InterviewAudit() {
  return (
    <>
      <AuditScreenHeader title="Life History Interview" eyebrow="Step 1 of 6" next={{ label: "Background", screen: "background" }} />
      <AuditIntro title="A life in evidence">
        <div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-serif text-xl"><MessageSquare className="h-5 w-5" style={{ color: "var(--lw-gold)" }} /> Early years</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm leading-relaxed text-muted-foreground">The client is invited to add specific moments, not a chronological CV. Each moment asks what happened, what they did, and what made it satisfying, enjoyable or fulfilling.</p>
              <div className="rounded-lg border p-4" style={{ borderColor: "rgba(201,151,58,0.35)", background: "rgba(201,151,58,0.06)" }}>
                <p className="text-xs font-semibold uppercase tracking-[0.12em]" style={{ color: "var(--lw-gold)" }}>Example event</p>
                <p className="mt-2 font-medium" style={{ color: "var(--lw-navy)" }}>Organising a school debate</p>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">A fictional example of planning the argument, drawing quieter people in, and helping the group arrive at a clear conclusion.</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="rounded-full bg-white px-2.5 py-1 text-xs shadow-sm">Enjoyable</span>
                  <span className="rounded-full bg-white px-2.5 py-1 text-xs shadow-sm">Satisfying</span>
                </div>
              </div>
              <Button disabled className="w-full gap-2" style={{ background: "var(--lw-gold)", color: "var(--lw-navy)" }}>
                <Sparkles className="h-4 w-4" /> Add another event — audit only
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="font-serif text-xl">Progress in context</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg bg-muted p-4">
                <p className="text-2xl font-semibold" style={{ color: "var(--lw-navy)" }}>24</p>
                <p className="mt-1 text-sm text-muted-foreground">fictional life-history events recorded</p>
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground">The live screen saves each event as the client works. This audit version deliberately does not save anything, so you can inspect the experience without creating an account or changing a record.</p>
              <div className="border-t pt-4 text-sm" style={{ borderColor: "var(--border)" }}>
                <p className="font-medium" style={{ color: "var(--lw-navy)" }}>What to check</p>
                <p className="mt-1 leading-relaxed text-muted-foreground">Clarity of the prompts, pace, reassurance about saved progress, and whether a client understands what counts as an event.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </AuditIntro>
    </>
  );
}

function BackgroundAudit() {
  return (
    <>
      <AuditScreenHeader title="Background & History" eyebrow="Step 2 of 6" next={{ label: "VIA survey", screen: "via" }} />
      <AuditIntro title="The context around the story">
        <div className="grid gap-5 md:grid-cols-2">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 font-serif text-xl"><UserRound className="h-5 w-5" style={{ color: "var(--lw-gold)" }} /> Family background</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm leading-relaxed text-muted-foreground">A calm, optional way for clients to add the context that may have shaped their choices and opportunities.</p>
              <Textarea readOnly value="Fictional audit example: a home where books, lively discussion and practical problem-solving were all valued." className="min-h-28 bg-muted/40" />
              <p className="text-xs text-muted-foreground">Audit mode: no data is saved.</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 font-serif text-xl"><FileText className="h-5 w-5" style={{ color: "var(--lw-gold)" }} /> Career timeline</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {[
                ["2011–2016", "Research and teaching", "Making difficult ideas useful to other people."],
                ["2016–2022", "Programme leadership", "Bringing disciplines and stakeholders into a shared direction."],
                ["2022–now", "Independent advisory work", "Helping groups decide what matters next."],
              ].map(([period, role, detail]) => (
                <div key={period} className="border-l-2 pl-4" style={{ borderColor: "var(--lw-gold)" }}>
                  <p className="text-xs font-semibold uppercase tracking-[0.1em]" style={{ color: "var(--lw-gold)" }}>{period}</p>
                  <p className="mt-1 text-sm font-medium" style={{ color: "var(--lw-navy)" }}>{role}</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">{detail}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </AuditIntro>
    </>
  );
}

const viaQuestions = [
  "I feel energised when I learn something that changes how I see a problem.",
  "I enjoy finding a way to make a complicated idea clearer for someone else.",
  "I notice when a group has lost sight of what it is trying to achieve.",
];

function AssessmentAudit({ type }: { type: "via" | "ipip" }) {
  const isVia = type === "via";
  const [, navigate] = useLocation();
  const title = isVia ? "VIA Character Strengths" : "Personality Profile";
  const eyebrow = isVia ? "Step 4 of 6 · assessment one" : "Step 4 of 6 · assessment two";
  const questions = isVia ? viaQuestions : [
    "I enjoy exploring questions for which there is no immediate answer.",
    "I prefer to have a clear plan before beginning something important.",
    "I am comfortable bringing different viewpoints into a useful discussion.",
  ];

  return (
    <>
      <AuditScreenHeader title={title} eyebrow={eyebrow} next={{ label: isVia ? "Personality profile" : "Alistair", screen: isVia ? "ipip" : "alistair" }} />
      <AuditIntro title={isVia ? "A further lens on what matters" : "A picture of working preferences"}>
        <Card className="mx-auto max-w-3xl">
          <CardHeader>
            <CardTitle className="font-serif text-xl">Illustrative question set</CardTitle>
            <p className="text-sm leading-relaxed text-muted-foreground">The live assessment is longer. This is a short, non-scoring screen so you can review language, pacing and controls without generating results.</p>
          </CardHeader>
          <CardContent className="space-y-6">
            {questions.map((question, index) => (
              <div key={question} className="border-b pb-6 last:border-0 last:pb-0" style={{ borderColor: "var(--border)" }}>
                <p className="mb-4 text-sm font-medium leading-relaxed" style={{ color: "var(--lw-navy)" }}><span style={{ color: "var(--lw-gold)" }}>{index + 1}.</span> {question}</p>
                <div className="grid grid-cols-5 gap-2 text-center text-[11px] text-muted-foreground sm:gap-3">
                  {["Strongly disagree", "Disagree", "Neither", "Agree", "Strongly agree"].map((label, ratingIndex) => (
                    <button
                      key={label}
                      type="button"
                      className={`rounded-md border px-1 py-2 transition-colors ${ratingIndex === 3 ? "border-[var(--lw-gold)] bg-[var(--lw-gold-light)]/20 text-[var(--lw-navy)]" : "border-border bg-background"}`}
                      aria-label={label}
                    >
                      <span className="block text-base font-semibold">{ratingIndex + 1}</span>
                      <span className="hidden pt-1 sm:block">{label}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <div className="flex justify-between gap-3 pt-2">
              <Button variant="outline" onClick={() => navigate(auditPath("dashboard"))}>Back to dashboard</Button>
              <Button disabled style={{ background: "var(--lw-gold)", color: "var(--lw-navy)" }}>{isVia ? "Continue — audit only" : "Finish — audit only"}</Button>
            </div>
          </CardContent>
        </Card>
      </AuditIntro>
    </>
  );
}

function AlistairAudit() {
  return (
    <>
      <AuditScreenHeader title="Explore with Alistair" eyebrow="Step 6 of 6" />
      <AuditIntro title="A conversation after the report">
        <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-serif text-xl"><Compass className="h-5 w-5" style={{ color: "var(--lw-gold)" }} /> How Alistair appears to a client</CardTitle>
              <p className="text-sm leading-relaxed text-muted-foreground">This screen is available after the counsellor has unlocked it. The audit version uses fictional material and does not open a real client conversation.</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="max-w-[88%] rounded-2xl rounded-tl-sm bg-muted px-4 py-3 text-sm leading-relaxed" style={{ color: "var(--lw-navy)" }}>
                You have described feeling most alive when you make a difficult question clearer and help people decide what to do next. Which recent piece of work comes closest to that for you?
              </div>
              <div className="ml-auto max-w-[78%] rounded-2xl rounded-tr-sm px-4 py-3 text-sm leading-relaxed text-white" style={{ background: "var(--lw-navy)" }}>
                Leading a workshop where two teams finally agreed how to move a project forward.
              </div>
              <div className="max-w-[88%] rounded-2xl rounded-tl-sm bg-muted px-4 py-3 text-sm leading-relaxed" style={{ color: "var(--lw-navy)" }}>
                What made it satisfying to you to help the group reach that point?
              </div>
              <div className="border-t pt-4" style={{ borderColor: "var(--border)" }}>
                <Input disabled placeholder="Audit mode — messages are not sent or saved" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="font-serif text-xl">What to audit here</CardTitle></CardHeader>
            <CardContent className="space-y-4 text-sm leading-relaxed text-muted-foreground">
              <p>Alistair should invite reflection through clear questions, rather than announcing an interpretation before the client has had room to think.</p>
              <p>In the live client view, the conversation draws on that client’s completed Lifework report and is available only when a counsellor has intentionally opened it.</p>
              <div className="rounded-lg p-4" style={{ background: "rgba(201,151,58,0.08)", border: "1px solid rgba(201,151,58,0.25)" }}>
                <p className="font-medium" style={{ color: "var(--lw-navy)" }}>Privacy boundary</p>
                <p className="mt-1">This audit screen never loads, writes or displays a real person’s report or conversation.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </AuditIntro>
    </>
  );
}

function VideoAudit() {
  return (
    <>
      <AuditScreenHeader title="Hosted video" eyebrow="Public media check" />
      <AuditIntro title="The current Lifework homepage film">
        <Card className="mx-auto max-w-4xl overflow-hidden">
          <CardContent className="p-0">
            <video
              src={HOMEPAGE_FILM}
              controls
              playsInline
              preload="metadata"
              title="Lifework homepage film — counsellor audit"
              className="block aspect-video w-full bg-[var(--lw-navy)]"
            />
          </CardContent>
          <div className="border-t p-5" style={{ borderColor: "var(--border)" }}>
            <p className="font-serif text-lg" style={{ color: "var(--lw-navy)" }}>Hosted media, as a visitor sees it</p>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">This is the same managed video asset used on the LifeworkPath home page. The audit route lets you check playback without registering a client account.</p>
          </div>
        </Card>
      </AuditIntro>
    </>
  );
}

export default function ClientExperienceAudit() {
  const params = useParams<{ screen?: string }>();
  const screen: AuditScreen = isAuditScreen(params.screen) ? params.screen : "dashboard";

  return (
    <div className="min-h-screen" style={{ background: "var(--lw-cream)" }}>
      <AuditBanner screen={screen} />
      {screen === "dashboard" && <AuditDashboard />}
      {screen === "interview" && <InterviewAudit />}
      {screen === "background" && <BackgroundAudit />}
      {screen === "via" && <AssessmentAudit type="via" />}
      {screen === "ipip" && <AssessmentAudit type="ipip" />}
      {screen === "alistair" && <AlistairAudit />}
      {screen === "video" && <VideoAudit />}
    </div>
  );
}
