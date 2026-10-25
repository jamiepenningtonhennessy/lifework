import { mountWithApi } from "./appRuntime";
import LifeworkAccreditationLibrary from "./pages/LifeworkAccreditationLibrary";

export function mountAccreditationLibrary(rootElement: HTMLElement) {
  mountWithApi(rootElement, <LifeworkAccreditationLibrary />);
}
