import LifeworkLandingConcepts from "./pages/LifeworkLandingConcepts";
import LifeworkCoachPartner from "./pages/LifeworkCoachPartner";
import LifeworkClientVideoLibrary from "./pages/LifeworkAccreditationLibrary";
import { mountWithApi } from "./appRuntime";

export function mountLifeworkPath(rootElement: HTMLElement) {
  const pathname = window.location.pathname;
  const isCoachPartnerPage = pathname === "/coaches" || pathname === "/coaches/";
  const isVideosPage = pathname === "/videos" || pathname === "/videos/";

  mountWithApi(
    rootElement,
    isCoachPartnerPage
      ? <LifeworkCoachPartner />
      : isVideosPage
        ? <LifeworkClientVideoLibrary />
        : <LifeworkLandingConcepts forcedConcept="field-notes" reviewOnly={false} />,
  );
}
