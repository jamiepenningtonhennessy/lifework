import { access } from "node:fs/promises";
import { constants } from "node:fs";
import puppeteer from "puppeteer";

// Executed inside the production image after its full build. No client data,
// database calls, remote pages or external font downloads are involved.
const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
let browser;

try {
  if (!executablePath) {
    throw new Error("PUPPETEER_EXECUTABLE_PATH must identify the installed production browser.");
  }
  await access(executablePath, constants.X_OK);
  browser = await puppeteer.launch({
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
  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  await page.setContent("<!doctype html><html><head><meta charset='utf-8'></head><body><h1>Lifework report browser check</h1><p>Synthetic build verification only.</p></body></html>");
  const pdf = Buffer.from(await page.pdf({ format: "A4", printBackground: true }));
  await context.close();
  if (pdf.length < 1000 || pdf.subarray(0, 5).toString("ascii") !== "%PDF-") {
    throw new Error("The production browser did not create a usable PDF.");
  }
  console.log("[report-browser-check] Passed: installed Chromium launched and created an A4 PDF.");
} catch (error) {
  console.error("[report-browser-check] FAILED: production report rendering is not ready.");
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
} finally {
  if (browser) await browser.close();
}
