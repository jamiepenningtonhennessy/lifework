// IPIP-NEO-120: International Personality Item Pool — 120-item Big Five measure
// Public domain — Johnson, J.A. (2014). Journal of Research in Personality, 51, 78-89.
// 5 domains × 6 facets × 4 items = 120 items
// Each item scored 1 (Very Inaccurate) to 5 (Very Accurate); some items are reverse-scored (R)

export type IpipDomainKey = "N" | "E" | "O" | "A" | "C";
export type IpipFacetKey =
  | "N1" | "N2" | "N3" | "N4" | "N5" | "N6"
  | "E1" | "E2" | "E3" | "E4" | "E5" | "E6"
  | "O1" | "O2" | "O3" | "O4" | "O5" | "O6"
  | "A1" | "A2" | "A3" | "A4" | "A5" | "A6"
  | "C1" | "C2" | "C3" | "C4" | "C5" | "C6";

export interface IpipFacet {
  key: IpipFacetKey;
  domain: IpipDomainKey;
  name: string;
  description: string;
  lowLabel: string;  // what a low score means
  highLabel: string; // what a high score means
}

export interface IpipDomain {
  key: IpipDomainKey;
  name: string;
  description: string;
  lowLabel: string;
  highLabel: string;
  color: string; // for UI
}

export interface IpipQuestion {
  id: number;       // 1-120
  facet: IpipFacetKey;
  text: string;
  reverse: boolean; // if true, score = 6 - raw
}

// ─── Domains ─────────────────────────────────────────────────────────────────

export const IPIP_DOMAINS: IpipDomain[] = [
  {
    key: "N",
    name: "Neuroticism",
    description: "The tendency to experience negative emotions such as anxiety, anger, or depression. High scorers are emotionally reactive and vulnerable to stress. Low scorers are emotionally stable and resilient.",
    lowLabel: "Emotionally stable, calm, resilient",
    highLabel: "Emotionally reactive, prone to stress",
    color: "#7C3AED",
  },
  {
    key: "E",
    name: "Extraversion",
    description: "The tendency to seek stimulation in the company of others. High scorers are outgoing, energetic, and talkative. Low scorers (introverts) tend to be reserved and prefer solitary activities.",
    lowLabel: "Reserved, solitary, reflective",
    highLabel: "Outgoing, energetic, sociable",
    color: "#D97706",
  },
  {
    key: "O",
    name: "Openness to Experience",
    description: "The tendency to be intellectually curious, creative, and open to new ideas and experiences. High scorers are imaginative and unconventional. Low scorers prefer routine and the conventional.",
    lowLabel: "Practical, conventional, prefers routine",
    highLabel: "Curious, creative, open to new ideas",
    color: "#059669",
  },
  {
    key: "A",
    name: "Agreeableness",
    description: "The tendency to be compassionate and cooperative rather than suspicious and antagonistic. High scorers are trusting, helpful, and empathetic. Low scorers tend to be competitive and sceptical.",
    lowLabel: "Competitive, sceptical, challenging",
    highLabel: "Cooperative, trusting, empathetic",
    color: "#DB2777",
  },
  {
    key: "C",
    name: "Conscientiousness",
    description: "The tendency to be organised, dependable, and disciplined. High scorers are goal-directed, reliable, and self-disciplined. Low scorers are more spontaneous and flexible.",
    lowLabel: "Spontaneous, flexible, easy-going",
    highLabel: "Organised, disciplined, goal-directed",
    color: "#2563EB",
  },
];

// ─── Facets ───────────────────────────────────────────────────────────────────

