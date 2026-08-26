import { useState } from "react";
import { ArrowLeft, ArrowUp, Brain, Lightbulb, RotateCcw, Sparkles } from "lucide-react";
import { Link } from "wouter";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

type Turn = {
  role: "user" | "assistant";
  content: string;
};

type ActivityTag = "enjoyable" | "satisfying" | "fulfilling";

const ACTIVITY_TAG_OPTIONS: Array<{ value: ActivityTag; label: string; description: string }> = [
  { value: "enjoyable", label: "Enjoyable", description: "It felt naturally engaging or energising" },
  { value: "satisfying", label: "Satisfying", description: "It brought pride in doing something well" },
  { value: "fulfilling", label: "Fulfilling", description: "It felt meaningful or worthwhile" },
];

const EXAMPLE_MEMORY = "When I was about eight, I spent a whole afternoon building a den at the bottom of the garden from branches, blankets and old cardboard boxes. I remember wanting it to be somewhere nobody else had thought of.";

export default function SagePrototype() {
  const [memory, setMemory] = useState("");
  const [followUp, setFollowUp] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [activityTags, setActivityTags] = useState<ActivityTag[]>([]);
  const [isComplete, setIsComplete] = useState(false);
  const [completedMemories, setCompletedMemories] = useState(0);
  const [isOnBreak, setIsOnBreak] = useState(false);

  const reflect = trpc.sagePrototype.reflect.useMutation({
    onSuccess: ({ reply, isComplete: activityComplete }) => {
      setTurns((current) => [...current, { role: "assistant", content: reply }]);
      setIsComplete(activityComplete);
      if (activityComplete) {
        setCompletedMemories((current) => current + 1);
      }
    },
    onError: (error) => toast.error(error.message),
  });

  const send = (text: string) => {
    const cleaned = text.trim();
    if (cleaned.length < 20) {
      toast.error("Please share a little more detail so Sage has something to explore.");
      return;
    }

    if (!turns.length && !activityTags.length) {
      toast.error("Please tick at least one word that fits this memory.");
      return;
    }

    const nextTurns: Turn[] = [...turns, { role: "user", content: cleaned }];
    setTurns(nextTurns);
    setMemory("");
    setFollowUp("");
    reflect.mutate({ messages: nextTurns, activityTags, activityNumber: completedMemories + 1 });
  };

  const toggleActivityTag = (tag: ActivityTag) => {
    setActivityTags((current) => current.includes(tag) ? current.filter((value) => value !== tag) : [...current, tag]);
  };

  const reset = () => {
    setMemory("");
    setFollowUp("");
    setTurns([]);
    setActivityTags([]);
    setIsComplete(false);
    setCompletedMemories(0);
    setIsOnBreak(false);
  };

  const beginNextMemory = () => {
    setMemory("");
    setFollowUp("");
    setTurns([]);
    setActivityTags([]);
    setIsComplete(false);
    setIsOnBreak(false);
  };

  const hasConversation = turns.length > 0;
  const currentActivityNumber = completedMemories + 1;

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
                <p className="text-xs text-[var(--lw-ink-muted)]">Reflective coaching companion · Memory {Math.min(currentActivityNumber, 20)} of 20</p>
              </div>
            </div>
            {hasConversation && (
              <button onClick={reset} className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--lw-navy)] underline decoration-[var(--lw-gold)] underline-offset-4 hover:text-[var(--lw-gold)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--lw-gold)]">
                <RotateCcw className="h-3.5 w-3.5" /> Start again
              </button>
            )}
          </div>

          <div className="min-h-[475px] p-5 sm:p-7">
            {isOnBreak ? (
              <div className="mx-auto max-w-2xl py-10 text-center">
                <span className="grid h-12 w-12 place-items-center rounded-full bg-[var(--lw-navy-soft)] text-[var(--lw-gold)] mx-auto"><Lightbulb className="h-5 w-5" /></span>
                <h2 className="mt-5 font-serif text-3xl text-[var(--lw-navy)]">A natural pause.</h2>
                <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-[var(--lw-ink-muted)]">You have explored {completedMemories} memories. This prototype does not save your entries, but you can begin another when you are ready.</p>
                <button onClick={beginNextMemory} className="mt-6 inline-flex items-center gap-2 bg-[var(--lw-navy)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--lw-navy-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--lw-gold)] focus-visible:ring-offset-2">Continue with another memory <ArrowUp className="h-4 w-4" /></button>
              </div>
            ) : !hasConversation ? (
              <div className="mx-auto max-w-2xl py-4 sm:py-10">
                <span className="grid h-12 w-12 place-items-center rounded-full bg-[var(--lw-navy-soft)] text-[var(--lw-gold)]"><Lightbulb className="h-5 w-5" /></span>
                <h2 className="mt-5 font-serif text-3xl text-[var(--lw-navy)]">Begin with one real memory.</h2>
                <p className="mt-3 text-sm leading-relaxed text-[var(--lw-ink-muted)]">There is no need to make it impressive. A small moment often reveals more than a headline achievement.</p>
                <label htmlFor="sage-memory" className="mt-7 block text-sm font-semibold text-[var(--lw-navy)]">What happened, and what do you remember about it?</label>
                <textarea id="sage-memory" value={memory} onChange={(event) => setMemory(event.target.value)} placeholder="For example: I was nine and…" className="mt-2 min-h-44 w-full resize-y rounded-sm border border-[var(--lw-navy)]/18 bg-[var(--lw-cream)] px-4 py-3 text-base leading-relaxed text-[var(--lw-ink)] outline-none transition focus:border-[var(--lw-gold)] focus:ring-2 focus:ring-[var(--lw-gold)]/25" maxLength={1500} disabled={reflect.isPending} />
                <fieldset className="mt-5">
                  <legend className="text-sm font-semibold text-[var(--lw-navy)]">Which words fit this memory?</legend>
                  <p className="mt-1 text-xs leading-relaxed text-[var(--lw-ink-muted)]">Tick one or more. There is no right answer—this simply gives Sage a starting point.</p>
                  <div className="mt-3 grid gap-2 sm:grid-cols-3">
                    {ACTIVITY_TAG_OPTIONS.map((tag) => (
                      <label key={tag.value} className={`cursor-pointer rounded-sm border p-3 transition ${activityTags.includes(tag.value) ? "border-[var(--lw-gold)] bg-[var(--lw-gold-soft)]" : "border-[var(--lw-navy)]/14 bg-white hover:border-[var(--lw-gold)]/60"}`}>
                        <span className="flex items-center gap-2 text-sm font-semibold text-[var(--lw-navy)]"><input type="checkbox" checked={activityTags.includes(tag.value)} onChange={() => toggleActivityTag(tag.value)} disabled={reflect.isPending} className="h-4 w-4 accent-[var(--lw-gold)]" />{tag.label}</span>
                        <span className="mt-1 block pl-6 text-[11px] leading-snug text-[var(--lw-ink-muted)]">{tag.description}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                  <button onClick={() => setMemory(EXAMPLE_MEMORY)} className="text-xs font-medium text-[var(--lw-navy)] underline decoration-[var(--lw-gold)] underline-offset-4 hover:text-[var(--lw-gold)]">Try a sample memory</button>
                  <button onClick={() => send(memory)} disabled={reflect.isPending || memory.trim().length < 20 || !activityTags.length} className="inline-flex items-center gap-2 bg-[var(--lw-gold)] px-5 py-3 text-sm font-semibold text-[var(--lw-navy)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--lw-navy)] focus-visible:ring-offset-2">
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
                {!reflect.isPending && !isComplete && (
                  <div className="mt-3 border-t border-[var(--lw-navy)]/10 pt-5">
                    <label htmlFor="sage-follow-up" className="sr-only">Continue the conversation</label>
                    <textarea id="sage-follow-up" value={followUp} onChange={(event) => setFollowUp(event.target.value)} placeholder="What feels most true—or what else do you remember?" className="min-h-24 w-full resize-y rounded-sm border border-[var(--lw-navy)]/18 bg-[var(--lw-cream)] px-4 py-3 text-sm leading-relaxed text-[var(--lw-ink)] outline-none transition focus:border-[var(--lw-gold)] focus:ring-2 focus:ring-[var(--lw-gold)]/25" maxLength={1500} />
                    <div className="mt-3 flex justify-end"><button onClick={() => send(followUp)} disabled={followUp.trim().length < 20} className="inline-flex items-center gap-2 bg-[var(--lw-navy)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--lw-navy-soft)] disabled:cursor-not-allowed disabled:opacity-45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--lw-gold)] focus-visible:ring-offset-2">Continue <ArrowUp className="h-4 w-4" /></button></div>
                  </div>
                )}
                {isComplete && (
                  <div className="mt-3 rounded-sm border border-[var(--lw-gold)]/35 bg-[var(--lw-gold-soft)] p-5 text-center">
                    <p className="font-serif text-2xl text-[var(--lw-navy)]">{completedMemories === 10 ? "Ten memories explored." : "This memory is complete."}</p>
                    <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-[var(--lw-ink-muted)]">{completedMemories === 10 ? "Sage has marked this natural point in the journey. You can take a breather or continue into another memory." : "Sage has brought this activity to a close and asked whether you would like to move on or pause."}</p>
                    <div className="mt-4 flex flex-wrap justify-center gap-3">
                      <button onClick={beginNextMemory} className="inline-flex items-center gap-2 bg-[var(--lw-navy)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--lw-navy-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--lw-gold)] focus-visible:ring-offset-2">Continue to another memory <ArrowUp className="h-4 w-4" /></button>
                      <button onClick={() => setIsOnBreak(true)} className="inline-flex items-center gap-2 border border-[var(--lw-navy)]/30 bg-white px-5 py-3 text-sm font-semibold text-[var(--lw-navy)] transition hover:border-[var(--lw-gold)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--lw-gold)] focus-visible:ring-offset-2"><RotateCcw className="h-4 w-4" /> Take a break</button>
                    </div>
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
