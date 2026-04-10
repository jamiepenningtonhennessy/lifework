import { generateLifeworkPdf } from "../server/routers/lifeworkPdf.js";
import { writeFileSync } from "fs";

const buf = await generateLifeworkPdf("Jamie Pennington");
writeFileSync("/home/ubuntu/upload/What-Lifework-Reveals-DRAFT.pdf", buf);
console.log("PDF written, size:", buf.length, "bytes");
