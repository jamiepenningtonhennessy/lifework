/**
 * InsightsMapping.tsx
 *
 * Maps OCEAN (Big Five) scores onto the Insights Discovery / DISC colour-energy
 * framework using the academic consensus mapping:
 *
 *   Extraversion (E)  →  Introvert ↔ Extravert axis (horizontal)
 *   Agreeableness (A) →  Thinking ↔ Feeling axis (vertical)
 *   Openness (O)      →  Sensing ↔ Intuiting (Jungian S/N)
 *   Conscientiousness (C) → Judging ↔ Perceiving (Jungian J/P)
 *
 * The four Insights colour energies:
 *   Fiery Red    — Introverted + Thinking  (low E, low A)
 *   Sunshine Yellow — Extraverted + Thinking (high E, low A)
 *   Earth Green  — Introverted + Feeling   (low E, high A)
 *   Cool Blue    — Extraverted + Feeling   (high E, high A)
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
  shortName: string;
  hex: string;
  textHex: string;
  jungian: string;
  description: string;
  strengths: string[];
  challenges: string[];
  careerFit: string;
}

const COLOUR_ENERGIES: Record<string, ColourEnergy> = {
  red: {
    name: "Fiery Red",
    shortName: "Red",
    hex: "#C0392B",
    textHex: "#ffffff",
    jungian: "Introverted Thinking (IT)",
    description:
      "Driven, purposeful, and results-oriented. Prefers to lead from the front, takes decisive action, and is comfortable with challenge and competition. Can be direct to the point of bluntness.",
    strengths: ["Decisive", "Determined", "Strong-willed", "Purposeful", "Results-focused"],
    challenges: ["May appear insensitive", "Can be impatient", "Dislikes indecision in others"],
    careerFit:
      "Roles requiring leadership, accountability, and the ability to drive change — management, entrepreneurship, law, surgery, strategy.",
  },
  yellow: {
    name: "Sunshine Yellow",
    shortName: "Yellow",
    hex: "#F1C40F",
    textHex: "#1a1008",
    jungian: "Extraverted Thinking (ET)",
    description:
      "Enthusiastic, persuasive, and sociable. Energised by people and ideas, brings optimism and creativity to groups. Can lose focus on detail and follow-through.",
    strengths: ["Enthusiastic", "Persuasive", "Creative", "Optimistic", "Collaborative"],
    challenges: ["Can be disorganised", "May over-promise", "Dislikes routine and detail"],
    careerFit:
      "Roles requiring communication, creativity, and relationship-building — sales, marketing, PR, teaching, facilitation, consulting.",
  },
  green: {
    name: "Earth Green",
    shortName: "Green",
    hex: "#27AE60",
    textHex: "#ffffff",
    jungian: "Introverted Feeling (IF)",
    description:
      "Caring, patient, and values-driven. Prioritises harmony, loyalty, and the wellbeing of others. Prefers to work collaboratively and dislikes conflict.",
    strengths: ["Empathetic", "Patient", "Reliable", "Supportive", "Values-driven"],
    challenges: ["Can avoid necessary conflict", "May be indecisive", "Dislikes rapid change"],
    careerFit:
      "Roles requiring empathy, support, and long-term relationship management — counselling, HR, nursing, social work, community roles.",
  },
  blue: {
    name: "Cool Blue",
    shortName: "Blue",
    hex: "#2980B9",
    textHex: "#ffffff",
    jungian: "Extraverted Feeling (EF)",
    description:
      "Analytical, cautious, and precise. Values accuracy, quality, and rigour. Prefers to work with data and evidence before reaching conclusions. Can appear detached.",
    strengths: ["Analytical", "Precise", "Systematic", "Thorough", "Objective"],
    challenges: ["Can be over-cautious", "May over-analyse", "Dislikes ambiguity"],
    careerFit:
      "Roles requiring analysis, precision, and systematic thinking — finance, engineering, research, IT, quality assurance, law.",
  },
};

function getColourEnergy(extraversion: number, agreeableness: number): string {
  const isExtravert = extraversion >= 50;
  const isFeeling = agreeableness >= 50;
  if (!isExtravert && !isFeeling) return "red";
  if (isExtravert && !isFeeling) return "yellow";
  if (!isExtravert && isFeeling) return "green";
  return "blue";
}

function getSecondaryEnergy(extraversion: number, agreeableness: number): string {
  // Secondary is determined by which axis score is closest to 50 (most ambiguous)
  const eDistance = Math.abs(extraversion - 50);
  const aDistance = Math.abs(agreeableness - 50);
  const primary = getColourEnergy(extraversion, agreeableness);

  if (eDistance < aDistance) {
    // Extraversion is the ambiguous axis — flip E
    const flippedE = extraversion >= 50 ? 30 : 70;
    return getColourEnergy(flippedE, agreeableness);
  } else {
    // Agreeableness is the ambiguous axis — flip A
    const flippedA = agreeableness >= 50 ? 30 : 70;
    const secondary = getColourEnergy(extraversion, flippedA);
    return secondary === primary ? getColourEnergy(extraversion >= 50 ? 30 : 70, agreeableness) : secondary;
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

// ─── Quadrant Wheel SVG ───────────────────────────────────────────────────────

function QuadrantWheel({
  extraversion,
  agreeableness,
}: {
  extraversion: number;
  agreeableness: number;
}) {
  // Convert 0-100 scores to -1..+1 for the plot
  const x = ((extraversion - 50) / 50) * 0.85; // positive = extravert (right)
  const y = -((agreeableness - 50) / 50) * 0.85; // positive = feeling (up in SVG coords = down)

  // SVG viewBox is 200x200, centre at 100,100
  const cx = 100 + x * 80;
  const cy = 100 + y * 80;

  return (
    <svg viewBox="0 0 200 200" className="w-full max-w-xs mx-auto" aria-label="Insights colour energy wheel">
      {/* Background quadrants */}
      {/* Top-left: Green (Introverted Feeling) */}
      <rect x="2" y="2" width="96" height="96" rx="6" fill="#27AE60" opacity="0.18" />
      {/* Top-right: Blue (Extraverted Feeling) */}
      <rect x="102" y="2" width="96" height="96" rx="6" fill="#2980B9" opacity="0.18" />
      {/* Bottom-left: Red (Introverted Thinking) */}
      <rect x="2" y="102" width="96" height="96" rx="6" fill="#C0392B" opacity="0.18" />
      {/* Bottom-right: Yellow (Extraverted Thinking) */}
      <rect x="102" y="102" width="96" height="96" rx="6" fill="#F1C40F" opacity="0.18" />

      {/* Quadrant labels */}
      <text x="50" y="22" textAnchor="middle" fontSize="8" fill="#27AE60" fontWeight="600">Earth Green</text>
      <text x="50" y="31" textAnchor="middle" fontSize="6.5" fill="#27AE60" opacity="0.8">Introverted · Feeling</text>
      <text x="150" y="22" textAnchor="middle" fontSize="8" fill="#2980B9" fontWeight="600">Cool Blue</text>
      <text x="150" y="31" textAnchor="middle" fontSize="6.5" fill="#2980B9" opacity="0.8">Extraverted · Feeling</text>
      <text x="50" y="118" textAnchor="middle" fontSize="8" fill="#C0392B" fontWeight="600">Fiery Red</text>
      <text x="50" y="127" textAnchor="middle" fontSize="6.5" fill="#C0392B" opacity="0.8">Introverted · Thinking</text>
      <text x="150" y="118" textAnchor="middle" fontSize="8" fill="#B7950B" fontWeight="600">Sunshine Yellow</text>
      <text x="150" y="127" textAnchor="middle" fontSize="6.5" fill="#B7950B" opacity="0.8">Extraverted · Thinking</text>

      {/* Axes */}
      <line x1="100" y1="5" x2="100" y2="195" stroke="rgba(0,0,0,0.15)" strokeWidth="1" />
      <line x1="5" y1="100" x2="195" y2="100" stroke="rgba(0,0,0,0.15)" strokeWidth="1" />

      {/* Axis labels */}
      <text x="100" y="198" textAnchor="middle" fontSize="6" fill="#888">← Introverted · Extraverted →</text>
      <text x="4" y="100" textAnchor="middle" fontSize="6" fill="#888" transform="rotate(-90,4,100)">← Thinking · Feeling →</text>

      {/* Client position dot */}
      <circle cx={cx} cy={cy} r="7" fill={COLOUR_ENERGIES[getColourEnergy(extraversion, agreeableness)].hex} stroke="white" strokeWidth="2" />
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

  const eLabel = extraversion >= 65 ? "Strongly Extraverted" : extraversion >= 50 ? "Moderately Extraverted" : extraversion >= 35 ? "Moderately Introverted" : "Strongly Introverted";
  const aLabel = agreeableness >= 65 ? "Strongly Feeling" : agreeableness >= 50 ? "Moderately Feeling" : agreeableness >= 35 ? "Moderately Thinking" : "Strongly Thinking";
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

      {/* Jungian type indicators */}
      <div className="rounded-xl border border-border p-4 bg-card">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Jungian Type Approximation</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Energy", value: eLabel, sub: extraversion >= 50 ? "E" : "I" },
            { label: "Perception", value: oLabel, sub: openness >= 50 ? "N" : "S" },
            { label: "Judgement", value: aLabel, sub: agreeableness >= 50 ? "F" : "T" },
            { label: "Orientation", value: cLabel, sub: conscientiousness >= 50 ? "J" : "P" },
          ].map((item) => (
            <div key={item.label} className="text-center p-3 rounded-lg bg-muted/50">
              <p className="text-2xl font-bold font-serif" style={{ color: "var(--lw-gold)" }}>{item.sub}</p>
              <p className="text-xs font-semibold text-foreground mt-0.5">{item.label}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{item.value}</p>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-3 text-center">
          Approximate MBTI-style type: <span className="font-mono font-bold text-foreground">{jungian}</span>
        </p>
      </div>

      {/* Strengths & challenges */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-xl border border-border p-4 bg-card">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Key Strengths ({primary.shortName})</p>
          <ul className="space-y-1.5">
            {primary.strengths.map((s) => (
              <li key={s} className="flex items-center gap-2 text-sm text-foreground">
                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: primary.hex }} />
                {s}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border border-border p-4 bg-card">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Potential Challenges ({primary.shortName})</p>
          <ul className="space-y-1.5">
            {primary.challenges.map((c) => (
              <li key={c} className="flex items-center gap-2 text-sm text-foreground">
                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 bg-muted-foreground" />
                {c}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Career fit */}
      <div className="rounded-xl border p-4" style={{ borderColor: "rgba(201,151,58,0.3)", background: "var(--lw-gold-light)" }}>
        <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "var(--lw-gold)" }}>Career Environment Fit</p>
        <p className="text-sm text-foreground leading-relaxed">{primary.careerFit}</p>
      </div>

      {/* Disclaimer */}
      <p className="text-xs text-muted-foreground text-center italic px-4">
        Insights Discovery® is a registered trademark of The Insights Group Ltd. This mapping is an independent approximation for coaching purposes and is not affiliated with or endorsed by Insights. Scores are derived from OCEAN facets using published academic correlations (Furnham, 2022; McCrae &amp; Costa, 1989).
      </p>
    </div>
  );
}
