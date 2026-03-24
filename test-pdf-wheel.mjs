// Test full PDF generation with the Insights wheel embedded
import { writeFileSync } from 'fs';

// Simulate the renderWowPdf call by importing the module
const { generateWheelPng } = await import('./server/routers/insightsWheelPng.js');
import { createRequire } from 'module';
const _require = createRequire(import.meta.url);

const pdfmake = _require('pdfmake');
const RobotoFonts = _require('pdfmake/fonts/Roboto');
pdfmake.addFonts(RobotoFonts);

// Generate wheel
const wheelPng = await generateWheelPng(68, 72, 320);
const wheelDataUrl = `data:image/png;base64,${wheelPng.toString('base64')}`;
console.log('Wheel PNG generated:', wheelPng.length, 'bytes');

const docDefinition = {
  pageSize: 'A4',
  pageMargins: [60, 80, 60, 80],
  content: [
    { text: 'Section 5: Your Behavioural Style', fontSize: 14, bold: true, color: '#0a1628', margin: [0, 20, 0, 6] },
    {
      columns: [
        {
          image: wheelDataUrl,
          width: 180,
          margin: [0, 0, 16, 12],
        },
        {
          stack: [
            {
              table: {
                widths: ['*'],
                body: [[{
                  stack: [
                    { text: 'PRIMARY ENERGY', fontSize: 7, color: '#0a1628', characterSpacing: 1, margin: [0, 0, 0, 3] },
                    { text: 'Sunshine Yellow', fontSize: 14, bold: true, color: '#c9973a' },
                  ],
                  border: [false, false, false, false],
                  fillColor: '#f5f1e8',
                  margin: [10, 8, 10, 8],
                }]],
              },
              layout: 'noBorders',
              margin: [0, 0, 0, 6],
            },
            {
              table: {
                widths: ['*'],
                body: [[{
                  stack: [
                    { text: 'SECONDARY ENERGY', fontSize: 7, color: '#0a1628', characterSpacing: 1, margin: [0, 0, 0, 3] },
                    { text: 'Earth Green', fontSize: 14, bold: false, color: '#0a1628' },
                  ],
                  border: [false, false, false, false],
                  fillColor: '#eae6de',
                  margin: [10, 8, 10, 8],
                }]],
              },
              layout: 'noBorders',
              margin: [0, 0, 0, 6],
            },
          ],
          width: '*',
        },
      ],
      columnGap: 0,
      margin: [0, 0, 0, 16],
    },
    { text: 'This is the behavioural style narrative text.', fontSize: 10.5, margin: [0, 0, 0, 8] },
  ],
};

const pdfDoc = pdfmake.createPdf(docDefinition);
const buf = await pdfDoc.getBuffer();
writeFileSync('/tmp/pdf-wheel-test.pdf', buf);
console.log('PDF generated:', buf.length, 'bytes → /tmp/pdf-wheel-test.pdf');
