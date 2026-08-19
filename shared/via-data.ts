export interface ViaStrength {
  id: string;
  name: string;
  virtue: string;
  description: string;
  atWork: string;
  color: string;
}

export const VIA_STRENGTHS: ViaStrength[] = [
  {
    id: "creativity",
    name: "Creativity",
    virtue: "Wisdom",
    description: "Thinking of novel and productive ways to conceptualize and do things; includes artistic achievement but is not limited to it.",
    atWork: "You bring fresh ideas and innovative solutions. You thrive when given latitude to experiment and approach problems from unexpected angles.",
    color: "#F59E0B",
  },
  {
    id: "curiosity",
    name: "Curiosity",
    virtue: "Wisdom",
    description: "Taking an interest in ongoing experience for its own sake; finding subjects and topics fascinating; exploring and discovering.",
    atWork: "You are energized by learning and investigation. You excel in roles that offer variety, novelty, and the chance to explore new domains.",
    color: "#F59E0B",
  },
  {
    id: "judgment",
    name: "Judgment",
    virtue: "Wisdom",
    description: "Thinking things through and examining them from all sides; not jumping to conclusions; being able to change one's mind in light of evidence.",
    atWork: "You are a careful, evidence-based thinker. You add value in analytical roles, strategic planning, and situations requiring balanced decision-making.",
    color: "#F59E0B",
  },
  {
    id: "love_of_learning",
    name: "Love of Learning",
    virtue: "Wisdom",
    description: "Mastering new skills, topics, and bodies of knowledge, whether on one's own or formally; related to the strength of curiosity but goes beyond it.",
    atWork: "You are motivated by mastery and expertise. You flourish in environments that support continuous development and intellectual growth.",
    color: "#F59E0B",
  },
  {
    id: "perspective",
    name: "Perspective",
    virtue: "Wisdom",
    description: "Being able to provide wise counsel to others; having ways of looking at the world that make sense to oneself and to other people.",
    atWork: "You offer big-picture thinking and sound guidance. You are valued as a mentor, advisor, or strategic thinker who helps others see the broader context.",
    color: "#F59E0B",
  },
  {
    id: "bravery",
    name: "Bravery",
    virtue: "Courage",
    description: "Not shrinking from threat, challenge, difficulty, or pain; speaking up for what is right even if there is opposition; acting on convictions.",
    atWork: "You are willing to take on difficult challenges and speak uncomfortable truths. You are effective in high-stakes, high-pressure, or change-leadership roles.",
    color: "#EF4444",
  },
  {
    id: "perseverance",
    name: "Perseverance",
    virtue: "Courage",
    description: "Finishing what one starts; persisting in a course of action in spite of obstacles; taking pleasure in completing tasks.",
    atWork: "You are reliable and tenacious. You deliver results even when the path is difficult, making you invaluable in long-term projects and demanding roles.",
    color: "#EF4444",
  },
  {
    id: "honesty",
    name: "Honesty",
    virtue: "Courage",
    description: "Speaking the truth but more broadly presenting oneself in a genuine way and acting in a sincere way; being without pretense; taking responsibility.",
    atWork: "You build trust through transparency and integrity. You are most effective in roles where credibility and authentic relationships are paramount.",
    color: "#EF4444",
  },
  {
    id: "zest",
    name: "Zest",
    virtue: "Courage",
    description: "Approaching life with excitement and energy; not doing things halfway or halfheartedly; living life as an adventure; feeling alive and activated.",
    atWork: "Your energy is contagious and motivating. You thrive in dynamic, fast-paced environments and roles that allow you to inspire and energize others.",
    color: "#EF4444",
  },
  {
    id: "love",
    name: "Love",
    virtue: "Humanity",
    description: "Valuing close relations with others, in particular those in which sharing and caring are reciprocated; being close to people.",
    atWork: "You build deep, loyal relationships. You excel in roles centred on people — mentoring, coaching, caregiving, or close-knit team environments.",
    color: "#EC4899",
  },
  {
    id: "kindness",
    name: "Kindness",
    virtue: "Humanity",
    description: "Doing favors and good deeds for others; helping them; taking care of them.",
    atWork: "You are generous and supportive. You add tremendous value in service-oriented, helping, or team-support roles where others' wellbeing matters.",
    color: "#EC4899",
  },
  {
    id: "social_intelligence",
    name: "Social Intelligence",
    virtue: "Humanity",
    description: "Being aware of the motives and feelings of other people and oneself; knowing what to do to fit into different social situations.",
    atWork: "You read people and situations with precision. You are highly effective in leadership, negotiation, client-facing, and team-building roles.",
    color: "#EC4899",
  },
  {
    id: "teamwork",
    name: "Teamwork",
    virtue: "Justice",
    description: "Working well as a member of a group or team; being loyal to the group; doing one's share.",
    atWork: "You are a dependable collaborator. You contribute most when working toward shared goals in cohesive teams with a clear collective purpose.",
    color: "#10B981",
  },
  {
    id: "fairness",
    name: "Fairness",
    virtue: "Justice",
    description: "Treating all people the same according to notions of fairness and justice; not letting personal feelings bias decisions about others.",
    atWork: "You are principled and equitable. You are well-suited to roles involving governance, policy, adjudication, or any context where impartiality matters.",
    color: "#10B981",
  },
  {
    id: "leadership",
    name: "Leadership",
    virtue: "Justice",
    description: "Encouraging a group of which one is a member to get things done and at the same time maintain good relations within the group.",
    atWork: "You naturally organize and motivate others. You are drawn to roles where you can set direction, coordinate effort, and bring out the best in a team.",
    color: "#10B981",
  },
  {
    id: "forgiveness",
    name: "Forgiveness",
    virtue: "Temperance",
    description: "Forgiving those who have done wrong; accepting the shortcomings of others; giving people a second chance; not being vengeful.",
    atWork: "You create psychologically safe environments. You are effective in conflict resolution, mediation, and cultures that value resilience and second chances.",
    color: "#8B5CF6",
  },
  {
    id: "humility",
    name: "Humility",
    virtue: "Temperance",
    description: "Letting one's accomplishments speak for themselves; not regarding oneself as more special than one is.",
    atWork: "You are approachable and grounded. You build credibility through substance rather than self-promotion, earning deep respect over time.",
    color: "#8B5CF6",
  },
  {
    id: "prudence",
    name: "Prudence",
    virtue: "Temperance",
    description: "Being careful about one's choices; not taking undue risks; not saying or doing things that might later be regretted.",
    atWork: "You are a careful, risk-aware decision-maker. You add value in roles requiring sound judgment, compliance, risk management, or long-term planning.",
    color: "#8B5CF6",
  },
  {
    id: "self_regulation",
    name: "Self-Regulation",
    virtue: "Temperance",
    description: "Regulating what one feels and does; being disciplined; controlling one's appetites and emotions.",
    atWork: "You are consistent and disciplined. You perform well under pressure and in roles requiring sustained focus, reliability, and emotional composure.",
    color: "#8B5CF6",
  },
  {
    id: "appreciation",
    name: "Appreciation of Beauty",
    virtue: "Transcendence",
    description: "Noticing and appreciating beauty, excellence, and skilled performance in various domains of life.",
    atWork: "You are drawn to quality and craft. You thrive in creative, design, or curatorial roles and bring an eye for excellence to everything you do.",
    color: "#06B6D4",
  },
  {
    id: "gratitude",
    name: "Gratitude",
    virtue: "Transcendence",
    description: "Being aware of and thankful for the good things that happen; taking time to express thanks.",
    atWork: "You foster positive cultures. You strengthen team morale and loyalty through recognition and appreciation, making you a valued colleague and leader.",
    color: "#06B6D4",
  },
  {
    id: "hope",
    name: "Hope",
    virtue: "Transcendence",
    description: "Expecting the best in the future and working to achieve it; believing that a good future is something that can be brought about.",
    atWork: "You are a motivating, forward-looking force. You excel in change management, entrepreneurship, and roles that require sustaining momentum through uncertainty.",
    color: "#06B6D4",
  },
  {
    id: "humor",
    name: "Humor",
    virtue: "Transcendence",
    description: "Liking to laugh and tease; bringing smiles to other people; seeing the light side; making (not necessarily telling) jokes.",
    atWork: "You ease tension and build rapport. You create enjoyable, human workplaces and are effective in roles requiring connection, communication, and culture-building.",
    color: "#06B6D4",
  },
  {
    id: "spirituality",
    name: "Spirituality",
    virtue: "Transcendence",
    description: "Having coherent beliefs about the higher purpose and meaning of the universe; knowing where one fits within the larger scheme.",
    atWork: "You are purpose-driven and values-led. You are most fulfilled in roles aligned with a clear mission, where your work connects to something larger than yourself.",
    color: "#06B6D4",
  },
];

