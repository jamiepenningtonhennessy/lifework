/**
 * Organisational Quality Taxonomy
 *
 * Eight qualities that describe the working culture and environment of an employer.
 * Used to match clients to employers based on the qualities surfaced in their WOW report,
 * rather than purely on sector or role title.
 *
 * Each company in company_universe is tagged with a subset of these qualities.
 * Stage 2 of the Jobs pipeline weights quality-fit alongside sector-fit.
 */

export const QUALITY_TAXONOMY = {
  autonomy: {
    label: "Autonomy & Self-Direction",
    description:
      "Employees are trusted to define their own approach and manage their own time. Low bureaucracy, high individual ownership. Common in startups, boutiques, and flat-structure organisations.",
    examples: ["Legal tech startups", "Boutique law firms", "Challenger banks"],
  },
  structured_learning: {
    label: "Structured Learning & Development",
    description:
      "Strong formal training programmes, mentorship schemes, and clear progression pathways. Common in large professional services firms, graduate employers, and regulated industries.",
    examples: ["Magic Circle firms", "Big Four", "Civil Service Fast Stream"],
  },
  social_impact: {
    label: "Social Impact & Mission",
    description:
      "The organisation's primary purpose is social, environmental, or public good rather than profit maximisation. Includes charities, B-Corps, social enterprises, and public sector bodies.",
    examples: ["Legal aid charities", "B-Corps", "NHS", "Social enterprises"],
  },
  commercial_intensity: {
    label: "Commercial Intensity",
    description:
      "High-performance, deal-driven, or revenue-focused culture. Long hours, high rewards, strong emphasis on commercial outcomes. Common in US law firms, investment banks, and strategy consultancies.",
    examples: ["US law firms", "Investment banks", "Strategy consultancies"],
  },
  collaboration: {
    label: "Collaboration & Team Culture",
    description:
      "Strong emphasis on teamwork, cross-functional working, and collective achievement. Flat or matrix structures. Common in mid-size firms, in-house teams, and tech companies.",
    examples: ["In-house legal teams", "Mid-size law firms", "Tech companies"],
  },
  innovation: {
    label: "Innovation & Change",
    description:
      "The organisation actively invests in new ways of working, technology, or business models. Tolerance for experimentation and ambiguity. Common in legal tech, innovation labs, and newer firms.",
    examples: ["Legal tech vendors", "Innovation labs", "NewLaw firms"],
  },
  prestige: {
    label: "Prestige & Credential-Building",
    description:
      "Strong brand recognition, high selectivity, and significant reputational value for alumni. Common in Magic Circle firms, top-tier US firms, and elite public sector bodies.",
    examples: ["Magic Circle", "Top US firms", "Government Legal Department"],
  },
  scale_and_stability: {
    label: "Scale & Stability",
    description:
      "Large, established organisations with clear processes, job security, and broad resources. Common in FTSE 100 companies, large public sector bodies, and global professional services firms.",
    examples: ["FTSE 100 in-house", "Large public sector", "Global law firms"],
  },
} as const;

export type QualityKey = keyof typeof QUALITY_TAXONOMY;
export const QUALITY_KEYS = Object.keys(QUALITY_TAXONOMY) as QualityKey[];
