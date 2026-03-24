/**
 * InsightsWheel — SVG Insights Discovery colour wheel with a client position dot.
 *
 * Quadrant layout (0°=top, clockwise):
 *   Top-right:    Fiery Red        (Extravert + Thinker)   bisector at  45°
 *   Bottom-right: Sunshine Yellow  (Extravert + Feeler)    bisector at 135°
 *   Bottom-left:  Earth Green      (Introvert + Feeler)    bisector at 225°
 *   Top-left:     Cool Blue        (Introvert + Thinker)   bisector at 315°
 *
 * Labels sit at 72% of outer radius (near the outer ring) so the dot,
 * which is capped at 60% of outer radius, can never overlap them.
 */

interface InsightsWheelProps {
  /** Extraversion score 0–100 (IPIP-NEO domain E) */
  extraversion: number;
  /** Agreeableness score 0–100 (IPIP-NEO domain A) */
  agreeableness: number;
  /** Size in pixels (default 280) */
  size?: number;
  /** Optional className */
  className?: string;
}

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

/** Returns SVG path for a 90° pie slice. quadrant: 0=TR, 1=BR, 2=BL, 3=TL */
function describeQuadrant(cx: number, cy: number, r: number, quadrant: number): string {
  const startAngles = [-90, 0, 90, 180]; // 0=right, -90=top
  const start = toRad(startAngles[quadrant]);
  const end = toRad(startAngles[quadrant] + 90);
  const x1 = cx + r * Math.cos(start);
  const y1 = cy + r * Math.sin(start);
  const x2 = cx + r * Math.cos(end);
  const y2 = cy + r * Math.sin(end);
  return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2} Z`;
}

/** Returns SVG arc path. startDeg/endDeg: 0=top, clockwise. */
function describeArc(cx: number, cy: number, r: number, startDeg: number, endDeg: number): string {
  const start = toRad(startDeg - 90);
  const end = toRad(endDeg - 90);
  const x1 = cx + r * Math.cos(start);
  const y1 = cy + r * Math.sin(start);
  const x2 = cx + r * Math.cos(end);
  const y2 = cy + r * Math.sin(end);
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`;
}

