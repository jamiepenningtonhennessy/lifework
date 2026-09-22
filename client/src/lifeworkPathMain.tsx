import LifeworkLandingConcepts from "./pages/LifeworkLandingConcepts";
import LifeworkCoachPartner from "./pages/LifeworkCoachPartner";
import { mountWithApi } from "./appRuntime";

export function mountLifeworkPath(rootElement: HTMLElement) {
  const pathname = window.location.pathname;
  const isCoachPartnerPage = pathname === "/coaches" || pathname === "/coaches/";

  mountWithApi(
    rootElement,
    isCoachPartnerPage
      ? <LifeworkCoachPartner />
      : <LifeworkLandingConcepts forcedConcept="field-notes" reviewOnly={false} />,
  );
}
