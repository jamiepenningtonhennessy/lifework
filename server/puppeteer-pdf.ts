/**
 * Legacy final-report download route.
 *
 * The report pipeline now creates, validates and stores the definitive PDF
 * before a report can be released. This route deliberately streams that same
 * stored PDF rather than producing a second fixed-height HTML rendition whose
 * pagination could differ from the approved report.
 */

import type { Request, Response } from "express";
import { streamAuthorisedFinalReport } from "./finalReportDelivery.js";

export async function handlePuppeteerPdfDownload(req: Request, res: Response): Promise<void> {
  await streamAuthorisedFinalReport(req, res, "attachment");
}
