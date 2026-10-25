import "./index.css";
import { shouldLoadStandaloneLanding } from "./lib/lifeworkDomain";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Application root element was not found.");
}

const useStandaloneLanding = shouldLoadStandaloneLanding(
  window.location.hostname,
  window.location.pathname,
);

const bootstrapMessage = rootElement.querySelector<HTMLElement>(".site-bootstrap__message");
if (bootstrapMessage && !useStandaloneLanding) {
  bootstrapMessage.textContent = "Opening Pennington Hennessy";
}

const showBootstrapError = () => {
  rootElement.innerHTML = "";
  const message = document.createElement("p");
  message.textContent = "LifeworkPath could not open just now. Please refresh the page.";
  message.style.cssText = "margin: 0; padding: 48px 24px; color: #112238; font: 500 18px/1.5 Georgia, serif; text-align: center;";
  rootElement.appendChild(message);
};

if (useStandaloneLanding) {
  void import("./lifeworkPathMain")
    .then(({ mountLifeworkPath }) => mountLifeworkPath(rootElement))
    .catch(showBootstrapError);
} else {
  void import("./appMain")
    .then(({ mountApplication }) => mountApplication(rootElement))
    .catch(showBootstrapError);
}
