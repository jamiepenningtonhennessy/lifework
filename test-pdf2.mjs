import { createRequire } from 'module';
const _require = createRequire(import.meta.url);

const pdfmake = _require('pdfmake');
const RobotoFonts = _require('pdfmake/fonts/Roboto');
pdfmake.addFonts(RobotoFonts);

const NAVY = '#0f1f35';
const GOLD = '#c9973a';
const CREAM = '#f5f1e8';

// Test 1: No background at all - just multi-page content
const docDef = {
  pageSize: 'A4',
  pageMargins: [60, 80, 60, 80],
  defaultStyle: { font: 'Roboto', fontSize: 10.5 },
  header: (currentPage) =>
    currentPage > 1
      ? { text: 'HEADER', fontSize: 7 }
      : { text: '', margin: [0,0,0,0] },
  content: [
    { text: 'Cover', fontSize: 28, margin: [0, 200, 0, 0] },
    { text: 'Section 2', pageBreak: 'before', fontSize: 14 },
    { text: 'Body text. '.repeat(50) },
    { text: 'Section 3', pageBreak: 'before', fontSize: 14 },
    { text: 'More text. '.repeat(50) },
  ],
};

const pdfDoc = pdfmake.createPdf(docDef);
pdfDoc.getBuffer().then(buf => {
  console.log('Test 1 (no background): SUCCESS, size =', buf.length);
}).catch(err => {
  console.error('Test 1 FAILED:', err.message);
});
