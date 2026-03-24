import { createRequire } from "module";
const _require = createRequire(import.meta.url);

try {
  // pdfmake 0.3.x: use main entry (js/index.js), not build/pdfmake.js
  const pdfmake = _require("pdfmake");
  console.log("pdfmake loaded, createPdf type:", typeof pdfmake.createPdf);
  
  // Add standard fonts
  const Roboto = _require("pdfmake/fonts/Roboto");
  pdfmake.addFonts({ Roboto });
  console.log("Fonts added");

  const docDef = {
    defaultStyle: { font: "Roboto" },
    content: [{ text: "Hello World — pdfmake 0.3.x test", fontSize: 18 }]
  };
  
  const pdfDoc = pdfmake.createPdf(docDef);
  console.log("pdfDoc created, calling getBuffer()...");
  
  // In 0.3.x, getBuffer() returns a Promise
  const buffer = await pdfDoc.getBuffer();
  console.log("SUCCESS — buffer size:", buffer.length);
} catch (e) {
  console.error("FAILED:", String(e));
  console.error(e);
}
