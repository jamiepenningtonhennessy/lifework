import { Link } from "wouter";

export function PHFooter() {
  return (
    <footer style={{ background: "var(--lw-navy)", borderTop: "1px solid rgba(201,151,58,0.25)" }}>
      <div className="container max-w-6xl py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <img
                src="https://d2xsxph8kpxj0f.cloudfront.net/107696804/kFbbE6kqNApXGDFpQJUGV7/phsquare_98c01de4.jpg"
                alt="Pennington Hennessy"
                className="w-8 h-8 object-cover"
              />
              <span className="font-serif font-semibold text-sm" style={{ color: "white" }}>
                Pennington Hennessy
              </span>
            </div>
            <p style={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.5)", lineHeight: 1.7 }}>
              Coaching and training for lawyers and professional services firms. Thirty years of experience. Powered by the latest in AI.
            </p>
          </div>

          {/* Navigation */}
          <div>
            <p
              className="font-medium mb-4 tracking-widest uppercase"
              style={{ fontSize: "0.7rem", color: "var(--lw-gold)", letterSpacing: "0.12em" }}
            >
              Pages
            </p>
            <ul className="space-y-2">
              {[
                { label: "Home", href: "/ph" },
                { label: "Coaching", href: "/ph/coaching" },
                { label: "Training", href: "/ph/training" },
                { label: "About", href: "/ph/about" },
              ].map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="no-underline transition-colors hover:opacity-100"
                    style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.6)" }}
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <p
              className="font-medium mb-4 tracking-widest uppercase"
              style={{ fontSize: "0.7rem", color: "var(--lw-gold)", letterSpacing: "0.12em" }}
            >
              Get in touch
            </p>
            <ul className="space-y-2">
              <li>
                <a
                  href="tel:07887536309"
                  className="no-underline transition-opacity hover:opacity-100"
                  style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.6)" }}
                >
                  07887 536309
                </a>
              </li>
              <li>
                <a
                  href="mailto:jamie@penningtonhennessy.com"
                  className="no-underline transition-opacity hover:opacity-100"
                  style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.6)" }}
                >
                  jamie@penningtonhennessy.com
                </a>
              </li>
            </ul>
            <div className="mt-6 pt-6" style={{ borderTop: "1px solid rgba(201,151,58,0.15)" }}>
              <p
                className="mb-3 tracking-widest uppercase"
                style={{ fontSize: "0.7rem", color: "var(--lw-gold)", letterSpacing: "0.12em" }}
              >
                Tools & Platforms
              </p>
              <ul className="space-y-2">
                <li>
                  <a
                    href="/dashboard"
                    className="no-underline transition-opacity hover:opacity-100"
                    style={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.5)" }}
                  >
                    Lifework — Career Analysis →
                  </a>
                </li>
                <li>
                  <a
                    href="/ai-coaching"
                    className="no-underline transition-opacity hover:opacity-100"
                    style={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.5)" }}
                  >
                    AI Scenarios — Skills Training →
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div
          className="mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3"
          style={{ borderTop: "1px solid rgba(201,151,58,0.15)" }}
        >
          <p style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.35)" }}>
            © {new Date().getFullYear()} Pennington Hennessy Ltd. All rights reserved.
          </p>
          <p style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.35)" }}>
            Ryston House, Ryston End, Downham Market PE38 9AX
          </p>
        </div>
      </div>
    </footer>
  );
}