// 120-question VIA survey (5 questions per strength × 24 strengths)
// Each question is rated 1 (very much unlike me) to 5 (very much like me)
export interface ViaQuestion {
  id: number;
  strengthId: string;
  text: string;
}

export const VIA_QUESTIONS: ViaQuestion[] = [
  // Creativity
  { id: 1, strengthId: "creativity", text: "I come up with new and different ways to do things." },
  { id: 2, strengthId: "creativity", text: "I have a unique way of looking at problems." },
  { id: 3, strengthId: "creativity", text: "I am always thinking of new ideas." },
  { id: 4, strengthId: "creativity", text: "I like to find creative solutions to everyday challenges." },
  { id: 5, strengthId: "creativity", text: "People often come to me for fresh perspectives." },
  // Curiosity
  { id: 6, strengthId: "curiosity", text: "I find almost everything interesting." },
  { id: 7, strengthId: "curiosity", text: "I ask lots of questions about how things work." },
  { id: 8, strengthId: "curiosity", text: "I love exploring new topics and ideas." },
  { id: 9, strengthId: "curiosity", text: "I am easily drawn into new subjects." },
  { id: 10, strengthId: "curiosity", text: "I enjoy learning about things I know nothing about." },
  // Judgment
  { id: 11, strengthId: "judgment", text: "I think carefully before making decisions." },
  { id: 12, strengthId: "judgment", text: "I look at problems from multiple angles before deciding." },
  { id: 13, strengthId: "judgment", text: "I change my mind when evidence warrants it." },
  { id: 14, strengthId: "judgment", text: "I weigh pros and cons before acting." },
  { id: 15, strengthId: "judgment", text: "I am good at spotting flaws in arguments." },
  // Love of Learning
  { id: 16, strengthId: "love_of_learning", text: "I love to learn new things." },
  { id: 17, strengthId: "love_of_learning", text: "I seek out opportunities to develop new skills." },
  { id: 18, strengthId: "love_of_learning", text: "I read widely to expand my knowledge." },
  { id: 19, strengthId: "love_of_learning", text: "I get excited when I master something new." },
  { id: 20, strengthId: "love_of_learning", text: "I enjoy formal and informal learning equally." },
  // Perspective
  { id: 21, strengthId: "perspective", text: "People often ask me for advice." },
  { id: 22, strengthId: "perspective", text: "I can see the big picture in complex situations." },
  { id: 23, strengthId: "perspective", text: "I help others make sense of difficult situations." },
  { id: 24, strengthId: "perspective", text: "I have a mature way of looking at life." },
  { id: 25, strengthId: "perspective", text: "I can find meaning in most experiences." },
  // Bravery
  { id: 26, strengthId: "bravery", text: "I speak up even when it is unpopular." },
  { id: 27, strengthId: "bravery", text: "I face my fears rather than avoiding them." },
  { id: 28, strengthId: "bravery", text: "I do what I think is right even when it is difficult." },
  { id: 29, strengthId: "bravery", text: "I take on challenges that others shy away from." },
  { id: 30, strengthId: "bravery", text: "I stand up for my beliefs under pressure." },
  // Perseverance
  { id: 31, strengthId: "perseverance", text: "I finish what I start." },
  { id: 32, strengthId: "perseverance", text: "I keep going even when things get tough." },
  { id: 33, strengthId: "perseverance", text: "I work hard to achieve my goals." },
  { id: 34, strengthId: "perseverance", text: "I push through obstacles without giving up." },
  { id: 35, strengthId: "perseverance", text: "I take pride in completing tasks fully." },
  // Honesty
  { id: 36, strengthId: "honesty", text: "I always tell the truth, even when it is hard." },
  { id: 37, strengthId: "honesty", text: "I am genuine and authentic in my interactions." },
  { id: 38, strengthId: "honesty", text: "I take responsibility for my mistakes." },
  { id: 39, strengthId: "honesty", text: "I present myself without pretense." },
  { id: 40, strengthId: "honesty", text: "People trust me to be straightforward." },
  // Zest
  { id: 41, strengthId: "zest", text: "I approach life with enthusiasm and energy." },
  { id: 42, strengthId: "zest", text: "I throw myself fully into whatever I do." },
  { id: 43, strengthId: "zest", text: "I feel alive and activated most of the time." },
  { id: 44, strengthId: "zest", text: "I bring energy and excitement to group activities." },
  { id: 45, strengthId: "zest", text: "I rarely feel bored or disengaged." },
  // Love
  { id: 46, strengthId: "love", text: "I value deep, close relationships above most things." },
  { id: 47, strengthId: "love", text: "I am emotionally available to the people I care about." },
  { id: 48, strengthId: "love", text: "I invest heavily in my personal relationships." },
  { id: 49, strengthId: "love", text: "I feel most fulfilled when I am close to others." },
  { id: 50, strengthId: "love", text: "I am a caring and devoted friend or partner." },
  // Kindness
  { id: 51, strengthId: "kindness", text: "I enjoy helping others, even strangers." },
  { id: 52, strengthId: "kindness", text: "I go out of my way to do favors for people." },
  { id: 53, strengthId: "kindness", text: "I genuinely care about the wellbeing of others." },
  { id: 54, strengthId: "kindness", text: "I find it natural to be generous with my time." },
  { id: 55, strengthId: "kindness", text: "I look for ways to make others' lives easier." },
  // Social Intelligence
  { id: 56, strengthId: "social_intelligence", text: "I can read people's emotions accurately." },
  { id: 57, strengthId: "social_intelligence", text: "I adapt easily to different social situations." },
  { id: 58, strengthId: "social_intelligence", text: "I know how to handle interpersonal conflicts well." },
  { id: 59, strengthId: "social_intelligence", text: "I understand what motivates different people." },
  { id: 60, strengthId: "social_intelligence", text: "I am skilled at making others feel comfortable." },
  // Teamwork
  { id: 61, strengthId: "teamwork", text: "I am a loyal and committed team member." },
  { id: 62, strengthId: "teamwork", text: "I do my fair share in group efforts." },
  { id: 63, strengthId: "teamwork", text: "I put the team's goals above my own." },
  { id: 64, strengthId: "teamwork", text: "I work well with people from different backgrounds." },
  { id: 65, strengthId: "teamwork", text: "I feel a strong sense of duty to my group." },
  // Fairness
  { id: 66, strengthId: "fairness", text: "I treat everyone equally and without bias." },
  { id: 67, strengthId: "fairness", text: "I make decisions based on principles, not personal feelings." },
  { id: 68, strengthId: "fairness", text: "I believe strongly in justice and equal treatment." },
  { id: 69, strengthId: "fairness", text: "I am consistent in applying rules to everyone." },
  { id: 70, strengthId: "fairness", text: "I speak out when I see unfairness." },
  // Leadership
  { id: 71, strengthId: "leadership", text: "I naturally take charge in group situations." },
  { id: 72, strengthId: "leadership", text: "I am good at organizing people to get things done." },
  { id: 73, strengthId: "leadership", text: "I inspire others to work toward a shared goal." },
  { id: 74, strengthId: "leadership", text: "I keep groups focused and productive." },
  { id: 75, strengthId: "leadership", text: "I am comfortable making decisions that affect others." },
  // Forgiveness
  { id: 76, strengthId: "forgiveness", text: "I let go of grudges easily." },
  { id: 77, strengthId: "forgiveness", text: "I give people second chances when they have wronged me." },
  { id: 78, strengthId: "forgiveness", text: "I do not dwell on past hurts." },
  { id: 79, strengthId: "forgiveness", text: "I accept people's flaws without resentment." },
  { id: 80, strengthId: "forgiveness", text: "I believe people can change and deserve forgiveness." },
  // Humility
  { id: 81, strengthId: "humility", text: "I do not seek the spotlight for my achievements." },
  { id: 82, strengthId: "humility", text: "I am aware of my own limitations." },
  { id: 83, strengthId: "humility", text: "I let my work speak for itself." },
  { id: 84, strengthId: "humility", text: "I am open to feedback and criticism." },
  { id: 85, strengthId: "humility", text: "I do not think of myself as better than others." },
  // Prudence
  { id: 86, strengthId: "prudence", text: "I think carefully about the consequences of my actions." },
  { id: 87, strengthId: "prudence", text: "I avoid taking unnecessary risks." },
  { id: 88, strengthId: "prudence", text: "I plan ahead to avoid problems." },
  { id: 89, strengthId: "prudence", text: "I am careful about what I say and do." },
  { id: 90, strengthId: "prudence", text: "I rarely act impulsively." },
  // Self-Regulation
  { id: 91, strengthId: "self_regulation", text: "I am disciplined and consistent in my habits." },
  { id: 92, strengthId: "self_regulation", text: "I manage my emotions well under pressure." },
  { id: 93, strengthId: "self_regulation", text: "I stick to my plans even when tempted to deviate." },
  { id: 94, strengthId: "self_regulation", text: "I control my impulses effectively." },
  { id: 95, strengthId: "self_regulation", text: "I maintain focus on my goals over time." },
  // Appreciation of Beauty
  { id: 96, strengthId: "appreciation", text: "I notice and appreciate beauty in everyday life." },
  { id: 97, strengthId: "appreciation", text: "I am moved by great art, music, or nature." },
  { id: 98, strengthId: "appreciation", text: "I seek out experiences of excellence and craft." },
  { id: 99, strengthId: "appreciation", text: "I am deeply affected by skilled performances." },
  { id: 100, strengthId: "appreciation", text: "I find beauty in things others might overlook." },
  // Gratitude
  { id: 101, strengthId: "gratitude", text: "I regularly express thanks to the people in my life." },
  { id: 102, strengthId: "gratitude", text: "I count my blessings often." },
  { id: 103, strengthId: "gratitude", text: "I feel genuinely thankful for what I have." },
  { id: 104, strengthId: "gratitude", text: "I notice the good things that happen to me." },
  { id: 105, strengthId: "gratitude", text: "I feel a deep sense of appreciation for life." },
  // Hope
  { id: 106, strengthId: "hope", text: "I am optimistic about the future." },
  { id: 107, strengthId: "hope", text: "I believe things will work out for the best." },
  { id: 108, strengthId: "hope", text: "I set ambitious goals and work toward them." },
  { id: 109, strengthId: "hope", text: "I maintain a positive outlook even in hard times." },
  { id: 110, strengthId: "hope", text: "I inspire others with my vision of what is possible." },
  // Humor
  { id: 111, strengthId: "humor", text: "I love to make people laugh." },
  { id: 112, strengthId: "humor", text: "I can find the funny side of most situations." },
  { id: 113, strengthId: "humor", text: "I use humor to ease tension and connect with others." },
  { id: 114, strengthId: "humor", text: "I enjoy playful banter and witty exchanges." },
  { id: 115, strengthId: "humor", text: "I bring lightness to difficult situations." },
  // Spirituality
  { id: 116, strengthId: "spirituality", text: "I have a strong sense of purpose in my life." },
  { id: 117, strengthId: "spirituality", text: "I feel connected to something larger than myself." },
  { id: 118, strengthId: "spirituality", text: "My values and beliefs guide my daily actions." },
  { id: 119, strengthId: "spirituality", text: "I find meaning in my experiences, even difficult ones." },
  { id: 120, strengthId: "spirituality", text: "I feel a sense of calling in what I do." },
];

