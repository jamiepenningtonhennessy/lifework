import { createRequire } from "module";
const _require = createRequire(import.meta.url);

const pdfmake = _require("pdfmake");
const RobotoFonts = _require("pdfmake/fonts/Roboto");
// RobotoFonts = { Roboto: { normal: '...ttf', bold: '...ttf', ... } }
pdfmake.addFonts(RobotoFonts);

const docDef = {
  defaultStyle: { font: "Roboto" },
  content: [{ text: "Hello World — pdfmake 0.3.x test", fontSize: 18 }]
};

const pdfDoc = pdfmake.createPdf(docDef);
const buffer = await pdfDoc.getBuffer();
console.log("SUCCESS — buffer size:", buffer.length);
