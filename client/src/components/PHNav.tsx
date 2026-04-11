import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Menu, X } from "lucide-react";

const NAV_LINKS = [
  { label: "Home", href: "/" },
  { label: "Coaching", href: "/coaching" },
  { label: "Training", href: "/training" },
  { label: "About", href: "/about" },
];

export function PHNav() {
  const [location] = useLocation();
  const [open, setOpen] = useState(false);

  return (
    <header
      className="sticky top-0 z-50"
      style={{ background: "var(--lw-navy)", borderBottom: "1px solid rgba(201,151,58,0.25)" }}
    >
      <div className="container max-w-6xl flex items-center justify-between h-16">
        {/* Logo */}
        <Link href="/" className="flex items-center no-underline">
          <img
            src="https://d2xsxph8kpxj0f.cloudfront.net/107696804/kFbbE6kqNApXGDFpQJUGV7/penhenlong_a1952c94.jpg"
            alt="Pennington Hennessy"
            style={{ height: "40px", width: "auto", objectFit: "contain" }}
          />
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map((link) => {
            const active = location === link.href || (link.href !== "/" && location.startsWith(link.href));
            return (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-medium tracking-widest uppercase no-underline transition-colors"
                style={{
                  color: active ? "var(--lw-gold)" : "rgba(255,255,255,0.7)",
                  letterSpacing: "0.1em",
                }}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Mobile hamburger */}
        <button
          className="md:hidden p-2 cursor-pointer"
          style={{ color: "rgba(255,255,255,0.7)" }}
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
        >
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div
          className="md:hidden border-t"
          style={{ background: "var(--lw-navy-mid)", borderColor: "rgba(201,151,58,0.2)" }}
        >
          {NAV_LINKS.map((link) => {
            const active = location === link.href || (link.href !== "/" && location.startsWith(link.href));
            return (
              <Link
                key={link.href}
                href={link.href}
                className="block px-6 py-3 text-sm font-medium tracking-widest uppercase no-underline"
                style={{
                  color: active ? "var(--lw-gold)" : "rgba(255,255,255,0.75)",
                  letterSpacing: "0.1em",
                  borderBottom: "1px solid rgba(201,151,58,0.1)",
                }}
                onClick={() => setOpen(false)}
              >
                {link.label}
              </Link>
            );
          })}
        </div>
      )}
    </header>
  );
}
