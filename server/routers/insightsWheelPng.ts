/**
 * insightsWheelPng — generates a PNG Buffer of the Insights Discovery colour
 * wheel with a client position dot, for embedding in the pdfmake PDF.
 *
 * Uses sharp to rasterise an inline SVG string.
 *
 * Label strategy: each quadrant label is centred at the 45° midpoint of its
 * slice, at ~55% of the outer radius. This keeps labels well away from the
 * axis lines and from each other.
 *
 * Quadrant layout (0° = right, angles increase clockwise):
 *   Fiery Red      — top-right  — midpoint at  315° (= -45°)
 *   Sunshine Yellow— bottom-right — midpoint at 45°
 *   Earth Green    — bottom-left — midpoint at 135°
 *   Cool Blue      — top-left   — midpoint at 225°
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
  // quadrant: 0=TR (Fiery Red), 1=BR (Sunshine Yellow), 2=BL (Earth Green), 3=TL (Cool Blue)
  const startAngles = [-90, 0, 90, 180]; // 0° = right, -90° = top
  const start = toRad(startAngles[quadrant]);
  const end = toRad(startAngles[quadrant] + 90);
  const x1 = cx + r * Math.cos(start);
  const y1 = cy + r * Math.sin(start);
  const x2 = cx + r * Math.cos(end);
  const y2 = cy + r * Math.sin(end);
  return `M ${cx} ${cy} L ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 0 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z`;
}

function describeArc(cx: number, cy: number, r: number, startDeg: number, endDeg: number): string {
  // startDeg/endDeg: 0 = top, clockwise
  const start = toRad(startDeg - 90);
  const end = toRad(endDeg - 90);
  const x1 = cx + r * Math.cos(start);
  const y1 = cy + r * Math.sin(start);
  const x2 = cx + r * Math.cos(end);
  const y2 = cy + r * Math.sin(end);
  return `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 0 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`;
}

/**
 * Returns the SVG x,y centre of a quadrant at a given radius fraction.
 * midDeg: the 45° bisector of the quadrant (0° = top, clockwise).
 */
function quadrantCentre(cx: number, cy: number, r: number, midDeg: number) {
  const rad = toRad(midDeg - 90); // convert to standard math angle (0° = right)
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}

