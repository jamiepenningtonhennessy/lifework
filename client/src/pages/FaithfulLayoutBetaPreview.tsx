import { useLocation, useParams } from "wouter";
import { ArrowLeft, CheckCircle2, Download, FileWarning, FlaskConical, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { FAITHFUL_CLIENT_REPORT_SEQUENCE } from "@shared/faithfulLayoutBeta";

const DEMO_DETAILS = {
  id: "00000000-0000-4000-8000-000000000003",
  sourceReportGeneratedAt: new Date("2026-10-31T00:00:00.000Z"),
  source: {
    clientFullName: "A fictional Lifework client",
    generatedAt: "31 October 2026",
  },
  annexCounts: { achievements: 18, careers: 4 },
};

function formatDate(date: Date | string | null | undefined) {
  if (!date) return "the completed report";
  return new Date(date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

export default function FaithfulLayoutBetaPreview({ demo = false }: { demo?: boolean }) {
  const [, navigate] = useLocation();
  const { id, betaId } = useParams<{ id: string; betaId: string }>();
  const clientId = Number(id);
  const query = trpc.faithfulLayoutBeta.get.useQuery(
    { clientId, betaId: betaId ?? "" },
    { enabled: !demo && Boolean(betaId) && Number.isInteger(clientId) && clientId > 0 },
  );
  const data = demo ? DEMO_DETAILS : query.data;
  const backPath = demo ? "/preview" : `/counselor/client/${clientId}`;

  if (!demo && query.isLoading) {
    return <main className="flex min-h-screen items-center justify-center bg-[#f5f0e8] text-[#1A2744]"><div className="text-center"><Loader2 className="mx-auto h-9 w-9 animate-spin text-[#B8862F]" /><p className="mt-4 font-sans text-sm">Opening the faithful layout beta…</p></div></main>;
  }

  if (!data) {
    return <main className="min-h-screen bg-[#f5f0e8] px-6 py-20 text-[#1A2744]"><div className="mx-auto max-w-xl border border-[#B8862F]/30 bg-white/70 p-8 text-center"><FileWarning className="mx-auto h-9 w-9 text-[#B8862F]" /><h1 className="mt-5 font-serif text-3xl">Faithful layout beta unavailable</h1><p className="mt-3 font-sans text-sm leading-6 text-[#1A2744]/70">This private review copy is available only to the master counsellor account and requires a valid frozen beta.</p><Button className="mt-6 bg-[#1A2744] text-white hover:bg-[#28395d]" onClick={() => navigate(backPath)}><ArrowLeft className="mr-2 h-4 w-4" /> Return to client profile</Button></div></main>;
  }

  return (
    <main className="min-h-screen bg-[#f5f0e8] text-[#1A2744]">
      <div className="border-b border-[#1A2744]/10 bg-[#1A2744] text-white">
        <div className="mx-auto flex max-w-[1320px] items-center justify-between gap-4 px-5 py-3 sm:px-8">
          <button type="button" onClick={() => navigate(backPath)} className="inline-flex items-center gap-2 font-sans text-xs font-semibold uppercase tracking-[0.11em] text-white/75 transition hover:text-white"><ArrowLeft className="h-4 w-4" /> {demo ? "Preview index" : "Client profile"}</button>
          <div className="inline-flex items-center gap-2 rounded-full border border-[#d9bb79]/50 bg-[#B8862F]/20 px-3 py-1 font-sans text-[10px] font-bold uppercase tracking-[0.14em] text-[#f7e8c2]"><FlaskConical className="h-3.5 w-3.5" /> Faithful Layout Beta 1 · {demo ? "fictional layout review" : "internal only"}</div>
        </div>
      </div>

      <header className="border-b border-[#1A2744]/10 px-5 py-10 sm:px-8 lg:py-14">
        <div className="mx-auto grid max-w-[1320px] gap-8 lg:grid-cols-[minmax(0,1fr)_330px] lg:items-end">
          <div>
            <p className="font-sans text-[11px] font-bold uppercase tracking-[0.18em] text-[#B8862F]">Lifework · internal report layout review</p>
            <h1 className="mt-4 max-w-4xl font-serif text-4xl leading-[1.03] sm:text-5xl lg:text-6xl">The same report, <em className="font-normal text-[#B8862F]">given more room.</em></h1>
            <p className="mt-5 max-w-3xl font-serif text-xl leading-8 text-[#1A2744]/80 sm:text-2xl">A faithful layout-only version of the completed client report — its wording, sequence, chapter names, evidence displays and annex remain intact.</p>
          </div>
          <div className="border-l-2 border-[#B8862F] bg-white/60 px-5 py-4 font-sans text-sm leading-6 text-[#1A2744]/75">
            <p className="font-semibold text-[#1A2744]">Frozen source</p>
            <p className="mt-1">{demo ? "Fictional content only." : `Completed report generated ${formatDate(data.sourceReportGeneratedAt)}.`}</p>
            <p className="mt-2">No AI re-write, content edit or client-report update is possible from this beta.</p>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1320px] gap-10 px-5 py-10 sm:px-8 lg:grid-cols-[285px_minmax(0,1fr)] lg:py-14">
        <aside className="lg:sticky lg:top-6 lg:h-fit">
          {!demo && <Button className="w-full bg-[#B8862F] text-[#1A2744] hover:bg-[#a97826]" onClick={() => window.open(`/api/report/faithful-layout-beta/${clientId}/${data.id}`, "_blank", "noopener,noreferrer")}><Download className="mr-2 h-4 w-4" /> Open faithful beta PDF</Button>}
          <div className="mt-5 flex items-start gap-3 bg-[#1A2744] px-4 py-4 text-white"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#d9bb79]" /><p className="font-sans text-xs leading-5 text-white/75">The saved beta is append-only and private to the master counsellor account. The production report is not changed or replaced.</p></div>
          <div className="mt-7 border-y border-[#1A2744]/15 py-5">
            <p className="font-sans text-[10px] font-bold uppercase tracking-[0.15em] text-[#B8862F]">Review focus</p>
            <ol className="mt-4 space-y-4 font-sans text-sm leading-5 text-[#1A2744]/75">
              <li><span className="mr-2 font-bold text-[#1A2744]">1.</span>Does every familiar part of the report remain present and in the same order?</li>
              <li><span className="mr-2 font-bold text-[#1A2744]">2.</span>Do long chapters flow calmly onto the next page without being cramped or clipped?</li>
              <li><span className="mr-2 font-bold text-[#1A2744]">3.</span>Are the familiar strengths, personality and behavioural displays clearer to use?</li>
            </ol>
          </div>
        </aside>

        <article className="min-w-0">
          <div className="border border-[#B8862F]/30 bg-white/75 p-7 sm:p-9">
            <p className="font-sans text-[10px] font-bold uppercase tracking-[0.15em] text-[#B8862F]">Prepared for review</p>
            <h2 className="mt-3 font-serif text-3xl sm:text-4xl">{data.source.clientFullName}&rsquo;s Lifework Report</h2>
            <p className="mt-4 max-w-2xl font-sans text-sm leading-6 text-[#1A2744]/70">This beta reprints the current client-report design in its original order. It changes only page flow, typography, spacing and visual treatment.</p>
          </div>

          <section className="mt-10 border border-[#1A2744]/15 bg-white/50 p-6 sm:p-8">
            <p className="font-sans text-[10px] font-bold uppercase tracking-[0.15em] text-[#B8862F]">The retained document sequence</p>
            <ol className="mt-6 grid gap-x-7 gap-y-4 sm:grid-cols-2">
              {FAITHFUL_CLIENT_REPORT_SEQUENCE.map((item, index) => <li key={item} className="flex items-start gap-3 font-serif text-lg leading-6 text-[#1A2744]"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#B8862F]" /><span><span className="mr-2 font-sans text-xs font-bold tracking-wider text-[#1A2744]/40">{String(index + 1).padStart(2, "0")}</span>{item}</span></li>)}
            </ol>
          </section>

          <section className="mt-10 border-l-2 border-[#B8862F] bg-white/50 px-6 py-7 sm:px-9">
            <p className="font-sans text-[10px] font-bold uppercase tracking-[0.15em] text-[#B8862F]">Frozen supporting material</p>
            <p className="mt-3 font-serif text-xl leading-8 text-[#1A2744]/80">The saved copy includes the original life-history evidence, character-strengths and personality scores, behavioural display and data annex. {data.annexCounts.achievements} life-history {data.annexCounts.achievements === 1 ? "entry is" : "entries are"} held in its private snapshot{data.annexCounts.careers ? `, alongside ${data.annexCounts.careers} career-history ${data.annexCounts.careers === 1 ? "record" : "records"}` : ""}.</p>
          </section>

          <footer className="mt-14 border-t border-[#1A2744]/15 py-9 font-serif text-lg leading-7 text-[#1A2744]/75">Faithful Layout Beta 1 is an internal test of visual presentation. The completed client report remains the authoritative analysis.</footer>
        </article>
      </div>
    </main>
  );
}

export function FaithfulLayoutBetaPreviewDemo() {
  return <FaithfulLayoutBetaPreview demo />;
}
