import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Brain, ArrowRight, Loader2 } from "lucide-react";
import {
  IPIP_DOMAINS,
  IPIP_FACETS,
  interpretDomainScore,
  type IpipDomainKey,
  type IpipFacetKey,
} from "../../../shared/ipip-data";
import { InsightsMapping } from "@/components/InsightsMapping";

export default function IpipResults() {
  const [, setLocation] = useLocation();
  const { data, isLoading } = trpc.ipip.getMyResults.useQuery();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4">
        <Brain className="h-12 w-12 text-muted-foreground" />
        <h2 className="text-xl font-semibold">No results yet</h2>
        <p className="text-muted-foreground text-center">Complete the personality survey first.</p>
        <Button onClick={() => setLocation("/ipip-survey")}>Take the Survey</Button>
      </div>
    );
  }

  const domainScores = data.domainScores as Record<IpipDomainKey, number>;
  const facetScores = data.facetScores as Record<IpipFacetKey, number>;

  function scoreLabel(score: number) {
    if (score >= 70) return { label: "High", variant: "default" as const };
    if (score <= 30) return { label: "Low", variant: "secondary" as const };
    return { label: "Average", variant: "outline" as const };
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-10">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Brain className="h-7 w-7 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">Your Personality Profile</h1>
          </div>
          <p className="text-muted-foreground">
            Your IPIP-NEO-120 results across five personality dimensions and thirty facets. These
            results will be incorporated into your career analysis report.
          </p>
        </div>

        {/* Domain overview */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-base">The Big Five — Domain Overview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {IPIP_DOMAINS.map((domain) => {
              const score = domainScores[domain.key] ?? 50;
              const { label, variant } = scoreLabel(score);
              return (
                <div key={domain.key}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: domain.color }}
                      />
                      <span className="font-medium text-sm">{domain.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={variant}>{label}</Badge>
                      <span className="text-sm font-mono text-muted-foreground w-10 text-right">
                        {score}
                      </span>
                    </div>
                  </div>
                  <Progress
                    value={score}
                    className="h-2.5"
                    style={{ "--progress-color": domain.color } as React.CSSProperties}
                  />
                  <p className="text-xs text-muted-foreground mt-1.5">
                    {interpretDomainScore(domain, score)}
                  </p>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Facet detail by domain */}
        {IPIP_DOMAINS.map((domain) => {
          const facets = IPIP_FACETS.filter((f) => f.domain === domain.key);
          const ds = domainScores[domain.key] ?? 50;
          return (
            <Card key={domain.key} className="mb-6">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: domain.color }}
                  />
                  <CardTitle className="text-base">{domain.name}</CardTitle>
                  <Badge className="ml-auto text-white" style={{ backgroundColor: domain.color }}>
                    {ds}/100
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {facets.map((facet) => {
                    const fs = facetScores[facet.key] ?? 50;
                    const { label } = scoreLabel(fs);
                    return (
                      <div key={facet.key}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium">{facet.name}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">{label}</span>
                            <span className="text-xs font-mono text-muted-foreground w-8 text-right">
                              {fs}
                            </span>
                          </div>
                        </div>
                        <div className="relative">
                          <Progress value={fs} className="h-1.5" />
                        </div>
                        <div className="flex justify-between text-[10px] text-muted-foreground mt-0.5">
                          <span>{facet.lowLabel}</span>
                          <span className="text-right">{facet.highLabel}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          );
        })}

        {/* Insights Mapping */}
        <div className="mb-8">
          <h2 className="text-lg font-serif font-semibold text-foreground mb-4">Insights Discovery Colour Mapping</h2>
          <InsightsMapping
            extraversion={domainScores["E"] ?? 50}
            agreeableness={domainScores["A"] ?? 50}
            openness={domainScores["O"] ?? 50}
            conscientiousness={domainScores["C"] ?? 50}
          />
        </div>

        {/* CTA */}
        <div className="mt-8 flex justify-center">
          <Button size="lg" onClick={() => setLocation("/dashboard")} className="gap-2">
            Return to Dashboard
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
