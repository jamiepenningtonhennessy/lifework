import LifeworkLandingConcepts from "./pages/LifeworkLandingConcepts";
import { mountWithApi } from "./appRuntime";

export function mountLifeworkPath(rootElement: HTMLElement) {
  mountWithApi(
    rootElement,
    <LifeworkLandingConcepts forcedConcept="field-notes" reviewOnly={false} />,
  );
}
