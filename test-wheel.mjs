import { generateWheelPng } from './server/routers/insightsWheelPng.js';
import { writeFileSync } from 'fs';

const buf = await generateWheelPng(68, 72, 320);
console.log('Wheel PNG size:', buf.length, 'bytes');
writeFileSync('/tmp/wheel-test.png', buf);
console.log('Saved to /tmp/wheel-test.png');