export const IPIP_FACETS: IpipFacet[] = [
  // Neuroticism
  { key: "N1", domain: "N", name: "Anxiety", description: "Tendency to worry and feel nervous or fearful.", lowLabel: "Relaxed, rarely worries", highLabel: "Anxious, prone to worry" },
  { key: "N2", domain: "N", name: "Anger", description: "Tendency to feel angry, frustrated, and bitter.", lowLabel: "Slow to anger, patient", highLabel: "Quick to anger, easily frustrated" },
  { key: "N3", domain: "N", name: "Depression", description: "Tendency to feel sad, hopeless, and lonely.", lowLabel: "Rarely feels sad or hopeless", highLabel: "Prone to sadness and low mood" },
  { key: "N4", domain: "N", name: "Self-Consciousness", description: "Sensitivity to embarrassment and social anxiety.", lowLabel: "Comfortable in social situations", highLabel: "Easily embarrassed, self-conscious" },
  { key: "N5", domain: "N", name: "Immoderation", description: "Difficulty resisting urges and cravings.", lowLabel: "Good impulse control", highLabel: "Difficulty resisting urges" },
  { key: "N6", domain: "N", name: "Vulnerability", description: "Tendency to feel overwhelmed under stress.", lowLabel: "Handles stress well", highLabel: "Easily overwhelmed by stress" },
  // Extraversion
  { key: "E1", domain: "E", name: "Friendliness", description: "Warmth and genuine interest in other people.", lowLabel: "Reserved, formal with others", highLabel: "Warm, genuinely interested in people" },
  { key: "E2", domain: "E", name: "Gregariousness", description: "Preference for the company of others.", lowLabel: "Prefers solitude or small groups", highLabel: "Enjoys crowds and social gatherings" },
  { key: "E3", domain: "E", name: "Assertiveness", description: "Social dominance, confidence, and forcefulness.", lowLabel: "Prefers to follow, unassuming", highLabel: "Dominant, assertive, takes charge" },
  { key: "E4", domain: "E", name: "Activity Level", description: "Pace of living and energy levels.", lowLabel: "Leisurely, relaxed pace", highLabel: "Energetic, fast-paced, busy" },
  { key: "E5", domain: "E", name: "Excitement-Seeking", description: "Need for environmental stimulation and thrills.", lowLabel: "Avoids excitement and risk", highLabel: "Craves excitement and stimulation" },
  { key: "E6", domain: "E", name: "Cheerfulness", description: "Tendency to experience positive emotions.", lowLabel: "Less exuberant, more serious", highLabel: "Cheerful, optimistic, enthusiastic" },
  // Openness
  { key: "O1", domain: "O", name: "Imagination", description: "Use of fantasy and vivid imagination.", lowLabel: "Practical, feet on the ground", highLabel: "Vivid imagination, daydreamer" },
  { key: "O2", domain: "O", name: "Artistic Interests", description: "Appreciation of art, music, and beauty.", lowLabel: "Little interest in arts", highLabel: "Deep appreciation of art and beauty" },
  { key: "O3", domain: "O", name: "Emotionality", description: "Awareness and depth of emotional experience.", lowLabel: "Less emotionally aware", highLabel: "Emotionally aware and expressive" },
  { key: "O4", domain: "O", name: "Adventurousness", description: "Eagerness to try new activities and experiences.", lowLabel: "Prefers familiar routines", highLabel: "Eager to try new things" },
  { key: "O5", domain: "O", name: "Intellect", description: "Intellectual curiosity and love of ideas.", lowLabel: "Prefers concrete facts", highLabel: "Loves ideas and intellectual discussion" },
  { key: "O6", domain: "O", name: "Liberalism", description: "Readiness to challenge authority and convention.", lowLabel: "Respects tradition and authority", highLabel: "Questions convention, progressive" },
  // Agreeableness
  { key: "A1", domain: "A", name: "Trust", description: "Belief in the honesty and good intentions of others.", lowLabel: "Sceptical, suspicious of others", highLabel: "Trusting, assumes good faith" },
  { key: "A2", domain: "A", name: "Morality", description: "Sincerity and straightforwardness.", lowLabel: "Willing to manipulate to get results", highLabel: "Honest, direct, dislikes deception" },
  { key: "A3", domain: "A", name: "Altruism", description: "Active concern for the welfare of others.", lowLabel: "Self-focused, less generous", highLabel: "Generous, enjoys helping others" },
  { key: "A4", domain: "A", name: "Cooperation", description: "Dislike of confrontation, preference for compromise.", lowLabel: "Competitive, confrontational", highLabel: "Cooperative, avoids conflict" },
  { key: "A5", domain: "A", name: "Modesty", description: "Tendency to be humble and self-effacing.", lowLabel: "Confident, believes in own superiority", highLabel: "Humble, modest, self-effacing" },
  { key: "A6", domain: "A", name: "Sympathy", description: "Tender-heartedness and concern for others.", lowLabel: "Tough-minded, unaffected by others' distress", highLabel: "Sympathetic, moved by others' needs" },
  // Conscientiousness
  { key: "C1", domain: "C", name: "Self-Efficacy", description: "Belief in one's ability to accomplish things.", lowLabel: "Doubts own competence", highLabel: "Confident in own abilities" },
  { key: "C2", domain: "C", name: "Orderliness", description: "Tendency to be organised and tidy.", lowLabel: "Disorganised, untidy", highLabel: "Organised, neat, methodical" },
  { key: "C3", domain: "C", name: "Dutifulness", description: "Strong sense of moral obligation and duty.", lowLabel: "Finds rules restrictive", highLabel: "Strong sense of duty and obligation" },
  { key: "C4", domain: "C", name: "Achievement-Striving", description: "High aspirations and hard work to achieve goals.", lowLabel: "Content with modest achievement", highLabel: "Ambitious, works hard to succeed" },
  { key: "C5", domain: "C", name: "Self-Discipline", description: "Ability to persist at tasks despite distractions.", lowLabel: "Easily distracted, procrastinates", highLabel: "Persistent, focused, self-disciplined" },
  { key: "C6", domain: "C", name: "Cautiousness", description: "Tendency to think carefully before acting.", lowLabel: "Acts impulsively, speaks without thinking", highLabel: "Deliberate, thinks before acting" },
];

