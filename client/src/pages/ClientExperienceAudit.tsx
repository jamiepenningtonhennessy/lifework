import { useLocation, useParams } from "wouter";
import {
  ArrowLeft,
  ArrowRight,
  ClipboardList,
  Compass,
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

type AuditScreen = "dashboard" | "interview" | "background" | "sage" | "via" | "ipip" | "alistair" | "video";

const AUDIT_ROOT = "/counselor/client-audit";
const HOMEPAGE_FILM = "/manus-storage/lifework_homepage_editorial_slidefilm_retimed_48dd0749.mp4";
const STAGE_VIDEOS = {
  lifeHistory: { fileId: "1vYmcvxcjjK3kPiOib4l9aNlg9XSCIBSL", title: "Lifework introduction" },
  background: { fileId: "1FQ9fnNAvFIvwPqqmwC_t7ODEOhj0w1ld", title: "Career, education and family" },
  via: { fileId: "1bJfqf5QNyio-xtNa14AFHYE8L90-1MWr", title: "VIA Character Strengths — Introduction" },
  ipip: { fileId: "1t1UYw3YRal-UZ0efJrtr3H_IqH08ANsy", title: "IPIP-NEO Personality Survey" },
} as const;

/** A deliberately empty account state — no real profile, record or report is ever read. */
const firstVisitProfile = {
  firstName: "Example",
  lastName: "Client",
  interviewStatus: "not_started",
  backgroundStatus: "not_started",
  viaStatus: "not_started",
  ipipStatus: "not_started",
  careerExplorerUnlocked: false,
};

const firstVisitEnrichmentStatus = {
  total: 0,
  enriched: 0,
  requiredEvents: 20,
  unlocked: false,
  sageConversationCompleted: false,
  hasMinimumEvents: false,
  remainingEvents: 20,
};

const auditPath = (screen: AuditScreen) =>
  screen === "dashboard" ? AUDIT_ROOT : `${AUDIT_ROOT}/${screen}`;

function isAuditScreen(value: string | undefined): value is AuditScreen {
  return ["dashboard", "interview", "background", "sage", "via", "ipip", "alistair", "video"].includes(value ?? "");
}

const auditLinks: Array<{ screen: AuditScreen; label: string }> = [
  { screen: "dashboard", label: "Dashboard" },
  { screen: "interview", label: "Life history" },
  { screen: "background", label: "Background" },
  { screen: "sage", label: "Sage" },
  { screen: "via", label: "VIA" },
  { screen: "ipip", label: "Personality" },
  { screen: "alistair", label: "Alistair" },
  { screen: "video", label: "Hosted video" },
];

function AuditBanner({ screen }: { screen: AuditScreen }) {
  const [, navigate] = useLocation();

  return (
    <div className="border-b" style={{ background: "var(--lw-gold)", borderColor: "rgba(17,34,56,0.18)", color: "var(--lw-navy)" }}>
      <div className="container py-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-2 text-sm">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <span className="font-semibold">Counsellor audit mode</span>
              <span className="hidden sm:inline"> — first-engagement screens, fictional state; nothing is saved or sent to a client.</span>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate("/counselor")}
            className="w-fit border-[var(--lw-navy)]/45 bg-transparent text-[var(--lw-navy)] hover:bg-white/35"
          >
            Return to counsellor desk
          </Button>
        </div>
        <nav className="mt-3 flex gap-1.5 overflow-x-auto pb-0.5" aria-label="Audit screens">
          {auditLinks.map((link) => (
            <button
              key={link.screen}
              type="button"
              onClick={() => navigate(auditPath(link.screen))}
              aria-current={screen === link.screen ? "page" : undefined}
              className="shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors"
              style={{
                borderColor: "rgba(17,34,56,0.3)",
                background: screen === link.screen ? "var(--lw-navy)" : "rgba(255,255,255,0.22)",
                color: screen === link.screen ? "white" : "var(--lw-navy)",
              }}
            >
              {link.label}
            </button>
          ))}
        </nav>
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
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--lw-gold)" }}>First engagement audit</p>
        <h1 className="font-serif text-3xl font-semibold tracking-tight" style={{ color: "var(--lw-navy)" }}>{title}</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">This shows the blank or opening state a new client first encounters. It is fictional and non-persistent, so you can inspect every stage without registering or changing a client record.</p>
      </div>
      {children}
    </div>
  );
}

