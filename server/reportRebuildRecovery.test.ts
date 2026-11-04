import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";
import { getAnalysisReport, upsertAnalysisReport } from "./db";
import { generateMasterReportPdf } from "./masterReportPdf";
import { preflightReportPdf } from "./reportPdfPreflight";
import { storagePut } from "./storage";
import { wowReportRouter } from "./routers/wowReport";

vi.mock("./db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./db")>();
  return { ...actual, getAnalysisReport: vi.fn(), upsertAnalysisReport: vi.fn() };
});
vi.mock("./routers/claudeExport", () => ({ buildClaudeExportJson: vi.fn().mockResolvedValue({}) }));
vi.mock("./html-report", () => ({ renderHtmlReport: vi.fn().mockReturnValue("<html>Synthetic only</html>") }));
vi.mock("./masterReportPdf", () => ({ generateMasterReportPdf: vi.fn() }));
vi.mock("./reportPdfPreflight", () => ({ preflightReportPdf: vi.fn() }));
vi.mock("./storage", () => ({ storagePut: vi.fn() }));

const ctx = {
  user: { id: 9999, openId: "synthetic-admin", name: "Synthetic Admin", email: "test@example.com", role: "admin", loginMethod: "manus", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
  req: { protocol: "https", headers: {} },
  res: {},
} as TrpcContext;
const source = JSON.stringify({ clientName: "Synthetic Client", summary: "Unchanged stored report source" });

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getAnalysisReport).mockResolvedValue({ clientId: 9999, wowReportJson: source, wowReportStatus: "error", wowReportError: "Previous browser failure" } as any);
  vi.mocked(generateMasterReportPdf).mockResolvedValue(Buffer.from("synthetic-pdf"));
  vi.mocked(preflightReportPdf).mockResolvedValue({ pageCount: 3, textLength: 1000 });
  vi.mocked(storagePut).mockResolvedValue({ key: "synthetic", url: "https://example.com/synthetic.pdf" });
  vi.mocked(upsertAnalysisReport).mockResolvedValue(undefined);
});

describe("PDF rebuild recovery", () => {
  it("marks done and clears the old error only after successful rendering, preflight and upload", async () => {
    const result = await wowReportRouter.createCaller(ctx).rebuildPdf({ clientId: 9999 });
    expect(result.pdfUrl).toBe("https://example.com/synthetic.pdf");
    expect(preflightReportPdf).toHaveBeenCalledTimes(2);
    expect(upsertAnalysisReport).toHaveBeenCalledWith(expect.objectContaining({ clientId: 9999, wowReportPdfUrl: result.pdfUrl, wowReportStatus: "done", wowReportError: null, wowReportGeneratedAt: expect.any(Date) }));
    expect(vi.mocked(upsertAnalysisReport).mock.calls[0][0]).not.toHaveProperty("wowReportJson");
    expect(storagePut.mock.invocationCallOrder[0]).toBeLessThan(upsertAnalysisReport.mock.invocationCallOrder[0]);
  });

  it("leaves the saved source and PDF unchanged if Chromium cannot launch", async () => {
    vi.mocked(generateMasterReportPdf).mockRejectedValueOnce(new Error("error while loading shared libraries: libglib-2.0.so.0"));
    await expect(wowReportRouter.createCaller(ctx).rebuildPdf({ clientId: 9999 })).rejects.toThrow("libglib-2.0.so.0");
    expect(storagePut).not.toHaveBeenCalled();
    expect(upsertAnalysisReport).not.toHaveBeenCalled();
  });

  it("does not release a PDF that fails the page-boundary preflight", async () => {
    vi.mocked(preflightReportPdf).mockRejectedValueOnce(new Error("Synthetic footer overflow"));
    await expect(wowReportRouter.createCaller(ctx).rebuildPdf({ clientId: 9999 })).rejects.toThrow("footer overflow");
    expect(storagePut).not.toHaveBeenCalled();
    expect(upsertAnalysisReport).not.toHaveBeenCalled();
  });

  it("does not clear a prior error if PDF upload fails", async () => {
    vi.mocked(storagePut).mockRejectedValueOnce(new Error("Synthetic upload failure"));
    await expect(wowReportRouter.createCaller(ctx).rebuildPdf({ clientId: 9999 })).rejects.toThrow("upload failure");
    expect(upsertAnalysisReport).not.toHaveBeenCalled();
  });
});