// ─── Questions ────────────────────────────────────────────────────────────────
// 120 items from the IPIP-NEO-120 (Johnson, 2014), public domain.
// 4 items per facet, ordered by domain then facet.

export const IPIP_QUESTIONS: IpipQuestion[] = [
  // N1 – Anxiety
  { id: 1,  facet: "N1", text: "I worry about things.", reverse: false },
  { id: 2,  facet: "N1", text: "I fear for the worst.", reverse: false },
  { id: 3,  facet: "N1", text: "I am relaxed most of the time.", reverse: true },
  { id: 4,  facet: "N1", text: "I am not easily bothered by things.", reverse: true },
  // N2 – Anger
  { id: 5,  facet: "N2", text: "I get angry easily.", reverse: false },
  { id: 6,  facet: "N2", text: "I get irritated easily.", reverse: false },
  { id: 7,  facet: "N2", text: "I rarely get irritated.", reverse: true },
  { id: 8,  facet: "N2", text: "I am not easily annoyed.", reverse: true },
  // N3 – Depression
  { id: 9,  facet: "N3", text: "I often feel blue.", reverse: false },
  { id: 10, facet: "N3", text: "I dislike myself.", reverse: false },
  { id: 11, facet: "N3", text: "I am seldom sad.", reverse: true },
  { id: 12, facet: "N3", text: "I feel comfortable with myself.", reverse: true },
  // N4 – Self-Consciousness
  { id: 13, facet: "N4", text: "I find it difficult to approach others.", reverse: false },
  { id: 14, facet: "N4", text: "I am afraid to draw attention to myself.", reverse: false },
  { id: 15, facet: "N4", text: "I am not embarrassed easily.", reverse: true },
  { id: 16, facet: "N4", text: "I feel comfortable around people.", reverse: true },
  // N5 – Immoderation
  { id: 17, facet: "N5", text: "I eat too much.", reverse: false },
  { id: 18, facet: "N5", text: "I don't know why I do some of the things I do.", reverse: false },
  { id: 19, facet: "N5", text: "I rarely overindulge.", reverse: true },
  { id: 20, facet: "N5", text: "I easily resist temptations.", reverse: true },
  // N6 – Vulnerability
  { id: 21, facet: "N6", text: "I panic easily.", reverse: false },
  { id: 22, facet: "N6", text: "I get overwhelmed by emotions.", reverse: false },
  { id: 23, facet: "N6", text: "I remain calm under pressure.", reverse: true },
  { id: 24, facet: "N6", text: "I can handle a lot.", reverse: true },
  // E1 – Friendliness
  { id: 25, facet: "E1", text: "I make friends easily.", reverse: false },
  { id: 26, facet: "E1", text: "I warm up quickly to others.", reverse: false },
  { id: 27, facet: "E1", text: "I am hard to get to know.", reverse: true },
  { id: 28, facet: "E1", text: "I often feel uncomfortable around other people.", reverse: true },
  // E2 – Gregariousness
  { id: 29, facet: "E2", text: "I love large parties.", reverse: false },
  { id: 30, facet: "E2", text: "I talk to a lot of different people at parties.", reverse: false },
  { id: 31, facet: "E2", text: "I prefer to be alone.", reverse: true },
  { id: 32, facet: "E2", text: "I don't like crowded events.", reverse: true },
  // E3 – Assertiveness
  { id: 33, facet: "E3", text: "I take charge.", reverse: false },
  { id: 34, facet: "E3", text: "I try to lead others.", reverse: false },
  { id: 35, facet: "E3", text: "I wait for others to lead the way.", reverse: true },
  { id: 36, facet: "E3", text: "I keep in the background.", reverse: true },
  // E4 – Activity Level
  { id: 37, facet: "E4", text: "I am always busy.", reverse: false },
  { id: 38, facet: "E4", text: "I am always on the go.", reverse: false },
  { id: 39, facet: "E4", text: "I like to take it easy.", reverse: true },
  { id: 40, facet: "E4", text: "I do things at a leisurely pace.", reverse: true },
  // E5 – Excitement-Seeking
  { id: 41, facet: "E5", text: "I seek adventure.", reverse: false },
  { id: 42, facet: "E5", text: "I enjoy being part of a loud crowd.", reverse: false },
  { id: 43, facet: "E5", text: "I prefer quiet, peaceful environments.", reverse: true },
  { id: 44, facet: "E5", text: "I avoid dangerous situations.", reverse: true },
  // E6 – Cheerfulness
  { id: 45, facet: "E6", text: "I radiate joy.", reverse: false },
  { id: 46, facet: "E6", text: "I laugh a lot.", reverse: false },
  { id: 47, facet: "E6", text: "I am not a very enthusiastic person.", reverse: true },
  { id: 48, facet: "E6", text: "I seldom joke around.", reverse: true },
  // O1 – Imagination
  { id: 49, facet: "O1", text: "I have a vivid imagination.", reverse: false },
  { id: 50, facet: "O1", text: "I enjoy daydreaming.", reverse: false },
  { id: 51, facet: "O1", text: "I seldom daydream.", reverse: true },
  { id: 52, facet: "O1", text: "I do not have a good imagination.", reverse: true },
  // O2 – Artistic Interests
  { id: 53, facet: "O2", text: "I believe in the importance of art.", reverse: false },
  { id: 54, facet: "O2", text: "I see beauty in things that others might not notice.", reverse: false },
  { id: 55, facet: "O2", text: "I do not like art.", reverse: true },
  { id: 56, facet: "O2", text: "I do not enjoy going to art museums.", reverse: true },
  // O3 – Emotionality
  { id: 57, facet: "O3", text: "I experience my emotions intensely.", reverse: false },
  { id: 58, facet: "O3", text: "I feel others' emotions.", reverse: false },
  { id: 59, facet: "O3", text: "I am not easily affected by my emotions.", reverse: true },
  { id: 60, facet: "O3", text: "I rarely notice my emotional reactions.", reverse: true },
  // O4 – Adventurousness
  { id: 61, facet: "O4", text: "I prefer variety to routine.", reverse: false },
  { id: 62, facet: "O4", text: "I like to visit new places.", reverse: false },
  { id: 63, facet: "O4", text: "I prefer to stick with things that I know.", reverse: true },
  { id: 64, facet: "O4", text: "I am a creature of habit.", reverse: true },
  // O5 – Intellect
  { id: 65, facet: "O5", text: "I love to think up new ways of doing things.", reverse: false },
  { id: 66, facet: "O5", text: "I enjoy thinking about things.", reverse: false },
  { id: 67, facet: "O5", text: "I am not interested in abstract ideas.", reverse: true },
  { id: 68, facet: "O5", text: "I avoid philosophical discussions.", reverse: true },
  // O6 – Liberalism
  { id: 69, facet: "O6", text: "I believe that there is no absolute right and wrong.", reverse: false },
  { id: 70, facet: "O6", text: "I tend to vote for liberal political candidates.", reverse: false },
  { id: 71, facet: "O6", text: "I believe in one true religion.", reverse: true },
  { id: 72, facet: "O6", text: "I tend to vote for conservative political candidates.", reverse: true },
  // A1 – Trust
  { id: 73, facet: "A1", text: "I trust others.", reverse: false },
  { id: 74, facet: "A1", text: "I believe that others have good intentions.", reverse: false },
  { id: 75, facet: "A1", text: "I suspect hidden motives in others.", reverse: true },
  { id: 76, facet: "A1", text: "I am wary of others.", reverse: true },
  // A2 – Morality
  { id: 77, facet: "A2", text: "I would never cheat on my taxes.", reverse: false },
  { id: 78, facet: "A2", text: "I stick to the rules.", reverse: false },
  { id: 79, facet: "A2", text: "I use others for my own ends.", reverse: true },
  { id: 80, facet: "A2", text: "I know how to get around the rules.", reverse: true },
  // A3 – Altruism
  { id: 81, facet: "A3", text: "I make people feel welcome.", reverse: false },
  { id: 82, facet: "A3", text: "I anticipate the needs of others.", reverse: false },
  { id: 83, facet: "A3", text: "I am indifferent to the feelings of others.", reverse: true },
  { id: 84, facet: "A3", text: "I don't see the point in wasting time on others.", reverse: true },
  // A4 – Cooperation
  { id: 85, facet: "A4", text: "I hate to seem pushy.", reverse: false },
  { id: 86, facet: "A4", text: "I am easy to satisfy.", reverse: false },
  { id: 87, facet: "A4", text: "I love a good fight.", reverse: true },
  { id: 88, facet: "A4", text: "I insist that others do things my way.", reverse: true },
  // A5 – Modesty
  { id: 89, facet: "A5", text: "I dislike being the centre of attention.", reverse: false },
  { id: 90, facet: "A5", text: "I think little of myself.", reverse: false },
  { id: 91, facet: "A5", text: "I think highly of myself.", reverse: true },
  { id: 92, facet: "A5", text: "I have a high opinion of myself.", reverse: true },
  // A6 – Sympathy
  { id: 93,  facet: "A6", text: "I sympathise with the homeless.", reverse: false },
  { id: 94,  facet: "A6", text: "I feel sympathy for those who are worse off than myself.", reverse: false },
  { id: 95,  facet: "A6", text: "I am not interested in other people's problems.", reverse: true },
  { id: 96,  facet: "A6", text: "I try not to think about the needy.", reverse: true },
  // C1 – Self-Efficacy
  { id: 97,  facet: "C1", text: "I complete tasks successfully.", reverse: false },
  { id: 98,  facet: "C1", text: "I excel in what I do.", reverse: false },
  { id: 99,  facet: "C1", text: "I don't understand things.", reverse: true },
  { id: 100, facet: "C1", text: "I have little to contribute.", reverse: true },
  // C2 – Orderliness
  { id: 101, facet: "C2", text: "I like order.", reverse: false },
  { id: 102, facet: "C2", text: "I want everything to be 'just right'.", reverse: false },
  { id: 103, facet: "C2", text: "I often forget to put things back in their proper place.", reverse: true },
  { id: 104, facet: "C2", text: "I leave a mess in my room.", reverse: true },
  // C3 – Dutifulness
  { id: 105, facet: "C3", text: "I keep my promises.", reverse: false },
  { id: 106, facet: "C3", text: "I tell the truth.", reverse: false },
  { id: 107, facet: "C3", text: "I break rules.", reverse: true },
  { id: 108, facet: "C3", text: "I do the opposite of what is asked.", reverse: true },
  // C4 – Achievement-Striving
  { id: 109, facet: "C4", text: "I work hard.", reverse: false },
  { id: 110, facet: "C4", text: "I do more than what's expected of me.", reverse: false },
  { id: 111, facet: "C4", text: "I put little time and effort into my work.", reverse: true },
  { id: 112, facet: "C4", text: "I do just enough work to get by.", reverse: true },
  // C5 – Self-Discipline
  { id: 113, facet: "C5", text: "I get chores done right away.", reverse: false },
  { id: 114, facet: "C5", text: "I am always prepared.", reverse: false },
  { id: 115, facet: "C5", text: "I waste my time.", reverse: true },
  { id: 116, facet: "C5", text: "I find it difficult to get down to work.", reverse: true },
  // C6 – Cautiousness
  { id: 117, facet: "C6", text: "I think before I act.", reverse: false },
  { id: 118, facet: "C6", text: "I avoid making hasty decisions.", reverse: false },
  { id: 119, facet: "C6", text: "I act without thinking.", reverse: true },
  { id: 120, facet: "C6", text: "I make rash decisions.", reverse: true },
];