/** Uses exactly the same Google Drive preview source as the matching live client page. */
function StageVideoEmbed({ video }: { video: (typeof STAGE_VIDEOS)[keyof typeof STAGE_VIDEOS] }) {
  return (
    <div className="mb-8 overflow-hidden" style={{ border: "1px solid rgba(201,151,58,0.3)", background: "#000" }}>
      <div className="relative aspect-video">
        <iframe
          src={`https://drive.google.com/file/d/${video.fileId}/preview`}
          allow="autoplay"
          allowFullScreen
          title={video.title}
          className="absolute inset-0 h-full w-full border-0"
        />
      </div>
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
      profile={firstVisitProfile}
      enrichmentStatus={firstVisitEnrichmentStatus}
      loadingProfile={false}
      displayName="Example Client"
      onNavigate={auditNavigate}
      showAdminLink={false}
    />
  );
}

function InterviewAudit() {
  return (
    <>
      <AuditScreenHeader title="Life History Interview" eyebrow="Step 1 of 6 · first visit" next={{ label: "Background", screen: "background" }} />
      <AuditIntro title="Begin with one real moment">
        <StageVideoEmbed video={STAGE_VIDEOS.lifeHistory} />
        <div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-serif text-xl"><MessageSquare className="h-5 w-5" style={{ color: "var(--lw-gold)" }} /> Your first memory</CardTitle>
              <p className="text-sm leading-relaxed text-muted-foreground">The client sees a calm invitation to start with any time they felt effective, engaged, satisfied or fulfilled. There is no expectation to tell their whole life story at once.</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium" style={{ color: "var(--lw-navy)" }}>Give this moment a short title</label>
                <Input readOnly placeholder="For example: organising a school play" />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium" style={{ color: "var(--lw-navy)" }}>What happened? What did you do?</label>
                <Textarea readOnly placeholder="Write freely. You can return later to add detail or another moment." className="min-h-36" />
              </div>
              <div className="flex flex-wrap gap-2">
                {["Enjoyable", "Satisfying", "Fulfilling"].map((label) => <button key={label} type="button" className="rounded-full border border-border bg-background px-3 py-1.5 text-xs">{label}</button>)}
              </div>
              <Button disabled className="w-full gap-2" style={{ background: "var(--lw-gold)", color: "var(--lw-navy)" }}><Sparkles className="h-4 w-4" /> Save this memory — audit only</Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="font-serif text-xl">What a new client needs to know</CardTitle></CardHeader>
            <CardContent className="space-y-4 text-sm leading-relaxed text-muted-foreground">
              <div className="rounded-lg p-4" style={{ background: "rgba(201,151,58,0.08)", border: "1px solid rgba(201,151,58,0.25)" }}>
                <p className="font-medium" style={{ color: "var(--lw-navy)" }}>There is no right starting point.</p>
                <p className="mt-1">The first memory can be from childhood, work, study, family life or any other period. It just needs to matter to them.</p>
              </div>
              <p>The live journey saves progress as a client works. This audit holds nothing, so the page always returns to its first blank state.</p>
              <div className="border-t pt-4" style={{ borderColor: "var(--border)" }}>
                <p className="font-medium" style={{ color: "var(--lw-navy)" }}>Audit focus</p>
                <p className="mt-1">Look for warmth, simplicity and whether the invitation feels achievable rather than like a demand for a polished autobiography.</p>
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
      <AuditScreenHeader title="Background & History" eyebrow="Step 2 of 6 · first visit" next={{ label: "Sage", screen: "sage" }} />
      <AuditIntro title="Add context only when it helps">
        <StageVideoEmbed video={STAGE_VIDEOS.background} />
        <div className="grid gap-5 md:grid-cols-2">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 font-serif text-xl"><UserRound className="h-5 w-5" style={{ color: "var(--lw-gold)" }} /> Family background</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm leading-relaxed text-muted-foreground">The opening state is intentionally empty and optional. It invites context without presuming that a client should disclose more than feels useful.</p>
              <Textarea readOnly placeholder="If useful, add a little about the people, places or circumstances that shaped you." className="min-h-32" />
              <p className="text-xs text-muted-foreground">Nothing is saved in audit mode.</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 font-serif text-xl"><FileText className="h-5 w-5" style={{ color: "var(--lw-gold)" }} /> Career timeline</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm leading-relaxed text-muted-foreground">A new client sees an empty timeline and can add a role, period of study or meaningful transition when ready.</p>
              <div className="rounded-lg border border-dashed p-6 text-center" style={{ borderColor: "rgba(201,151,58,0.45)" }}>
                <FileText className="mx-auto h-7 w-7" style={{ color: "var(--lw-gold)" }} />
                <p className="mt-3 text-sm font-medium" style={{ color: "var(--lw-navy)" }}>No timeline entries yet</p>
                <p className="mt-1 text-xs text-muted-foreground">The first entry can be work, study, a break or a turning point.</p>
              </div>
              <Button disabled variant="outline" className="w-full">Add your first timeline entry — audit only</Button>
            </CardContent>
          </Card>
        </div>
      </AuditIntro>
    </>
  );
}

