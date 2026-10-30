import { useLocation, useParams } from "wouter";
import { ArrowLeft, Download, FileWarning, FlaskConical, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import {
  createDefaultReportDesignLayoutPlan,
  DESIGN_BETA_SECTION_LABELS,
  type ReportDesignBetaSnapshot,
  type ReportDesignSectionKey,
} from "@shared/wowReportDesignBeta";
import type { WowReportBeta1SourceSections } from "@shared/wowReportBeta1";

const DEMO_SOURCE_SECTIONS: WowReportBeta1SourceSections = {
  clientName: "A fictional Lifework client",
  clientFullName: "A fictional Lifework client",
  generatedAt: "30 October 2026",
  reportType: "standard",
  summary: "You are at your best when a difficult problem needs patient attention, clear thinking and a human response. Across different settings, you have repeatedly made progress by listening closely, finding the pattern and giving other people confidence in the next step.",
  lifeHistoryPattern: "## The recurring pattern\n\nThe fictional source in this preview demonstrates how longer report prose can continue naturally over a page boundary. It remains ordinary, readable text rather than being forced into a fixed-height panel.\n\n## What the evidence suggests\n\nThe reader reaches the recurring pattern before meeting the supporting lenses and possible next steps.",
  fourPillars: "## Places\n\nYou do your best work where thoughtful people are trusted to solve meaningful problems.\n\n## People\n\nYou are most alive when helping capable people make sense of a difficult choice.",
  viaSection: "## The key findings\n\nThis fictional section shows the character-strengths material as one lens alongside the life-history evidence.",
  personalitySection: "## What the psychometrics show\n\nThe psychometric lens belongs alongside the life story, not above it.",
  behaviouralStyle: "## At your best\n\nThe behavioural-style analysis remains separate from the source evidence and is clearly labelled as a lens.",
  careerDirections: "## A direction worth testing\n\nThe original report's possible directions would appear here as options to explore rather than instructions to obey.",
  developmentEdge: "## What to notice\n\nThis section helps the reader consider the patterns that may narrow choice without turning them into a verdict.",
  coachingQuestions: "## The next conversation\n\nThe final questions bring the evidence forward into a purposeful coaching conversation about what to retain, test and change.",
};

const DEMO_SNAPSHOT: ReportDesignBetaSnapshot = {
  sourceSections: DEMO_SOURCE_SECTIONS,
  layoutPlan: createDefaultReportDesignLayoutPlan(DEMO_SOURCE_SECTIONS),
};

function formatDate(date: Date | string | null | undefined) {
  if (!date) return "the source report";
  return new Date(date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

function renderInline(text: string) {
  return text.replace(/[\*_`]/g, "");
}

function ReportProse({ source }: { source: string }) {
  const blocks: Array<{ type: "heading" | "paragraph" | "list"; content: string | string[] }> = [];
  let paragraph: string[] = [];
  let list: string[] = [];
  const flushParagraph = () => {
    if (paragraph.length) blocks.push({ type: "paragraph", content: paragraph.join(" ") });
    paragraph = [];
  };
  const flushList = () => {
    if (list.length) blocks.push({ type: "list", content: list });
    list = [];
  };

  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) {
      flushParagraph();
      flushList();
      continue;
    }
    const heading = line.match(/^#{1,3}\s+(.+)$/);
    if (heading) {
      flushParagraph();
      flushList();
      blocks.push({ type: "heading", content: heading[1] });
      continue;
    }
    const bullet = line.match(/^[-•]\s+(.+)$/);
    if (bullet) {
      flushParagraph();
      list.push(bullet[1]);
      continue;
    }
    flushList();
    paragraph.push(line);
  }
  flushParagraph();
  flushList();

  return (
    <div className="space-y-4 font-serif text-[1.05rem] leading-8 text-[#26354e] sm:text-[1.1rem]">
      {blocks.map((block, index) => {
        if (block.type === "heading") {
          return <h3 key={index} className="pt-2 font-sans text-xs font-bold uppercase tracking-[0.13em] text-[#1A2744]">{renderInline(block.content as string)}</h3>;
        }
        if (block.type === "list") {
          return <ul key={index} className="ml-5 list-disc space-y-2">{(block.content as string[]).map((item, itemIndex) => <li key={itemIndex}>{renderInline(item)}</li>)}</ul>;
        }
        return <p key={index}>{renderInline(block.content as string)}</p>;
      })}
    </div>
  );
}

export default function ReportDesignBetaPreview({ demo = false }: { demo?: boolean }) {
  const [, navigate] = useLocation();
  const { id, betaId } = useParams<{ id: string; betaId: string }>();
  const clientId = Number(id);
  const query = trpc.reportDesignBeta.get.useQuery(
    { clientId, betaId: betaId ?? "" },
    { enabled: !demo && Boolean(betaId) && Number.isInteger(clientId) && clientId > 0 },
  );
  const data = demo
    ? {
      id: "00000000-0000-4000-8000-000000000002",
      sourceReportGeneratedAt: new Date("2026-10-30T00:00:00.000Z"),
      sourceSections: DEMO_SNAPSHOT.sourceSections,
      layoutPlan: DEMO_SNAPSHOT.layoutPlan,
      planner: "claude-sonnet-4-6",
    }
    : query.data;
  const backPath = demo ? "/preview" : `/counselor/client/${clientId}`;

  if (!demo && query.isLoading) {
    return <main className="flex min-h-screen items-center justify-center bg-[#f5f0e8] text-[#1A2744]"><div className="text-center"><Loader2 className="mx-auto h-9 w-9 animate-spin text-[#B8862F]" /><p className="mt-4 font-sans text-sm">Opening the report design beta…</p></div></main>;
  }

  if (!data) {
    return <main className="min-h-screen bg-[#f5f0e8] px-6 py-20 text-[#1A2744]"><div className="mx-auto max-w-xl border border-[#B8862F]/30 bg-white/70 p-8 text-center"><FileWarning className="mx-auto h-9 w-9 text-[#B8862F]" /><h1 className="mt-5 font-serif text-3xl">Design beta unavailable</h1><p className="mt-3 font-sans text-sm leading-6 text-[#1A2744]/70">This private review copy is available only to the master counsellor account and requires a valid frozen design beta.</p><Button className="mt-6 bg-[#1A2744] text-white hover:bg-[#28395d]" onClick={() => navigate(backPath)}><ArrowLeft className="mr-2 h-4 w-4" /> Return to client profile</Button></div></main>;
  }

  const clientName = data.sourceSections.clientFullName || data.sourceSections.clientName || "Client";
  const orderedSections = data.layoutPlan.sourceOrder.map((key) => ({
    key,
    plan: data.layoutPlan.sections.find((section) => section.key === key),
    text: data.sourceSections[key],
  })).filter((section): section is { key: ReportDesignSectionKey; plan: NonNullable<typeof section.plan>; text: string } => Boolean(section.plan && section.text?.trim()));

  return (
    <main className="min-h-screen bg-[#f5f0e8] text-[#1A2744]">
      <div className="border-b border-[#1A2744]/10 bg-[#1A2744] text-white">
        <div className="mx-auto flex max-w-[1480px] items-center justify-between gap-4 px-5 py-3 sm:px-8">
          <button type="button" onClick={() => navigate(backPath)} className="inline-flex items-center gap-2 font-sans text-xs font-semibold uppercase tracking-[0.11em] text-white/75 transition hover:text-white"><ArrowLeft className="h-4 w-4" /> {demo ? "Preview index" : "Client profile"}</button>
          <div className="inline-flex items-center gap-2 rounded-full border border-[#d9bb79]/50 bg-[#B8862F]/20 px-3 py-1 font-sans text-[10px] font-bold uppercase tracking-[0.14em] text-[#f7e8c2]"><FlaskConical className="h-3.5 w-3.5" /> Design Beta 1 · {demo ? "fictional layout review" : "internal only"}</div>
        </div>
      </div>

      <header className="border-b border-[#1A2744]/10 px-5 py-10 sm:px-8 lg:py-14">
        <div className="mx-auto grid max-w-[1320px] gap-8 lg:grid-cols-[minmax(0,1fr)_310px] lg:items-end">
          <div>
            <p className="font-sans text-[11px] font-bold uppercase tracking-[0.18em] text-[#B8862F]">Lifework · Report Design Beta</p>
            <h1 className="mt-4 max-w-4xl font-serif text-4xl leading-[1.03] sm:text-5xl lg:text-6xl">Give the evidence <em className="font-normal text-[#B8862F]">room to breathe.</em></h1>
            <p className="mt-5 max-w-3xl font-serif text-xl leading-8 text-[#1A2744]/80 sm:text-2xl">A flowing, editorial report format that preserves the completed analysis while letting the pages find their natural length.</p>
          </div>
          <div className="border-l-2 border-[#B8862F] bg-white/60 px-5 py-4 font-sans text-sm leading-6 text-[#1A2744]/75">
            <p className="font-semibold text-[#1A2744]">Frozen source</p>
            <p className="mt-1">{demo ? "Fictional content only." : `Source report generated ${formatDate(data.sourceReportGeneratedAt)}.`}</p>
            <p className="mt-2">Layout planner: {data.planner === "claude-sonnet-4-6" ? "Claude-assisted metadata plan" : "standard review layout"}.</p>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1320px] gap-10 px-5 py-10 sm:px-8 lg:grid-cols-[230px_minmax(0,1fr)] lg:py-14">
        <aside className="lg:sticky lg:top-6 lg:h-fit">
          <div className="border-y border-[#1A2744]/15 py-5">
            <p className="font-sans text-[10px] font-bold uppercase tracking-[0.15em] text-[#B8862F]">Review focus</p>
            <ol className="mt-4 space-y-4 font-sans text-sm leading-5 text-[#1A2744]/75">
              <li><span className="mr-2 font-bold text-[#1A2744]">1.</span>Does the report feel calmer and easier to read?</li>
              <li><span className="mr-2 font-bold text-[#1A2744]">2.</span>Do long passages continue naturally rather than collide with a page boundary?</li>
              <li><span className="mr-2 font-bold text-[#1A2744]">3.</span>Does the same analysis land with more clarity and weight?</li>
            </ol>
          </div>
          {!demo && <Button className="mt-6 w-full bg-[#B8862F] text-[#1A2744] hover:bg-[#a97826]" onClick={() => window.open(`/api/report/design-beta/${clientId}/${data.id}`, "_blank", "noopener,noreferrer")}><Download className="mr-2 h-4 w-4" /> Open beta PDF</Button>}
          <div className="mt-6 flex items-start gap-3 bg-[#1A2744] px-4 py-4 text-white"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#d9bb79]" /><p className="font-sans text-xs leading-5 text-white/75">The report prose is frozen separately from production. This page cannot change a client report or its release status.</p></div>
        </aside>

        <article className="min-w-0">
          <div className="border border-[#B8862F]/30 bg-white/75 p-7 sm:p-9">
            <p className="font-sans text-[10px] font-bold uppercase tracking-[0.15em] text-[#B8862F]">Prepared for review</p>
            <h2 className="mt-3 font-serif text-3xl sm:text-4xl">{clientName}&rsquo;s Lifework Report</h2>
            <p className="mt-4 max-w-2xl font-sans text-sm leading-6 text-[#1A2744]/70">Design Beta 1 changes the pace and hierarchy of the reading experience. It does not add, remove or rewrite analysis.</p>
          </div>

          <div className="mt-10 space-y-12">
            {orderedSections.map(({ key, plan, text }, index) => {
              const labels = DESIGN_BETA_SECTION_LABELS[key];
              return <section key={key} className={`border-b border-[#1A2744]/15 pb-12 ${plan.emphasis === "featured" ? "border-l-2 border-l-[#B8862F] bg-white/50 px-6 py-7 sm:px-9" : ""}`}>
                <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 font-sans text-[10px] font-bold uppercase tracking-[0.16em] text-[#B8862F]"><span>{String(index + 1).padStart(2, "0")} · {labels.eyebrow}</span><span className="text-[#1A2744]/45">{labels.sourceLabel}</span></div>
                <h2 className="mt-3 max-w-3xl font-serif text-3xl leading-tight sm:text-4xl">{labels.title}</h2>
                <div className="my-5 h-px w-20 bg-[#B8862F]" />
                <ReportProse source={text} />
              </section>;
            })}
          </div>
          <footer className="mt-14 border-t border-[#1A2744]/15 py-9 font-serif text-lg leading-7 text-[#1A2744]/75">Design Beta 1 is an internal test of format and flow. The completed source report remains the only analysis of record.</footer>
        </article>
      </div>
    </main>
  );
}

export function ReportDesignBetaPreviewDemo() {
  return <ReportDesignBetaPreview demo />;
}
