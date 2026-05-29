/**
 * One-off script: rebuild Amanda Lord's WOW Report PDF from stored JSON.
 * Run with: npx tsx server/scripts/rebuildAmanda.ts
 */
import "dotenv/config";
import { db } from "../db";
import { analysisReports } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { renderWowPdf } from "../routers/wowReport";
import { storagePut } from "../storage";
import { getFamilyBackground, getEducationHistory, getCareerHistory } from "../db";

const CLIENT_ID = 1149902; // Amanda Lord

async function main() {
  console.log(`[rebuildAmanda] Starting PDF rebuild for client ${CLIENT_ID}...`);

  // Load the stored report
  const [report] = await db
    .select()
    .from(analysisReports)
    .where(eq(analysisReports.clientId, CLIENT_ID))
    .limit(1);

  if (!report || !report.wowReportJson) {
    throw new Error("No stored report JSON found for Amanda Lord.");
  }

  const sections = JSON.parse(report.wowReportJson);
  console.log("[rebuildAmanda] Sections present:", Object.keys(sections).join(", "));
  console.log("[rebuildAmanda] lifeHistoryPattern length:", sections.lifeHistoryPattern?.length ?? 0);

  // Render the PDF
  console.log("[rebuildAmanda] Rendering PDF...");
  const pdfBuffer = await renderWowPdf(sections, "house");
  console.log(`[rebuildAmanda] PDF rendered: ${pdfBuffer.length} bytes`);

  // Merge annex if available
  let combinedBuffer = pdfBuffer;
  try {
    const { PDFDocument } = await import("pdf-lib");
    const [familyBg, education, career] = await Promise.all([
      getFamilyBackground(CLIENT_ID),
      getEducationHistory(CLIENT_ID),
      getCareerHistory(CLIENT_ID),
    ]);

    const { generateAnnexPdf } = await import("../routers/wowReport");
    const annexBuffer = await generateAnnexPdf(familyBg, education, career, sections.clientFullName ?? sections.clientName ?? "Amanda Lord");
    if (annexBuffer) {
      const mainDoc = await PDFDocument.load(pdfBuffer);
      const annexDoc = await PDFDocument.load(annexBuffer);
      const annexPages = await mainDoc.copyPages(annexDoc, annexDoc.getPageIndices());
      annexPages.forEach(p => mainDoc.addPage(p));
      combinedBuffer = Buffer.from(await mainDoc.save());
      console.log(`[rebuildAmanda] Annex merged, total pages: ${mainDoc.getPageCount()}`);
    }
  } catch (err) {
    console.warn("[rebuildAmanda] Annex merge failed (using main report only):", err);
  }

  // Upload to S3
  const fileKey = `wow-reports/client-${CLIENT_ID}-rebuild-${Date.now()}.pdf`;
  const { url } = await storagePut(fileKey, combinedBuffer, "application/pdf");
  console.log(`[rebuildAmanda] Uploaded to S3: ${url}`);

  // Update the database
  await db
    .update(analysisReports)
    .set({
      wowReportPdfUrl: url,
      wowReportStatus: "done",
      wowReportError: null,
    })
    .where(eq(analysisReports.clientId, CLIENT_ID));

  console.log("[rebuildAmanda] Database updated. PDF URL:", url);
  console.log("[rebuildAmanda] Done.");
  process.exit(0);
}

main().catch(err => {
  console.error("[rebuildAmanda] FAILED:", err);
  process.exit(1);
});