/** Returns the x,y centre of a quadrant at a given radius and midpoint angle. */
function quadrantCentre(cx: number, cy: number, r: number, midDeg: number) {
  const rad = toRad(midDeg - 90); // convert to standard math angle (0°=right)
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

export default function InsightsWheel({
  extraversion,
  agreeableness,
  size = 280,
  className = "",
}: InsightsWheelProps) {
  const cx = size / 2;
  const cy = size / 2;
  const outerR = size / 2 - 4;
  const innerR = outerR * 0.16;

  // Dot is capped at 60% of outer radius — labels sit at 72%, so no overlap possible.
  const usableR = outerR * 0.60;
  const rawDotX = cx + ((extraversion - 50) / 50) * usableR;
  const rawDotY = cy + ((agreeableness - 50) / 50) * usableR;
  const dx = rawDotX - cx;
  const dy = rawDotY - cy;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const dotX = dist > usableR ? cx + (dx / dist) * usableR : rawDotX;
  const dotY = dist > usableR ? cy + (dy / dist) * usableR : rawDotY;
  const dotR = size * 0.038;

  // Label positions at 72% radius, centred on each quadrant's 45° bisector
  const labelR = outerR * 0.72;
  const FR = quadrantCentre(cx, cy, labelR, 45);   // Fiery Red
  const SY = quadrantCentre(cx, cy, labelR, 135);  // Sunshine Yellow
  const EG = quadrantCentre(cx, cy, labelR, 225);  // Earth Green
  const CB = quadrantCentre(cx, cy, labelR, 315);  // Cool Blue

  const fs = size * 0.044;
  const fsSY = size * 0.038; // Sunshine Yellow is a longer word
  const fsSmall = size * 0.036;
  const lineH = fs * 1.25;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={className}
      aria-label="Insights Discovery colour wheel"
    >
      {/* Quadrant fills */}
      <path d={describeQuadrant(cx, cy, outerR, 0)} fill={COLOURS.fieryRedLight} stroke="white" strokeWidth={1.5} />
      <path d={describeQuadrant(cx, cy, outerR, 1)} fill={COLOURS.sunshineYellowLight} stroke="white" strokeWidth={1.5} />
      <path d={describeQuadrant(cx, cy, outerR, 2)} fill={COLOURS.earthGreenLight} stroke="white" strokeWidth={1.5} />
      <path d={describeQuadrant(cx, cy, outerR, 3)} fill={COLOURS.coolBlueLight} stroke="white" strokeWidth={1.5} />

      {/* Outer colour arcs */}
      <path d={describeArc(cx, cy, outerR - 2, 315, 45)} fill="none" stroke={COLOURS.fieryRed} strokeWidth={8} />
      <path d={describeArc(cx, cy, outerR - 2, 45, 135)} fill="none" stroke={COLOURS.sunshineYellow} strokeWidth={8} />
      <path d={describeArc(cx, cy, outerR - 2, 135, 225)} fill="none" stroke={COLOURS.earthGreen} strokeWidth={8} />
      <path d={describeArc(cx, cy, outerR - 2, 225, 315)} fill="none" stroke={COLOURS.coolBlue} strokeWidth={8} />

      {/* Axis lines */}
      <line x1={cx} y1={4} x2={cx} y2={size - 4} stroke="white" strokeWidth={1.5} opacity={0.6} />
      <line x1={4} y1={cy} x2={size - 4} y2={cy} stroke="white" strokeWidth={1.5} opacity={0.6} />

      {/* Centre circle */}
      <circle cx={cx} cy={cy} r={innerR} fill="white" />

      {/* Quadrant labels — at 72% radius, centred on each quadrant's bisector */}
      {/* Fiery Red */}
      <text textAnchor="middle" dominantBaseline="middle" fontFamily="sans-serif" fontWeight="700" fill={COLOURS.fieryRed}>
        <tspan x={FR.x} y={FR.y - lineH * 0.5} fontSize={fs}>Fiery</tspan>
        <tspan x={FR.x} dy={lineH} fontSize={fs}>Red</tspan>
      </text>
      {/* Sunshine Yellow */}
      <text textAnchor="middle" dominantBaseline="middle" fontFamily="sans-serif" fontWeight="700" fill={COLOURS.sunshineYellow}>
        <tspan x={SY.x} y={SY.y - lineH * 0.5} fontSize={fsSY}>Sunshine</tspan>
        <tspan x={SY.x} dy={lineH * 0.95} fontSize={fsSY}>Yellow</tspan>
      </text>
      {/* Earth Green */}
      <text textAnchor="middle" dominantBaseline="middle" fontFamily="sans-serif" fontWeight="700" fill={COLOURS.earthGreen}>
        <tspan x={EG.x} y={EG.y - lineH * 0.5} fontSize={fs}>Earth</tspan>
        <tspan x={EG.x} dy={lineH} fontSize={fs}>Green</tspan>
      </text>
      {/* Cool Blue */}
      <text textAnchor="middle" dominantBaseline="middle" fontFamily="sans-serif" fontWeight="700" fill={COLOURS.coolBlue}>
        <tspan x={CB.x} y={CB.y - lineH * 0.5} fontSize={fs}>Cool</tspan>
        <tspan x={CB.x} dy={lineH} fontSize={fs}>Blue</tspan>
      </text>

      {/* Axis labels */}
      <text x={cx} y={fsSmall + 4} textAnchor="middle" fontSize={fsSmall} fill="#666" fontFamily="sans-serif">Thinker</text>
      <text x={cx} y={size - 4} textAnchor="middle" fontSize={fsSmall} fill="#666" fontFamily="sans-serif">Feeler</text>
      <text x={6} y={cy + fsSmall * 0.4} textAnchor="start" fontSize={fsSmall} fill="#666" fontFamily="sans-serif">Introvert</text>
      <text x={size - 6} y={cy + fsSmall * 0.4} textAnchor="end" fontSize={fsSmall} fill="#666" fontFamily="sans-serif">Extravert</text>

      {/* Client position dot — white halo then navy fill */}
      <circle cx={dotX} cy={dotY} r={dotR + 3} fill="white" opacity={0.9} />
      <circle cx={dotX} cy={dotY} r={dotR} fill="#1a2744" stroke="white" strokeWidth={2} />
    </svg>
  );
}
