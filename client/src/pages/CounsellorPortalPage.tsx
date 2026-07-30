/**
 * CounsellorPortalPage
 *
 * Renders the full Jobs Explorer exactly as the client sees it, but with a
 * gold counsellor banner at the top. Accessible via:
 *   /counselor/client/:id/portal
 *
 * The counsellor's admin session passes clientId through every tRPC query
 * via the existing resolveClientId pattern, so no extra auth is needed.
 */
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Loader2 } from "lucide-react";
import { CounsellorPortalView } from "./JobsExplorer";

export default function CounsellorPortalPage() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const clientId = parseInt(params.id ?? "0");

  // Fetch the client's name for the banner
  const { data, isLoading } = trpc.counselor.getClientProfile.useQuery(
    { clientId },
    { enabled: !!clientId }
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const clientName = data?.profile
    ? [data.profile.firstName, data.profile.lastName].filter(Boolean).join(" ")
    : undefined;

  return (
    <CounsellorPortalView
      clientId={clientId}
      clientName={clientName || undefined}
      onBack={() => navigate(`/counselor/client/${clientId}`)}
    />
  );
}