function SageAudit() {
  return (
    <>
      <AuditScreenHeader title="Sage — Exploring your Life History" eyebrow="Step 3 of 6 · first available conversation" next={{ label: "VIA", screen: "via" }} />
      <AuditIntro title="The first question, not a conclusion">
        <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-serif text-xl"><Sparkles className="h-5 w-5" style={{ color: "var(--lw-gold)" }} /> When Sage first opens</CardTitle>
              <p className="text-sm leading-relaxed text-muted-foreground">On the dashboard Sage is initially locked. Once a client has begun their life history, this is the first conversational state they encounter.</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="max-w-[88%] rounded-2xl rounded-tl-sm bg-muted px-4 py-3 text-sm leading-relaxed" style={{ color: "var(--lw-navy)" }}>
                What part of that moment felt most satisfying to you?
              </div>
              <div className="border-t pt-4" style={{ borderColor: "var(--border)" }}>
                <Textarea readOnly placeholder="The client can answer in their own words…" className="min-h-24" />
                <Button disabled className="mt-3 gap-2" style={{ background: "var(--lw-gold)", color: "var(--lw-navy)" }}>Send — audit only <ArrowRight className="h-3.5 w-3.5" /></Button>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="font-serif text-xl">Coaching standard</CardTitle></CardHeader>
            <CardContent className="space-y-4 text-sm leading-relaxed text-muted-foreground">
              <p>The opening must move directly to a spacious question. Sage does not announce an interpretation, diagnosis or insight before giving the client room to say what the experience meant to them.</p>
              <div className="rounded-lg p-4" style={{ background: "rgba(201,151,58,0.08)", border: "1px solid rgba(201,151,58,0.25)" }}>
                <p className="font-medium" style={{ color: "var(--lw-navy)" }}>Audit focus</p>
                <p className="mt-1">Listen for a pace that feels curious, unhurried and question-led — never like a lecture about the client.</p>
              </div>
              <p>The live conversation saves only in the actual client journey. This audit version never starts or persists a conversation.</p>
            </CardContent>
          </Card>
        </div>
      </AuditIntro>
    </>
  );
}

