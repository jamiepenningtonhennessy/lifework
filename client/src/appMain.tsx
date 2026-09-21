import App from "./App";
import { mountWithApi } from "./appRuntime";

export function mountApplication(rootElement: HTMLElement) {
  mountWithApi(rootElement, <App />);
}
