import { useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  Check,
  ChevronDown,
  Clock3,
  Mail,
  Quote,
  Sparkles,
  UserRound,
  Video,
} from "lucide-react";
import {
  WEBINAR_AGENDA,
  WEBINAR_BOOKING_URL,
  WEBINAR_SESSIONS,
} from "@shared/lifeworkWebinar";
import { isStandaloneLifeworkDomain, lifeworkLandingPath } from "@/lib/lifeworkDomain";
import { trpc } from "@/lib/trpc";
import { arrangeEditorialTestimonials } from "@shared/verifiedTestimonials";

const BRAND_LOGO_URL =
  "https://d2xsxph8kpxj0f.cloudfront.net/107696804/kFbbE6kqNApXGDFpQJUGV7/lifework-logo-onnavy_1f7a4c72.png";

function GoldButton({
  href,
  children,
  secondary = false,
}: {
  href: string;
  children: React.ReactNode;
  secondary?: boolean;
}) {
  return (
    <a
      href={href}
      className="inline-flex items-center justify-center gap-2 px-6 py-3.5 text-xs font-bold uppercase tracking-[0.12em] transition-transform duration-150 active:scale-[0.97] hover:opacity-90"
      style={
        secondary
          ? { border: "1px solid rgba(255,255,255,0.52)", color: "white", textDecoration: "none" }
          : { background: "var(--lw-gold)", color: "var(--lw-navy)", textDecoration: "none" }
      }
    >
      {children}
      <ArrowRight className="h-4 w-4" aria-hidden="true" />
    </a>
  );
}

