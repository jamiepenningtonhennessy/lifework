import { PHNav } from "@/components/PHNav";
import { PHFooter } from "@/components/PHFooter";

export default function PHAbout() {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--lw-cream)" }}>
      <PHNav />

      {/* -- Page hero ------------------------------------------------------ */}
      <section
        style={{ background: "var(--lw-navy)", paddingTop: "5rem", paddingBottom: "5rem" }}
      >
        <div className="container max-w-6xl">
          <div className="flex items-center gap-3 mb-5">
            <div style={{ width: "2.5rem", height: "1px", background: "var(--lw-gold)" }} />
            <span
              className="font-medium tracking-widest uppercase"
              style={{ fontSize: "0.7rem", color: "var(--lw-gold)", letterSpacing: "0.18em" }}
            >
              About
            </span>
          </div>
          <h1
            className="font-serif font-bold"
            style={{ fontSize: "clamp(2rem, 4vw, 3rem)", color: "white", lineHeight: 1.2 }}
          >
            Jamie Pennington
          </h1>
          <p
            className="mt-3"
            style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.45)", letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 500 }}
          >
            Director &middot; Visiting Professor, University of Law
          </p>
        </div>
      </section>

      {/* -- Bio + photo ---------------------------------------------------- */}
      <section className="py-20" style={{ background: "white" }}>
        <div className="container max-w-6xl">
          <div className="grid md:grid-cols-5 gap-14 items-start">
            {/* Photo */}
            <div className="md:col-span-2">
              <div
                className="w-full overflow-hidden"
                style={{
                  aspectRatio: "3/4",
                  border: "1px solid rgba(15,31,53,0.1)",
                  maxWidth: "360px",
                }}
              >
                <img
                  src="https://d2xsxph8kpxj0f.cloudfront.net/107696804/kFbbE6kqNApXGDFpQJUGV7/jamie_portrait_clean_d350989c.png"
                  alt="Jamie Pennington"
                  className="w-full h-full object-cover object-top"
                />
              </div>
            </div>

            {/* Bio */}
            <div className="md:col-span-3">
              <div className="flex items-center gap-3 mb-3">
                <div style={{ width: "2rem", height: "1px", background: "var(--lw-gold)" }} />
                <span
                  className="font-medium tracking-widest uppercase"
                  style={{ fontSize: "0.65rem", color: "var(--lw-gold)", letterSpacing: "0.18em" }}
                >
                  Biography
                </span>
              </div>
              <p
                className="mb-5"
                style={{ color: "rgba(15,31,53,0.72)", lineHeight: 1.85, fontSize: "0.97rem" }}
              >
                Jamie Pennington has spent over thirty years working with lawyers and other professionals, helping them develop the skills, confidence, and commercial awareness they need to thrive. His career began in sales and marketing before moving into professional development, giving him a rare combination of commercial acumen and coaching expertise.
              </p>
              <p
                className="mb-5"
                style={{ color: "rgba(15,31,53,0.72)", lineHeight: 1.85, fontSize: "0.97rem" }}
              >
                As Director of Pennington Hennessy and a Visiting Professor at the University of Law, Jamie brings both practical experience and academic rigour to his work. He has designed and delivered programmes for a wide range of firms, from large international practices to specialist boutiques.
              </p>
              <p
                className="mb-5"
                style={{ color: "rgba(15,31,53,0.72)", lineHeight: 1.85, fontSize: "0.97rem" }}
              >
                Jamie is a pioneer in the use of AI for professional development, having developed a suite of AI-powered role-play scenarios that allow professionals to practise and refine their skills in realistic, bespoke simulations. He describes himself as an "AI scenario evangelist" -- continually exploring what's possible as the technology advances, and then applying it with his clients.
              </p>
              <p
                style={{ color: "rgba(15,31,53,0.72)", lineHeight: 1.85, fontSize: "0.97rem" }}
              >
                His approach is grounded in a belief that lasting change comes not from instruction alone, but from understanding the deeper systems -- cultural, behavioural and motivational -- that shape how professionals work and grow.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* -- Take Counsel / Lifework ---------------------------------------- */}
      <section className="py-20" style={{ background: "var(--lw-cream)" }}>
        <div className="container max-w-6xl">
          <div className="max-w-3xl">
            <div className="flex items-center gap-3 mb-3">
              <div style={{ width: "2rem", height: "1px", background: "var(--lw-gold)" }} />
              <span
                className="font-medium tracking-widest uppercase"
                style={{ fontSize: "0.65rem", color: "var(--lw-gold)", letterSpacing: "0.18em" }}
              >
                Methodology
              </span>
            </div>
            <h2
              className="font-serif font-bold mb-5"
              style={{ fontSize: "clamp(1.4rem, 2.2vw, 1.9rem)", color: "var(--lw-navy)" }}
            >
              The Take Counsel philosophy
            </h2>
            <p
              className="mb-4"
              style={{ color: "rgba(15,31,53,0.65)", lineHeight: 1.85, fontSize: "0.95rem" }}
            >
              At the heart of Jamie's coaching practice is a conviction that the most powerful insights come not from personality questionnaires or competency frameworks, but from a careful examination of a person's own life history. The Take Counsel approach -- rooted in the Dependable Strengths tradition of Bernard Haldane -- begins by exploring the full arc of a client's achievements, from childhood to the present day.
            </p>
            <p
              style={{ color: "rgba(15,31,53,0.65)", lineHeight: 1.85, fontSize: "0.95rem" }}
            >
              This process is now supported by Lifework, a digital platform that guides clients through a structured life history interview, VIA Character Strengths survey, and IPIP-NEO personality profile -- providing a rich, detailed picture that informs every coaching conversation that follows.
            </p>
          </div>
        </div>
      </section>

      {/* -- Contact -------------------------------------------------------- */}
      <section
        className="py-16"
        style={{ background: "var(--lw-navy-mid)", borderTop: "1px solid rgba(201,151,58,0.15)" }}
      >
        <div className="container max-w-6xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div>
            <h3
              className="font-serif font-bold mb-2"
              style={{ fontSize: "1.4rem", color: "white" }}
            >
              Get in touch
            </h3>
            <p style={{ fontSize: "0.9rem", color: "rgba(255,255,255,0.6)" }}>
              To discuss coaching, training, or anything else.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <a
              href="tel:07887536309"
              className="inline-flex items-center gap-2 px-6 py-3 font-medium text-sm tracking-widest uppercase no-underline transition-opacity hover:opacity-80"
              style={{
                background: "var(--lw-gold)",
                color: "var(--lw-navy)",
                letterSpacing: "0.1em",
              }}
            >
              07887 536309
            </a>
            <a
              href="mailto:jamie@penningtonhennessy.com"
              className="text-sm no-underline transition-opacity hover:opacity-80"
              style={{ color: "rgba(255,255,255,0.5)", textAlign: "center" }}
            >
              jamie@penningtonhennessy.com
            </a>
          </div>
        </div>
      </section>

      <PHFooter />
    </div>
  );
}
