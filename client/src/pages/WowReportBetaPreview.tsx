import { useParams, useLocation } from "wouter";
import { ArrowLeft, BookOpenCheck, FileWarning, Loader2, ShieldCheck } from "lucide-react";
import { Streamdown } from "streamdown";
import { Button } from "@/components/ui/button";
import { getPresentBeta1Sections, type WowReportBeta1SourceSections } from "@shared/wowReportBeta1";
import { trpc } from "@/lib/trpc";

function formatDate(date: Date | string | null | undefined) {
  if (!date) return "the current production report";
  return new Date(date).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

const DEMO_SOURCE_SECTIONS: WowReportBeta1SourceSections = {
  clientName: "A fictional Lifework client",
  clientFullName: "A fictional Lifework client",
  generatedAt: "25 October 2026",
  reportType: "standard",
  summary: `You are at your best when a difficult problem needs patient attention, clear thinking and a human response. Across different settings, you have repeatedly made progress by listening closely, finding the pattern and giving other people confidence in the next step.

From what you have told us, we can see:
- You turn uncertainty into a practical way forward.
- You are most energised when expertise has a clear human purpose.
- You work best where careful thought can become useful action.`,
  lifeHistoryPattern: `## The recurring pattern

The evidence in this fictional preview is deliberately generic. In a real Beta 1 snapshot, the source report's own life-history analysis appears here exactly as written.

## What the pattern reveals

The reader first sees the thread across the story, before moving into the lenses and possible next steps.`,
  fourPillars: `## PLACES — Where Energy Was High

Learning: You do your best work where thoughtful people are trusted to solve meaningful problems.

## PEOPLE — Who Was Present, and in What Role

Learning: You are most alive when helping capable people make sense of a difficult choice.

## PROBLEMS — The Nature of the Challenge

Learning: The work matters to you when there is something real to improve, clarify or repair.

## PROCEDURES — How the Work Was Done

Learning: You combine careful preparation with the willingness to act once the pattern is clear.`,
  viaSection: `## The Key Findings

In a real review copy, this section retains the original VIA evidence and commentary. Beta 1 only places it after the reader has understood the life-history pattern it is intended to illuminate.`,
  personalitySection: `## What the Psychometrics Show

The psychometric lens belongs alongside the life story, not above it. This fictional text simply demonstrates the visual hierarchy of the reader-first edition.`,
  behaviouralStyle: `## At Your Best

The original behavioural-style analysis is retained, but is given a clear source label so the reader can distinguish the lens from the life-history evidence.`,
  developmentEdge: `## What to notice

This is where the original report identifies patterns that may narrow choice. In Beta 1, it follows the possible directions so the client can consider both aspiration and constraint together.`,
  careerDirections: `## A direction worth testing

The original report's own possible directions would appear here. They remain options to explore, not instructions to obey.`,
  coachingQuestions: `## The next conversation

The closing synthesis is presented last: a bridge from recognition into a purposeful conversation about what to retain, test and change.`,
};

const DEMO_BETA_DATA = {
  id: "00000000-0000-4000-8000-000000000001",
  clientId: 0,
  betaVersion: "beta-1",
  sourceReportGeneratedAt: new Date("2026-10-25T00:00:00.000Z"),
  createdAt: new Date("2026-10-25T00:00:00.000Z"),
  sourceSections: DEMO_SOURCE_SECTIONS,
};

export default function WowReportBetaPreview({ demo = false }: { demo?: boolean }) {
  const [, navigate] = useLocation();
  const { id, betaId } = useParams<{ id: string; betaId: string }>();
  const clientId = Number(id);
  const query = trpc.wowReportBeta.get.useQuery(
    { betaId: betaId ?? "", clientId },
    { enabled: !demo && Boolean(betaId) && Number.isInteger(clientId) && clientId > 0 }
  );
  const data = demo ? DEMO_BETA_DATA : query.data;
  const isLoading = !demo && query.isLoading;
  const error = !demo && query.error;
  const backPath = demo ? "/preview" : `/counselor/client/${clientId}`;

  if (isLoading) {
    return (
      <main className="min-h-screen bg-[#f5f0e8] flex items-center justify-center px-6 text-[#1A2744]">
        <div className="text-center">
          <Loader2 className="mx-auto h-9 w-9 animate-spin text-[#B8862F]" />
          <p className="mt-4 font-sans text-sm tracking-wide">Opening the frozen Beta 1 review copy…</p>
        </div>
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="min-h-screen bg-[#f5f0e8] px-6 py-20 text-[#1A2744]">
        <div className="mx-auto max-w-xl border border-[#B8862F]/30 bg-white/60 p-8 text-center shadow-sm">
          <FileWarning className="mx-auto h-9 w-9 text-[#B8862F]" />
          <h1 className="mt-5 font-serif text-3xl">Beta review copy unavailable</h1>
          <p className="mt-3 font-sans text-sm leading-6 text-[#1A2744]/70">
            This private review page is available only to the master counsellor account and requires a valid frozen Beta 1 snapshot.
          </p>
          <Button className="mt-6 bg-[#1A2744] text-white hover:bg-[#28395d]" onClick={() => navigate(backPath)}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Return to client profile
          </Button>
        </div>
      </main>
    );
  }

  const movements = getPresentBeta1Sections(data.sourceSections);
  const clientName = data.sourceSections.clientFullName || data.sourceSections.clientName || "Client";

  return (
    <main className="min-h-screen bg-[#f5f0e8] text-[#1A2744]">
      <div className="border-b border-[#1A2744]/10 bg-[#1A2744] text-white">
        <div className="mx-auto flex max-w-[1480px] items-center justify-between gap-4 px-5 py-3 sm:px-8">
          <button
            type="button"
            onClick={() => navigate(backPath)}
            className="inline-flex items-center gap-2 font-sans text-xs font-semibold tracking-[0.11em] uppercase text-white/75 transition hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" /> {demo ? "Preview index" : "Client profile"}
          </button>
          <div className="inline-flex items-center gap-2 rounded-full border border-[#d9bb79]/50 bg-[#B8862F]/20 px-3 py-1 font-sans text-[10px] font-bold tracking-[0.14em] uppercase text-[#f7e8c2]">
            <FlaskBadge /> Beta 1 · {demo ? "fictional layout preview" : "internal review only"}
          </div>
        </div>
      </div>

      <header className="border-b border-[#1A2744]/10 px-5 py-10 sm:px-8 lg:py-14">
        <div className="mx-auto max-w-[1320px]">
          <p className="font-sans text-[11px] font-bold tracking-[0.18em] uppercase text-[#B8862F]">Lifework · Reader-first edition</p>
          <div className="mt-5 grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-end">
            <div>
              <h1 className="max-w-4xl font-serif text-4xl leading-[1.05] sm:text-5xl lg:text-6xl">
                A clearer way into <em className="font-normal text-[#B8862F]">what is already true.</em>
              </h1>
              <p className="mt-5 max-w-3xl font-serif text-xl leading-8 text-[#1A2744]/80 sm:text-2xl">
                Beta 1 reorganises the existing WOW Report around recognition, usable conditions and purposeful choices. It changes the reading experience — not the analysis.
              </p>
            </div>
            <div className="border-l-2 border-[#B8862F] bg-white/50 px-5 py-4 font-sans text-sm leading-6 text-[#1A2744]/75">
              <p className="font-semibold text-[#1A2744]">Frozen source</p>
              <p className="mt-1">{demo ? "Fictional sample for layout review only." : `Original report generated ${formatDate(data.sourceReportGeneratedAt)}.`}</p>
              <p className="mt-2">This copy is not client-facing and cannot overwrite the production report.</p>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1320px] gap-10 px-5 py-10 sm:px-8 lg:grid-cols-[230px_minmax(0,1fr)] lg:py-14">
        <aside className="lg:sticky lg:top-6 lg:h-fit">
          <div className="border-y border-[#1A2744]/15 py-5">
            <p className="font-sans text-[10px] font-bold tracking-[0.15em] uppercase text-[#B8862F]">How to review Beta 1</p>
            <ol className="mt-4 space-y-4">
              <li className="font-sans text-sm leading-5 text-[#1A2744]/75"><span className="mr-2 font-bold text-[#1A2744]">1.</span> Does the opening make the central recognition land earlier?</li>
              <li className="font-sans text-sm leading-5 text-[#1A2744]/75"><span className="mr-2 font-bold text-[#1A2744]">2.</span> Does the flow make it easier to turn evidence into useful choices?</li>
              <li className="font-sans text-sm leading-5 text-[#1A2744]/75"><span className="mr-2 font-bold text-[#1A2744]">3.</span> Are the original conclusions preserved and clearly distinguished from the evidence?</li>
            </ol>
          </div>
          <div className="mt-6 flex items-start gap-3 rounded-sm bg-[#1A2744] px-4 py-4 text-white">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#d9bb79]" />
            <p className="font-sans text-xs leading-5 text-white/75">Only the approved counsellor account can open this snapshot. It is stored separately from the live report.</p>
          </div>
        </aside>

        <article className="min-w-0">
          <div className="mb-10 border border-[#B8862F]/25 bg-white/70 p-6 sm:p-8">
            <p className="font-sans text-[10px] font-bold tracking-[0.15em] uppercase text-[#B8862F]">Prepared for review</p>
            <h2 className="mt-3 font-serif text-3xl sm:text-4xl">{clientName}&rsquo;s WOW Report</h2>
            <p className="mt-4 max-w-2xl font-sans text-sm leading-6 text-[#1A2744]/75">
              This is a deliberately different sequence for the same report: begin with the central pattern, understand the conditions that support it, then use that recognition to explore what comes next.
            </p>
          </div>

          <div className="space-y-14">
            {movements.map((movement) => (
              <section key={movement.number} className="scroll-mt-8">
                <div className="grid gap-4 border-t-2 border-[#1A2744] pt-5 sm:grid-cols-[80px_minmax(0,1fr)]">
                  <p className="font-serif text-4xl leading-none text-[#B8862F]">{movement.number}</p>
                  <div>
                    <p className="font-sans text-[10px] font-bold tracking-[0.16em] uppercase text-[#B8862F]">{movement.eyebrow}</p>
                    <h2 className="mt-2 font-serif text-3xl leading-tight sm:text-4xl">{movement.title}</h2>
                    <p className="mt-3 max-w-3xl font-sans text-sm leading-6 text-[#1A2744]/70">{movement.purpose}</p>
                  </div>
                </div>

                <div className="mt-7 space-y-7 sm:pl-20">
                  {movement.sections.map((section) => (
                    <div key={section.key} className="border-l border-[#B8862F]/55 pl-5 sm:pl-7">
                      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                        <p className="font-sans text-[10px] font-bold tracking-[0.14em] uppercase text-[#B8862F]">{section.source}</p>
                        <span className="h-px w-6 bg-[#1A2744]/20" />
                        <h3 className="font-serif text-2xl leading-tight">{section.title}</h3>
                      </div>
                      <p className="mt-2 max-w-3xl font-sans text-sm leading-6 text-[#1A2744]/65">{section.supportingText}</p>
                      <div className="beta-report-prose mt-6 max-w-none font-serif text-[1.07rem] leading-8 text-[#1A2744] sm:text-[1.12rem]">
                        <Streamdown>{data.sourceSections[section.key]}</Streamdown>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>

          <footer className="mt-16 border-t border-[#1A2744]/15 py-9">
            <div className="flex items-start gap-3">
              <BookOpenCheck className="mt-1 h-5 w-5 shrink-0 text-[#B8862F]" />
              <p className="max-w-3xl font-serif text-lg leading-7 text-[#1A2744]/80">
                Beta 1 is a review of how the report is encountered. The source analysis remains intact; no content from this page is sent to a client or used to replace the production report.
              </p>
            </div>
          </footer>
        </article>
      </div>
    </main>
  );
}

/** A public, entirely fictional page for reviewing Beta 1's visual direction. */
export function WowReportBetaPreviewDemo() {
  return <WowReportBetaPreview demo />;
}

function FlaskBadge() {
  return <span aria-hidden="true" className="inline-block h-1.5 w-1.5 rounded-full bg-[#d9bb79]" />;
}
