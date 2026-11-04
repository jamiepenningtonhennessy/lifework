import type { Browser, LaunchOptions } from "puppeteer";

type LaunchBrowser = (options: LaunchOptions) => Promise<Browser>;

/**
 * Create an independent lifecycle for unit tests. Production callers must use
 * withMasterReportBrowser so all requests share one browser and one busy guard.
 * The caller owns isolated contexts/pages and must close them in its own finally;
 * it must not close the shared browser. This module never handles report HTML.
 */
export function createMasterReportBrowser(launch: LaunchBrowser) {
  let browser: Browser | undefined;
  let busy = false;

  async function resetBrowser(): Promise<void> {
    const staleBrowser = browser;
    browser = undefined;
    if (!staleBrowser) return;

    try {
      await staleBrowser.close();
    } catch {
      // Preserve the original launch/render error, but do not leave a failed
      // Chromium process or protocol connection behind if graceful close fails.
      try {
        const child = staleBrowser.process();
        if (child && child.exitCode === null && child.signalCode === null) {
          child.kill("SIGKILL");
        }
      } catch {
        // The process may already have exited.
      }
      try {
        await staleBrowser.disconnect();
      } catch {
        // The connection may already be disposed.
      }
    }
  }

  return async function withBrowser<T>(
    executablePath: string | undefined,
    operation: (browser: Browser) => Promise<T>
  ): Promise<T> {
    // Set this synchronously, before launch or any other await. There is no
    // queue, polling, or detached cleanup that request-based hosting must keep alive.
    if (busy) {
      throw new Error(
        "A master report is already being generated. Please retry shortly."
      );
    }
    busy = true;

    try {
      // Check lazily on the next request instead of scheduling idle work.
      if (browser && !browser.connected) await resetBrowser();
      if (!browser) {
        browser = await launch({
          executablePath,
          headless: true,
          pipe: true,
          timeout: 45_000,
          protocolTimeout: 60_000,
          args: [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage",
            "--disable-gpu",
            "--renderer-process-limit=1",
            "--no-zygote",
            "--font-render-hinting=none",
          ],
        });
      }
      if (!browser.connected) {
        throw new Error(
          "The master report browser disconnected. Please retry."
        );
      }

      const result = await operation(browser);
      // A completed result remains valid, but a disconnected browser cannot be reused.
      if (!browser.connected) await resetBrowser();
      return result;
    } catch (error) {
      await resetBrowser();
      throw error;
    } finally {
      // Keep the guard held through cleanup, including failed launch/render paths.
      busy = false;
    }
  };
}

const sharedMasterReportBrowser = createMasterReportBrowser(async options => {
  const { default: puppeteer } = await import("puppeteer");
  return puppeteer.launch(options);
});

/** Run one report operation at a time using this Node instance's shared browser. */
export async function withMasterReportBrowser<T>(
  executablePath: string | undefined,
  operation: (browser: Browser) => Promise<T>
): Promise<T> {
  return sharedMasterReportBrowser(executablePath, operation);
}
