// Plum Trees Cognitive Screener
// 30 items across 3 domains: Verbal Reasoning (V), Numerical Reasoning (N), Abstract Reasoning (A)
// Each domain has 10 items graded easy (1-3), medium (4-7), hard (8-10)
// Time limit: 25 minutes total (suggested ~50s per item)
// Scoring: 1 point per correct answer; domain scores /10; total /30
// Presented in interleaved order to avoid fatigue in a single domain

export type CogDomain = "verbal" | "numerical" | "abstract";
export type CogDifficulty = "easy" | "medium" | "hard";

export interface CogItem {
  id: number;
  domain: CogDomain;
  difficulty: CogDifficulty;
  question: string;
  /** For abstract items, a text-art or described pattern */
  stimulus?: string;
  options: string[];
  /** Zero-based index of the correct option */
  answer: number;
  /** Brief explanation shown on results page */
  explanation: string;
}

export const SCREENER_ITEMS: CogItem[] = [

  // ─── VERBAL REASONING ────────────────────────────────────────────────────────

  {
    id: 1,
    domain: "verbal",
    difficulty: "easy",
    question: "Which word is most opposite in meaning to ANCIENT?",
    options: ["Old", "Modern", "Antique", "Historical"],
    answer: 1,
    explanation: "Ancient means very old; its opposite is modern (new, current).",
  },
  {
    id: 2,
    domain: "verbal",
    difficulty: "easy",
    question: "LIBRARY is to BOOKS as GALLERY is to:",
    options: ["Visitors", "Paintings", "Architecture", "Tickets"],
    answer: 1,
    explanation: "A library houses books; a gallery houses paintings.",
  },
  {
    id: 3,
    domain: "verbal",
    difficulty: "easy",
    question: "Which word does NOT belong with the others?",
    options: ["Sparrow", "Robin", "Eagle", "Salmon"],
    answer: 3,
    explanation: "Sparrow, Robin and Eagle are all birds; Salmon is a fish.",
  },
  {
    id: 4,
    domain: "verbal",
    difficulty: "medium",
    question: "CONDUCTOR is to ORCHESTRA as CAPTAIN is to:",
    options: ["Harbour", "Crew", "Anchor", "Voyage"],
    answer: 1,
    explanation: "A conductor leads an orchestra; a captain leads a crew.",
  },
  {
    id: 5,
    domain: "verbal",
    difficulty: "medium",
    question: "Which word best completes the analogy? OPAQUE is to TRANSPARENT as RIGID is to:",
    options: ["Hard", "Brittle", "Flexible", "Solid"],
    answer: 2,
    explanation: "Opaque is the opposite of transparent; rigid is the opposite of flexible.",
  },
  {
    id: 6,
    domain: "verbal",
    difficulty: "medium",
    question: "If all Blorks are Flurps, and some Flurps are Grumps, which statement must be true?",
    options: [
      "All Grumps are Blorks",
      "Some Blorks are Grumps",
      "No Blorks are Grumps",
      "Some Blorks may be Grumps",
    ],
    answer: 3,
    explanation: "We know all Blorks are Flurps, and some Flurps are Grumps — so it is possible (but not certain) that some Blorks are Grumps.",
  },
  {
    id: 7,
    domain: "verbal",
    difficulty: "medium",
    question: "MITIGATE most nearly means:",
    options: ["Worsen", "Lessen", "Ignore", "Transfer"],
    answer: 1,
    explanation: "To mitigate means to make something less severe or serious.",
  },
  {
    id: 8,
    domain: "verbal",
    difficulty: "hard",
    question: "ENERVATE most nearly means:",
    options: ["Energise", "Weaken", "Irritate", "Enlighten"],
    answer: 1,
    explanation: "To enervate means to drain of energy or vitality — the opposite of what it sounds like.",
  },
  {
    id: 9,
    domain: "verbal",
    difficulty: "hard",
    question: "Which statement, if true, most weakens the argument: 'Students who eat breakfast perform better in exams'?",
    options: [
      "Some students skip breakfast and still pass",
      "High-performing students tend to have more structured morning routines generally",
      "Breakfast foods contain nutrients that aid concentration",
      "Schools that provide breakfast see higher attendance",
    ],
    answer: 1,
    explanation: "If high performers have structured routines generally, breakfast may be a symptom of that structure rather than the cause of better performance — weakening the causal claim.",
  },
  {
    id: 10,
    domain: "verbal",
    difficulty: "hard",
    question: "LACONIC most nearly means:",
    options: ["Verbose", "Melancholy", "Brief", "Logical"],
    answer: 2,
    explanation: "Laconic means using very few words; terse or concise in speech.",
  },

  // ─── NUMERICAL REASONING ─────────────────────────────────────────────────────

  {
    id: 11,
    domain: "numerical",
    difficulty: "easy",
    question: "What is 15% of 200?",
    options: ["20", "25", "30", "35"],
    answer: 2,
    explanation: "15% of 200 = 0.15 × 200 = 30.",
  },
  {
    id: 12,
    domain: "numerical",
    difficulty: "easy",
    question: "What is the next number in the sequence? 3, 6, 12, 24, ___",
    options: ["36", "42", "48", "54"],
    answer: 2,
    explanation: "Each term is doubled: 3 × 2 = 6, 6 × 2 = 12, 12 × 2 = 24, 24 × 2 = 48.",
  },
  {
    id: 13,
    domain: "numerical",
    difficulty: "easy",
    question: "A shirt costs £40 and is reduced by 25%. What is the sale price?",
    options: ["£28", "£30", "£32", "£35"],
    answer: 1,
    explanation: "25% of £40 = £10. £40 − £10 = £30.",
  },
  {
    id: 14,
    domain: "numerical",
    difficulty: "medium",
    question: "What is the next number in the sequence? 2, 5, 10, 17, 26, ___",
    options: ["35", "36", "37", "38"],
    answer: 2,
    explanation: "Differences are 3, 5, 7, 9, 11 (odd numbers increasing by 2). 26 + 11 = 37.",
  },
  {
    id: 15,
    domain: "numerical",
    difficulty: "medium",
    question: "A train travels 180 km in 2 hours 15 minutes. What is its average speed in km/h?",
    options: ["72 km/h", "80 km/h", "84 km/h", "90 km/h"],
    answer: 1,
    explanation: "2 hours 15 minutes = 2.25 hours. 180 ÷ 2.25 = 80 km/h.",
  },
  {
    id: 16,
    domain: "numerical",
    difficulty: "medium",
    question: "If 4 workers can complete a job in 6 days, how many days would 8 workers take?",
    options: ["2 days", "3 days", "4 days", "5 days"],
    answer: 1,
    explanation: "Total work = 4 × 6 = 24 worker-days. With 8 workers: 24 ÷ 8 = 3 days.",
  },
  {
    id: 17,
    domain: "numerical",
    difficulty: "medium",
    question: "What is the missing number? 7, 14, ___, 56, 112",
    options: ["21", "28", "35", "42"],
    answer: 1,
    explanation: "Each term is multiplied by 2: 7 × 2 = 14, 14 × 2 = 28, 28 × 2 = 56.",
  },
  {
    id: 18,
    domain: "numerical",
    difficulty: "hard",
    question: "A company's revenue grew from £2.4m to £3.0m. What was the percentage increase?",
    options: ["20%", "22.5%", "25%", "28%"],
    answer: 2,
    explanation: "Increase = £0.6m. Percentage = (0.6 ÷ 2.4) × 100 = 25%.",
  },
  {
    id: 19,
    domain: "numerical",
    difficulty: "hard",
    question: "What is the next number in the sequence? 1, 1, 2, 3, 5, 8, 13, ___",
    options: ["18", "19", "20", "21"],
    answer: 3,
    explanation: "This is the Fibonacci sequence: each term is the sum of the two preceding terms. 8 + 13 = 21.",
  },
  {
    id: 20,
    domain: "numerical",
    difficulty: "hard",
    question: "Three people share a prize in the ratio 2:3:5. If the total prize is £4,000, how much does the person with the largest share receive?",
    options: ["£1,200", "£1,600", "£2,000", "£2,400"],
    answer: 2,
    explanation: "Total parts = 2+3+5 = 10. Largest share = 5/10 × £4,000 = £2,000.",
  },

  // ─── ABSTRACT / PATTERN REASONING ────────────────────────────────────────────

  {
    id: 21,
    domain: "abstract",
    difficulty: "easy",
    question: "What comes next in the letter sequence? A, C, E, G, ___",
    options: ["H", "I", "J", "K"],
    answer: 1,
    explanation: "The sequence skips every other letter: A, C, E, G, I (every odd letter of the alphabet).",
  },
  {
    id: 22,
    domain: "abstract",
    difficulty: "easy",
    question: "What comes next in the sequence? ○ ○○ ○○○ ○○○○ ___",
    options: ["○○○○", "○○○○○", "○○○○○○", "○○○○○○○"],
    answer: 1,
    explanation: "Each step adds one circle: 1, 2, 3, 4, 5.",
  },
  {
    id: 23,
    domain: "abstract",
    difficulty: "easy",
    question: "Which number does NOT fit the pattern? 4, 9, 16, 25, 35, 49",
    options: ["16", "25", "35", "49"],
    answer: 2,
    explanation: "The sequence is perfect squares: 2², 3², 4², 5², 6², 7². 35 is not a perfect square (6² = 36).",
  },
  {
    id: 24,
    domain: "abstract",
    difficulty: "medium",
    question: "What comes next in the sequence? Z, X, V, T, ___",
    options: ["R", "S", "Q", "P"],
    answer: 0,
    explanation: "The sequence moves backwards through the alphabet skipping one letter each time: Z, X, V, T, R.",
  },
  {
    id: 25,
    domain: "abstract",
    difficulty: "medium",
    question: "What comes next? 2, 6, 12, 20, 30, ___",
    options: ["38", "40", "42", "44"],
    answer: 2,
    explanation: "The differences are 4, 6, 8, 10, 12 (increasing by 2 each time). 30 + 12 = 42.",
  },
  {
    id: 26,
    domain: "abstract",
    difficulty: "medium",
    question: "In a grid where each row and column contains the symbols ★ ● ▲ exactly once, a row reads: ★ ___ ▲. What is the missing symbol?",
    options: ["★", "●", "▲", "■"],
    answer: 1,
    explanation: "Each row must contain ★, ●, and ▲ exactly once. ★ and ▲ are present, so ● is missing.",
  },
  {
    id: 27,
    domain: "abstract",
    difficulty: "medium",
    question: "What comes next in the sequence? AZ, BY, CX, DW, ___",
    options: ["EV", "EU", "FV", "EW"],
    answer: 0,
    explanation: "First letter advances (A, B, C, D, E); second letter retreats (Z, Y, X, W, V). Next pair: EV.",
  },
  {
    id: 28,
    domain: "abstract",
    difficulty: "hard",
    question: "What is the missing number?\n  3   5   8\n  4   7  11\n  6   9  ___",
    options: ["13", "14", "15", "16"],
    answer: 2,
    explanation: "In each row, the third number is the sum of the first two: 3+5=8, 4+7=11, 6+9=15.",
  },
  {
    id: 29,
    domain: "abstract",
    difficulty: "hard",
    question: "What comes next in the sequence? 1, 4, 9, 16, 25, 36, ___",
    options: ["42", "45", "49", "52"],
    answer: 2,
    explanation: "These are perfect squares: 1², 2², 3², 4², 5², 6², 7² = 49.",
  },
  {
    id: 30,
    domain: "abstract",
    difficulty: "hard",
    question: "A code uses the rule: each letter is replaced by the letter 3 positions later in the alphabet (wrapping around). What does 'EBU' decode to?",
    options: ["HEX", "BYR", "GDW", "FCW"],
    answer: 0,
    explanation: "E+3=H, B+3=E, U+3=X. So EBU encodes to HEX.",
  },
];

