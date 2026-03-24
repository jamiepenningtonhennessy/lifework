import { createRequire } from "module";
const _require = createRequire(import.meta.url);

try {
  console.log("Loading pdfmake from project dir...");
  const pdfMake = _require("pdfmake/build/pdfmake.js");
  console.log("pdfmake loaded OK, type:", typeof pdfMake?.createPdf);
  const pdfFonts = _require("pdfmake/build/vfs_fonts.js");
  pdfMake.vfs = pdfFonts.pdfMake?.vfs ?? pdfFonts.vfs;
  console.log("vfs keys:", Object.keys(pdfMake.vfs ?? {}).slice(0, 3));

  const pdfDoc = pdfMake.createPdf({ content: [{ text: "Hello World" }] });
  await new Promise<void>((resolve, reject) => {
    pdfDoc.getBuffer((buffer: Buffer) => {
      console.log("SUCCESS — buffer size:", buffer.length);
      resolve();
    });
  });
} catch (e) {
  console.error("FAILED:", String(e));
}