// ─── Scoring ──────────────────────────────────────────────────────────────────

export interface IpipScores {
  domainScores: Record<IpipDomainKey, number>;   // 0-100
  facetScores: Record<IpipFacetKey, number>;     // 0-100
}

/**
 * Score the IPIP-NEO-120 from raw answers.
 * @param answers - Record<questionId (1-120), response (1-5)>
 * @returns Domain and facet scores normalised to 0-100
 */
export function scoreIpip(answers: Record<number, number>): IpipScores {
  const facetRaw: Record<string, number[]> = {};

  for (const q of IPIP_QUESTIONS) {
    const raw = answers[q.id];
    if (raw === undefined) continue;
    const scored = q.reverse ? 6 - raw : raw;
    if (!facetRaw[q.facet]) facetRaw[q.facet] = [];
    facetRaw[q.facet].push(scored);
  }

  // Each facet has 4 items, max raw = 20, min = 4 → normalise to 0-100
  const facetScores: Record<string, number> = {};
  for (const facet of IPIP_FACETS) {
    const raws = facetRaw[facet.key] ?? [];
    const sum = raws.reduce((a, b) => a + b, 0);
    const max = raws.length * 5;
    const min = raws.length * 1;
    facetScores[facet.key] = raws.length > 0 ? Math.round(((sum - min) / (max - min)) * 100) : 50;
  }

  // Domain scores = mean of 6 facet scores
  const domainScores: Record<string, number> = {};
  for (const domain of IPIP_DOMAINS) {
    const facetsInDomain = IPIP_FACETS.filter((f) => f.domain === domain.key);
    const sum = facetsInDomain.reduce((a, f) => a + (facetScores[f.key] ?? 50), 0);
    domainScores[domain.key] = Math.round(sum / facetsInDomain.length);
  }

  return {
    domainScores: domainScores as Record<IpipDomainKey, number>,
    facetScores: facetScores as Record<IpipFacetKey, number>,
  };
}