export default function LifeworkWebinar() {
  const [expandedAgenda, setExpandedAgenda] = useState<number | null>(0);
  const homeHref = lifeworkLandingPath();
  const isStandaloneDomain = isStandaloneLifeworkDomain();
  const { data: approvedTestimonials, isLoading: isLoadingTestimonials } = trpc.verifiedTestimonials.publicList.useQuery();
  const testimonialDisplay = arrangeEditorialTestimonials(approvedTestimonials ?? []);

  return (
    <main className="min-h-screen overflow-x-hidden" style={{ background: "var(--lw-cream)", color: "var(--lw-ink)" }}>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[70] focus:bg-white focus:px-4 focus:py-3 focus:text-sm"
      >
        Skip to content
      </a>

      <nav className="relative z-30" style={{ background: "var(--lw-navy)", borderBottom: "1px solid rgba(201,151,58,0.28)" }}>
        <div className="container flex h-18 items-center justify-between gap-6 py-4">
          <a href={homeHref} className="flex items-center" aria-label="Lifework home">
            <img src={BRAND_LOGO_URL} alt="Lifework" className="h-8 w-auto object-contain" />
          </a>
          <a
            href="#reserve"
            className="hidden text-xs font-semibold uppercase tracking-[0.12em] sm:inline-flex"
            style={{ color: "var(--lw-gold)", textDecoration: "none" }}
          >
            View the September sessions
          </a>
        </div>
      </nav>

      <section className="relative overflow-hidden" style={{ background: "var(--lw-navy)" }}>
        <div
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "radial-gradient(circle at 87% 22%, rgba(201,151,58,0.32) 0, transparent 22%), radial-gradient(circle at 70% 90%, rgba(42,58,94,0.9) 0, transparent 32%)",
          }}
        />
        <div className="container relative grid min-h-[610px] items-end gap-10 py-20 lg:grid-cols-[1.2fr_0.8fr] lg:py-28">
          <div className="max-w-3xl">
            <p className="lw-eyebrow mb-6" style={{ color: "var(--lw-gold)" }}>
              Live online webinars · 16th & 24th September 2026
            </p>
            <h1 className="font-serif text-5xl font-semibold leading-[0.98] text-white sm:text-6xl lg:text-7xl">
              Are you <em style={{ color: "var(--lw-gold)" }}>wasting your life?</em>
            </h1>
            <p className="mt-8 max-w-2xl text-lg leading-relaxed" style={{ color: "rgba(255,255,255,0.76)" }}>
              Join an intimate live conversation about career clarity, dependable strengths and personal understanding—without reducing yourself to a job title or a list of preferences.
            </p>
            <div className="mt-10 flex flex-col gap-4 sm:flex-row">
              <GoldButton href="#reserve">See the sessions</GoldButton>
              <GoldButton href="#what-you-will-leave-with" secondary>
                What you will learn
              </GoldButton>
            </div>
            <div className="mt-12 flex flex-wrap gap-x-8 gap-y-3 text-sm" style={{ color: "rgba(255,255,255,0.68)" }}>
              <span className="inline-flex items-center gap-2"><Clock3 className="h-4 w-4" style={{ color: "var(--lw-gold)" }} /> 45 minutes live</span>
              <span className="inline-flex items-center gap-2"><Video className="h-4 w-4" style={{ color: "var(--lw-gold)" }} /> Online conversation</span>
              <span className="inline-flex items-center gap-2"><UserRound className="h-4 w-4" style={{ color: "var(--lw-gold)" }} /> For people at a crossroads</span>
            </div>
          </div>

          <aside className="relative mb-2 p-7 sm:p-8" style={{ background: "rgba(245,240,232,0.97)", borderTop: "3px solid var(--lw-gold)" }}>
            <p className="lw-eyebrow mb-5" style={{ color: "var(--lw-gold)" }}>This conversation is for you if…</p>
            <ul className="space-y-5">
              {[
                "Your career looks right on paper, but no longer feels quite right inside.",
                "You are considering a change, a return, or a more meaningful next chapter.",
                "You want a better question than: “What job should I apply for?”",
              ].map((point) => (
                <li key={point} className="flex gap-3 text-[0.95rem] leading-relaxed" style={{ color: "var(--lw-navy)" }}>
                  <Check className="mt-1 h-4 w-4 shrink-0" style={{ color: "var(--lw-gold)" }} />
                  {point}
                </li>
              ))}
            </ul>
          </aside>
        </div>
      </section>

      <section id="main-content" className="py-20 sm:py-24" style={{ background: "var(--lw-cream)" }}>
        <div className="container grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
          <div>
            <p className="lw-eyebrow mb-4" style={{ color: "var(--lw-gold)" }}>A different starting point</p>
            <h2 className="font-serif text-4xl font-semibold leading-tight" style={{ color: "var(--lw-navy)" }}>
              We look at the person behind the behaviour—not the behaviour itself.
            </h2>
          </div>
          <div className="space-y-5 text-[1.05rem] leading-relaxed" style={{ color: "var(--lw-ink-muted)" }}>
            <p>
              Lifework begins with the evidence of your own life: the moments when you have felt most alive, most effective and most like yourself. Those moments often reveal a dependable pattern of strengths that a conventional CV cannot show.
            </p>
            <p>
              In this live webinar, we will introduce the Lifework approach and show how it can bring clarity to the questions that matter when work, identity and possibility are in motion.
            </p>
          </div>
        </div>
      </section>

      <section id="what-you-will-leave-with" className="py-20 sm:py-24" style={{ background: "white", borderTop: "1px solid rgba(26,39,68,0.08)" }}>
        <div className="container max-w-5xl">
          <div className="mb-12 flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
            <div>
              <p className="lw-eyebrow mb-4" style={{ color: "var(--lw-gold)" }}>In the webinar</p>
              <h2 className="font-serif text-4xl font-semibold" style={{ color: "var(--lw-navy)" }}>What we will explore together</h2>
            </div>
            <p className="max-w-sm text-sm leading-relaxed" style={{ color: "var(--lw-ink-muted)" }}>
              A live, practical introduction—not a generic career-planning lecture.
            </p>
          </div>
          <div className="border-y" style={{ borderColor: "rgba(201,151,58,0.38)" }}>
            {WEBINAR_AGENDA.map((item, index) => {
              const isExpanded = expandedAgenda === index;
              return (
                <div key={item} style={{ borderBottom: index < WEBINAR_AGENDA.length - 1 ? "1px solid rgba(201,151,58,0.25)" : "none" }}>
                  <button
                    type="button"
                    onClick={() => setExpandedAgenda(isExpanded ? null : index)}
                    aria-expanded={isExpanded}
                    className="flex w-full items-center justify-between gap-5 px-1 py-6 text-left transition-opacity hover:opacity-70"
                  >
                    <span className="flex items-start gap-5">
                      <span className="font-serif text-2xl" style={{ color: "var(--lw-gold)" }}>0{index + 1}</span>
                      <span className="text-lg leading-snug" style={{ color: "var(--lw-navy)" }}>{item}</span>
                    </span>
                    <ChevronDown className={`mt-1 h-5 w-5 shrink-0 transition-transform ${isExpanded ? "rotate-180" : ""}`} style={{ color: "var(--lw-gold)" }} />
                  </button>
                  {isExpanded && (
                    <p className="max-w-3xl pb-6 pl-12 text-sm leading-relaxed sm:pl-14" style={{ color: "var(--lw-ink-muted)" }}>
                      {index === 0 && "We will challenge the assumption that the answer can be found in a job description alone."}
                      {index === 1 && "We will explain why recurring stories of achievement can be more revealing than an inventory of preferences."}
                      {index === 2 && "You will leave with a more useful frame for the decision you are facing now."}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section id="reserve" className="py-20 sm:py-24" style={{ background: "var(--lw-navy-mid)" }}>
        <div className="container max-w-5xl">
          <div className="mb-12 text-center">
            <p className="lw-eyebrow mb-4" style={{ color: "var(--lw-gold)" }}>September webinars</p>
            <h2 className="font-serif text-4xl font-semibold text-white">Choose the session that suits you</h2>
            <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.7)" }}>
              Both sessions offer the same introduction to Lifework.
            </p>
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            {WEBINAR_SESSIONS.map((session) => (
              <article key={session.timing} className="p-7 sm:p-8" style={{ background: "var(--lw-cream)", borderTop: "3px solid var(--lw-gold)" }}>
                <h3 className="font-serif text-3xl font-semibold" style={{ color: "var(--lw-navy)" }}>{session.title}</h3>
                <p className="mt-5 flex items-start gap-2 text-sm" style={{ color: "var(--lw-ink-muted)" }}>
                  <CalendarDays className="mt-0.5 h-4 w-4 shrink-0" style={{ color: "var(--lw-gold)" }} />
                  {session.timing}
                </p>
                <a
                  href={session.registrationUrl}
                  className="mt-7 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em]"
                  style={{ color: "var(--lw-navy)", textDecoration: "none", borderBottom: "1px solid var(--lw-gold)", paddingBottom: "0.35rem" }}
                >
                  <Mail className="h-4 w-4" style={{ color: "var(--lw-gold)" }} />
                  Request a place
                </a>
              </article>
            ))}
          </div>
          <p className="mx-auto mt-7 max-w-2xl text-center text-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.55)" }}>
            Places are limited. Request a place in the session that suits you.
          </p>
        </div>
      </section>

      <section className="py-20 sm:py-24" style={{ background: "var(--lw-cream)" }}>
        <div className="container max-w-6xl">
          <div className="mb-12 max-w-3xl">
            <p className="lw-eyebrow mb-4" style={{ color: "var(--lw-gold)" }}>The value of a different question</p>
            <h2 className="font-serif text-4xl font-semibold leading-tight sm:text-5xl" style={{ color: "var(--lw-navy)" }}>
              What people value in Lifework
            </h2>
            <p className="mt-5 max-w-2xl text-base leading-relaxed" style={{ color: "var(--lw-ink-muted)" }}>
              A better next move starts with a fuller understanding of the person making it.
            </p>
          </div>
          {isLoadingTestimonials ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="h-64 animate-pulse" style={{ background: "rgba(26,39,68,0.08)" }} />
              <div className="h-64 animate-pulse" style={{ background: "rgba(26,39,68,0.08)" }} />
            </div>
          ) : approvedTestimonials?.length ? (
            <div>
              {testimonialDisplay.featured && (
                <article className="relative overflow-hidden border px-7 py-10 sm:px-12 sm:py-14" style={{ background: "var(--lw-navy)", borderColor: "var(--lw-gold)" }}>
                  <span aria-hidden="true" className="absolute -right-3 -top-10 font-serif text-[12rem] leading-none" style={{ color: "rgba(201,151,58,0.12)" }}>“</span>
                  <Quote className="relative h-7 w-7" style={{ color: "var(--lw-gold)" }} aria-hidden="true" />
                  <blockquote className="relative mt-8 max-w-4xl font-serif text-3xl leading-[1.18] text-white sm:text-4xl">
                    “{testimonialDisplay.featured.quote}”
                  </blockquote>
                  <cite className="relative mt-8 block text-xs font-semibold uppercase tracking-[0.16em] not-italic" style={{ color: "var(--lw-gold)" }}>
                    — {testimonialDisplay.featured.attribution}
                  </cite>
                </article>
              )}
              {testimonialDisplay.supporting.length > 0 && (
                <div className="mt-10 grid gap-x-10 gap-y-10 md:grid-cols-3">
                  {testimonialDisplay.supporting.map((testimonial) => (
                    <article key={testimonial.id} className="border-t pt-6" style={{ borderColor: "var(--lw-gold)" }}>
                      <Quote className="h-5 w-5" style={{ color: "var(--lw-gold)" }} aria-hidden="true" />
                      <blockquote className="mt-5 font-serif text-2xl leading-snug" style={{ color: "var(--lw-navy)" }}>
                        “{testimonial.quote}”
                      </blockquote>
                      <cite className="mt-6 block text-xs font-semibold uppercase tracking-[0.14em] not-italic" style={{ color: "var(--lw-gold)" }}>
                        — {testimonial.attribution}
                      </cite>
                    </article>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="border p-8 sm:p-10" style={{ background: "rgba(255,255,255,0.7)", borderColor: "rgba(201,151,58,0.4)" }}>
              <p className="font-serif text-3xl" style={{ color: "var(--lw-navy)" }}>Verified feedback will appear here.</p>
              <p className="mt-3 max-w-xl text-sm leading-relaxed" style={{ color: "var(--lw-ink-muted)" }}>
                We publish feedback only after the original source and permission to display it have been recorded.
              </p>
            </div>
          )}
        </div>
      </section>

      <section className="py-24" style={{ background: "var(--lw-navy)" }}>
        <div className="container max-w-3xl text-center">
          <Sparkles className="mx-auto h-6 w-6" style={{ color: "var(--lw-gold)" }} />
          <h2 className="mt-6 font-serif text-4xl font-semibold leading-tight text-white sm:text-5xl">
            You do not need to have your next move worked out before you join us.
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed" style={{ color: "rgba(255,255,255,0.72)" }}>
            Come with the question you have. Leave with a more illuminating way of approaching it.
          </p>
          <div className="mt-10">
            <GoldButton href="#reserve">Request a September place</GoldButton>
          </div>
        </div>
      </section>

      <footer className="py-8" style={{ background: "var(--lw-navy-mid)", borderTop: "1px solid rgba(201,151,58,0.22)" }}>
        <div className="container flex flex-col items-center justify-between gap-4 text-center sm:flex-row sm:text-left">
          <a href={homeHref} className="flex items-center" aria-label="Lifework home">
            <img src={BRAND_LOGO_URL} alt="Lifework" className="h-7 w-auto object-contain" />
          </a>
          <p className="text-xs" style={{ color: "rgba(255,255,255,0.52)" }}>
            Inspired by the work of Bernard Haldane · A Pennington Hennessy service
            {!isStandaloneDomain && " · Lifework webinar draft"}
          </p>
        </div>
      </footer>
    </main>
  );
}
