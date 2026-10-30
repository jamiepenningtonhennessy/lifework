import PDFDocument from "pdfkit";
import { describe, expect, it } from "vitest";
import { preflightReportPdf, ReportPdfPreflightError } from "./reportPdfPreflight";

type TestPdfOptions = {
  addHeaderOnSecondPage?: boolean;
  addFooterIntrusion?: boolean;
};

function makeTestPdf(options: TestPdfOptions = {}): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const document = new PDFDocument({ size: "A4", margin: 0 });
    const chunks: Buffer[] = [];
    document.on("data", (chunk: Buffer) => chunks.push(chunk));
    document.on("end", () => resolve(Buffer.concat(chunks)));
    document.on("error", reject);

    document.fontSize(15).text("WOW Report · Test Client", 50, 60);
    document.fontSize(11).text("The first page contains readable report content.", 50, 120);
    document.fontSize(8).text("Lifework", 50, 810, { width: 495, align: "center", lineBreak: false });

    document.addPage();
    if (options.addHeaderOnSecondPage !== false) {
      document.fontSize(15).text("Chapter 01 · Summary", 50, 60);
    }
    document.fontSize(11).text("The second page contains the completed report narrative.", 50, 120);
    if (options.addFooterIntrusion) {
      document.fontSize(9).text("Unexpected body content in the footer zone", 50, 810, { width: 400, lineBreak: false });
    } else {
      document.fontSize(8).text("Lifework", 50, 810, { width: 495, align: "center", lineBreak: false });
    }

    document.end();
  });
}

const releaseGateOptions = {
  documentLabel: "Test WOW Report",
  minimumPages: 2,
  requiredPhrases: ["Test Client", "Lifework"],
  footerMarkers: ["Lifework"],
  headerMarkers: ["Chapter"],
  headerRequiredFromPage: 2,
};

describe("report PDF release preflight", () => {
  it("accepts a readable, branded report with headers and footers in their reserved bands", async () => {
    const result = await preflightReportPdf(await makeTestPdf(), releaseGateOptions);

    expect(result.pageCount).toBe(2);
    expect(result.textLength).toBeGreaterThan(80);
  });

  it("rejects a PDF when report body text enters the reserved footer band", async () => {
    await expect(
      preflightReportPdf(await makeTestPdf({ addFooterIntrusion: true }), releaseGateOptions),
    ).rejects.toBeInstanceOf(ReportPdfPreflightError);
  });

  it("rejects an uncontrolled continuation page with no recognised header", async () => {
    await expect(
      preflightReportPdf(await makeTestPdf({ addHeaderOnSecondPage: false }), releaseGateOptions),
    ).rejects.toThrow("missing a recognised page header");
  });

  it("rejects a report when an expected core phrase was lost during rendering", async () => {
    await expect(
      preflightReportPdf(await makeTestPdf(), {
        ...releaseGateOptions,
        requiredPhrases: [...releaseGateOptions.requiredPhrases, "A phrase which is not present"],
      }),
    ).rejects.toThrow("missing expected report content");
  });
});
