/**
 * InsightsMapping.tsx
 *
 * Maps OCEAN (Big Five) scores onto the Insights Discovery / DISC colour-energy
 * framework using the academic consensus mapping:
 *
 *   Extraversion (E)  →  Introvert ↔ Extravert axis (horizontal)
 *   Agreeableness (A) →  Thinker ↔ Feeler axis (vertical, inverted: low A = Thinker = top)
 *   Openness (O)      →  Sensing ↔ Intuiting (Jungian S/N)
 *   Conscientiousness (C) → Judging ↔ Perceiving (Jungian J/P)
 *
 * Quadrant layout (matching Insights Discovery reference):
 *   Top-left:     Cool Blue      — Introverted Thinker   (low E, low A)
 *   Top-right:    Fiery Red      — Extraverted Thinker   (high E, low A)
 *   Bottom-left:  Earth Green    — Introverted Feeler    (low E, high A)
 *   Bottom-right: Sunshine Yellow — Extraverted Feeler   (high E, high A)
 *
 * Axis rule from reference image:
 *   Red + Yellow = Extrovert (right side)
 *   Blue + Red   = Thinker   (top half)
 *
 * References:
 *   Furnham, A. (2022). Correlations between the NEO-PI-R and MBTI. SCIRP.
 *   Insights Discovery® is a registered trademark of The Insights Group Ltd.
 *   This mapping is an approximation for coaching purposes only.
 */

interface InsightsMappingProps {
  /** 0–100 Extraversion domain score */
  extraversion: number;
  /** 0–100 Agreeableness domain score */
  agreeableness: number;
  /** 0–100 Openness domain score */
  openness: number;
  /** 0–100 Conscientiousness domain score */
  conscientiousness: number;
}

interface ColourEnergy {
  name: string;
  hex: string;
  borderHex: string;
  textHex: string;
  jungian: string;
  description: string;
  strengths: string[];
  challenges: string[];
  careerFit: string;
}

const COLOUR_ENERGIES: Record<string, ColourEnergy> = {
  blue: {
    name: "Cool Blue",
    hex: "#2471A3",
    borderHex: "#1A5276",
    textHex: "#ffffff",
    jungian: "Introverted Thinker (IT)",
    description:
      "Analytical, cautious, and precise. Values accuracy, quality, and rigour. Prefers to work with data and evidence before reaching conclusions. Can appear detached or over-cautious.",
    strengths: ["Analytical", "Precise", "Systematic", "Thorough", "Objective"],
    challenges: ["Can be over-cautious", "May over-analyse", "Dislikes ambiguity"],
    careerFit:
      "Roles requiring analysis, precision, and systematic thinking — finance, engineering, research, IT, quality assurance, law.",
  },
  red: {
    name: "Fiery Red",
    hex: "#A93226",
    borderHex: "#7B241C",
    textHex: "#ffffff",
    jungian: "Extraverted Thinker (ET)",
    description:
      "Driven, purposeful, and results-oriented. Prefers to lead from the front, takes decisive action, and is comfortable with challenge and competition. Can be direct to the point of bluntness.",
    strengths: ["Decisive", "Determined", "Strong-willed", "Purposeful", "Results-focused"],
    challenges: ["May appear insensitive", "Can be impatient", "Dislikes indecision in others"],
    careerFit:
      "Roles requiring leadership, accountability, and the ability to drive change — management, entrepreneurship, law, surgery, strategy.",
  },
  green: {
    name: "Earth Green",
    hex: "#6E9B1E",
    borderHex: "#4A6B10",
    textHex: "#ffffff",
    jungian: "Introverted Feeler (IF)",
    description:
      "Caring, patient, and values-driven. Prioritises harmony, loyalty, and the wellbeing of others. Prefers to work collaboratively and dislikes conflict.",
    strengths: ["Empathetic", "Patient", "Reliable", "Supportive", "Values-driven"],
    challenges: ["Can avoid necessary conflict", "May be indecisive", "Dislikes rapid change"],
    careerFit:
      "Roles requiring empathy, support, and long-term relationship management — counselling, HR, nursing, social work, community roles.",
  },
  yellow: {
    name: "Sunshine Yellow",
    hex: "#E8B84B",
    borderHex: "#C49A2A",
    textHex: "#1a1008",
    jungian: "Extraverted Feeler (EF)",
    description:
      "Enthusiastic, persuasive, and sociable. Energised by people and ideas, brings optimism and creativity to groups. Can lose focus on detail and follow-through.",
    strengths: ["Enthusiastic", "Persuasive", "Creative", "Optimistic", "Collaborative"],
    challenges: ["Can be disorganised", "May over-promise", "Dislikes routine and detail"],
    careerFit:
      "Roles requiring communication, creativity, and relationship-building — sales, marketing, PR, teaching, facilitation, consulting.",
  },
};

