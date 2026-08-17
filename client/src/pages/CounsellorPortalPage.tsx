/**
 * CounsellorPortalPage
 *
 * Renders the full WOW client dashboard exactly as the client sees it,
 * but with a gold counsellor banner at the top. Accessible via:
 *   /counselor/client/:id/portal
 */
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Loader2, Eye } from "lucide-react";
import { DashboardBody } from "./ClientDashboard";

export default function CounsellorPortalPage() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const clientId = parseInt(params.id ?? "0");

  const { data, isLoading: loadingProfile } = trpc.counselor.getClientProfile.useQuery(
    { clientId },
    { enabled: !!clientId }
  );

  const { data: enrichmentStatus } = trpc.counselor.getClientEnrichmentStatus.useQuery(
    { clientId },
    { enabled: !!clientId }
  );

  if (loadingProfile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const clientName = data?.profile
    ? [data.profile.firstName, data.profile.lastName].filter(Boolean).join(" ")
    : `Client #${clientId}`;

  return (
    <div className="min-h-screen" style={{ background: "var(--lw-cream)" }}>
      {/* Counsellor preview banner */}
      <div
        className="sticky top-0 z-30 px-4 py-2 flex items-center justify-between"
        style={{ background: "var(--lw-gold)", color: "white" }}
      >
        <div className="flex items-center gap-2 text-sm font-medium">
          <Eye className="w-4 h-4" />
          <span>Counsellor preview — viewing as {clientName}</span>
        </div>
        <button
          onClick={() => navigate(`/counselor/client/${clientId}`)}
          className="text-xs underline opacity-80 hover:opacity-100 cursor-pointer"
        >
          ← Return to profile
        </button>
      </div>

      {/* Full dashboard body in read-only preview mode */}
      <DashboardBody
        profile={data?.profile}
        enrichmentStatus={enrichmentStatus}
        loadingProfile={false}
        displayName={clientName}
        onNavigate={() => {}}
        showAdminLink={false}
        isPreview={true}
      />
    </div>
  );
}
