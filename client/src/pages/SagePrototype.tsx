import { useState } from "react";
import { ArrowLeft, ArrowUp, Brain, Lightbulb, RotateCcw, Sparkles } from "lucide-react";
import { Link } from "wouter";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

type Turn = {
  role: "user" | "assistant";
  content: string;
};

const EXAMPLE_MEMORY = "When I was about eight, I spent a whole afternoon building a den at the bottom of the garden from branches, blankets and old cardboard boxes. I remember wanting it to be somewhere nobody else had thought of.";

export default function SagePrototype() {
  const [memory, setMemory] = useState("");
  const [followUp, setFollowUp] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);

  const reflect = trpc.sagePrototype.reflect.useMutation({
    onSuccess: ({ reply }) => {
      setTurns((current) => [...current, { role: "assistant", content: reply }]);
    },
    onError: (error) => toast.error(error.message),
  });

  const send = (text: string) => {
    const cleaned = text.trim();
    if (cleaned.length < 20) {
      toast.error("Please share a little more detail so Sage has something to explore.");
      return;
    }

    const nextTurns: Turn[] = [...turns, { role: "user", content: cleaned }];
    setTurns(nextTurns);
    setMemory("");
    setFollowUp("");
    reflect.mutate({ messages: nextTurns });
  };

  const reset = () => {
    setMemory("");
    setFollowUp("");
    setTurns([]);
  };

  const hasConversation = turns.length > 0;

  return (
    <main className="min-h-screen bg-[var(--lw-cream)] text-[var(--lw-ink)]">
      <section className="bg-[var(--lw-navy)] text-white">
        <div className="container py-8 sm:py-12">
          <Link href="/" className="inline-flex items-center gap-2 text-xs font-medium tracking-[0.14em] uppercase text-white/70 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--lw-gold)]">
            <ArrowLeft className="h-3.5 w-3.5" /> Lifework
          </Link>
          <div className="mt-8 max-w-3xl">
            <p className="lw-eyebrow text-[var(--lw-gold)]">Sage conversation prototype</p>
            <h1 className="mt-3 font-serif text-4xl leading-[0.95] text-white sm:text-6xl">A more curious way to revisit a memory.</h1>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-white/76 sm:text-lg">Share one childhood memory. Sage will respond as a reflective Lifework coach—looking beyond the activity itself towards what may have made it matter to you.</p>
          </div>
        </div>
      </section>

      <section className="container grid gap-8 py-8 lg:grid-cols-[0.74fr_1.26fr] lg:py-12">
        <aside className="rounded-sm border border-[var(--lw-gold)]/25 bg-[var(--lw-cream-warm)] p-6 lg:sticky lg:top-6 lg:self-start">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-[var(--lw-navy)] text-[var(--lw-gold)]"><Brain className="h-5 w-5" /></span>
            <div>
              <p className="font-serif text-xl text-[var(--lw-navy)]">What this is</p>
              <p className="text-xs tracking-[0.12em] uppercase text-[var(--lw-ink-muted)]">A design preview</p>
            </div>
          </div>
          <p className="mt-5 text-sm leading-relaxed text-[var(--lw-ink-muted)]">This is a small, shareable demonstration of a new Sage conversation style. It is not a formal assessment and it does not save what you enter.</p>
          <div className="mt-5 border-l-2 border-[var(--lw-gold)] pl-4 text-sm leading-relaxed text-[var(--lw-ink-muted)]">
            Think of a moment from childhood when you felt absorbed, proud, useful, excited, quietly content—or simply very much yourself.
          </div>
          <div className="mt-6 rounded-sm bg-white/70 p-4 text-xs leading-relaxed text-[var(--lw-ink-muted)]">
            <span className="font-semibold text-[var(--lw-navy)]">A small boundary:</span> please avoid names, confidential details or anything you would not wish to share in a prototype. Sage is not a therapist or a source of career advice.
          </div>
        </aside>

        <div className="rounded-sm border border-[var(--lw-navy)]/12 bg-white shadow-[0_16px_45px_rgba(26,39,68,0.08)]">
          <div className="flex items-center justify-between border-b border-[var(--lw-navy)]/10 px-5 py-4 sm:px-7">
            <div className="flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-[var(--lw-gold-soft)] text-[var(--lw-navy)]"><Sparkles className="h-4 w-4" /></span>
              <div>
                <p className="font-serif text-xl text-[var(--lw-navy)]">Sage</p>
                <p className="text-xs text-[var(--lw-ink-muted)]">Reflective coaching companion</p>
              </div>
            </div>
            {hasConversation && (
              <button onClick={reset} className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--lw-navy)] underline decoration-[var(--lw-gold)] underline-offset-4 hover:text-[var(--lw-gold)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--lw-gold)]">
                <RotateCcw className="h-3.5 w-3.5" /> Start again
              </button>
            )}
          </div>

          <div className="min-h-[475px] p-5 sm:p-7">
            {!hasConversation ? (
              <div className="mx-auto max-w-2xl py-4 sm:py-10">
                <span className="grid h-12 w-12 place-items-center rounded-full bg-[var(--lw-navy-soft)] text-[var(--lw-gold)]"><Lightbulb className="h-5 w-5" /></span>
                <h2 className="mt-5 font-serif text-3xl text-[var(--lw-navy)]">Begin with one real memory.</h2>
                <p className="mt-3 text-sm leading-relaxed text-[var(--lw-ink-muted)]">There is no need to make it impressive. A small moment often reveals more than a headline achievement.</p>
                <label htmlFor="sage-memory" className="mt-7 block text-sm font-semibold text-[var(--lw-navy)]">What happened, and what do you remember about it?</label>
                <textarea id="sage-memory" value={memory} onChange={(event) => setMemory(event.target.value)} placeholder="For example: I was nine and…" className="mt-2 min-h-44 w-full resize-y rounded-sm border border-[var(--lw-navy)]/18 bg-[var(--lw-cream)] px-4 py-3 text-base leading-relaxed text-[var(--lw-ink)] outline-none transition focus:border-[var(--lw-gold)] focus:ring-2 focus:ring-[var(--lw-gold)]/25" maxLength={1500} disabled={reflect.isPending} />
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                  <button onClick={() => setMemory(EXAMPLE_MEMORY)} className="text-xs font-medium text-[var(--lw-navy)] underline decoration-[var(--lw-gold)] underline-offset-4 hover:text-[var(--lw-gold)]">Try a sample memory</button>
                  <button onClick={() => send(memory)} disabled={reflect.isPending || memory.trim().length < 20} className="inline-flex items-center gap-2 bg-[var(--lw-gold)] px-5 py-3 text-sm font-semibold text-[var(--lw-navy)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--lw-navy)] focus-visible:ring-offset-2">
                    {reflect.isPending ? "Sage is thinking…" : "Ask Sage"} <ArrowUp className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="mx-auto flex max-w-2xl flex-col gap-5">
                {turns.map((turn, index) => (
                  <article key={`${turn.role}-${index}`} className={turn.role === "assistant" ? "self-start max-w-[94%]" : "self-end max-w-[88%]"}>
                    <p className={`mb-1.5 text-xs font-medium tracking-[0.12em] uppercase ${turn.role === "assistant" ? "text-[var(--lw-gold)]" : "text-[var(--lw-ink-muted)]"}`}>{turn.role === "assistant" ? "Sage" : "You"}</p>
                    <div className={turn.role === "assistant" ? "rounded-sm border-l-2 border-[var(--lw-gold)] bg-[var(--lw-cream-warm)] px-5 py-4 text-[15px] leading-relaxed text-[var(--lw-ink)]" : "rounded-sm bg-[var(--lw-navy)] px-5 py-4 text-[15px] leading-relaxed text-white"}>{turn.content}</div>
                  </article>
                ))}
                {reflect.isPending && <div className="self-start rounded-sm border-l-2 border-[var(--lw-gold)] bg-[var(--lw-cream-warm)] px-5 py-4 text-sm italic text-[var(--lw-ink-muted)]">Sage is considering what you have shared…</div>}
                {!reflect.isPending && (
                  <div className="mt-3 border-t border-[var(--lw-navy)]/10 pt-5">
                    <label htmlFor="sage-follow-up" className="sr-only">Continue the conversation</label>
                    <textarea id="sage-follow-up" value={followUp} onChange={(event) => setFollowUp(event.target.value)} placeholder="What feels most true—or what else do you remember?" className="min-h-24 w-full resize-y rounded-sm border border-[var(--lw-navy)]/18 bg-[var(--lw-cream)] px-4 py-3 text-sm leading-relaxed text-[var(--lw-ink)] outline-none transition focus:border-[var(--lw-gold)] focus:ring-2 focus:ring-[var(--lw-gold)]/25" maxLength={1500} />
                    <div className="mt-3 flex justify-end"><button onClick={() => send(followUp)} disabled={followUp.trim().length < 20} className="inline-flex items-center gap-2 bg-[var(--lw-navy)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--lw-navy-soft)] disabled:cursor-not-allowed disabled:opacity-45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--lw-gold)] focus-visible:ring-offset-2">Continue <ArrowUp className="h-4 w-4" /></button></div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