/**
 * Determine primary colour energy.
 * Axes:
 *   Extraversion ≥ 50 → Extravert (right: Red or Yellow)
 *   Agreeableness < 50 → Thinker (top: Blue or Red)
 */
function getColourEnergy(extraversion: number, agreeableness: number): string {
  const isExtravert = extraversion >= 50;
  const isFeeler = agreeableness >= 50;
  if (!isExtravert && !isFeeler) return "blue";   // top-left
  if (isExtravert && !isFeeler) return "red";     // top-right
  if (!isExtravert && isFeeler) return "green";   // bottom-left
  return "yellow";                                 // bottom-right
}

function getSecondaryEnergy(extraversion: number, agreeableness: number): string {
  const eDistance = Math.abs(extraversion - 50);
  const aDistance = Math.abs(agreeableness - 50);
  const primary = getColourEnergy(extraversion, agreeableness);

  if (eDistance < aDistance) {
    const flippedE = extraversion >= 50 ? 30 : 70;
    const candidate = getColourEnergy(flippedE, agreeableness);
    return candidate !== primary ? candidate : getColourEnergy(extraversion, agreeableness >= 50 ? 30 : 70);
  } else {
    const flippedA = agreeableness >= 50 ? 30 : 70;
    const candidate = getColourEnergy(extraversion, flippedA);
    return candidate !== primary ? candidate : getColourEnergy(extraversion >= 50 ? 30 : 70, agreeableness);
  }
}

function getJungianType(
  extraversion: number,
  agreeableness: number,
  openness: number,
  conscientiousness: number
): string {
  const E_or_I = extraversion >= 50 ? "E" : "I";
  const S_or_N = openness >= 50 ? "N" : "S";
  const T_or_F = agreeableness >= 50 ? "F" : "T";
  const J_or_P = conscientiousness >= 50 ? "J" : "P";
  return `${E_or_I}${S_or_N}${T_or_F}${J_or_P}`;
}

// ─── Circular Quadrant Wheel SVG ──────────────────────────────────────────────
// ViewBox: 240×240, centre: 120,120, outer radius: 108, inner clip radius: 108

