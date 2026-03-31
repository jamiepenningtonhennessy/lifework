import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useLocation } from "wouter";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { ArrowRight, Loader2, Users, CheckCircle2, Clock, Circle, Eye } from "lucide-react";

function StatusBadge({ status }: { status: string }) {
  if (status === "completed") {
    return (
      <span className="flex items-center gap-1 text-xs text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
        <CheckCircle2 className="w-3 h-3" /> Complete
      </span>
    );
  }
  if (status === "in_progress") {
    return (
      <span className="flex items-center gap-1 text-xs text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
        <Clock className="w-3 h-3" /> In Progress
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
      <Circle className="w-3 h-3" /> Not Started
    </span>
  );
}

export default function CounselorDashboard() {
  const { isAuthenticated, loading, user } = useAuth();
  const [, navigate] = useLocation();

  const { data: clients = [], isLoading } = trpc.counselor.listClients.useQuery(undefined, {
    enabled: isAuthenticated && user?.role === "admin",
  });

  if (!loading && !isAuthenticated) {
    window.location.href = getLoginUrl();
    return null;
  }

  if (!loading && user?.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">You don't have access to the counselor dashboard.</p>
          <Button onClick={() => navigate("/dashboard")}>Go to My Dashboard</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--lw-cream)" }}>
      {/* Header */}
      <div className="sticky top-0 z-10" style={{ background: "var(--lw-navy)", borderBottom: "1px solid rgba(201,151,58,0.25)" }}>
        <div className="container flex items-center justify-between h-14">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <img src="https://d2xsxph8kpxj0f.cloudfront.net/107696804/kFbbE6kqNApXGDFpQJUGV7/phsquare_98c01de4.jpg" alt="Pennington Hennessy" className="w-7 h-7 object-cover" />
              <span className="font-serif font-semibold" style={{ color: "white" }}>Lifework</span>
            </div>
            <div className="h-4 w-px" style={{ background: "rgba(255,255,255,0.2)" }} />
            <span className="text-sm" style={{ color: "rgba(255,255,255,0.55)" }}>Counsellor Dashboard</span>
          </div>
          <div className="flex items-center gap-2">
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

      <div className="container py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-serif font-bold text-foreground mb-1">Clients</h1>
            <p className="text-muted-foreground text-sm">
              {clients.length} client{clients.length !== 1 ? "s" : ""} registered
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : clients.length === 0 ? (
          <div className="text-center py-16 border-2 border-dashed border-border rounded-xl">
            <Users className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No clients have registered yet.</p>
            <p className="text-sm text-muted-foreground mt-1">Share the link to this app with your coaching clients.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {clients.map(({ profile, user: clientUser }) => (
              <Card
                key={profile.id}
                className="border border-border hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => navigate(`/counselor/client/${profile.id}`)}
              >
                <CardContent className="pt-5 pb-5">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <p className="font-serif font-semibold text-foreground">
                        {clientUser?.name ?? "Unknown Client"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">{clientUser?.email ?? ""}</p>
                    </div>
                    <Button variant="ghost" size="icon" className="text-muted-foreground">
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Interview</span>
                      <StatusBadge status={profile.interviewStatus ?? "not_started"} />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">VIA Survey</span>
                      <StatusBadge status={profile.viaStatus ?? "not_started"} />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">OCEAN</span>
                      <StatusBadge status={profile.ipipStatus ?? "not_started"} />
                    </div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-border">
                    <p className="text-xs text-muted-foreground">
                      Updated {new Date(profile.updatedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