/**
 * Get a narrative interpretation of a domain score.
 */
export function interpretDomainScore(domain: IpipDomain, score: number): string {
  if (score >= 70) return `High ${domain.name}: ${domain.highLabel}.`;
  if (score <= 30) return `Low ${domain.name}: ${domain.lowLabel}.`;
  return `Average ${domain.name}: a balanced profile between ${domain.lowLabel.toLowerCase()} and ${domain.highLabel.toLowerCase()}.`;
}

/**
 * Get a career-relevant interpretation of the full IPIP profile.
 * Returns a plain-text summary suitable for inclusion in the AI analysis prompt.
 */
export function ipipCareerNarrative(scores: IpipScores): string {
  const lines: string[] = ["IPIP-NEO-120 Personality Profile:"];
  for (const domain of IPIP_DOMAINS) {
    const ds = scores.domainScores[domain.key];
    lines.push(`\n${domain.name} (${ds}/100): ${interpretDomainScore(domain, ds)}`);
    const facets = IPIP_FACETS.filter((f) => f.domain === domain.key);
    for (const facet of facets) {
      const fs = scores.facetScores[facet.key];
      const level = fs >= 70 ? "High" : fs <= 30 ? "Low" : "Average";
      lines.push(`  - ${facet.name}: ${level} (${fs}/100)`);
    }
  }
  return lines.join("\n");
}
