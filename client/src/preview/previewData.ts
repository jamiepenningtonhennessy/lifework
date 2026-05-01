/**
 * Preview Mode — Static Fixture
 *
 * Rich dummy data that powers every client-facing page in preview mode.
 * All data is fictional. The fake client is "Alex Morgan", a mid-career
 * solicitor considering a move into in-house or consultancy roles.
 */

// ─── Profile ─────────────────────────────────────────────────────────────────
export const PREVIEW_PROFILE = {
  id: 9999,
  userId: "preview",
  firstName: "Alex",
  lastName: "Morgan",
  email: "alex.morgan@example.com",
  analysisStatus: "complete" as const,
  interviewCompleted: true,
  backgroundCompleted: true,
  viaCompleted: true,
  ipipCompleted: true,
  createdAt: new Date("2025-01-15"),
};

// ─── Achievements (Interview) ─────────────────────────────────────────────────
export const PREVIEW_ACHIEVEMENTS = [
  {
    id: 1,
    clientId: 9999,
    decade: "Childhood (before 18)",
    title: "Founded the school debating society",
    description:
      "Convinced the headteacher to let a group of students run a weekly debating club. Within a year it had 40 members and won a regional competition.",
    esf: "E",
    order: 1,
  },
  {
    id: 2,
    clientId: 9999,
    decade: "Childhood (before 18)",
    title: "Organised the village summer fête",
    description:
      "Took over from a parent who dropped out and coordinated 12 stalls, entertainment, and catering for 300 people.",
    esf: "S",
    order: 2,
  },
  {
    id: 3,
    clientId: 9999,
    decade: "20s",
    title: "First-class LLB dissertation on corporate governance",
    description:
      "Chose a topic no supervisor had supervised before. Spent three months interviewing FTSE 100 company secretaries. Awarded a distinction.",
    esf: "E",
    order: 3,
  },
  {
    id: 4,
    clientId: 9999,
    decade: "20s",
    title: "Led the trainee intake programme at my firm",
    description:
      "Volunteered to redesign the two-week induction for 18 new trainees. Cut the drop-out rate in the first six months from 30% to 8%.",
    esf: "F",
    order: 4,
  },
  {
    id: 5,
    clientId: 9999,
    decade: "30s",
    title: "Closed a £40m cross-border acquisition",
    description:
      "Lead associate on a deal involving four jurisdictions. Managed a team of six and kept the client informed throughout a six-month process.",
    esf: "E",
    order: 5,
  },
  {
    id: 6,
    clientId: 9999,
    decade: "30s",
    title: "Mentored three junior associates to partnership track",
    description:
      "Informally took on three associates who were struggling. All three were promoted within 18 months. One has since made partner.",
    esf: "F",
    order: 6,
  },
  {
    id: 7,
    clientId: 9999,
    decade: "40s",
    title: "Built the firm's pro bono practice from scratch",
    description:
      "Identified a gap, wrote the business case, recruited 12 volunteer lawyers, and delivered 800 hours of pro bono advice in year one.",
    esf: "S",
    order: 7,
  },
];

// ─── Background ───────────────────────────────────────────────────────────────
export const PREVIEW_FAMILY = {
  id: 1,
  clientId: 9999,
  fatherOccupation: "Secondary school teacher (History)",
  motherOccupation: "NHS practice manager",
  siblings: "One younger sister — now a GP",
  childhoodLocation: "Shrewsbury, Shropshire",
  familyNotes:
    "Both parents were public-sector professionals who valued education and service. The household was intellectually stimulating — dinner-table debates were common. Financial security was modest but stable.",
};

export const PREVIEW_EDUCATION = [
  {
    id: 1,
    clientId: 9999,
    institution: "Shrewsbury School",
    qualification: "A-Levels",
    subject: "History, English Literature, Politics",
    yearFrom: 2000,
    yearTo: 2002,
    notes: "Head of Debating Society. School prize for History.",
  },
  {
    id: 2,
    clientId: 9999,
    institution: "University of Bristol",
    qualification: "LLB (Hons)",
    subject: "Law",
    yearFrom: 2002,
    yearTo: 2005,
    notes: "First Class. Mooting champion 2004.",
  },
  {
    id: 3,
    clientId: 9999,
    institution: "BPP Law School",
    qualification: "LPC",
    subject: "Legal Practice Course",
    yearFrom: 2005,
    yearTo: 2006,
    notes: "Distinction.",
  },
];