function buildWheelSvg(extraversion: number, agreeableness: number, size = 320): string {
  const cx = size / 2;
  const cy = size / 2;
  const outerR = size / 2 - 6;
  const innerR = outerR * 0.16;
  // Cap dot movement to 60% of outer radius so it never reaches the label zone (72%).
  const usableR = outerR * 0.60;
  const dotR = size * 0.038;

  // Label radius: 72% of outer radius — labels sit near the outer ring,
  // leaving the inner area free for the client dot to move without overlap.
  const labelR = outerR * 0.72;
  // Font sizes — slightly smaller so labels fit within the arc
  const fs = Math.round(size * 0.044);        // quadrant label
  const fsSmall = Math.round(size * 0.036);   // axis label
  const lineH = fs * 1.25;

  // Quadrant label centres (midpoint of each 90° slice, 0°=top clockwise)
  const FR = quadrantCentre(cx, cy, labelR, 45);   // Fiery Red: top-right, bisector at 45°
  const SY = quadrantCentre(cx, cy, labelR, 135);  // Sunshine Yellow: bottom-right, 135°
  const EG = quadrantCentre(cx, cy, labelR, 225);  // Earth Green: bottom-left, 225°
  const CB = quadrantCentre(cx, cy, labelR, 315);  // Cool Blue: top-left, 315°

  // Client dot position
  const rawX = cx + ((extraversion - 50) / 50) * usableR;
  const rawY = cy + ((agreeableness - 50) / 50) * usableR;
  const dx = rawX - cx;
  const dy = rawY - cy;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const dotX = dist > usableR ? cx + (dx / dist) * usableR : rawX;
  const dotY = dist > usableR ? cy + (dy / dist) * usableR : rawY;

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
  <line x1="${cx}" y1="6" x2="${cx}" y2="${size - 6}" stroke="white" stroke-width="2" opacity="0.6"/>
  <line x1="6" y1="${cy}" x2="${size - 6}" y2="${cy}" stroke="white" stroke-width="2" opacity="0.6"/>

  <!-- Centre circle -->
  <circle cx="${cx}" cy="${cy}" r="${innerR}" fill="white"/>

  <!-- Quadrant labels — centred at 45° bisector of each slice at 58% radius -->
  <!-- Fiery Red (top-right) -->
  <text x="${FR.x.toFixed(1)}" y="${(FR.y - lineH * 0.5).toFixed(1)}" text-anchor="middle" dominant-baseline="middle" font-size="${fs}" font-weight="bold" fill="${COLOURS.fieryRed}">Fiery</text>
  <text x="${FR.x.toFixed(1)}" y="${(FR.y + lineH * 0.5).toFixed(1)}" text-anchor="middle" dominant-baseline="middle" font-size="${fs}" font-weight="bold" fill="${COLOURS.fieryRed}">Red</text>

  <!-- Sunshine Yellow (bottom-right) -->
  <text x="${SY.x.toFixed(1)}" y="${(SY.y - lineH * 0.5).toFixed(1)}" text-anchor="middle" dominant-baseline="middle" font-size="${Math.round(fs * 0.85)}" font-weight="bold" fill="${COLOURS.sunshineYellow}">Sunshine</text>
  <text x="${SY.x.toFixed(1)}" y="${(SY.y + lineH * 0.5).toFixed(1)}" text-anchor="middle" dominant-baseline="middle" font-size="${Math.round(fs * 0.85)}" font-weight="bold" fill="${COLOURS.sunshineYellow}">Yellow</text>

  <!-- Earth Green (bottom-left) -->
  <text x="${EG.x.toFixed(1)}" y="${(EG.y - lineH * 0.5).toFixed(1)}" text-anchor="middle" dominant-baseline="middle" font-size="${fs}" font-weight="bold" fill="${COLOURS.earthGreen}">Earth</text>
  <text x="${EG.x.toFixed(1)}" y="${(EG.y + lineH * 0.5).toFixed(1)}" text-anchor="middle" dominant-baseline="middle" font-size="${fs}" font-weight="bold" fill="${COLOURS.earthGreen}">Green</text>

  <!-- Cool Blue (top-left) -->
  <text x="${CB.x.toFixed(1)}" y="${(CB.y - lineH * 0.5).toFixed(1)}" text-anchor="middle" dominant-baseline="middle" font-size="${fs}" font-weight="bold" fill="${COLOURS.coolBlue}">Cool</text>
  <text x="${CB.x.toFixed(1)}" y="${(CB.y + lineH * 0.5).toFixed(1)}" text-anchor="middle" dominant-baseline="middle" font-size="${fs}" font-weight="bold" fill="${COLOURS.coolBlue}">Blue</text>

  <!-- Axis labels — small, at the very edge of the wheel -->
  <text x="${cx}" y="${fsSmall + 4}" text-anchor="middle" font-size="${fsSmall}" fill="#666">Thinker</text>
  <text x="${cx}" y="${size - 4}" text-anchor="middle" font-size="${fsSmall}" fill="#666">Feeler</text>
  <text x="6" y="${cy + fsSmall * 0.4}" text-anchor="start" font-size="${fsSmall}" fill="#666">Introvert</text>
  <text x="${size - 6}" y="${cy + fsSmall * 0.4}" text-anchor="end" font-size="${fsSmall}" fill="#666">Extravert</text>

  <!-- Client dot — white halo then navy fill -->
  <circle cx="${dotX.toFixed(2)}" cy="${dotY.toFixed(2)}" r="${(dotR + 4).toFixed(1)}" fill="white" opacity="0.9"/>
  <circle cx="${dotX.toFixed(2)}" cy="${dotY.toFixed(2)}" r="${dotR.toFixed(1)}" fill="#1a2744" stroke="white" stroke-width="2.5"/>
</svg>`;
}

export async function generateWheelPng(extraversion: number, agreeableness: number, size = 320): Promise<Buffer> {
  const sharp = _require("sharp") as typeof import("sharp");
  const svg = buildWheelSvg(extraversion, agreeableness, size);
  return sharp(Buffer.from(svg)).png().toBuffer();
}
