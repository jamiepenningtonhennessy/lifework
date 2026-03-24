/**
 * insightsWheelPng — generates a PNG Buffer of the Insights Discovery colour
 * wheel with a client position dot, for embedding in the pdfmake PDF.
 *
 * Uses sharp to rasterise an inline SVG string.
 */

import { createRequire } from "module";
const _require = createRequire(import.meta.url);

const COLOURS = {
  fieryRed: "#C0392B",
  sunshineYellow: "#D4AC0D",
  earthGreen: "#27AE60",
  coolBlue: "#2980B9",
  fieryRedLight: "#F1948A",
  sunshineYellowLight: "#F9E79F",
  earthGreenLight: "#A9DFBF",
  coolBlueLight: "#AED6F1",
};

function toRad(deg: number) {
  return (deg * Math.PI) / 180;
}

function describeQuadrant(cx: number, cy: number, r: number, quadrant: number): string {
  const startAngles = [-90, 0, 90, 180];
  const start = toRad(startAngles[quadrant]);
  const end = toRad(startAngles[quadrant] + 90);
  const x1 = cx + r * Math.cos(start);
  const y1 = cy + r * Math.sin(start);
  const x2 = cx + r * Math.cos(end);
  const y2 = cy + r * Math.sin(end);
  return `M ${cx} ${cy} L ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 0 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z`;
}

function describeArc(cx: number, cy: number, r: number, startDeg: number, endDeg: number): string {
  const start = toRad(startDeg - 90);
  const end = toRad(endDeg - 90);
  const x1 = cx + r * Math.cos(start);
  const y1 = cy + r * Math.sin(start);
  const x2 = cx + r * Math.cos(end);
  const y2 = cy + r * Math.sin(end);
  return `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 0 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`;
}

