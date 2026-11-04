// @vitest-environment jsdom
import React from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import WowReportTab from "../client/src/components/WowReportTab";

const state = vi.hoisted(() => ({
  report: null as any,
  pdfMutate: vi.fn(),
  generateMutate: vi.fn(),
  pdfOptions: [] as any[],
  invalidate: vi.fn(),
  toastError: vi.fn(),
}));
vi.mock("@/lib/trpc", () => {
  const node = (path: string[] = []): any => new Proxy(() => {}, {
    get: (_target, key) => {
      if (key === "useUtils") return () => node(["utils"]);
      if (key === "invalidate") return state.invalidate;
      if (key === "fetch") return vi.fn(async () => state.report);
      if (key === "useQuery") return () => ({ data: path.join(".") === "wowReport.get" ? state.report : undefined });
      if (key === "useMutation") return (options: any) => {
        const route = path.join(".");
        if (route === "wowReport.rebuildPdf") state.pdfOptions.push(options);
        return { isPending: false, mutate: route === "wowReport.rebuildPdf" ? state.pdfMutate : route === "wowReport.generate" ? state.generateMutate : vi.fn() };
      };
      return node([...path, String(key)]);
    },
  });
  return { trpc: node() };
});
vi.mock("sonner", () => ({ toast: { error: state.toastError, success: vi.fn(), info: vi.fn() } }));
vi.mock("@/components/SageCounsellorPanel", () => ({ default: () => null }));
vi.mock("@/components/ClaudeJsonPreviewModal", () => ({ default: () => null }));
vi.mock("@/components/InsightsMapping", () => ({ InsightsMapping: () => null }));
vi.mock("streamdown", () => ({ Streamdown: ({ children }: any) => children }));

beforeEach(() => {
  vi.stubGlobal("React", React);
  state.pdfMutate.mockReset();
  state.generateMutate.mockReset();
  state.invalidate.mockReset();
  state.toastError.mockReset();
  state.pdfOptions = [];
  state.report = { exists: true, status: "pdf_pending", pdfUrl: null, sections: null, writingStyle: "house", reportType: "standard", generatedAt: null, locked: false };
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("saved report PDF workflow", () => {
  it("resumes the pending formatted PDF exactly once without generating a new analysis", () => {
    const view = render(<WowReportTab clientId={9999} clientName="Synthetic Client" />);
    expect(screen.getByText("Your report text has been saved.")).toBeTruthy();
    expect(state.pdfMutate).toHaveBeenCalledTimes(1);
    expect(state.pdfMutate).toHaveBeenCalledWith({ clientId: 9999, writingStyle: "house" });
    view.rerender(<WowReportTab clientId={9999} clientName="Synthetic Client" />);
    expect(state.pdfMutate).toHaveBeenCalledTimes(1);
    expect(state.generateMutate).not.toHaveBeenCalled();
  });

  it("leaves failed PDF creation as an explicit retry without an automatic failure loop", () => {
    render(<WowReportTab clientId={9999} clientName="Synthetic Client" />);
    act(() => state.pdfOptions[0].onError(new Error("Synthetic browser failure")));
    expect(state.toastError).toHaveBeenCalledWith(expect.stringContaining("report text is saved"));
    expect(state.pdfMutate).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "Retry PDF" }));
    expect(state.pdfMutate).toHaveBeenCalledTimes(2);
    expect(state.generateMutate).not.toHaveBeenCalled();
  });

  it("does not present a previous released PDF as the pending replacement", () => {
    state.report.pdfUrl = "https://example.com/previous-synthetic.pdf";
    render(<WowReportTab clientId={9999} clientName="Synthetic Client" />);
    expect(screen.getByText("Text saved · PDF pending")).toBeTruthy();
    expect((screen.getByRole("button", { name: "View Final PDF" }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole("button", { name: "Download Final PDF" }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.queryByText("Report ready")).toBeNull();
  });
});
