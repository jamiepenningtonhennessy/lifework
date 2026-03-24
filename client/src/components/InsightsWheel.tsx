/**
 * InsightsWheel — SVG Insights Discovery colour wheel with a client position dot.
 *
 * The wheel is divided into 4 quadrants:
 *   Top-right:    Fiery Red   (Extravert + Thinker)
 *   Bottom-right: Sunshine Yellow (Extravert + Feeler)
 *   Bottom-left:  Earth Green (Introvert + Feeler)
 *   Top-left:     Cool Blue   (Introvert + Thinker)
 *
 * The client dot is positioned using:
 *   x-axis: Extraversion score (0-100), mapped to left (introvert) → right (extravert)
 *   y-axis: Agreeableness score (0-100), mapped to top (thinker/low A) → bottom (feeler/high A)
 *
 * Both scores are centred at 50 (the midpoint of the wheel).
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
  sunshineYellow: "#F1C40F",
  earthGreen: "#27AE60",
  coolBlue: "#2980B9",
  fieryRedLight: "#E8A09A",
  sunshineYellowLight: "#F9E79F",
  earthGreenLight: "#A9DFBF",
  coolBlueLight: "#AED6F1",
};

export default function InsightsWheel({
  extraversion,
  agreeableness,
  size = 280,
  className = "",
}: InsightsWheelProps) {
  const cx = size / 2;
  const cy = size / 2;
  const outerR = size / 2 - 4;
  const innerR = outerR * 0.18; // small centre circle

  // Map scores to dot position
  // E: 0=far left, 100=far right; centre at 50
  // A: 0=far top (thinker), 100=far bottom (feeler); centre at 50
  const usableR = outerR - 14; // keep dot inside the wheel
  const dotX = cx + ((extraversion - 50) / 50) * usableR;
  const dotY = cy + ((agreeableness - 50) / 50) * usableR;

  // Clamp dot within circle
  const dx = dotX - cx;
  const dy = dotY - cy;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const clampedDotX = dist > usableR ? cx + (dx / dist) * usableR : dotX;
  const clampedDotY = dist > usableR ? cy + (dy / dist) * usableR : dotY;

  const dotR = size * 0.038;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={className}
      aria-label="Insights Discovery colour wheel"
    >
      {/* ── Quadrant arcs (pie segments) ── */}
      {/* Top-right: Fiery Red */}
      <path
        d={describeQuadrant(cx, cy, outerR, 0)}
        fill={COLOURS.fieryRedLight}
        stroke="white"
        strokeWidth={1.5}
      />
      {/* Bottom-right: Sunshine Yellow */}
      <path
        d={describeQuadrant(cx, cy, outerR, 1)}
        fill={COLOURS.sunshineYellowLight}
        stroke="white"
        strokeWidth={1.5}
      />
      {/* Bottom-left: Earth Green */}
      <path
        d={describeQuadrant(cx, cy, outerR, 2)}
        fill={COLOURS.earthGreenLight}
        stroke="white"
        strokeWidth={1.5}
      />
      {/* Top-left: Cool Blue */}
      <path
        d={describeQuadrant(cx, cy, outerR, 3)}
        fill={COLOURS.coolBlueLight}
        stroke="white"
        strokeWidth={1.5}
      />

      {/* ── Outer colour ring (thin arc per quadrant) ── */}
      <path d={describeArc(cx, cy, outerR - 2, 315, 45)} fill="none" stroke={COLOURS.fieryRed} strokeWidth={8} />
      <path d={describeArc(cx, cy, outerR - 2, 45, 135)} fill="none" stroke={COLOURS.sunshineYellow} strokeWidth={8} />
      <path d={describeArc(cx, cy, outerR - 2, 135, 225)} fill="none" stroke={COLOURS.earthGreen} strokeWidth={8} />
      <path d={describeArc(cx, cy, outerR - 2, 225, 315)} fill="none" stroke={COLOURS.coolBlue} strokeWidth={8} />

      {/* ── Axis lines ── */}
      <line x1={cx} y1={4} x2={cx} y2={size - 4} stroke="white" strokeWidth={1.5} opacity={0.7} />
      <line x1={4} y1={cy} x2={size - 4} y2={cy} stroke="white" strokeWidth={1.5} opacity={0.7} />

      {/* ── Centre circle ── */}
      <circle cx={cx} cy={cy} r={innerR} fill="white" />

      {/* ── Quadrant labels ── */}
      <QuadrantLabel cx={cx + outerR * 0.52} cy={cy - outerR * 0.52} label="Fiery Red" colour={COLOURS.fieryRed} size={size} />
      <QuadrantLabel cx={cx + outerR * 0.52} cy={cy + outerR * 0.52} label="Sunshine Yellow" colour={COLOURS.sunshineYellow} size={size} />
      <QuadrantLabel cx={cx - outerR * 0.52} cy={cy + outerR * 0.52} label="Earth Green" colour={COLOURS.earthGreen} size={size} />
      <QuadrantLabel cx={cx - outerR * 0.52} cy={cy - outerR * 0.52} label="Cool Blue" colour={COLOURS.coolBlue} size={size} />

      {/* ── Axis labels ── */}
      <text x={cx} y={10} textAnchor="middle" fontSize={size * 0.038} fill="#666" fontFamily="sans-serif">Thinker</text>
      <text x={cx} y={size - 3} textAnchor="middle" fontSize={size * 0.038} fill="#666" fontFamily="sans-serif">Feeler</text>
      <text x={6} y={cy + 4} textAnchor="start" fontSize={size * 0.038} fill="#666" fontFamily="sans-serif">Introvert</text>
      <text x={size - 6} y={cy + 4} textAnchor="end" fontSize={size * 0.038} fill="#666" fontFamily="sans-serif">Extravert</text>

      {/* ── Client position dot ── */}
      <circle
        cx={clampedDotX}
        cy={clampedDotY}
        r={dotR + 3}
        fill="white"
        opacity={0.85}
      />
      <circle
        cx={clampedDotX}
        cy={clampedDotY}
        r={dotR}
        fill="#1a2744"
        stroke="white"
        strokeWidth={2}
      />
    </svg>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function QuadrantLabel({
  cx, cy, label, colour, size,
}: { cx: number; cy: number; label: string; colour: string; size: number }) {
  const fs = size * 0.042;
  const words = label.split(" ");
  return (
    <text textAnchor="middle" fontFamily="sans-serif" fontWeight="600" fill={colour}>
      {words.map((w, i) => (
        <tspan key={i} x={cx} dy={i === 0 ? `${-((words.length - 1) * fs * 0.6)}` : `${fs * 1.2}`} fontSize={fs}>
          {w}
        </tspan>
      ))}
    </text>
  );
}

/** Returns SVG path for a 90° pie slice. quadrant: 0=TR, 1=BR, 2=BL, 3=TL */
function describeQuadrant(cx: number, cy: number, r: number, quadrant: number): string {
  const startAngles = [-90, 0, 90, 180]; // degrees, 0=right, -90=top
  const start = toRad(startAngles[quadrant]);
  const end = toRad(startAngles[quadrant] + 90);
  const x1 = cx + r * Math.cos(start);
  const y1 = cy + r * Math.sin(start);
  const x2 = cx + r * Math.cos(end);
  const y2 = cy + r * Math.sin(end);
  return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2} Z`;
}

/** Returns SVG arc path from startDeg to endDeg (clockwise, 0=right) */
function describeArc(cx: number, cy: number, r: number, startDeg: number, endDeg: number): string {
  const start = toRad(startDeg - 90); // rotate so 0° = top
  const end = toRad(endDeg - 90);
  const x1 = cx + r * Math.cos(start);
  const y1 = cy + r * Math.sin(start);
  const x2 = cx + r * Math.cos(end);
  const y2 = cy + r * Math.sin(end);
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`;
}

function toRad(deg: number) {
  return (deg * Math.PI) / 180;
}