export const PREVIEW_CAREER = [
  {
    id: 1,
    clientId: 9999,
    role: "Trainee Solicitor",
    organisation: "Clifford Chance LLP",
    yearFrom: 2006,
    yearTo: 2008,
    notes: "Corporate M&A and Banking seats.",
  },
  {
    id: 2,
    clientId: 9999,
    role: "Associate — Corporate M&A",
    organisation: "Clifford Chance LLP",
    yearFrom: 2008,
    yearTo: 2014,
    notes: "Promoted to Senior Associate in 2012.",
  },
  {
    id: 3,
    clientId: 9999,
    role: "Senior Associate — Corporate",
    organisation: "Linklaters LLP",
    yearFrom: 2014,
    yearTo: 2019,
    notes: "Led the trainee development programme. Pro bono lead.",
  },
  {
    id: 4,
    clientId: 9999,
    role: "Legal Director",
    organisation: "Linklaters LLP",
    yearFrom: 2019,
    yearTo: null,
    notes: "Current role. Considering next step.",
  },
];

// ─── VIA Character Strengths ──────────────────────────────────────────────────
export const PREVIEW_VIA_RESULTS = {
  id: 1,
  clientId: 9999,
  rankedStrengths: [
    { rank: 1, id: "leadership", name: "Leadership", virtue: "justice", score: 23 },
    { rank: 2, id: "fairness", name: "Fairness", virtue: "justice", score: 22 },
    { rank: 3, id: "love_of_learning", name: "Love of Learning", virtue: "wisdom", score: 22 },
    { rank: 4, id: "perspective", name: "Perspective", virtue: "wisdom", score: 21 },
    { rank: 5, id: "honesty", name: "Honesty", virtue: "courage", score: 21 },
    { rank: 6, id: "kindness", name: "Kindness", virtue: "humanity", score: 20 },
    { rank: 7, id: "social_intelligence", name: "Social Intelligence", virtue: "humanity", score: 20 },
    { rank: 8, id: "curiosity", name: "Curiosity", virtue: "wisdom", score: 19 },
    { rank: 9, id: "prudence", name: "Prudence", virtue: "temperance", score: 18 },
    { rank: 10, id: "perseverance", name: "Perseverance", virtue: "courage", score: 18 },
    { rank: 11, id: "creativity", name: "Creativity", virtue: "wisdom", score: 17 },
    { rank: 12, id: "bravery", name: "Bravery", virtue: "courage", score: 17 },
    { rank: 13, id: "teamwork", name: "Teamwork", virtue: "justice", score: 16 },
    { rank: 14, id: "self_regulation", name: "Self-Regulation", virtue: "temperance", score: 16 },
    { rank: 15, id: "appreciation_of_beauty", name: "Appreciation of Beauty", virtue: "transcendence", score: 15 },
    { rank: 16, id: "gratitude", name: "Gratitude", virtue: "transcendence", score: 15 },
    { rank: 17, id: "hope", name: "Hope", virtue: "transcendence", score: 14 },
    { rank: 18, id: "humor", name: "Humor", virtue: "transcendence", score: 14 },
    { rank: 19, id: "love", name: "Love", virtue: "humanity", score: 13 },
    { rank: 20, id: "zest", name: "Zest", virtue: "courage", score: 13 },
    { rank: 21, id: "forgiveness", name: "Forgiveness", virtue: "temperance", score: 12 },
    { rank: 22, id: "humility", name: "Humility", virtue: "temperance", score: 12 },
    { rank: 23, id: "spirituality", name: "Spirituality", virtue: "transcendence", score: 11 },
    { rank: 24, id: "citizenship", name: "Citizenship", virtue: "justice", score: 11 },
  ],
  completedAt: new Date("2025-02-01"),
};

// ─── IPIP-NEO Personality ─────────────────────────────────────────────────────
export const PREVIEW_IPIP_RESULTS = {
  id: 1,
  clientId: 9999,
  domainScores: {
    N: 28,
    E: 72,
    O: 81,
    A: 68,
    C: 76,
  },
  facetScores: {
    N1: 30, N2: 25, N3: 28, N4: 32, N5: 24, N6: 29,
    E1: 75, E2: 70, E3: 68, E4: 74, E5: 72, E6: 73,
    O1: 82, O2: 78, O3: 85, O4: 80, O5: 79, O6: 82,
    A1: 70, A2: 65, A3: 72, A4: 68, A5: 66, A6: 67,
    C1: 78, C2: 74, C3: 76, C4: 80, C5: 72, C6: 76,
  },
  completedAt: new Date("2025-02-10"),
};

