import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISSED_KEY = "lifework-pwa-install-dismissed";

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Don't show if already dismissed this session
    if (sessionStorage.getItem(DISMISSED_KEY)) return;

    // Don't show if already running as installed PWA
    if (window.matchMedia("(display-mode: standalone)").matches) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Small delay so the page has settled before the banner slides in
      setTimeout(() => setVisible(true), 2000);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setVisible(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    sessionStorage.setItem(DISMISSED_KEY, "1");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 p-4 safe-area-pb"
      style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
    >
      <div
        className="mx-auto max-w-sm rounded-2xl shadow-2xl overflow-hidden"
        style={{ background: "#0d1b2e", border: "1px solid rgba(201,150,58,0.3)" }}
      >
        <div className="flex items-center gap-3 p-4">
          <img
            src="/icon-192.png"
            alt="Lifework"
            className="w-12 h-12 rounded-xl flex-shrink-0"
          />
          <div className="flex-1 min-w-0">
            <p className="text-white font-semibold text-sm leading-tight">
              Add Lifework to your home screen
            </p>
            <p className="text-white/60 text-xs mt-0.5">
              Access your career analysis anytime, offline
            </p>
          </div>
          <button
            onClick={handleDismiss}
            className="text-white/40 hover:text-white/70 transition-colors flex-shrink-0 p-1"
            aria-label="Dismiss"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M12.854 3.146a.5.5 0 0 1 0 .708L8.707 8l4.147 4.146a.5.5 0 0 1-.708.708L8 8.707l-4.146 4.147a.5.5 0 0 1-.708-.708L7.293 8 3.146 3.854a.5.5 0 0 1 .708-.708L8 7.293l4.146-4.147a.5.5 0 0 1 .708 0z" />
            </svg>
          </button>
        </div>
        <div className="px-4 pb-4">
          <button
            onClick={handleInstall}
            className="w-full py-2.5 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90 active:opacity-75"
            style={{ background: "#C9963A", color: "#0d1b2e" }}
          >
            Install App
          </button>
        </div>
      </div>
    </div>
  );
}