function AssessmentAudit({ type }: { type: "via" | "ipip" }) {
  const isVia = type === "via";
  const [, navigate] = useLocation();
  const title = isVia ? "VIA Character Strengths" : "Personality Profile";
  const eyebrow = isVia ? "Step 4 of 6 · first question" : "Step 4 of 6 · first question";
  const question = isVia
    ? "I feel energised when I learn something that changes how I see a problem."
    : "I enjoy exploring questions for which there is no immediate answer.";

  return (
    <>
      <AuditScreenHeader title={title} eyebrow={eyebrow} next={{ label: isVia ? "Personality profile" : "Alistair", screen: isVia ? "ipip" : "alistair" }} />
      <AuditIntro title={isVia ? "A further lens on what matters" : "A picture of working preferences"}>
        <StageVideoEmbed video={isVia ? STAGE_VIDEOS.via : STAGE_VIDEOS.ipip} />
        <Card className="mx-auto max-w-3xl">
          <CardHeader>
            <CardTitle className="font-serif text-xl">First available question</CardTitle>
            <p className="text-sm leading-relaxed text-muted-foreground">In the real journey, these surveys unlock only after the Sage stage. This audit view shows the clean first question a client sees once access is granted, before any answer has been selected.</p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="rounded-lg border p-5" style={{ borderColor: "rgba(201,151,58,0.35)" }}>
              <p className="mb-5 text-sm font-medium leading-relaxed" style={{ color: "var(--lw-navy)" }}><span style={{ color: "var(--lw-gold)" }}>1.</span> {question}</p>
              <div className="grid grid-cols-5 gap-2 text-center text-[11px] text-muted-foreground sm:gap-3">
                {["Strongly disagree", "Disagree", "Neither", "Agree", "Strongly agree"].map((label, ratingIndex) => (
                  <button key={label} type="button" className="rounded-md border border-border bg-background px-1 py-2" aria-label={label}>
                    <span className="block text-base font-semibold">{ratingIndex + 1}</span>
                    <span className="hidden pt-1 sm:block">{label}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="flex justify-between gap-3">
              <Button variant="outline" onClick={() => navigate(auditPath("dashboard"))}>Back to dashboard</Button>
              <Button disabled style={{ background: "var(--lw-gold)", color: "var(--lw-navy)" }}>Next question — audit only</Button>
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
      <AuditScreenHeader title="Explore with Alistair" eyebrow="Step 6 of 6 · first visit" />
      <AuditIntro title="Visible only at the right point">
        <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 font-serif text-xl"><Compass className="h-5 w-5" style={{ color: "var(--lw-gold)" }} /> The initial client state</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border p-6 text-center" style={{ borderColor: "rgba(201,151,58,0.28)", background: "rgba(201,151,58,0.05)" }}>
                <LockKeyhole className="mx-auto h-8 w-8" style={{ color: "var(--lw-gold)" }} />
                <h2 className="mt-4 font-serif text-xl" style={{ color: "var(--lw-navy)" }}>Awaiting your counsellor</h2>
                <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">Your counsellor will unlock this conversation once your Lifework report and coaching conversation are complete.</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="font-serif text-xl">Why the first encounter is locked</CardTitle></CardHeader>
            <CardContent className="space-y-4 text-sm leading-relaxed text-muted-foreground">
              <p>At first visit, Alistair is deliberately unavailable. He should not begin a conversation before there is a report and a completed coaching conversation to build on.</p>
              <div className="rounded-lg p-4" style={{ background: "rgba(201,151,58,0.08)", border: "1px solid rgba(201,151,58,0.25)" }}>
                <p className="font-medium" style={{ color: "var(--lw-navy)" }}>Audit focus</p>
                <p className="mt-1">Check that the boundary is clear, humane and does not imply that a client has done anything wrong.</p>
              </div>
              <p>This page remains fictional and never loads a real client report or conversation.</p>
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
            <video src={HOMEPAGE_FILM} controls playsInline preload="metadata" title="Lifework homepage film — counsellor audit" className="block aspect-video w-full bg-[var(--lw-navy)]" />
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
      {screen === "sage" && <SageAudit />}
      {screen === "via" && <AssessmentAudit type="via" />}
      {screen === "ipip" && <AssessmentAudit type="ipip" />}
      {screen === "alistair" && <AlistairAudit />}
      {screen === "video" && <VideoAudit />}
    </div>
  );
}