function buildWheelSvg(extraversion: number, agreeableness: number, size = 320): string {
  const cx = size / 2;
  const cy = size / 2;
  const outerR = size / 2 - 6;
  const innerR = outerR * 0.16;
  const usableR = outerR - 18;
  const dotR = size * 0.038;

  // Client dot position
  const rawX = cx + ((extraversion - 50) / 50) * usableR;
  const rawY = cy + ((agreeableness - 50) / 50) * usableR;
  const dx = rawX - cx;
  const dy = rawY - cy;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const dotX = dist > usableR ? cx + (dx / dist) * usableR : rawX;
  const dotY = dist > usableR ? cy + (dy / dist) * usableR : rawY;

  const fs = size * 0.052;
  const fsSmall = size * 0.038;

  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg" font-family="Arial, sans-serif">
  <!-- Quadrant fills -->
  <path d="${describeQuadrant(cx, cy, outerR, 0)}" fill="${COLOURS.fieryRedLight}" stroke="white" stroke-width="2"/>
  <path d="${describeQuadrant(cx, cy, outerR, 1)}" fill="${COLOURS.sunshineYellowLight}" stroke="white" stroke-width="2"/>
  <path d="${describeQuadrant(cx, cy, outerR, 2)}" fill="${COLOURS.earthGreenLight}" stroke="white" stroke-width="2"/>
  <path d="${describeQuadrant(cx, cy, outerR, 3)}" fill="${COLOURS.coolBlueLight}" stroke="white" stroke-width="2"/>

  <!-- Outer colour arcs -->
  <path d="${describeArc(cx, cy, outerR - 3, 315, 45)}" fill="none" stroke="${COLOURS.fieryRed}" stroke-width="10" stroke-linecap="butt"/>
  <path d="${describeArc(cx, cy, outerR - 3, 45, 135)}" fill="none" stroke="${COLOURS.sunshineYellow}" stroke-width="10" stroke-linecap="butt"/>
  <path d="${describeArc(cx, cy, outerR - 3, 135, 225)}" fill="none" stroke="${COLOURS.earthGreen}" stroke-width="10" stroke-linecap="butt"/>
  <path d="${describeArc(cx, cy, outerR - 3, 225, 315)}" fill="none" stroke="${COLOURS.coolBlue}" stroke-width="10" stroke-linecap="butt"/>

  <!-- Axis lines -->
  <line x1="${cx}" y1="6" x2="${cx}" y2="${size - 6}" stroke="white" stroke-width="2" opacity="0.7"/>
  <line x1="6" y1="${cy}" x2="${size - 6}" y2="${cy}" stroke="white" stroke-width="2" opacity="0.7"/>

  <!-- Centre circle -->
  <circle cx="${cx}" cy="${cy}" r="${innerR}" fill="white"/>

  <!-- Quadrant labels — placed near outer ring to keep centre area clear for dot -->
  <text x="${cx + outerR * 0.62}" y="${cy - outerR * 0.58}" text-anchor="middle" font-size="${fs}" font-weight="bold" fill="${COLOURS.fieryRed}">Fiery</text>
  <text x="${cx + outerR * 0.62}" y="${cy - outerR * 0.58 + fs * 1.2}" text-anchor="middle" font-size="${fs}" font-weight="bold" fill="${COLOURS.fieryRed}">Red</text>

  <text x="${cx + outerR * 0.52}" y="${cy + outerR * 0.52}" text-anchor="middle" font-size="${fs * 0.82}" font-weight="bold" fill="${COLOURS.sunshineYellow}">Sunshine</text>
  <text x="${cx + outerR * 0.52}" y="${cy + outerR * 0.52 + fs * 1.1}" text-anchor="middle" font-size="${fs * 0.82}" font-weight="bold" fill="${COLOURS.sunshineYellow}">Yellow</text>

  <text x="${cx - outerR * 0.62}" y="${cy + outerR * 0.52}" text-anchor="middle" font-size="${fs}" font-weight="bold" fill="${COLOURS.earthGreen}">Earth</text>
  <text x="${cx - outerR * 0.62}" y="${cy + outerR * 0.52 + fs * 1.2}" text-anchor="middle" font-size="${fs}" font-weight="bold" fill="${COLOURS.earthGreen}">Green</text>

  <text x="${cx - outerR * 0.62}" y="${cy - outerR * 0.58}" text-anchor="middle" font-size="${fs}" font-weight="bold" fill="${COLOURS.coolBlue}">Cool</text>
  <text x="${cx - outerR * 0.62}" y="${cy - outerR * 0.58 + fs * 1.2}" text-anchor="middle" font-size="${fs}" font-weight="bold" fill="${COLOURS.coolBlue}">Blue</text>

  <!-- Axis labels -->
  <text x="${cx}" y="${fsSmall + 2}" text-anchor="middle" font-size="${fsSmall}" fill="#555">Thinker</text>
  <text x="${cx}" y="${size - 3}" text-anchor="middle" font-size="${fsSmall}" fill="#555">Feeler</text>
  <text x="4" y="${cy + fsSmall * 0.4}" text-anchor="start" font-size="${fsSmall}" fill="#555">Introvert</text>
  <text x="${size - 4}" y="${cy + fsSmall * 0.4}" text-anchor="end" font-size="${fsSmall}" fill="#555">Extravert</text>

  <!-- Client dot -->
  <circle cx="${dotX.toFixed(2)}" cy="${dotY.toFixed(2)}" r="${dotR + 4}" fill="white" opacity="0.85"/>
  <circle cx="${dotX.toFixed(2)}" cy="${dotY.toFixed(2)}" r="${dotR}" fill="#1a2744" stroke="white" stroke-width="2.5"/>
</svg>`;
}

export async function generateWheelPng(extraversion: number, agreeableness: number, size = 320): Promise<Buffer> {
  const sharp = _require("sharp") as typeof import("sharp");
  const svg = buildWheelSvg(extraversion, agreeableness, size);
  return sharp(Buffer.from(svg)).png().toBuffer();
}
