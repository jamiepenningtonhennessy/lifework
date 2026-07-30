import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, ArrowLeft, Building2, ExternalLink, Lock, Eye } from "lucide-react";
import { getLoginUrl } from "@/const";

// ── Human-readable label maps ──────────────────────────────────────────────
const TIER_LABELS: Record<string, string> = {
  law_firm: "Law Firm",
  ftse100: "FTSE 100",
  ftse250: "FTSE 250",
  ftse_small: "FTSE Small Cap",
  uk_private: "UK Private",
  global_tech: "Global Tech",
  tech_scaleup: "Tech Scaleup",
  inhouse_legal: "In-house Legal",
  legal_tech: "Legal Tech",
  professional_services: "Professional Services",
  public_sector: "Public Sector",
};

const SECTOR_LABELS: Record<string, string> = {
  magic_circle: "Magic Circle",
  silver_circle: "Silver Circle",
  us_firm_london: "US Firm (London)",
  uk_intl: "UK International",
  uk_regional: "UK Regional",
  ai: "AI",
  fintech: "Fintech",
  healthtech: "Healthtech",
  legaltech: "Legal Tech",
  saas: "SaaS",
  ecommerce: "E-commerce",
  banking: "Banking",
  insurance: "Insurance",
  consulting: "Consulting",
  media: "Media",
  energy: "Energy",
  pharma: "Pharma",
  retail: "Retail",
  telecoms: "Telecoms",
  "Law Firm": "Law Firm",
};

const ATS_LABELS: Record<string, string> = {
  greenhouse: "Greenhouse",
  lever: "Lever",
  ashby: "Ashby",
  workday: "Workday",
  smartrecruiters: "SmartRecruiters",
  icims: "iCIMS",
  taleo: "Taleo",
  successfactors: "SuccessFactors",
  generic: "Generic",
  none: "None",
};

const TIER_COLOURS: Record<string, string> = {
  law_firm: "bg-blue-50 text-blue-700 border-blue-200",
  ftse100: "bg-purple-50 text-purple-700 border-purple-200",
  ftse250: "bg-violet-50 text-violet-700 border-violet-200",
  ftse_small: "bg-indigo-50 text-indigo-700 border-indigo-200",
  uk_private: "bg-slate-50 text-slate-700 border-slate-200",
  global_tech: "bg-cyan-50 text-cyan-700 border-cyan-200",
  tech_scaleup: "bg-teal-50 text-teal-700 border-teal-200",
  inhouse_legal: "bg-amber-50 text-amber-700 border-amber-200",
  legal_tech: "bg-orange-50 text-orange-700 border-orange-200",
  professional_services: "bg-rose-50 text-rose-700 border-rose-200",
  public_sector: "bg-green-50 text-green-700 border-green-200",
};

