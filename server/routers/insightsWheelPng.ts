/**
 * insightsWheelPng — generates a PNG Buffer of the Insights Discovery colour
 * wheel with a client position dot, for embedding in the pdfmake PDF.
 *
 * Uses sharp (librsvg) to rasterise an inline SVG string.
 *
 * Renders: four light-tint quadrant fills + thick outer colour ring + client dot.
 * No text labels (avoids font rendering issues in the headless server environment).
 *
 * Quadrant layout (0° = top, clockwise):
 *   Fiery Red       — top-right    (quadrant 0)
 *   Sunshine Yellow — bottom-right (quadrant 1)
 *   Earth Green     — bottom-left  (quadrant 2)
 *   Cool Blue       — top-left     (quadrant 3)
 */

import { createRequire } from "module";
const _require = createRequire(import.meta.url);

const COLOURS = {
  fieryRed:            "#C0392B",
  sunshineYellow:      "#D4AC0D",
  earthGreen:          "#27AE60",
  coolBlue:            "#2980B9",
  fieryRedLight:       "#F1948A",
  sunshineYellowLight: "#F9E79F",
  earthGreenLight:     "#A9DFBF",
  coolBlueLight:       "#AED6F1",
};

function toRad(deg: number) { return (deg * Math.PI) / 180; }

/** SVG arc path from startDeg to endDeg (0° = top, clockwise). */
function describeArc(cx: number, cy: number, r: number, startDeg: number, endDeg: number): string {
  const s = toRad(startDeg - 90);
  const e = toRad(endDeg   - 90);
  const x1 = cx + r * Math.cos(s);
  const y1 = cy + r * Math.sin(s);
  const x2 = cx + r * Math.cos(e);
  const y2 = cy + r * Math.sin(e);
  return `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 0 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`;
}

/** SVG pie-slice path for one quadrant. quadrant: 0=TR, 1=BR, 2=BL, 3=TL */
function describeQuadrant(cx: number, cy: number, r: number, quadrant: number): string {
  const startAngles = [-90, 0, 90, 180];
  const s = toRad(startAngles[quadrant]);
  const e = toRad(startAngles[quadrant] + 90);
  const x1 = cx + r * Math.cos(s);
  const y1 = cy + r * Math.sin(s);
  const x2 = cx + r * Math.cos(e);
  const y2 = cy + r * Math.sin(e);
  return `M ${cx} ${cy} L ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 0 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z`;
}

function buildWheelSvg(extraversion: number, agreeableness: number, size = 320): string {
  const cx = size / 2;
  const cy = size / 2;
  const outerR = size / 2 - 4;   // quadrant fill radius — almost fills canvas
  const ringW  = outerR * 0.10;  // thickness of outer colour ring
  const ringR  = outerR + ringW / 2;
  const innerR = outerR * 0.14;  // centre white circle
  const usableR = outerR * 0.58; // max dot travel radius
  const dotR   = size * 0.038;

  // Client dot position
  // Extraversion: high → right (+x); Agreeableness: high → bottom (+y in SVG = Feeler)
  const rawX = cx + ((extraversion  - 50) / 50) * usableR;
  const rawY = cy + ((agreeableness - 50) / 50) * usableR;
  const dx = rawX - cx;
  const dy = rawY - cy;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const dotX = dist > usableR ? cx + (dx / dist) * usableR : rawX;
  const dotY = dist > usableR ? cy + (dy / dist) * usableR : rawY;

  // Total canvas must contain the ring
  const totalR = outerR + ringW;
  const svgSize = Math.ceil(totalR * 2) + 8;
  const scx = svgSize / 2;
  const scy = svgSize / 2;

  return `<svg width="${svgSize}" height="${svgSize}" viewBox="0 0 ${svgSize} ${svgSize}" xmlns="http://www.w3.org/2000/svg">

  <!-- Quadrant fills (light tints) -->
  <path d="${describeQuadrant(scx, scy, outerR, 0)}" fill="${COLOURS.fieryRedLight}"       stroke="white" stroke-width="1.5"/>
  <path d="${describeQuadrant(scx, scy, outerR, 1)}" fill="${COLOURS.sunshineYellowLight}" stroke="white" stroke-width="1.5"/>
  <path d="${describeQuadrant(scx, scy, outerR, 2)}" fill="${COLOURS.earthGreenLight}"     stroke="white" stroke-width="1.5"/>
  <path d="${describeQuadrant(scx, scy, outerR, 3)}" fill="${COLOURS.coolBlueLight}"       stroke="white" stroke-width="1.5"/>

  <!-- Outer colour ring -->
  <path d="${describeArc(scx, scy, ringR, 315, 45)}"  fill="none" stroke="${COLOURS.fieryRed}"       stroke-width="${ringW}" stroke-linecap="butt"/>
  <path d="${describeArc(scx, scy, ringR, 45, 135)}"  fill="none" stroke="${COLOURS.sunshineYellow}" stroke-width="${ringW}" stroke-linecap="butt"/>
  <path d="${describeArc(scx, scy, ringR, 135, 225)}" fill="none" stroke="${COLOURS.earthGreen}"     stroke-width="${ringW}" stroke-linecap="butt"/>
  <path d="${describeArc(scx, scy, ringR, 225, 315)}" fill="none" stroke="${COLOURS.coolBlue}"       stroke-width="${ringW}" stroke-linecap="butt"/>

  <!-- Axis dividers -->
  <line x1="${scx}" y1="${scy - outerR}" x2="${scx}" y2="${scy + outerR}" stroke="white" stroke-width="2" opacity="0.6"/>
  <line x1="${scx - outerR}" y1="${scy}" x2="${scx + outerR}" y2="${scy}" stroke="white" stroke-width="2" opacity="0.6"/>

  <!-- Centre white circle -->
  <circle cx="${scx}" cy="${scy}" r="${innerR}" fill="white"/>

  <!-- Client dot — white halo then navy fill -->
  <circle cx="${(scx + (dotX - cx)).toFixed(2)}" cy="${(scy + (dotY - cy)).toFixed(2)}" r="${(dotR + 3.5).toFixed(1)}" fill="white" opacity="0.9"/>
  <circle cx="${(scx + (dotX - cx)).toFixed(2)}" cy="${(scy + (dotY - cy)).toFixed(2)}" r="${dotR.toFixed(1)}" fill="#1a2744" stroke="white" stroke-width="2.5"/>
</svg>`;
}

export async function generateWheelPng(extraversion: number, agreeableness: number, size = 320): Promise<Buffer> {
  const sharp = _require("sharp") as typeof import("sharp");
  const svg = buildWheelSvg(extraversion, agreeableness, size);
  return sharp(Buffer.from(svg)).png().toBuffer();
}
