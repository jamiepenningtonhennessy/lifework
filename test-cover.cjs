"use strict";
const pdfmake = require("pdfmake");
const RobotoFonts = require("pdfmake/fonts/Roboto");
pdfmake.addFonts(RobotoFonts);

const fs = require("fs");
const path = require("path");

const logoB64 = fs.readFileSync(
  path.join(__dirname, "server/routers/lifeworkLogoBase64.ts"),
  "utf8"
).match(/= "(.+)"/)?.[1] ?? "";

const DARK_GREY = "#2c2c2c";
const MID_GREY = "#666666";
const GOLD = "#c9973a";

const dd = {
  pageSize: "A4",
  pageMargins: [60, 80, 60, 80],
  defaultStyle: { font: "Roboto", fontSize: 10.5, color: DARK_GREY },
  background: null,
  header: (p) => p > 1 ? {
    columns: [
      { text: "LIFEWORK CAREER ANALYSIS", font: "Roboto", fontSize: 7, color: MID_GREY, margin: [60, 20, 0, 0] },
      { text: "Jamie Pennington", font: "Roboto", fontSize: 7, color: GOLD, alignment: "right", margin: [0, 20, 60, 0] },
    ]
  } : { text: "", margin: [0,0,0,0] },
  footer: (p, total) => ({
    columns: [
      { text: "Pennington Hennessy", font: "Roboto", fontSize: 7, color: MID_GREY, margin: [60, 20, 0, 0] },
      { text: `${p} / ${total}`, font: "Roboto", fontSize: 7, color: MID_GREY, alignment: "right", margin: [0, 20, 60, 0] },
    ]
  }),
  content: [
    // Cover page
    { text: "", margin: [0, 0, 0, 300] },
    { text: "Jamie Pennington", font: "Roboto", fontSize: 40, bold: false, color: DARK_GREY, alignment: "center", margin: [0, 0, 0, 10] },
    { text: "25 March 2026", font: "Roboto", fontSize: 11, color: MID_GREY, alignment: "center", margin: [0, 0, 0, 0] },
    { image: logoB64, width: 130, absolutePosition: { x: 595 - 60 - 130, y: 842 - 60 - 45 } },
    // Inner pages
    { text: "Section 1 content starts here on page 2.", pageBreak: "before", font: "Roboto", fontSize: 10.5, color: DARK_GREY },
    { text: "Section 2 content starts here on page 3.", pageBreak: "before", font: "Roboto", fontSize: 10.5, color: DARK_GREY },
  ]
};

const pdf = pdfmake.createPdf(dd);
pdf.getBuffer((buf) => {
  fs.writeFileSync("/tmp/cover-test.pdf", buf);
  console.log("PDF written:", buf.length, "bytes");
});