// ─── SCORING HELPERS ─────────────────────────────────────────────────────────

export interface ScreenerScores {
  verbal: number;      // 0–10
  numerical: number;   // 0–10
  abstract: number;    // 0–10
  total: number;       // 0–30
  percentile: number;  // estimated percentile (indicative only)
}

/**
 * Score a completed screener from a map of itemId → chosen option index (0-based).
 */
export function scoreScreener(responses: Record<number, number>): ScreenerScores {
  let verbal = 0, numerical = 0, abstract = 0;

  for (const item of SCREENER_ITEMS) {
    const chosen = responses[item.id];
    if (chosen === item.answer) {
      if (item.domain === "verbal") verbal++;
      else if (item.domain === "numerical") numerical++;
      else abstract++;
    }
  }

  const total = verbal + numerical + abstract;

  // Indicative percentile mapping based on published norms for similar instruments
  // (Not clinically validated — presented as indicative only)
  const percentile = estimatePercentile(total);

  return { verbal, numerical, abstract, total, percentile };
}

function estimatePercentile(total: number): number {
  // Based on approximate normal distribution: mean ~18/30, SD ~5
  // Mapped from published cognitive ability test norms
  const lookup: Record<number, number> = {
    0: 1, 1: 1, 2: 1, 3: 2, 4: 3, 5: 5,
    6: 7, 7: 10, 8: 13, 9: 16, 10: 20,
    11: 24, 12: 29, 13: 34, 14: 39, 15: 45,
    16: 50, 17: 55, 18: 60, 19: 65, 20: 70,
    21: 75, 22: 79, 23: 83, 24: 87, 25: 90,
    26: 93, 27: 95, 28: 97, 29: 98, 30: 99,
  };
  return lookup[total] ?? 50;
}

