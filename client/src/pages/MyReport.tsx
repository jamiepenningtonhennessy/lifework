import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Brain, ArrowLeft, Download, Loader2, FileText } from "lucide-react";
import { Streamdown } from "streamdown";
import { useAuth } from "@/_core/hooks/useAuth";

export default function MyReport() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();

  const { data: report, isLoading } = trpc.analysis.getMyReport.useQuery();
  const { data: profile } = trpc.profile.getMyProfile.useQuery();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading your report…</p>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 px-4 bg-background">
        <div className="text-center max-w-md">
          <Brain className="h-14 w-14 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-2xl font-semibold mb-2">Your Report Isn't Ready Yet</h2>
          <p className="text-muted-foreground mb-6">
            Your counsellor will generate your personalised career analysis report once you have
            completed all the steps in your journey. Make sure all six steps are marked as complete
            on your dashboard.
          </p>
          <Button onClick={() => setLocation("/dashboard")} className="gap-2">
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const clientName = profile?.firstName
    ? `${profile.firstName}${profile.lastName ? " " + profile.lastName : ""}`
    : user?.name ?? "Your";

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => setLocation("/dashboard")} className="gap-1">
              <ArrowLeft className="w-4 h-4" /> Dashboard
            </Button>
            <div className="w-px h-5 bg-border" />
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              <span className="font-semibold text-foreground">Career Analysis Report</span>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => window.open(`/api/export/report`, "_blank")}
          >
            <Download className="w-4 h-4" /> Export PDF
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-10">
        {/* Title card */}
        <Card className="mb-8 border-primary/20 bg-gradient-to-br from-primary/5 to-background">
          <CardContent className="pt-6 pb-5">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <FileText className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground mb-1">
                  {clientName}'s Career Analysis
                </h1>
                <p className="text-muted-foreground text-sm">
                  Generated on{" "}
                  {report.generatedAt
                    ? new Date(report.generatedAt).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })
                    : "recently"}{" "}
                  · Based on your life history, VIA strengths, personality profile, and reasoning assessment
                </p>
                <div className="flex gap-2 mt-3 flex-wrap">
                  <Badge variant="secondary">Life History</Badge>
                  <Badge variant="secondary">VIA Character Strengths</Badge>
                  <Badge variant="secondary">IPIP-NEO Personality</Badge>
                  <Badge variant="secondary">Cognitive Profile</Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Report body */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-muted-foreground font-medium flex items-center gap-2">
              <Brain className="w-4 h-4" /> Full Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-neutral max-w-none dark:prose-invert">
              <Streamdown>{report.fullReportMarkdown ?? ""}</Streamdown>
            </div>
          </CardContent>
        </Card>

        {/* Counsellor notes (read-only for client) */}
        {report.counselorNotes && (
          <Card className="mt-6 border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium text-amber-800 dark:text-amber-300">
                Counsellor's Notes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-amber-900 dark:text-amber-200 whitespace-pre-wrap leading-relaxed">
                {report.counselorNotes}
              </p>
            </CardContent>
          </Card>
        )}

        <div className="mt-8 text-center">
          <Button onClick={() => setLocation("/dashboard")} variant="outline" className="gap-2">
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}