/**
 * Returns the VIA questions in a reproducible, client-specific random order.
 *
 * The question identifiers and strength mappings are never changed, so answers
 * remain compatible with scoreVia regardless of their presentation sequence.
 * A deterministic seed gives an individual client the same order on every page
 * load and return visit, while different clients receive different sequences.
 */
export function getViaQuestionsForClient(clientSeed: number): ViaQuestion[] {
  let state = (clientSeed ^ 0x9e3779b9) >>> 0;

  const nextRandom = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };

  const shuffle = <T,>(items: T[]): T[] => {
    const shuffled = [...items];
    for (let index = shuffled.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(nextRandom() * (index + 1));
      [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
    }
    return shuffled;
  };

  const questionsByStrength = new Map(
    VIA_STRENGTHS.map((strength) => [
      strength.id,
      shuffle(VIA_QUESTIONS.filter((question) => question.strengthId === strength.id)),
    ])
  );
  const strengthIds = VIA_STRENGTHS.map((strength) => strength.id);
  const ordered: ViaQuestion[] = [];
  let previousStrengthId: string | undefined;

  // Each round includes one randomly selected item from every strength. This
  // retains a fully mixed experience without allowing neighbouring items from
  // the same strength to create recognisable five-question blocks.
  for (let roundIndex = 0; roundIndex < 5; roundIndex += 1) {
    const roundStrengthIds = shuffle(strengthIds);
    if (previousStrengthId && roundStrengthIds[0] === previousStrengthId) {
      const swapIndex = 1 + Math.floor(nextRandom() * (roundStrengthIds.length - 1));
      [roundStrengthIds[0], roundStrengthIds[swapIndex]] = [roundStrengthIds[swapIndex], roundStrengthIds[0]];
    }

    for (const strengthId of roundStrengthIds) {
      const question = questionsByStrength.get(strengthId)?.[roundIndex];
      if (!question) throw new Error(`Missing VIA question for strength: ${strengthId}`);
      ordered.push(question);
      previousStrengthId = strengthId;
    }
  }

  return ordered;
}

export function scoreVia(answers: Record<number, number>): { strengthId: string; name: string; score: number; rank: number }[] {
  const totals: Record<string, number> = {};
  for (const q of VIA_QUESTIONS) {
    if (!totals[q.strengthId]) totals[q.strengthId] = 0;
    totals[q.strengthId] += answers[q.id] ?? 3;
  }
  const ranked = Object.entries(totals)
    .map(([strengthId, score]) => ({
      strengthId,
      name: VIA_STRENGTHS.find(s => s.id === strengthId)?.name ?? strengthId,
      score,
    }))
    .sort((a, b) => b.score - a.score)
    .map((item, idx) => ({ ...item, rank: idx + 1 }));
  return ranked;
}