export interface DomainInterpretation {
  label: string;
  description: string;
  careerImplication: string;
}

export function interpretDomain(domain: CogDomain, score: number): DomainInterpretation {
  const level = score <= 3 ? "developing" : score <= 6 ? "solid" : score <= 8 ? "strong" : "exceptional";

  const interpretations: Record<CogDomain, Record<string, DomainInterpretation>> = {
    verbal: {
      developing: {
        label: "Developing",
        description: "You tend to approach problems through practical experience and doing rather than through language and abstract argument.",
        careerImplication: "Roles that emphasise hands-on work, visual communication, or structured processes may suit you better than those requiring extensive written analysis or persuasion.",
      },
      solid: {
        label: "Solid",
        description: "You have a good working command of language and can follow and construct reasoned arguments effectively.",
        careerImplication: "You can operate comfortably in most professional environments. Roles requiring clear communication, report writing, or client-facing work are well within your range.",
      },
      strong: {
        label: "Strong",
        description: "You handle language and logical argument with confidence and can identify nuance, ambiguity, and faulty reasoning.",
        careerImplication: "Roles in law, strategy, consulting, management, education, or any field where persuasion and precision of thought are valued are likely to play to your strengths.",
      },
      exceptional: {
        label: "Exceptional",
        description: "Your verbal reasoning is in the top tier. You process complex language, construct arguments, and identify logical flaws with unusual ease.",
        careerImplication: "You are likely to excel in roles where language is the primary tool — law, academia, journalism, senior leadership, or any field requiring sophisticated written or spoken communication.",
      },
    },
    numerical: {
      developing: {
        label: "Developing",
        description: "You prefer to work with ideas, people, or concrete tasks rather than numbers and quantitative reasoning.",
        careerImplication: "Roles that rely heavily on financial modelling, data analysis, or quantitative problem-solving may require additional support. People-facing, creative, or qualitative roles are likely a better fit.",
      },
      solid: {
        label: "Solid",
        description: "You can handle everyday numerical tasks and follow quantitative arguments without difficulty.",
        careerImplication: "You can manage budgets, interpret data, and work with numbers in a professional context. Most management and operational roles are comfortably within your range.",
      },
      strong: {
        label: "Strong",
        description: "You think comfortably in numbers and can identify patterns, ratios, and relationships in quantitative data.",
        careerImplication: "Finance, data analysis, operations, engineering, science, and any field where quantitative reasoning is an advantage are likely to suit you well.",
      },
      exceptional: {
        label: "Exceptional",
        description: "Your numerical reasoning is highly developed. You process quantitative information rapidly and accurately.",
        careerImplication: "You are likely to excel in roles where numbers are central — finance, data science, engineering, economics, or quantitative research.",
      },
    },
    abstract: {
      developing: {
        label: "Developing",
        description: "You tend to work best with familiar, concrete problems rather than novel patterns and abstract relationships.",
        careerImplication: "Roles with clear, well-defined processes and established methods may suit you better than those requiring constant adaptation to new frameworks or ambiguous problems.",
      },
      solid: {
        label: "Solid",
        description: "You can identify patterns and work through unfamiliar problems with reasonable confidence.",
        careerImplication: "You can adapt to new situations and learn new systems effectively. Most professional roles are well within your range.",
      },
      strong: {
        label: "Strong",
        description: "You identify patterns and underlying structures quickly, even in novel or ambiguous situations.",
        careerImplication: "Roles requiring strategic thinking, problem-solving, system design, or working in fast-changing environments are likely to play to your strengths.",
      },
      exceptional: {
        label: "Exceptional",
        description: "Your abstract reasoning is highly developed. You see patterns, connections, and structures that others miss.",
        careerImplication: "You are likely to excel in roles requiring original thinking, complex problem-solving, or working at the frontier of a field — strategy, research, technology, or entrepreneurship.",
      },
    },
  };

  return interpretations[domain][level];
}

// Time limit in seconds (25 minutes)
export const SCREENER_TIME_LIMIT_SECONDS = 25 * 60;

// Interleaved order: V, N, A, V, N, A... to avoid domain fatigue
export const INTERLEAVED_ORDER = [
  1, 11, 21,  // easy
  2, 12, 22,
  3, 13, 23,
  4, 14, 24,  // medium
  5, 15, 25,
  6, 16, 26,
  7, 17, 27,
  8, 18, 28,  // hard
  9, 19, 29,
  10, 20, 30,
];
