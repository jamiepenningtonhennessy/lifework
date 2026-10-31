import type { Request, Response } from "express";
import { sdk } from "./_core/sdk.js";
import { getWowReportDesignBetaVersion } from "./db.js";
import { FAITHFUL_LAYOUT_BETA_VERSION } from "../shared/faithfulLayoutBeta";

export async function handleFaithfulLayoutBetaPdfDownload(req: Request, res: Response): Promise<void> {
  try {
    const user = await sdk.authenticateRequest(req);
    if (!user?.id || user.role !== "admin") {
      res.status(403).json({ error: "Counsellor access required" });
      return;
    }

    const betaId = req.params.betaId;
    const clientId = Number(req.params.clientId);
    if (!betaId || !Number.isInteger(clientId) || clientId <= 0) {
      res.status(400).json({ error: "Invalid faithful layout beta ID" });
      return;
    }

    const beta = await getWowReportDesignBetaVersion(betaId);
    if (
      !beta?.pdfUrl
      || beta.clientId !== clientId
      || beta.betaVersion !== FAITHFUL_LAYOUT_BETA_VERSION
    ) {
      res.status(404).json({ error: "Faithful layout beta PDF not found" });
      return;
    }

    const upstream = await fetch(beta.pdfUrl);
    if (!upstream.ok) {
      res.status(502).json({ error: "Stored faithful layout beta PDF could not be retrieved" });
      return;
    }
    const pdf = Buffer.from(await upstream.arrayBuffer());
    if (pdf.length === 0) {
      res.status(502).json({ error: "Stored faithful layout beta PDF is empty" });
      return;
    }

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="Lifework-Faithful-Layout-Beta-${beta.id}.pdf"`);
    res.setHeader("Content-Length", pdf.length);
    res.setHeader("Cache-Control", "private, no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.status(200).end(pdf);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to deliver faithful layout beta PDF";
    console.error("[faithful-layout-beta-delivery]", message);
    res.status(500).json({ error: "Unable to deliver faithful layout beta PDF" });
  }
}
