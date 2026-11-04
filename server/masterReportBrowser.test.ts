import type { Browser, LaunchOptions } from "puppeteer";
import { describe, expect, it, vi } from "vitest";
import {
  createMasterReportBrowser,
  withMasterReportBrowser,
} from "./masterReportBrowser";

const { defaultLaunch } = vi.hoisted(() => ({ defaultLaunch: vi.fn() }));
vi.mock("puppeteer", () => ({ default: { launch: defaultLaunch } }));

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function mockBrowser() {
  let connected = true;
  const close = vi.fn(async () => {
    connected = false;
  });
  const disconnect = vi.fn(async () => {
    connected = false;
  });
  const process = vi.fn<Browser["process"]>(() => null);
  const browser = {
    get connected() {
      return connected;
    },
    close,
    disconnect,
    process,
  } as unknown as Browser;
  return {
    browser,
    close,
    disconnect,
    process,
    setConnected(value: boolean) {
      connected = value;
    },
  };
}

function mockLaunch() {
  return vi.fn<(options: LaunchOptions) => Promise<Browser>>();
}

describe("master report shared browser lifecycle", () => {
  it("launches through a pipe with the required constrained-host settings", async () => {
    const fake = mockBrowser();
    const launch = mockLaunch().mockResolvedValue(fake.browser);
    const withBrowser = createMasterReportBrowser(launch);
    const operation = vi.fn(async (browser: Browser) => {
      expect(browser).toBe(fake.browser);
      return "synthetic result";
    });

    await expect(withBrowser("/synthetic/chromium", operation)).resolves.toBe(
      "synthetic result"
    );
    expect(launch).toHaveBeenCalledTimes(1);
    expect(launch).toHaveBeenCalledWith({
      executablePath: "/synthetic/chromium",
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
    expect(operation).toHaveBeenCalledTimes(1);
    expect(fake.close).not.toHaveBeenCalled();
  });

  it("reuses the connected browser and preserves generic operation results", async () => {
    const fake = mockBrowser();
    const launch = mockLaunch().mockResolvedValue(fake.browser);
    const withBrowser = createMasterReportBrowser(launch);
    const result = { synthetic: true };

    await expect(
      withBrowser(undefined, async browser => browser)
    ).resolves.toBe(fake.browser);
    await expect(withBrowser(undefined, async () => result)).resolves.toBe(
      result
    );
    expect(launch).toHaveBeenCalledTimes(1);
    expect(launch.mock.calls[0][0].executablePath).toBeUndefined();
    expect(fake.close).not.toHaveBeenCalled();
  });

  it("rejects overlapping requests immediately while launch is pending", async () => {
    const fake = mockBrowser();
    const launching = deferred<Browser>();
    const launch = mockLaunch().mockReturnValue(launching.promise);
    const withBrowser = createMasterReportBrowser(launch);
    const firstOperation = vi.fn(async () => "first");
    const overlappingOperation = vi.fn(async () => "must not run");
    const first = withBrowser(undefined, firstOperation);

    await expect(withBrowser(undefined, overlappingOperation)).rejects.toThrow(
      "A master report is already being generated. Please retry shortly."
    );
    expect(launch).toHaveBeenCalledTimes(1);
    expect(firstOperation).not.toHaveBeenCalled();
    expect(overlappingOperation).not.toHaveBeenCalled();
    launching.resolve(fake.browser);
    await expect(first).resolves.toBe("first");
  });

  it("rejects overlap during rendering without queueing the rejected operation", async () => {
    const fake = mockBrowser();
    const launch = mockLaunch().mockResolvedValue(fake.browser);
    const withBrowser = createMasterReportBrowser(launch);
    const started = deferred<void>();
    const rendering = deferred<string>();
    const first = withBrowser(undefined, async () => {
      started.resolve();
      return rendering.promise;
    });
    await started.promise;
    const overlappingOperation = vi.fn(async () => "must not run");

    await expect(withBrowser(undefined, overlappingOperation)).rejects.toThrow(
      /already being generated.*retry/i
    );
    rendering.resolve("first");
    await expect(first).resolves.toBe("first");
    await expect(withBrowser(undefined, async () => "retry")).resolves.toBe(
      "retry"
    );
    expect(overlappingOperation).not.toHaveBeenCalled();
    expect(launch).toHaveBeenCalledTimes(1);
  });

  it("releases the guard after a launch failure so a subsequent request retries", async () => {
    const fake = mockBrowser();
    const failure = new Error("synthetic launch failure");
    const launch = mockLaunch()
      .mockRejectedValueOnce(failure)
      .mockResolvedValueOnce(fake.browser);
    const withBrowser = createMasterReportBrowser(launch);
    const operation = vi.fn(async () => "retry");

    await expect(withBrowser(undefined, operation)).rejects.toBe(failure);
    expect(operation).not.toHaveBeenCalled();
    await expect(withBrowser(undefined, operation)).resolves.toBe("retry");
    expect(launch).toHaveBeenCalledTimes(2);
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it("awaits render-failure cleanup, keeps the guard held, and relaunches on retry", async () => {
    const failed = mockBrowser();
    const replacement = mockBrowser();
    const closing = deferred<void>();
    const closeStarted = deferred<void>();
    failed.close.mockImplementationOnce(async () => {
      closeStarted.resolve();
      await closing.promise;
      failed.setConnected(false);
    });
    const launch = mockLaunch()
      .mockResolvedValueOnce(failed.browser)
      .mockResolvedValueOnce(replacement.browser);
    const withBrowser = createMasterReportBrowser(launch);
    const failure = new Error("synthetic render failure");
    const first = withBrowser(undefined, async () => {
      throw failure;
    });
    const rejection = expect(first).rejects.toBe(failure);
    await closeStarted.promise;

    await expect(
      withBrowser(undefined, async () => "must not run")
    ).rejects.toThrow(/retry/i);
    expect(launch).toHaveBeenCalledTimes(1);
    closing.resolve();
    await rejection;
    expect(failed.close).toHaveBeenCalledTimes(1);
    await expect(
      withBrowser(undefined, async browser => browser)
    ).resolves.toBe(replacement.browser);
    expect(launch).toHaveBeenCalledTimes(2);
  });

  it("closes a cached disconnected browser before launching its replacement", async () => {
    const stale = mockBrowser();
    const replacement = mockBrowser();
    const launch = mockLaunch()
      .mockResolvedValueOnce(stale.browser)
      .mockImplementationOnce(async () => {
        expect(stale.close).toHaveBeenCalledTimes(1);
        return replacement.browser;
      });
    const withBrowser = createMasterReportBrowser(launch);
    await withBrowser(undefined, async () => "first");
    stale.setConnected(false);

    await expect(
      withBrowser(undefined, async browser => browser)
    ).resolves.toBe(replacement.browser);
    expect(launch).toHaveBeenCalledTimes(2);
  });

  it("rejects and cleans up a browser that launches disconnected, then recovers", async () => {
    const disconnected = mockBrowser();
    disconnected.setConnected(false);
    const replacement = mockBrowser();
    const launch = mockLaunch()
      .mockResolvedValueOnce(disconnected.browser)
      .mockResolvedValueOnce(replacement.browser);
    const withBrowser = createMasterReportBrowser(launch);
    const operation = vi.fn(async () => "retry");

    await expect(withBrowser(undefined, operation)).rejects.toThrow(
      /browser disconnected.*retry/i
    );
    expect(operation).not.toHaveBeenCalled();
    expect(disconnected.close).toHaveBeenCalledTimes(1);
    await expect(withBrowser(undefined, operation)).resolves.toBe("retry");
    expect(launch).toHaveBeenCalledTimes(2);
  });

  it("cleans up a browser disconnected during successful work without losing its result", async () => {
    const disconnected = mockBrowser();
    const replacement = mockBrowser();
    const launch = mockLaunch()
      .mockResolvedValueOnce(disconnected.browser)
      .mockResolvedValueOnce(replacement.browser);
    const withBrowser = createMasterReportBrowser(launch);

    await expect(
      withBrowser(undefined, async () => {
        disconnected.setConnected(false);
        return "completed result";
      })
    ).resolves.toBe("completed result");
    expect(disconnected.close).toHaveBeenCalledTimes(1);
    await expect(
      withBrowser(undefined, async browser => browser)
    ).resolves.toBe(replacement.browser);
  });

  it("kills a still-running process and disconnects if close fails, preserving the render error", async () => {
    const failed = mockBrowser();
    const replacement = mockBrowser();
    const kill = vi.fn(() => true);
    failed.process.mockReturnValue({
      exitCode: null,
      signalCode: null,
      kill,
    } as unknown as ReturnType<Browser["process"]>);
    failed.close.mockRejectedValueOnce(new Error("synthetic cleanup failure"));
    failed.disconnect.mockRejectedValueOnce(new Error("already disconnected"));
    const launch = mockLaunch()
      .mockResolvedValueOnce(failed.browser)
      .mockResolvedValueOnce(replacement.browser);
    const withBrowser = createMasterReportBrowser(launch);
    const failure = new Error("synthetic render failure");

    await expect(
      withBrowser(undefined, async () => {
        throw failure;
      })
    ).rejects.toBe(failure);
    expect(kill).toHaveBeenCalledTimes(1);
    expect(kill).toHaveBeenCalledWith("SIGKILL");
    expect(failed.disconnect).toHaveBeenCalledTimes(1);
    await expect(
      withBrowser(undefined, async browser => browser)
    ).resolves.toBe(replacement.browser);
  });

  it("exports a production wrapper that shares the mocked default Puppeteer launch", async () => {
    const fake = mockBrowser();
    defaultLaunch.mockResolvedValueOnce(fake.browser);

    await expect(
      withMasterReportBrowser(undefined, async () => 1)
    ).resolves.toBe(1);
    await expect(
      withMasterReportBrowser(undefined, async () => 2)
    ).resolves.toBe(2);
    expect(defaultLaunch).toHaveBeenCalledTimes(1);
    expect(defaultLaunch).toHaveBeenCalledWith(
      expect.objectContaining({ pipe: true })
    );
    expect(fake.close).not.toHaveBeenCalled();
  });
});
