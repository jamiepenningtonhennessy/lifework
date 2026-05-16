import mysql from 'mysql2/promise';

// Caitlin's profile: lawyer, highly social, loves performing/debating, creative,
// empathetic, energetic, somewhat anxious, strong values, curious, organised but
// flexible. Based on life history evidence.

// Domain scores (0-100):
// O (Openness): HIGH — creative, loves ideas, arts, debating metaphysics = 78
// C (Conscientiousness): MODERATE-HIGH — organised lawyer but also spontaneous = 68
// E (Extraversion): HIGH — performing, debating, social energy = 80
// A (Agreeableness): HIGH — empathetic, collaborative, warm = 74
// N (Neuroticism): MODERATE — some anxiety about rules/freedom, but resilient = 48

const domainScores = { O: 78, C: 68, E: 80, A: 74, N: 48 };

// Facet scores (0-100) — 6 facets per domain
// N facets: N1=Anxiety, N2=Anger, N3=Depression, N4=Self-consciousness, N5=Immoderation, N6=Vulnerability
// E facets: E1=Friendliness, E2=Gregariousness, E3=Assertiveness, E4=Activity, E5=Excitement-seeking, E6=Cheerfulness
// O facets: O1=Imagination, O2=Artistic interests, O3=Emotionality, O4=Adventurousness, O5=Intellect, O6=Liberalism
// A facets: A1=Trust, A2=Morality, A3=Altruism, A4=Cooperation, A5=Modesty, A6=Sympathy
// C facets: C1=Self-efficacy, C2=Orderliness, C3=Dutifulness, C4=Achievement-striving, C5=Self-discipline, C6=Cautiousness

const facetScores = {
  // Neuroticism (moderate — some anxiety but resilient)
  N1: 55,  // Anxiety — some worry, especially about doing right thing
  N2: 35,  // Anger — low, warm and collaborative
  N3: 38,  // Depression — resilient, positive
  N4: 45,  // Self-consciousness — moderate, performer but aware of others' views
  N5: 42,  // Immoderation — moderate
  N6: 48,  // Vulnerability — moderate under stress

  // Extraversion (high — social, performing, energetic)
  E1: 82,  // Friendliness — very warm and approachable
  E2: 78,  // Gregariousness — loves being with people
  E3: 80,  // Assertiveness — confident debater, strong voice
  E4: 76,  // Activity level — energetic
  E5: 72,  // Excitement-seeking — loves the thrill of performance
  E6: 84,  // Cheerfulness — described as making husband laugh, clowning around

  // Openness (high — creative, intellectual, artistic)
  O1: 80,  // Imagination — creative, loves dressing up, storytelling
  O2: 82,  // Artistic interests — ballet, craft fairs, historical fiction
  O3: 76,  // Emotionality — emotionally attuned
  O4: 72,  // Adventurousness — willing to try new things
  O5: 82,  // Intellect — debating metaphysics, politics, law
  O6: 74,  // Liberalism — open to different perspectives

  // Agreeableness (high — empathetic, collaborative)
  A1: 76,  // Trust — trusting of others
  A2: 78,  // Morality — strong ethical sense (lawyer)
  A3: 80,  // Altruism — caring, positive impact on colleagues
  A4: 72,  // Cooperation — collaborative, not combative
  A5: 62,  // Modesty — moderate, confident but not arrogant
  A6: 82,  // Sympathy — highly empathetic, "special needs teddy bear"

  // Conscientiousness (moderate-high — organised but also spontaneous)
  C1: 74,  // Self-efficacy — confident in abilities
  C2: 62,  // Orderliness — organised but not rigid
  C3: 72,  // Dutifulness — strong sense of duty (lawyer, rule-follower as child)
  C4: 76,  // Achievement-striving — sold out at craft fair, competitive
  C5: 66,  // Self-discipline — good but can be distracted by interesting things
  C6: 58,  // Cautiousness — moderate, sometimes acts on enthusiasm
};

// Build synthetic raw answers (not real but consistent with scores)
// We'll just store null for rawAnswers since we're constructing scores directly
const rawAnswers = null;

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  
  const clientId = 690001;
  const now = new Date();
  
  // Insert IPIP results
  await conn.execute(
    `INSERT INTO ipip_results (clientId, domainScores, facetScores, rawAnswers, completedAt, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       domainScores = VALUES(domainScores),
       facetScores = VALUES(facetScores),
       rawAnswers = VALUES(rawAnswers),
       completedAt = VALUES(completedAt),
       updatedAt = VALUES(updatedAt)`,
    [clientId, JSON.stringify(domainScores), JSON.stringify(facetScores), rawAnswers, now, now, now]
  );
  
  // Update client profile status
  await conn.execute(
    `UPDATE client_profiles SET ipipStatus = 'completed' WHERE id = ?`,
    [clientId]
  );
  
  // Verify
  const [rows] = await conn.execute('SELECT ipipStatus, viaStatus FROM client_profiles WHERE id = ?', [clientId]);
  console.log('Caitlin profile status:', JSON.stringify(rows[0]));
  
  const [ipip] = await conn.execute('SELECT domainScores FROM ipip_results WHERE clientId = ?', [clientId]);
  console.log('OCEAN domain scores inserted:', JSON.stringify(JSON.parse(ipip[0].domainScores)));
  
  await conn.end();
  console.log('\nDone. Caitlin is ready for WOW report generation.');
}

main().catch(console.error);