export default function CompanyUniversePage() {
  const { isAuthenticated, loading, user } = useAuth();
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const [tierFilter, setTierFilter] = useState<string>("all");
  const [sectorFilter, setSectorFilter] = useState<string>("all");

  const { data: companies = [], isLoading } = trpc.jobs.getCompanyUniverse.useQuery(
    {},
    { enabled: isAuthenticated && user?.role === "admin" }
  );

  const { data: stats } = trpc.jobs.getUniverseStats.useQuery(undefined, {
    enabled: isAuthenticated && user?.role === "admin",
  });

  // Derive distinct tiers and sectors from loaded data
  const tiers = useMemo(() => {
    const s = new Set(companies.map((c) => c.tier).filter(Boolean) as string[]);
    return Array.from(s).sort();
  }, [companies]);

  const sectors = useMemo(() => {
    const s = new Set(companies.map((c) => c.sector).filter(Boolean) as string[]);
    return Array.from(s).sort();
  }, [companies]);

  // Client-side filtering
  const filtered = useMemo(() => {
    let rows = companies;
    if (tierFilter !== "all") rows = rows.filter((c) => c.tier === tierFilter);
    if (sectorFilter !== "all") rows = rows.filter((c) => c.sector === sectorFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.domain ?? "").toLowerCase().includes(q) ||
          (c.sector ?? "").toLowerCase().includes(q)
      );
    }
    return rows;
  }, [companies, tierFilter, sectorFilter, search]);

  if (!loading && !isAuthenticated) {
    window.location.href = getLoginUrl();
    return null;
  }

  if (!loading && user?.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">You don't have access to this page.</p>
          <Button onClick={() => navigate("/dashboard")}>Go to My Dashboard</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--lw-cream)" }}>
      {/* Header — matches CounselorDashboard */}
      <div className="sticky top-0 z-10" style={{ background: "var(--lw-navy)", borderBottom: "1px solid rgba(201,151,58,0.25)" }}>
        <div className="container flex items-center justify-between h-14">
          <div className="flex items-center gap-3">
            <img
              src="https://d2xsxph8kpxj0f.cloudfront.net/107696804/kFbbE6kqNApXGDFpQJUGV7/lifework-logo-onnavy_1f7a4c72.png"
              alt="Lifework"
              className="h-8 w-auto object-contain"
            />
            <div className="h-4 w-px" style={{ background: "rgba(255,255,255,0.2)" }} />
            <span className="text-sm" style={{ color: "rgba(255,255,255,0.55)" }}>Company Universe</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                try { sessionStorage.removeItem("counsellor_pin_verified"); } catch { /* ignore */ }
                navigate("/counselor");
                window.location.reload();
              }}
              className="px-3 py-1.5 text-xs font-medium tracking-wide uppercase cursor-pointer flex items-center gap-1.5"
              style={{ border: "1px solid rgba(201,151,58,0.2)", color: "rgba(255,255,255,0.4)", background: "transparent", letterSpacing: "0.08em" }}
              title="Lock dashboard"
            >
              <Lock className="w-3.5 h-3.5" />
              Lock
            </button>
            <button
              onClick={() => navigate("/preview")}
              className="px-3 py-1.5 text-xs font-medium tracking-wide uppercase cursor-pointer flex items-center gap-1.5"
              style={{ border: "1px solid rgba(201,151,58,0.3)", color: "rgba(255,255,255,0.65)", background: "transparent", letterSpacing: "0.08em" }}
            >
              <Eye className="w-3.5 h-3.5" />
              Preview
            </button>
            <button
              onClick={() => navigate("/dashboard")}
              className="px-3 py-1.5 text-xs font-medium tracking-wide uppercase cursor-pointer"
              style={{ border: "1px solid rgba(201,151,58,0.5)", color: "var(--lw-gold)", background: "transparent", letterSpacing: "0.08em" }}
            >
              My Profile
            </button>
          </div>
        </div>
      </div>

      <div className="container py-8">
        {/* Back + title */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate("/counselor")}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to clients
          </button>
        </div>

        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-3xl font-serif font-bold text-foreground mb-1">Company Universe</h1>
            <p className="text-muted-foreground text-sm">
              The seed list of organisations monitored by the Jobs Explorer pipeline.
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Building2 className="w-4 h-4" />
            <span><strong className="text-foreground">{stats?.total ?? companies.length}</strong> companies</span>
          </div>
        </div>

        {/* Stats chips */}
        {stats && (
          <div className="flex flex-wrap gap-2 mb-6">
            {Object.entries(stats.byTier)
              .sort((a, b) => b[1] - a[1])
              .map(([tier, count]) => (
                <button
                  key={tier}
                  onClick={() => setTierFilter(tierFilter === tier ? "all" : tier)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                    tierFilter === tier
                      ? "bg-[var(--lw-navy)] text-white border-[var(--lw-navy)]"
                      : (TIER_COLOURS[tier] ?? "bg-gray-50 text-gray-700 border-gray-200")
                  }`}
                >
                  {TIER_LABELS[tier] ?? tier} · {count}
                </button>
              ))}
          </div>
        )}

        {/* Search + filter bar */}
        <div className="flex flex-wrap gap-3 mb-5">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or domain…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <select
            value={tierFilter}
            onChange={(e) => setTierFilter(e.target.value)}
            className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="all">All tiers</option>
            {tiers.map((t) => (
              <option key={t} value={t}>{TIER_LABELS[t] ?? t}</option>
            ))}
          </select>
          <select
            value={sectorFilter}
            onChange={(e) => setSectorFilter(e.target.value)}
            className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="all">All sectors</option>
            {sectors.map((s) => (
              <option key={s} value={s}>{SECTOR_LABELS[s] ?? s}</option>
            ))}
          </select>
          {(search || tierFilter !== "all" || sectorFilter !== "all") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setSearch(""); setTierFilter("all"); setSectorFilter("all"); }}
            >
              Clear filters
            </Button>
          )}
        </div>

        <p className="text-xs text-muted-foreground mb-3">
          Showing {filtered.length} of {companies.length} companies
        </p>

        {/* Table */}
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="rounded-xl border border-border overflow-hidden bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: "var(--lw-navy)" }}>
                  <th className="text-left px-4 py-3 font-medium text-white/80 w-[30%]">Company</th>
                  <th className="text-left px-4 py-3 font-medium text-white/80 w-[14%]">Tier</th>
                  <th className="text-left px-4 py-3 font-medium text-white/80 w-[16%]">Sector</th>
                  <th className="text-left px-4 py-3 font-medium text-white/80 w-[12%]">ATS</th>
                  <th className="text-left px-4 py-3 font-medium text-white/80 w-[28%]">Careers URL</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-12 text-muted-foreground">
                      No companies match your filters.
                    </td>
                  </tr>
                ) : (
                  filtered.map((company, i) => (
                    <tr
                      key={company.id}
                      className={`border-t border-border transition-colors hover:bg-amber-50/40 ${i % 2 === 0 ? "bg-white" : "bg-stone-50/50"}`}
                    >
                      <td className="px-4 py-2.5">
                        <div className="font-medium text-foreground">{company.name}</div>
                        {company.domain && (
                          <a
                            href={`https://${company.domain}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-muted-foreground hover:text-[var(--lw-gold)] flex items-center gap-0.5 mt-0.5"
                          >
                            {company.domain}
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        {company.tier ? (
                          <span className={`inline-block px-2 py-0.5 rounded-full text-xs border ${TIER_COLOURS[company.tier] ?? "bg-gray-50 text-gray-600 border-gray-200"}`}>
                            {TIER_LABELS[company.tier] ?? company.tier}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground">
                        {company.sector ? (SECTOR_LABELS[company.sector] ?? company.sector) : "—"}
                      </td>
                      <td className="px-4 py-2.5">
                        {company.atsProvider && company.atsProvider !== "none" ? (
                          <span className="inline-block px-2 py-0.5 rounded text-xs bg-slate-100 text-slate-600 border border-slate-200">
                            {ATS_LABELS[company.atsProvider] ?? company.atsProvider}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        {company.careersUrl ? (
                          <a
                            href={company.careersUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-[var(--lw-gold)] hover:underline flex items-center gap-0.5 truncate max-w-[260px]"
                          >
                            <span className="truncate">{company.careersUrl.replace(/^https?:\/\//, "")}</span>
                            <ExternalLink className="w-3 h-3 flex-shrink-0" />
                          </a>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
