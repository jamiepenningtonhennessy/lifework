type PdfTextItem = {
  str?: string;
  transform?: number[];
};

type PdfPage = {
  getViewport: (options: { scale: number }) => { height: number };
  getTextContent: () => Promise<{ items: unknown[] }>;
};

type PdfDocument = {
  numPages: number;
  getPage: (pageNumber: number) => Promise<PdfPage>;
  destroy: () => Promise<void>;
};

type PdfLoadingTask = {
  promise: Promise<PdfDocument>;
};

type PdfJsModule = {
  getDocument: (options: {
    data: Uint8Array;
    disableWorker: boolean;
    standardFontDataUrl?: string;
    verbosity?: number;
  }) => PdfLoadingTask;
};

export type ReportPdfPreflightOptions = {
  documentLabel: string;
  minimumPages?: number;
  requiredPhrases?: string[];
  footerMarkers?: string[];
  headerMarkers?: string[];
  headerRequiredFromPage?: number;
  headerZoneHeight?: number;
  footerZoneHeight?: number;
};

export type ReportPdfPreflightResult = {
  pageCount: number;
  textLength: number;
};

export class ReportPdfPreflightError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ReportPdfPreflightError";
  }
}

function normaliseText(value: string): string {
  return value
    .toLocaleLowerCase("en-GB")
    .replace(/[^a-z0-9]+/gi, "");
}

function textFromItems(items: unknown[]): Array<{ text: string; baselineY: number }> {
  return items.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const candidate = item as PdfTextItem;
    const text = typeof candidate.str === "string" ? candidate.str.trim() : "";
    const baselineY = Array.isArray(candidate.transform) && typeof candidate.transform[5] === "number"
      ? candidate.transform[5]
      : Number.POSITIVE_INFINITY;
    return text ? [{ text, baselineY }] : [];
  });
}

function isAllowedFooterLine(text: string, footerMarkers: string[]): boolean {
  const normalisedLineText = normaliseText(text);
  return footerMarkers.some((marker) => normalisedLineText.includes(marker))
    || /^\s*(?:page\s*)?\d+(?:\s*\/\s*\d+)?\s*$/i.test(text);
}

/**
 * Parses a generated report before it can be uploaded or streamed. The checks
 * are deliberately deterministic: a readable multi-page PDF, expected report
 * text, no body text inside the lower footer band, and (where requested) a
 * recognised header on every interior report page.
 */
export async function preflightReportPdf(
  pdfBuffer: Buffer,
  options: ReportPdfPreflightOptions,
): Promise<ReportPdfPreflightResult> {
  if (!Buffer.isBuffer(pdfBuffer) || pdfBuffer.length < 512) {
    throw new ReportPdfPreflightError(`${options.documentLabel} was not rendered as a usable PDF.`);
  }

  const pdfJsModule = await import("pdfjs-dist/legacy/build/pdf.mjs") as unknown as PdfJsModule;
  const standardFontDataUrl = new URL("../node_modules/pdfjs-dist/standard_fonts/", import.meta.url).toString();
  const loadingTask = pdfJsModule.getDocument({
    data: new Uint8Array(pdfBuffer),
    disableWorker: true,
    standardFontDataUrl,
    verbosity: 0,
  });

  let document: PdfDocument | undefined;
  try {
    document = await loadingTask.promise;
    const minimumPages = options.minimumPages ?? 1;
    if (document.numPages < minimumPages) {
      throw new ReportPdfPreflightError(
        `${options.documentLabel} has ${document.numPages} page${document.numPages === 1 ? "" : "s"}; at least ${minimumPages} required.`,
      );
    }

    const footerMarkers = (options.footerMarkers ?? ["Lifework"]).map(normaliseText);
    const headerMarkers = (options.headerMarkers ?? []).map(normaliseText);
    const headerRequiredFromPage = options.headerRequiredFromPage ?? Number.POSITIVE_INFINITY;
    const headerZoneHeight = options.headerZoneHeight ?? 96;
    const footerZoneHeight = options.footerZoneHeight ?? 48;
    const pageTexts: string[] = [];

    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const viewport = page.getViewport({ scale: 1 });
      const content = await page.getTextContent();
      const items = textFromItems(content.items);
      const pageText = items.map((item) => item.text).join(" ");
      const normalisedPageText = normaliseText(pageText);
      pageTexts.push(pageText);

      if (pageText.length < 8) {
        throw new ReportPdfPreflightError(`${options.documentLabel} has an unreadable page ${pageNumber}.`);
      }

      if (pageNumber >= headerRequiredFromPage && headerMarkers.length > 0) {
        const upperBandText = normaliseText(
          items
            .filter((item) => item.baselineY > viewport.height - headerZoneHeight)
            .map((item) => item.text)
            .join(" "),
        );
        const hasHeader = headerMarkers.some((marker) => upperBandText.includes(marker));
        if (!hasHeader) {
          throw new ReportPdfPreflightError(
            `${options.documentLabel} page ${pageNumber} is missing a recognised page header; it may be an uncontrolled overflow page.`,
          );
        }
      }

      const lowerBandLines: Record<string, string[]> = {};
      for (const item of items.filter((item) => item.baselineY < footerZoneHeight)) {
        const lineKey = String(Math.round(item.baselineY));
        lowerBandLines[lineKey] = [...(lowerBandLines[lineKey] ?? []), item.text];
      }
      const unexpectedLowerBandLines = Object.values(lowerBandLines)
        .map((line) => line.join(" "))
        .filter((line) => !isAllowedFooterLine(line, footerMarkers));
      if (unexpectedLowerBandLines.length > 0) {
        throw new ReportPdfPreflightError(
          `${options.documentLabel} page ${pageNumber} has content inside the reserved footer area.`,
        );
      }
    }

    const normalisedReportText = normaliseText(pageTexts.join(" "));
    const missingPhrases = (options.requiredPhrases ?? []).filter((phrase) => {
      const normalisedPhrase = normaliseText(phrase);
      return normalisedPhrase.length > 0 && !normalisedReportText.includes(normalisedPhrase);
    });
    if (missingPhrases.length > 0) {
      throw new ReportPdfPreflightError(
        `${options.documentLabel} is missing expected report content: ${missingPhrases.join(", ")}.`,
      );
    }

    return { pageCount: document.numPages, textLength: pageTexts.join(" ").length };
  } catch (error) {
    if (error instanceof ReportPdfPreflightError) throw error;
    const message = error instanceof Error ? error.message : String(error);
    throw new ReportPdfPreflightError(`${options.documentLabel} could not be read during PDF preflight: ${message}`);
  } finally {
    if (document) await document.destroy();
  }
}