function QuadrantWheel({
  extraversion,
  agreeableness,
}: {
  extraversion: number;
  agreeableness: number;
}) {
  // Map scores to SVG coordinates
  // x: left = introvert, right = extravert
  // y: top = thinker (low A), bottom = feeler (high A)
  const normX = (extraversion - 50) / 50;   // -1 to +1
  const normY = (agreeableness - 50) / 50;  // -1 to +1 (positive = feeler = down)

  const cx = 120 + normX * 72;
  const cy = 120 + normY * 72;

  const primaryKey = getColourEnergy(extraversion, agreeableness);
  const dotColour = COLOUR_ENERGIES[primaryKey].hex;
  const dotBorder = COLOUR_ENERGIES[primaryKey].borderHex;

  // Quadrant arc paths (each is a quarter circle)
  // SVG arc: top-left=blue, top-right=red, bottom-left=green, bottom-right=yellow
  // Outer ring radius: 108, inner clip: 0 (full circle, clipped by quadrant)
  const R = 108;
  const cx0 = 120;
  const cy0 = 120;

  // Helper: arc path for a quadrant
  // startAngle, endAngle in degrees (0 = right, 90 = down)
  function quadrantPath(startDeg: number, endDeg: number): string {
    const toRad = (d: number) => (d * Math.PI) / 180;
    const x1 = cx0 + R * Math.cos(toRad(startDeg));
    const y1 = cy0 + R * Math.sin(toRad(startDeg));
    const x2 = cx0 + R * Math.cos(toRad(endDeg));
    const y2 = cy0 + R * Math.sin(toRad(endDeg));
    return `M ${cx0} ${cy0} L ${x1} ${y1} A ${R} ${R} 0 0 1 ${x2} ${y2} Z`;
  }

  // Label path along the outer ring (just outside R+6)
  const LR = R + 14;
  function labelArcPath(startDeg: number, endDeg: number, id: string): string {
    const toRad = (d: number) => (d * Math.PI) / 180;
    const midDeg = (startDeg + endDeg) / 2;
    // For bottom labels, we want text to read correctly — use a reversed arc
    const sweep = endDeg > startDeg ? 1 : 0;
    const x1 = cx0 + LR * Math.cos(toRad(startDeg));
    const y1 = cy0 + LR * Math.sin(toRad(startDeg));
    const x2 = cx0 + LR * Math.cos(toRad(endDeg));
    const y2 = cy0 + LR * Math.sin(toRad(endDeg));
    return `M ${x1} ${y1} A ${LR} ${LR} 0 0 ${sweep} ${x2} ${y2}`;
  }

  return (
    <svg
      viewBox="0 0 240 240"
      className="w-full max-w-[280px] mx-auto drop-shadow-md"
      aria-label="Insights colour energy wheel"
    >
      <defs>
        {/* Clip to circle */}
        <clipPath id="circleClip">
          <circle cx={cx0} cy={cy0} r={R} />
        </clipPath>
        {/* Label arc paths */}
        {/* Cool Blue: top-left, 180°→270° */}
        <path id="labelBlue" d={labelArcPath(195, 265, "labelBlue")} fill="none" />
        {/* Fiery Red: top-right, 270°→360° */}
        <path id="labelRed" d={labelArcPath(275, 345, "labelRed")} fill="none" />
        {/* Earth Green: bottom-left, 90°→180° */}
        <path id="labelGreen" d={labelArcPath(105, 175, "labelGreen")} fill="none" />
        {/* Sunshine Yellow: bottom-right, 0°→90° */}
        <path id="labelYellow" d={labelArcPath(15, 85, "labelYellow")} fill="none" />
      </defs>

      {/* Outer border ring */}
      <circle cx={cx0} cy={cy0} r={R + 3} fill="none" stroke="#d0d0d0" strokeWidth="2" />

      {/* Quadrant fills clipped to circle */}
      <g clipPath="url(#circleClip)">
        {/* Top-left: Cool Blue (270°→360° = top-left quarter) */}
        <path d={quadrantPath(180, 270)} fill={COLOUR_ENERGIES.blue.hex} />
        {/* Top-right: Fiery Red */}
        <path d={quadrantPath(270, 360)} fill={COLOUR_ENERGIES.red.hex} />
        {/* Bottom-left: Earth Green */}
        <path d={quadrantPath(90, 180)} fill={COLOUR_ENERGIES.green.hex} />
        {/* Bottom-right: Sunshine Yellow */}
        <path d={quadrantPath(0, 90)} fill={COLOUR_ENERGIES.yellow.hex} />
      </g>

      {/* Dividing lines */}
      <line x1={cx0} y1={cy0 - R} x2={cx0} y2={cy0 + R} stroke="white" strokeWidth="2.5" />
      <line x1={cx0 - R} y1={cy0} x2={cx0 + R} y2={cy0} stroke="white" strokeWidth="2.5" />

      {/* Outer colour ring border per quadrant */}
      <g clipPath="url(#circleClip)">
        <path d={quadrantPath(180, 270)} fill="none" stroke={COLOUR_ENERGIES.blue.borderHex} strokeWidth="5" opacity="0.4" />
        <path d={quadrantPath(270, 360)} fill="none" stroke={COLOUR_ENERGIES.red.borderHex} strokeWidth="5" opacity="0.4" />
        <path d={quadrantPath(90, 180)} fill="none" stroke={COLOUR_ENERGIES.green.borderHex} strokeWidth="5" opacity="0.4" />
        <path d={quadrantPath(0, 90)} fill="none" stroke={COLOUR_ENERGIES.yellow.borderHex} strokeWidth="5" opacity="0.4" />
      </g>

      {/* Curved labels along outer ring */}
      <text fontSize="11" fontWeight="800" fontFamily="sans-serif" fill={COLOUR_ENERGIES.blue.hex} letterSpacing="1.5">
        <textPath href="#labelBlue" startOffset="50%" textAnchor="middle">COOL BLUE</textPath>
      </text>
      <text fontSize="11" fontWeight="800" fontFamily="sans-serif" fill={COLOUR_ENERGIES.red.hex} letterSpacing="1.5">
        <textPath href="#labelRed" startOffset="50%" textAnchor="middle">FIERY RED</textPath>
      </text>
      <text fontSize="11" fontWeight="800" fontFamily="sans-serif" fill={COLOUR_ENERGIES.green.hex} letterSpacing="1.5">
        <textPath href="#labelGreen" startOffset="50%" textAnchor="middle">EARTH GREEN</textPath>
      </text>
      <text fontSize="11" fontWeight="800" fontFamily="sans-serif" fill={COLOUR_ENERGIES.yellow.borderHex} letterSpacing="1.5">
        <textPath href="#labelYellow" startOffset="50%" textAnchor="middle">SUNSHINE YELLOW</textPath>
      </text>

      {/* Axis labels inside wheel */}
      <text x={cx0} y={cy0 - R + 18} textAnchor="middle" fontSize="7.5" fill="rgba(255,255,255,0.85)" fontWeight="600">THINKER</text>
      <text x={cx0} y={cy0 + R - 10} textAnchor="middle" fontSize="7.5" fill="rgba(255,255,255,0.85)" fontWeight="600">FEELER</text>
      <text x={cx0 - R + 10} y={cy0 + 3} textAnchor="middle" fontSize="7.5" fill="rgba(255,255,255,0.85)" fontWeight="600" transform={`rotate(-90,${cx0 - R + 10},${cy0})`}>INTROVERT</text>
      <text x={cx0 + R - 10} y={cy0 + 3} textAnchor="middle" fontSize="7.5" fill="rgba(255,255,255,0.85)" fontWeight="600" transform={`rotate(90,${cx0 + R - 10},${cy0})`}>EXTRAVERT</text>

      {/* Client position dot */}
      <circle
        cx={cx}
        cy={cy}
        r="9"
        fill={dotColour}
        stroke={dotBorder}
        strokeWidth="2.5"
        filter="drop-shadow(0 1px 3px rgba(0,0,0,0.4))"
      />
      <circle cx={cx} cy={cy} r="3.5" fill="white" opacity="0.9" />
    </svg>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function InsightsMapping({
  extraversion,
  agreeableness,
  openness,
  conscientiousness,
}: InsightsMappingProps) {
  const primaryKey = getColourEnergy(extraversion, agreeableness);
  const secondaryKey = getSecondaryEnergy(extraversion, agreeableness);
  const primary = COLOUR_ENERGIES[primaryKey];
  const secondary = COLOUR_ENERGIES[secondaryKey];
  const jungian = getJungianType(extraversion, agreeableness, openness, conscientiousness);

  const eLabel =
    extraversion >= 65 ? "Strongly Extraverted" :
    extraversion >= 50 ? "Moderately Extraverted" :
    extraversion >= 35 ? "Moderately Introverted" : "Strongly Introverted";
  const aLabel =
    agreeableness >= 65 ? "Strongly Feeling" :
    agreeableness >= 50 ? "Moderately Feeling" :
    agreeableness >= 35 ? "Moderately Thinking" : "Strongly Thinking";
  const oLabel = openness >= 50 ? "Intuiting (N)" : "Sensing (S)";
  const cLabel = conscientiousness >= 50 ? "Judging (J)" : "Perceiving (P)";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-xl p-5 border" style={{ background: "var(--lw-navy)", borderColor: "rgba(201,151,58,0.3)" }}>
        <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: "var(--lw-gold)" }}>
          Insights Discovery Mapping
        </p>
        <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.75)" }}>
          The following is an <em>approximation</em> derived by mapping your Big Five scores onto the Insights Discovery colour-energy framework, using the academic consensus correlations between OCEAN and the Jungian dimensions. It is a coaching tool, not a clinical assessment. For a validated Insights profile, contact an accredited Insights practitioner.
        </p>
      </div>

      {/* Wheel + primary energy side by side */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-start">
        <QuadrantWheel extraversion={extraversion} agreeableness={agreeableness} />

        <div className="space-y-4">
          {/* Primary energy */}
          <div className="rounded-xl overflow-hidden border border-border">
            <div className="px-4 py-3 flex items-center gap-3" style={{ background: primary.hex }}>
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <span className="text-lg font-bold" style={{ color: primary.textHex }}>1</span>
              </div>
              <div>
                <p className="font-serif font-bold text-base" style={{ color: primary.textHex }}>{primary.name}</p>
                <p className="text-xs opacity-80" style={{ color: primary.textHex }}>Primary energy · {primary.jungian}</p>
              </div>
            </div>
            <div className="px-4 py-3 bg-card">
              <p className="text-sm text-foreground leading-relaxed">{primary.description}</p>
            </div>
          </div>

          {/* Secondary energy */}
          <div className="rounded-xl overflow-hidden border border-border">
            <div className="px-4 py-3 flex items-center gap-3" style={{ background: secondary.hex }}>
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <span className="text-lg font-bold" style={{ color: secondary.textHex }}>2</span>
              </div>
              <div>
                <p className="font-serif font-bold text-base" style={{ color: secondary.textHex }}>{secondary.name}</p>
                <p className="text-xs opacity-80" style={{ color: secondary.textHex }}>Secondary energy · {secondary.jungian}</p>
              </div>
            </div>
            <div className="px-4 py-3 bg-card">
              <p className="text-sm text-foreground leading-relaxed">{secondary.description}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Jungian type + axis scores */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Jungian Type", value: jungian, sub: "Approximate MBTI equivalent" },
          { label: "E / I Axis", value: eLabel, sub: `Extraversion score: ${extraversion}` },
          { label: "T / F Axis", value: aLabel, sub: `Agreeableness score: ${agreeableness}` },
          { label: "S / N + J / P", value: `${oLabel} · ${cLabel}`, sub: "Openness & Conscientiousness" },
        ].map((item) => (
          <div key={item.label} className="rounded-xl border border-border bg-card px-3 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">{item.label}</p>
            <p className="text-sm font-bold text-foreground leading-tight">{item.value}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{item.sub}</p>
          </div>
        ))}
      </div>

      {/* Strengths, challenges, career fit */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-border bg-card px-4 py-4">
          <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--lw-gold)" }}>Strengths</p>
          <ul className="space-y-1">
            {primary.strengths.map((s) => (
              <li key={s} className="text-sm text-foreground flex items-start gap-2">
                <span style={{ color: primary.hex }}>▸</span>{s}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border border-border bg-card px-4 py-4">
          <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--lw-gold)" }}>Watch-outs</p>
          <ul className="space-y-1">
            {primary.challenges.map((c) => (
              <li key={c} className="text-sm text-foreground flex items-start gap-2">
                <span style={{ color: primary.hex }}>▸</span>{c}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border border-border bg-card px-4 py-4">
          <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--lw-gold)" }}>Career Environment Fit</p>
          <p className="text-sm text-foreground leading-relaxed">{primary.careerFit}</p>
        </div>
      </div>
    </div>
  );
}