// ─── WOW Report ───────────────────────────────────────────────────────────────
export const PREVIEW_WOW_REPORT = {
  id: 1,
  clientId: 9999,
  wowReportStatus: "complete" as const,
  wowReportGeneratedAt: new Date("2025-03-01"),
  wowReportPdfUrl: null,
  wowReportError: null,
  wowReportJson: {
    clientName: "Alex",
    clientFullName: "Alex Morgan",
    generatedAt: "1 March 2025",
    summary: `## Lifework Summary

Alex Morgan is a Legal Director at a Magic Circle firm whose career has been shaped by a consistent and early-established pattern: the compulsion to build things that did not previously exist, and to develop the people around them. From founding a debating society at school to constructing a pro bono practice from scratch, Alex has repeatedly chosen the harder path — the one that involves persuasion, design, and leadership — over the more straightforward one.

The analytical rigour that earned a first-class degree and a distinction at LPC is not separate from the human warmth that has mentored three associates to partnership track. In Alex's case, these are the same impulse: a desire to understand things deeply and then share that understanding generously.

Alex is at a crossroads that is less about capability — which is not in question — and more about context. The question is not "can Alex do more?" but "in what kind of organisation will Alex's particular combination of intellectual ambition, relational skill, and builder's instinct produce the most meaning?"`,

    lifeHistoryPattern: `## Life History Pattern

### The Seed Themes (Before 18)

The earliest recorded achievement — founding the school debating society — is not simply a story about public speaking. It is a story about institutional creation: identifying a gap, making the case to authority, recruiting participants, and sustaining something over time. Alex was 15. The pattern was already fully formed.

The second childhood achievement — organising the village fête after a parent dropped out — adds a second dimension: Alex steps in when things are at risk of falling apart, takes ownership without being asked, and delivers. This is not crisis management; it is a quiet confidence that "I can sort this."

### The 20s: Intellectual Ambition Meets Institutional Life

The first-class dissertation on corporate governance was not a conventional choice. Alex sought out a topic that was genuinely uncharted, spent months doing primary research, and produced something original. This is the love of learning in action — not learning as accumulation, but learning as construction.

The decision to redesign the trainee induction programme in the same decade is the other side of the same coin. Alex saw something that was not working, had a better idea, and persuaded the institution to let them try it. The outcome — a drop in early attrition from 30% to 8% — is the kind of result that comes from someone who actually cares whether the people around them succeed.

### The 30s and 40s: Scale and Depth

The £40m cross-border acquisition is the professional peak of Alex's transactional career. But it is notable that the achievement Alex describes is not the deal itself — it is the team management and the client communication. The deal is the context; the people are the story.

The pro bono practice is the clearest expression of the builder theme at full maturity: a business case written, a team recruited, a programme delivered, 800 hours of advice given. Alex did this in addition to a full-time Legal Director role, which says something about where the energy actually comes from.

### The Foundational Motif

The thread that connects every decade is this: **Alex builds things for people who need them, in institutions that would not have built them without Alex.** This is not a job description. It is a vocation.`,

    personalitySection: `## Personality Profile: A Deep Dive

### Big Five Overview

Alex's IPIP-NEO-120 results present a distinctive profile: high Openness to Experience (81st percentile), high Conscientiousness (76th), high Extraversion (72nd), moderate-high Agreeableness (68th), and low Neuroticism (28th). This is an unusual combination — high O and high C together are relatively rare, and their interaction is the key to understanding Alex's professional style.

### Openness to Experience (81st Percentile)

Alex is genuinely intellectually curious — not performatively so. The high scores on the Openness facets (Ideas: 85, Aesthetics: 82, Fantasy: 82) suggest someone who finds abstract thinking genuinely pleasurable, who is drawn to complexity, and who is likely to be bored by routine work that does not require conceptual engagement. This is consistent with the choice of an uncharted dissertation topic and the decision to build a pro bono practice rather than simply participate in one.

### Conscientiousness (76th Percentile)

The high Conscientiousness score explains how the Openness translates into results rather than remaining at the level of ideas. Alex is organised, thorough, and reliable. The high Achievement Striving facet (80th) in particular suggests someone who sets high standards for themselves and is genuinely uncomfortable with work that falls below those standards.

### Extraversion (72nd Percentile)

Alex draws energy from people and is comfortable in leadership roles. The high Assertiveness (75th) and Positive Emotions (73rd) facets are consistent with the debating society founder, the trainee programme redesigner, and the pro bono practice builder — all of which required sustained persuasion and the ability to energise others.

### The Interaction Effect

The combination of high O and high C means Alex can both generate novel ideas and execute them reliably. This is the profile of someone who is genuinely suited to roles that require both strategic thinking and operational follow-through — a relatively rare combination that is often described as "entrepreneurial" in an institutional context.`,

    behaviouralStyle: `## Behavioural Style

### Insights Discovery Profile

Alex's Insights Discovery profile shows a primary Blue-Green energy, with a strong secondary Yellow. This means Alex leads with analytical rigour and a desire to get things right (Blue), combined with a genuine care for the people involved and a preference for collaborative process (Green). The Yellow energy emerges in public settings — Alex is more animated, persuasive, and visibly enthusiastic when presenting ideas or leading groups than when working alone.

### How Alex Shows Up

In professional settings, Alex tends to be the person who has thought about the problem more carefully than anyone else in the room, but who presents that thinking in a way that invites others in rather than shutting them down. This is a relatively rare combination: intellectual rigour without intellectual arrogance.

Alex is likely to be most effective in roles that combine strategic analysis with people leadership — where the quality of the thinking and the quality of the relationships both matter. Alex is likely to be least effective in roles that are purely transactional, highly repetitive, or that require sustained political manoeuvring without the ability to act on principle.

### Under Pressure

Under pressure, Alex's Blue energy can become over-dominant: the desire to get things right can tip into perfectionism, and the care for others can make it difficult to deliver difficult messages quickly. Alex is aware of this tendency and has developed strategies for managing it — but it remains the primary development edge.`,

    careerDirections: `## Career Directions

### Direction 1: General Counsel / Chief Legal Officer (In-House)

This is the most natural next step for Alex's profile. An in-house GC role in a mid-sized company (£100m–£500m revenue) would give Alex the combination of strategic influence, people leadership, and institutional building that has characterised every peak achievement in the life history. The move from private practice to in-house is not a step down — for someone with Alex's profile, it is a move towards the kind of work that actually energises them.

**Why it fits:** Alex's builder instinct, relational skill, and strategic thinking are all well-suited to building a legal function from a small team. The GC role also has a seat at the leadership table — which is where Alex's perspective and communication skills are most valuable.

### Direction 2: Legal Education / Professional Development

Alex's consistent pattern of developing others — the trainee induction redesign, the three mentored associates, the pro bono practice — points towards a genuine vocation in legal education. This could take the form of a role at a law school, a professional development director role at a large firm, or an independent coaching/consultancy practice focused on lawyer development.

**Why it fits:** The love of learning and the love of teaching are both present in Alex's profile. This direction would allow Alex to work at the level of ideas and systems rather than individual transactions.

### Direction 3: Legal Technology / Innovation

Alex's high Openness and builder instinct, combined with deep legal expertise, make this a credible direction. The legal technology sector is actively seeking people who understand both the law and the human systems around it — and who can communicate across the technical/legal divide.

**Why it fits:** This direction would satisfy Alex's intellectual curiosity and the desire to build something new. It carries more risk than the GC route but potentially more meaning for someone who is genuinely interested in how the legal profession is changing.`,

    developmentEdge: `## Development Edge

### Edge 1: Tolerating Imperfection in Others

Alex's high Conscientiousness and high standards are genuine strengths — but they can create a subtle dynamic where others feel they cannot meet the bar Alex sets. The development edge is not to lower standards, but to become more explicit about what "good enough" looks like at each stage of a project, and to give people permission to produce imperfect work in progress.

### Edge 2: Political Navigation

Alex's preference for acting on principle is a strength in environments that value integrity. It is a vulnerability in environments where political capital matters more than being right. The development edge is to develop a more sophisticated understanding of when to push and when to wait — not as a compromise of values, but as a more effective way of achieving them.

### Edge 3: Visibility

Alex's work tends to speak for itself — which means it often does not speak loudly enough. The pro bono practice, the trainee programme, the mentoring — all of these have had significant impact, but Alex has not systematically built a reputation around them. The development edge is to become more intentional about making the work visible, both within the current firm and in the broader legal market.`,

    conclusions: `## Past: What the Life History Reveals

Alex Morgan's life history reveals a pattern that was established before the age of 18 and has reproduced itself, in different forms, across every subsequent decade. The seed theme is institutional creation: Alex identifies a gap, makes the case, builds the thing, and develops the people around it. This pattern appeared first in the school debating society, then in the trainee induction programme, then in the pro bono practice. It is not a career strategy. It is a vocation.

The second consistent thread is relational investment: Alex does not build things in isolation. Every significant achievement in the life history involves recruiting others, developing others, or creating conditions in which others can succeed. The three mentored associates, the 800 hours of pro bono advice, the 40-member debating society — these are not side projects. They are the main event.

## Present: Who Alex Is

Alex Morgan is a Legal Director who combines intellectual rigour with genuine relational warmth — a combination that is rarer in the legal profession than it should be. The IPIP-NEO profile (O: 81, C: 76, E: 72) describes someone who generates original ideas and executes them reliably, who leads with analytical depth and communicates with clarity and warmth. The VIA strengths — Leadership, Fairness, Love of Learning, Perspective, Honesty — describe someone who is trusted precisely because they are both competent and principled.

Alex operating at full capacity looks like this: a strategic leadership role in an organisation that values both intellectual quality and human development, where Alex has the authority to build something, the team to develop, and the space to act on principle.

## Future: Where Alex Is Headed

The two most compelling directions for Alex are General Counsel in a mid-sized company and a role in legal education or professional development. Both directions honour the builder instinct and the relational vocation. The GC route offers more immediate financial continuity and a clear institutional context. The education route offers more alignment with what Alex actually finds most meaningful.

The development edges — tolerating imperfection in others, political navigation, visibility — are all addressable. None of them are character flaws. They are the natural shadow side of Alex's genuine strengths.

The path forward is not a departure from who Alex has always been. It is a continuation of it — in a context that is finally large enough to contain it.

## Tell Me About Yourself

The following is a suggested answer to the interview question 'Tell me about yourself' — drawn from everything Alex Morgan's Lifework analysis has revealed:

I am a lawyer who has always been more interested in building things than in billing hours. Throughout my career — from redesigning the trainee induction at Clifford Chance to building a pro bono practice from scratch at Linklaters — I have found that the work I do best is the work that creates something that did not exist before: a programme, a team, a function, a culture. I combine a genuine love of legal complexity with an equal commitment to the people around me, and I have been told that I am the person who makes difficult things feel manageable. I am now looking for a role where those two things — the intellectual rigour and the human investment — are both valued, and where I have the authority and the space to build something that matters.`,
  },
};

