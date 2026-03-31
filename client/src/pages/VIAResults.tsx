import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, ArrowRight, Brain, Loader2, Star } from "lucide-react";

const VIRTUE_COLORS: Record<string, string> = {
  wisdom: "bg-blue-100 text-blue-800 border-blue-200",
  courage: "bg-orange-100 text-orange-800 border-orange-200",
  humanity: "bg-pink-100 text-pink-800 border-pink-200",
  justice: "bg-green-100 text-green-800 border-green-200",
  temperance: "bg-purple-100 text-purple-800 border-purple-200",
  transcendence: "bg-yellow-100 text-yellow-800 border-yellow-200",
};

export default function VIAResults() {
  const { isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();

  const { data: results, isLoading } = trpc.via.getMyResults.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const { data: viaData } = trpc.via.getQuestions.useQuery();
  // Check if IPIP is already done so we can adjust the CTA label
  const { data: ipipResults } = trpc.ipip.getMyResults.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  if (!loading && !isAuthenticated) {
    window.location.href = getLoginUrl();
    return null;
  }

  const strengthsMap = new Map(viaData?.strengths.map((s) => [s.id, s]) ?? []);
  const ranked = (results?.rankedStrengths as any[]) ?? [];
  const ipipDone = !!(ipipResults && (ipipResults as any).domainScores);

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container flex items-center justify-between h-14">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/via")}>
              <ArrowLeft className="w-4 h-4 mr-1" /> Survey
            </Button>
            <div className="h-4 w-px bg-border" />
            <span className="font-serif font-semibold text-foreground">Your Character Strengths</span>
          </div>
          <div className="flex items-center gap-2">
            {!ipipDone && (
              <Button
                size="sm"
                onClick={() => navigate("/ipip-survey")}
                className="gap-1 bg-[var(--lw-gold)] hover:bg-[oklch(0.60_0.13_72)] text-white"
              >
                <Brain className="w-3.5 h-3.5" />
                Next: Personality Profile
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate("/dashboard")}
              className="gap-1"
            >
              Dashboard
            </Button>
          </div>
        </div>
      </div>

      <div className="container max-w-3xl py-8">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : !results ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">You haven't completed the VIA survey yet.</p>
            <Button onClick={() => navigate("/via")} className="bg-[var(--lw-gold)] hover:bg-[oklch(0.60_0.13_72)] text-white">
              Take the Survey
            </Button>
          </div>
        ) : (
          <>
            {/* Top 5 Signature Strengths */}
            <div className="mb-10">
              <div className="flex items-center gap-2 mb-2">
                <Star className="w-5 h-5 text-[var(--gold)]" fill="currentColor" />
                <h2 className="text-2xl font-serif font-bold text-foreground">Your Signature Strengths</h2>
              </div>
              <p className="text-sm text-muted-foreground mb-6">
                Your top 5 character strengths are your most natural and energising qualities. These are the strengths you should build your career around.
              </p>
              <div className="space-y-3">
                {ranked.slice(0, 5).map((s: any, i: number) => {
                  const strength = strengthsMap.get(s.strengthId);
                  const colorClass = VIRTUE_COLORS[strength?.virtue ?? ""] ?? "bg-gray-100 text-gray-800 border-gray-200";
                  return (
                    <div key={s.strengthId} className="p-5 rounded-xl border-2 border-[var(--lw-gold)]/30 bg-[var(--lw-gold-light)]/30">
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-full bg-[var(--lw-gold)] text-white flex items-center justify-center font-serif font-bold text-lg flex-shrink-0">
                          {i + 1}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <h3 className="font-serif font-semibold text-foreground text-lg">{strength?.name ?? s.strengthId}</h3>
                            {strength?.virtue && (
                              <span className={`text-xs px-2 py-0.5 rounded-full border capitalize ${colorClass}`}>
                                {strength.virtue}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground leading-relaxed">{strength?.description}</p>
                          {strength?.atWork && (
                            <p className="text-xs text-[var(--lw-gold)] mt-2 font-medium">{strength.atWork}</p>
                          )}
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="text-lg font-bold text-[var(--lw-gold)]">{s.score}</div>
                          <div className="text-xs text-muted-foreground">/ 25</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* All 24 strengths */}
            <div className="mb-12">
              <h2 className="text-xl font-serif font-semibold text-foreground mb-4">All 24 Strengths Ranked</h2>
              <div className="space-y-2">
                {ranked.map((s: any, i: number) => {
                  const strength = strengthsMap.get(s.strengthId);
                  const pct = Math.round((s.score / 25) * 100);
                  return (
                    <div key={s.strengthId} className="flex items-center gap-3 py-2">
                      <span className="text-sm text-muted-foreground w-6 text-right flex-shrink-0">{i + 1}</span>
                      <span className="text-sm font-medium text-foreground w-44 flex-shrink-0">{strength?.name ?? s.strengthId}</span>
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${pct}%`,
                            backgroundColor: i < 5 ? "var(--lw-gold)" : i < 10 ? "var(--gold)" : "var(--color-muted-foreground)",
                          }}
                        />
                      </div>
                      <span className="text-sm text-muted-foreground w-8 text-right flex-shrink-0">{s.score}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Next step CTA — only shown if IPIP not yet completed */}
            {!ipipDone && (
              <div
                className="rounded-2xl p-8 text-center"
                style={{
                  background: "var(--lw-navy)",
                  border: "1px solid rgba(201,151,58,0.35)",
                }}
              >
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4"
                  style={{ background: "rgba(201,151,58,0.15)" }}
                >
                  <Brain className="w-6 h-6" style={{ color: "var(--lw-gold)" }} />
                </div>
                <h3 className="text-xl font-serif font-bold text-white mb-2">
                  Next: Personality Profile
                </h3>
                <p className="text-sm mb-6" style={{ color: "rgba(255,255,255,0.7)", maxWidth: "28rem", margin: "0 auto 1.5rem" }}>
                  The second part of your psychometrics is the IPIP-NEO Personality Profile — 120 questions
                  across five dimensions. It takes around 15 minutes and gives your counsellor a deeper
                  picture of how you think and work.
                </p>
                <Button
                  onClick={() => navigate("/ipip-survey")}
                  className="gap-2 text-base px-6 py-3"
                  style={{ background: "var(--lw-gold)", color: "var(--lw-navy)", fontWeight: 600 }}
                >
                  Begin Personality Profile <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            )}

            {/* Already done IPIP — quiet nudge back to dashboard */}
            {ipipDone && (
              <div className="text-center pt-4 pb-8">
                <Button
                  onClick={() => navigate("/dashboard")}
                  className="gap-2 bg-[var(--lw-gold)] hover:bg-[oklch(0.60_0.13_72)] text-white"
                >
                  Back to Dashboard <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