// ─── Career Explorer Session ──────────────────────────────────────────────────
export const PREVIEW_CAREER_EXPLORER_MESSAGES = [
  {
    id: 1,
    role: "assistant" as const,
    content: `*She sets down her pen and looks up.*

Alex. I've read your report carefully. What strikes me most is not the breadth of what you've done — it's how consistent the pattern is. You've been building things for people who needed them since you were fifteen years old. The debating society. The trainee induction. The pro bono practice. Every decade, the same instinct.

So here's my opening question: when you imagine yourself five years from now, doing work that genuinely matters to you — what does the *institution* look like? Not the job title. The institution.`,
    createdAt: new Date("2025-03-05T10:00:00"),
  },
  {
    id: 2,
    role: "user" as const,
    content: "Smaller than where I am now. Somewhere I can actually see the impact of what I do.",
    createdAt: new Date("2025-03-05T10:02:00"),
  },
  {
    id: 3,
    role: "assistant" as const,
    content: `*She nods slowly.*

That's interesting. "See the impact" — can you say more about what that means for you? Because in your current role you've had measurable impact: the pro bono practice, the associates you've mentored. But something about the scale or the visibility of that impact isn't satisfying you. What's missing?`,
    createdAt: new Date("2025-03-05T10:03:00"),
  },
  {
    id: 4,
    role: "user" as const,
    content: "I think it's that the firm doesn't really value those things. The pro bono work, the mentoring — they're tolerated, not celebrated. The only thing that actually counts is billing.",
    createdAt: new Date("2025-03-05T10:05:00"),
  },
  {
    id: 5,
    role: "assistant" as const,
    content: `*She leans forward slightly.*

So the issue isn't the work itself — it's the environment's relationship to the work. You can do the building, but the institution doesn't recognise it as building. It recognises it as distraction.

That's a values mismatch, not a capability gap. And it's worth naming clearly, because it changes what you're looking for. You're not looking for a bigger role. You're looking for an organisation where the things you care about are the things the organisation cares about.

The GC route and the education route both appear in your report. Which one do you find yourself thinking about more?`,
    createdAt: new Date("2025-03-05T10:07:00"),
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// ALISTAIR DRUMMOND — dummy client data
// A 48-year-old partner at a mid-size commercial law firm, considering whether
// to stay in private practice, move in-house, or pivot to legal tech / academia.
// ─────────────────────────────────────────────────────────────────────────────

export const PREVIEW_PROFILE_ALISTAIR = {
  id: 9998,
  userId: "preview-alistair",
  firstName: "Alistair",
  lastName: "Drummond",
  email: "alistair.drummond@example.com",
  analysisStatus: "complete" as const,
  interviewCompleted: true,
  backgroundCompleted: true,
  viaCompleted: true,
  ipipCompleted: true,
  createdAt: new Date("2025-02-01"),
};

export const PREVIEW_ACHIEVEMENTS_ALISTAIR = [
  {
    id: 101,
    clientId: 9998,
    decade: "childhood",
    title: "Built a working radio transmitter",
    description:
      "Spent a summer building an AM radio transmitter from a kit, then modified it to broadcast further. Neighbourhood kids tuned in. Wrote a short programme guide.",
    esf: "enjoyable",
    age: 12,
    othersObservations: "Physics teacher said I had an unusual ability to hold a complex system in my head.",
  },
  {
    id: 102,
    clientId: 9998,
    decade: "teens",
    title: "Won the regional schools chess championship",
    description:
      "Trained independently for two years using library books. Represented the school at regional level and won the under-18 individual title.",
    esf: "satisfying",
    age: 16,
    othersObservations: "Coach said I was the most methodical player he had coached — never made the same mistake twice.",
  },
  {
    id: 103,
    clientId: 9998,
    decade: "teens",
    title: "Edited the school magazine",
    description:
      "Took over a failing publication, redesigned the layout, recruited writers, and doubled the readership in one academic year.",
    esf: "fulfilling",
    age: 17,
    othersObservations: "Head of English said I had a gift for drawing out other people's best work.",
  },
  {
    id: 104,
    clientId: 9998,
    decade: "twenties",
    title: "Published a note in the Cambridge Law Journal",
    description:
      "As a second-year undergraduate, spotted an inconsistency in a recent Court of Appeal judgment and wrote a 2,000-word note. Accepted after minor revisions.",
    esf: "satisfying",
    age: 20,
    othersObservations: "Tutor described it as the most original piece of student writing he had seen in five years.",
  },
  {
    id: 105,
    clientId: 9998,
    decade: "twenties",
    title: "Negotiated the firm's first pro bono partnership with a housing charity",
    description:
      "As a newly qualified solicitor, identified a local housing charity that needed legal support. Drafted the partnership agreement, got sign-off from the managing partner, and ran the first clinic.",
    esf: "fulfilling",
    age: 27,
    othersObservations: "Managing partner said it was the most commercially astute piece of business development from a junior he had seen.",
  },
  {
    id: 106,
    clientId: 9998,
    decade: "thirties",
    title: "Designed and delivered the firm's knowledge management system",
    description:
      "Identified that the firm was losing institutional knowledge every time a senior lawyer left. Designed a precedent library and know-how system, trained 40 lawyers, and reduced drafting time on standard documents by 30%.",
    esf: "satisfying",
    age: 34,
    othersObservations: "IT director said I was the only lawyer who had ever understood the technical constraints and worked within them.",
  },
  {
    id: 107,
    clientId: 9998,
    decade: "thirties",
    title: "Led the firm's largest ever restructuring deal",
    description:
      "Lead partner on a £120m debt restructuring involving six creditor groups. Managed a team of 14 over nine months. The deal was cited in Legal 500 as a standout transaction.",
    esf: "enjoyable",
    age: 38,
    othersObservations: "Client CFO said I was the calmest person in the room at every crisis point.",
  },
  {
    id: 108,
    clientId: 9998,
    decade: "forties",
    title: "Launched an internal legal tech incubator",
    description:
      "Persuaded the partnership to fund a six-month pilot in which junior lawyers could prototype legal tech tools. Three tools are now in daily use. One has been licensed to two other firms.",
    esf: "fulfilling",
    age: 44,
    othersObservations: "Junior associates said it was the first time the firm had made them feel like their ideas mattered.",
  },
  {
    id: 109,
    clientId: 9998,
    decade: "forties",
    title: "Appointed visiting lecturer at UCL Faculty of Laws",
    description:
      "Invited to deliver a module on commercial dispute resolution to LLM students. Developed original case studies. Student evaluations placed the module in the top 10% of the faculty.",
    esf: "fulfilling",
    age: 46,
    othersObservations: "Course director said I had a rare ability to make abstract legal doctrine feel practically urgent.",
  },
];

export const PREVIEW_FAMILY_ALISTAIR = {
  id: 2,
  clientId: 9998,
  fatherOccupation: "Electrical engineer (British Telecom)",
  motherOccupation: "Secondary school librarian",
  siblings: "One older brother — now a software architect in Edinburgh",
  childhoodLocation: "Guildford, Surrey",
  familyNotes:
    "A technically-minded household where precision and self-sufficiency were valued. Father built his own hi-fi equipment; mother ran the school library with a rigour that impressed even the headteacher. Intellectual curiosity was modelled rather than taught.",
};

export const PREVIEW_EDUCATION_ALISTAIR = [
  {
    id: 10,
    clientId: 9998,
    institution: "Royal Grammar School, Guildford",
    qualification: "A-Levels",
    subject: "Mathematics, Physics, Economics",
    yearFrom: 1993,
    yearTo: 1995,
    notes: "A, A, A. Head of Chess Club. Editor of school magazine.",
  },
  {
    id: 11,
    clientId: 9998,
    institution: "Gonville & Caius College, Cambridge",
    qualification: "BA Law (Hons)",
    subject: "Law",
    yearFrom: 1995,
    yearTo: 1998,
    notes: "First Class. Published in Cambridge Law Journal (1997).",
  },
  {
    id: 12,
    clientId: 9998,
    institution: "College of Law, London",
    qualification: "LPC",
    subject: "Legal Practice Course",
    yearFrom: 1998,
    yearTo: 1999,
    notes: "Commendation.",
  },
];

export const PREVIEW_CAREER_ALISTAIR = [
  {
    id: 10,
    clientId: 9998,
    role: "Trainee Solicitor",
    organisation: "Freshfields Bruckhaus Deringer",
    yearFrom: 1999,
    yearTo: 2001,
    notes: "Finance and Dispute Resolution seats.",
  },
  {
    id: 11,
    clientId: 9998,
    role: "Associate — Finance & Restructuring",
    organisation: "Freshfields Bruckhaus Deringer",
    yearFrom: 2001,
    yearTo: 2008,
    notes: "Promoted to Senior Associate in 2005.",
  },
  {
    id: 12,
    clientId: 9998,
    role: "Partner — Finance & Restructuring",
    organisation: "Gateley plc",
    yearFrom: 2008,
    yearTo: null,
    notes: "Current role. Legal 500 ranked. Visiting Lecturer at UCL since 2022.",
  },
];

export const PREVIEW_VIA_RESULTS_ALISTAIR = {
  id: 2,
  clientId: 9998,
  rankedStrengths: [
    { rank: 1,  id: "love_of_learning",        name: "Love of Learning",        virtue: "wisdom",        score: 24 },
    { rank: 2,  id: "curiosity",                name: "Curiosity",               virtue: "wisdom",        score: 23 },
    { rank: 3,  id: "creativity",               name: "Creativity",              virtue: "wisdom",        score: 22 },
    { rank: 4,  id: "perspective",              name: "Perspective",             virtue: "wisdom",        score: 22 },
    { rank: 5,  id: "prudence",                 name: "Prudence",                virtue: "temperance",    score: 21 },
    { rank: 6,  id: "perseverance",             name: "Perseverance",            virtue: "courage",       score: 21 },
    { rank: 7,  id: "honesty",                  name: "Honesty",                 virtue: "courage",       score: 20 },
    { rank: 8,  id: "leadership",               name: "Leadership",              virtue: "justice",       score: 19 },
    { rank: 9,  id: "fairness",                 name: "Fairness",                virtue: "justice",       score: 19 },
    { rank: 10, id: "self_regulation",          name: "Self-Regulation",         virtue: "temperance",    score: 18 },
    { rank: 11, id: "bravery",                  name: "Bravery",                 virtue: "courage",       score: 17 },
    { rank: 12, id: "social_intelligence",      name: "Social Intelligence",     virtue: "humanity",      score: 17 },
    { rank: 13, id: "kindness",                 name: "Kindness",                virtue: "humanity",      score: 16 },
    { rank: 14, id: "teamwork",                 name: "Teamwork",                virtue: "justice",       score: 16 },
    { rank: 15, id: "appreciation_of_beauty",   name: "Appreciation of Beauty",  virtue: "transcendence", score: 15 },
    { rank: 16, id: "hope",                     name: "Hope",                    virtue: "transcendence", score: 14 },
    { rank: 17, id: "humor",                    name: "Humor",                   virtue: "transcendence", score: 14 },
    { rank: 18, id: "gratitude",                name: "Gratitude",               virtue: "transcendence", score: 13 },
    { rank: 19, id: "love",                     name: "Love",                    virtue: "humanity",      score: 13 },
    { rank: 20, id: "zest",                     name: "Zest",                    virtue: "courage",       score: 12 },
    { rank: 21, id: "forgiveness",              name: "Forgiveness",             virtue: "temperance",    score: 12 },
    { rank: 22, id: "humility",                 name: "Humility",                virtue: "temperance",    score: 11 },
    { rank: 23, id: "citizenship",              name: "Citizenship",             virtue: "justice",       score: 11 },
    { rank: 24, id: "spirituality",             name: "Spirituality",            virtue: "transcendence", score: 10 },
  ],
  completedAt: new Date("2025-03-01"),
};

export const PREVIEW_IPIP_RESULTS_ALISTAIR = {
  id: 2,
  clientId: 9998,
  domainScores: {
    N: 22,  // Low neuroticism — calm under pressure
    E: 52,  // Moderate extraversion — ambivert
    O: 88,  // Very high openness — intellectual curiosity, creativity
    A: 58,  // Moderate agreeableness
    C: 82,  // High conscientiousness — methodical, precise
  },
  facetScores: {
    N1: 20, N2: 18, N3: 22, N4: 25, N5: 20, N6: 27,
    E1: 55, E2: 48, E3: 52, E4: 56, E5: 50, E6: 51,
    O1: 90, O2: 85, O3: 92, O4: 88, O5: 86, O6: 87,
    A1: 60, A2: 55, A3: 62, A4: 58, A5: 56, A6: 57,
    C1: 84, C2: 80, C3: 82, C4: 85, C5: 78, C6: 83,
  },
  completedAt: new Date("2025-03-10"),
};

// ─── Normalised client data accessor ─────────────────────────────────────────
// Provides a single interface for both Alex and Alistair data, with all fields
// normalised to the same shape so components don't need to branch on client.

export type PreviewClientKey = "alex" | "alistair";

export type NormalisedAchievement = {
  id: number;
  clientId: number;
  decade: string;
  title: string;
  description: string;
  esf: string;
  order: number;
};

export type NormalisedEducation = {
  id: number;
  institution: string;
  qualification: string;
  type: string;
  years: string;
  notes: string;
};

export type NormalisedCareer = {
  id: number;
  title: string;
  organisation: string;
  sector: string;
  years: string;
  notes: string;
};

export type NormalisedFamily = {
  fatherOccupation: string;
  motherOccupation: string;
  siblings: string;
  childhoodLocation: string;
  familyNotes: string;
};

export type NormalisedProfile = {
  id: number;
  fullName: string;
  firstName: string;
  lastName: string;
  email: string;
  analysisStatus: "complete";
  interviewCompleted: boolean;
  backgroundCompleted: boolean;
  viaCompleted: boolean;
  ipipCompleted: boolean;
  createdAt: Date;
};

export type NormalisedClientData = {
  profile: NormalisedProfile;
  achievements: NormalisedAchievement[];
  family: NormalisedFamily;
  education: NormalisedEducation[];
  career: NormalisedCareer[];
};

// Map Alistair decade labels to the canonical phase IDs used by the form
const ALISTAIR_DECADE_MAP: Record<string, string> = {
  childhood: "mid_childhood",
  teens: "late_childhood",
  twenties: "twenties",
  thirties: "thirties",
  forties: "forties",
};

type RawAchievement = {
  id: number;
  clientId: number;
  decade: string;
  title: string;
  description: string;
  esf: string;
  order?: number;
  age?: number;
  othersObservations?: string;
};

function normAchievements(
  raw: RawAchievement[]
): NormalisedAchievement[] {
  return raw.map((a, i) => ({
    id: a.id,
    clientId: a.clientId,
    decade: a.order != null ? a.decade : (ALISTAIR_DECADE_MAP[a.decade] ?? a.decade),
    title: a.title,
    description: a.description,
    esf: a.esf,
    order: a.order ?? i + 1,
  }));
}

type RawEducation = {
  id: number;
  clientId: number;
  institution: string;
  qualification: string;
  subject?: string;
  yearFrom: number;
  yearTo: number | null;
  notes?: string;
};

function normEducation(
  raw: RawEducation[]
): NormalisedEducation[] {
  return raw.map((e) => ({
    id: e.id,
    institution: e.institution,
    qualification: e.qualification,
    type: e.qualification.includes("A-Level") ? "Secondary" :
          e.qualification.includes("LPC") || e.qualification.includes("BVC") ? "Professional" : "University",
    years: `${e.yearFrom}–${e.yearTo ?? "present"}`,
    notes: e.notes ?? "",
  }));
}

type RawCareer = {
  id: number;
  clientId: number;
  role: string;
  organisation: string;
  yearFrom: number;
  yearTo: number | null;
  notes?: string;
};

function normCareer(
  raw: RawCareer[]
): NormalisedCareer[] {
  return raw.map((c) => ({
    id: c.id,
    title: c.role,
    organisation: c.organisation,
    sector: c.organisation.includes("LLP") || c.organisation.includes("plc") || c.organisation.includes("Freshfields") || c.organisation.includes("Clifford") || c.organisation.includes("Linklaters") || c.organisation.includes("Gateley") || c.organisation.includes("BPP") ? "Legal" : "Other",
    years: `${c.yearFrom}–${c.yearTo ?? "present"}`,
    notes: c.notes ?? "",
  }));
}

const ALEX_DATA: NormalisedClientData = {
  profile: {
    ...PREVIEW_PROFILE,
    fullName: "Alex Morgan",
  },
  achievements: normAchievements(PREVIEW_ACHIEVEMENTS),
  family: PREVIEW_FAMILY,
  education: normEducation(PREVIEW_EDUCATION),
  career: normCareer(PREVIEW_CAREER),
};

const ALISTAIR_DATA: NormalisedClientData = {
  profile: {
    ...PREVIEW_PROFILE_ALISTAIR,
    fullName: "Alistair Drummond",
  },
  achievements: normAchievements(PREVIEW_ACHIEVEMENTS_ALISTAIR as RawAchievement[]),
  family: PREVIEW_FAMILY_ALISTAIR,
  education: normEducation(PREVIEW_EDUCATION_ALISTAIR as RawEducation[]),
  career: normCareer(PREVIEW_CAREER_ALISTAIR as RawCareer[]),
};

export function getClientData(client: PreviewClientKey): NormalisedClientData {
  return client === "alistair" ? ALISTAIR_DATA : ALEX_DATA;
}
