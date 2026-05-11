import mysql from 'mysql2/promise';

async function run() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);

  // ── 1. Create a user account for the demo client ──────────────────────────
  const [userResult] = await conn.execute(
    `INSERT INTO users (openId, name, role, createdAt, updatedAt)
     VALUES (?, ?, 'user', NOW(), NOW())`,
    ['demo_client_hartley_001', 'James Hartley (Demo)']
  );
  const userId = userResult.insertId;
  console.log('Created user id:', userId);

  // ── 2. Create the client profile ──────────────────────────────────────────
  const [cpResult] = await conn.execute(
    `INSERT INTO client_profiles
     (userId, firstName, lastName, email, dateOfBirth, currentRole, currentOrg,
      interviewStatus, viaStatus, ipipStatus, backgroundStatus, sageStatus, cognitiveStatus, analysisStatus, pronouns,
      createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'completed', 'completed', 'completed', 'completed', 'not_started', 'not_started', 'not_started', 'he/him', NOW(), NOW())`,
    [userId, 'James', 'Hartley', 'james.hartley@example.com', '1979-04-12',
     'Senior Associate', 'Meridian Law LLP']
  );
  const clientId = cpResult.insertId;
  console.log('Created client_profile id:', clientId);

  // ── 3. Family background ──────────────────────────────────────────────────
  await conn.execute(
    `INSERT INTO family_background
     (clientId, fatherOccupation, motherOccupation, siblingPosition, upbringingLocation,
      familyNarrative, significantInfluences, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
    [clientId,
     'Chartered surveyor',
     'Secondary school teacher (French)',
     'Eldest of three (one brother, one sister)',
     'Market town in Shropshire, then moved to Bristol at age 14',
     'James grew up in a household where intellectual curiosity and practical competence were equally valued. His father ran a small surveying practice and often brought James along to site visits at weekends, instilling an early appreciation for how things are built and how organisations work. His mother taught French at the local grammar school and encouraged wide reading. The family moved to Bristol when James was fourteen — a disruption he found difficult at first but which ultimately broadened his world considerably.',
     'Father — modelled quiet competence and the satisfaction of a job done properly. Mother — instilled love of language and European culture. A history teacher at his Bristol school, Mr Caldwell, who spotted his analytical ability and pushed him towards Cambridge.',
    ]
  );

  // ── 4. Education history ──────────────────────────────────────────────────
  const education = [
    ['Shrewsbury School', 'A-levels', 'History, Latin, Economics', '1990', '1997', 'Head of House; won the school history prize two years running; played rugby to county level.', 0],
    ['Pembroke College, Cambridge', 'BA (Hons) 2:1', 'Law', '1997', '2000', 'Took up rowing in final year — set himself the goal of winning his oar, which friends considered unlikely. Trained intensively over the summer term; the crew achieved the required bumps on the final day in front of a large crowd. Also played horn in the university orchestra.', 1],
    ['College of Law, London', 'LPC', 'Legal Practice', '2000', '2001', 'Distinction. Particularly strong in commercial property and corporate finance modules.', 2],
  ];
  for (const [inst, qual, subj, yf, yt, hi, so] of education) {
    await conn.execute(
      `INSERT INTO education_history (clientId, institution, qualification, subject, yearFrom, yearTo, highlights, sortOrder, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [clientId, inst, qual, subj, yf, yt, hi, so]
    );
  }

  // ── 5. Career history ─────────────────────────────────────────────────────
  const careers = [
    ['Clifford Chance LLP', 'Trainee Solicitor', '2001', '2003',
     'Rotated through corporate, real estate, litigation and finance seats. Qualified into the real estate team.',
     'Wanted to move to a firm with a stronger arts and culture client base.',
     'Seconded to the Tokyo office for six months; managed a significant cross-border real estate transaction largely independently.', 0],
    ['Harbison & Wren LLP', 'Associate, Real Estate', '2003', '2009',
     'Advised on major commercial property transactions for arts institutions, universities and public bodies. Developed a specialism in heritage and listed buildings.',
     'Approached by a former colleague to join a smaller firm with a more entrepreneurial culture.',
     'Led the legal team on the redevelopment of a Victorian concert hall — a project that combined his legal skills with his genuine passion for arts infrastructure. Promoted to senior associate in 2007.', 1],
    ['Meridian Law LLP', 'Senior Associate, Real Estate & Culture', '2009', 'present',
     'Heads the firm\'s arts and culture sub-group. Advises major galleries, theatres and arts charities on property, governance and commercial contracts. Also sits on the firm\'s pro bono committee.',
     null,
     'Built the arts and culture practice from scratch — it now generates approximately 15% of the real estate department\'s revenue. Mentors three junior associates. Serves as a trustee of a regional theatre company.', 2],
  ];
  for (const [org, role, yf, yt, kr, wl, hi, so] of careers) {
    await conn.execute(
      `INSERT INTO career_history (clientId, organisation, role, yearFrom, yearTo, keyResponsibilities, whyLeft, highlights, sortOrder, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [clientId, org, role, yf, yt, kr, wl, hi, so]
    );
  }

  // ── 6. Achievements ───────────────────────────────────────────────────────
  const achievements = [
    ['childhood', 'Scramble course designer', 7,
     'My brother and I built a scrambling course around the garden — we designed the route together, deciding where to put ramps and obstacles. We wanted something that required real handling skill but was not too dangerous. We timed each other and kept refining it.',
     'satisfying', 'Design, problem-solving, iterative improvement', 0],
    ['childhood', 'Historical Society volunteer', 10,
     'Once a year the historic houses in our village were open to the public. I helped clean the house, dressed in period costume, and showed visitors around — answering their questions about the village and its history. My parents were active in the Historical Society and I developed a real appreciation for heritage.',
     'fulfilling', 'Communication, historical knowledge, public engagement', 1],
    ['teens', 'School travel journal prize', 13,
     'On a school trip abroad I was encouraged to keep a daily record. I collected unusual objects — postcards, coins, pressed flowers — noted events in detail, wrote it up neatly with illustrations, and won the prize for it.',
     'satisfying', 'Writing, observation, attention to detail', 2],
    ['teens', 'County rugby', 16,
     'Played rugby to county level at school. The discipline of team sport and the physical commitment required shaped how I approach collective endeavour.',
     'enjoyable', 'Teamwork, physical discipline, resilience', 3],
    ['twenties', 'Cambridge rowing oar', 21,
     'Took up rowing in my final year at Cambridge. I stated my ambition to win my oar — friends laughed. I trained very hard over the summer term. The whole eight were committed. We needed one bump on the final day; we got it in front of the thickest part of the crowd on the river bank.',
     'fulfilling', 'Goal-setting, perseverance, team commitment', 4],
    ['twenties', 'Tokyo secondment', 24,
     'Seconded to the Tokyo office of Clifford Chance for six months. Managed a significant cross-border real estate transaction largely independently. Learned to work across cultural and language barriers. Kept a detailed journal throughout — later typed up and circulated to colleagues.',
     'satisfying', 'Cross-cultural working, independent judgment, written communication', 5],
    ['thirties', 'Victorian concert hall redevelopment', 33,
     'Led the legal team on the redevelopment of a Victorian concert hall — a complex project combining heritage law, listed building consent, and commercial property. The project combined my legal skills with my genuine passion for arts infrastructure. Completed on time and under budget.',
     'fulfilling', 'Legal expertise, project leadership, heritage knowledge, stakeholder management', 6],
    ['thirties', 'Arts and culture practice built from scratch', 37,
     'Joined Meridian as a senior associate with a brief to develop an arts and culture sub-group. Over three years I identified the right clients, built the relationships, and created a practice that now generates approximately 15% of the real estate department\'s revenue.',
     'fulfilling', 'Business development, relationship building, strategic thinking, entrepreneurial initiative', 7],
    ['forties', 'Theatre trustee appointment', 41,
     'Invited to join the board of a regional theatre company as a trustee. Brought legal and governance expertise but also found myself genuinely engaged in the artistic and strategic questions the board faced. Chaired the property sub-committee during a significant capital project.',
     'fulfilling', 'Governance, strategic oversight, arts sector knowledge, board-level contribution', 8],
    ['forties', 'Self-taught Italian', 43,
     'Having visited Italy nearly every year for eight years, I decided to teach myself Italian properly. Bought the BBC course and followed it religiously. Got to the end of the course and then kept going — now read Italian newspapers and have conducted simple client conversations in Italian.',
     'satisfying', 'Self-directed learning, linguistic ability, persistence', 9],
  ];
  for (const [decade, title, age, description, esf, skills, sortOrder] of achievements) {
    await conn.execute(
      `INSERT INTO achievements (clientId, decade, title, age, description, esf, skills, sortOrder, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [clientId, decade, title, age, description, esf, skills, sortOrder]
    );
  }

  // ── 7. VIA results ────────────────────────────────────────────────────────
  const rankedStrengths = [
    { strength: "Love of Learning", score: 4.8, rank: 1 },
    { strength: "Perseverance", score: 4.7, rank: 2 },
    { strength: "Appreciation of Beauty & Excellence", score: 4.6, rank: 3 },
    { strength: "Judgment", score: 4.5, rank: 4 },
    { strength: "Honesty", score: 4.4, rank: 5 },
    { strength: "Leadership", score: 4.3, rank: 6 },
    { strength: "Creativity", score: 4.2, rank: 7 },
    { strength: "Curiosity", score: 4.1, rank: 8 },
    { strength: "Prudence", score: 4.0, rank: 9 },
    { strength: "Perspective", score: 3.9, rank: 10 },
    { strength: "Teamwork", score: 3.8, rank: 11 },
    { strength: "Self-Regulation", score: 3.7, rank: 12 },
    { strength: "Fairness", score: 3.6, rank: 13 },
    { strength: "Bravery", score: 3.5, rank: 14 },
    { strength: "Kindness", score: 3.4, rank: 15 },
    { strength: "Social Intelligence", score: 3.3, rank: 16 },
    { strength: "Gratitude", score: 3.2, rank: 17 },
    { strength: "Hope", score: 3.1, rank: 18 },
    { strength: "Humor", score: 3.0, rank: 19 },
    { strength: "Zest", score: 2.9, rank: 20 },
    { strength: "Spirituality", score: 2.5, rank: 21 },
    { strength: "Forgiveness", score: 2.4, rank: 22 },
    { strength: "Humility", score: 2.3, rank: 23 },
    { strength: "Love", score: 2.2, rank: 24 },
  ];
  const rawScores = {};
  rankedStrengths.forEach(s => rawScores[s.strength] = s.score);
  await conn.execute(
    `INSERT INTO via_results (clientId, rankedStrengths, rawScores, completedAt, createdAt, updatedAt)
     VALUES (?, ?, ?, NOW(), NOW(), NOW())`,
    [clientId, JSON.stringify(rankedStrengths), JSON.stringify(rawScores)]
  );

  // ── 8. IPIP-NEO results ───────────────────────────────────────────────────
  const domainScores = { N: 28, E: 58, O: 82, A: 72, C: 74 };
  const facetScores = {
    anxiety: 30, anger: 25, depression: 22, self_consciousness: 35, immoderation: 28, vulnerability: 30,
    friendliness: 62, gregariousness: 48, assertiveness: 65, activity_level: 55, excitement_seeking: 45, cheerfulness: 60,
    imagination: 88, artistic_interests: 92, emotionality: 75, adventurousness: 78, intellect: 85, liberalism: 72,
    trust: 70, morality: 82, altruism: 75, cooperation: 68, modesty: 65, sympathy: 72,
    self_efficacy: 80, orderliness: 72, dutifulness: 78, achievement_striving: 85, self_discipline: 76, cautiousness: 68,
  };
  await conn.execute(
    `INSERT INTO ipip_results (clientId, domainScores, facetScores, rawAnswers, completedAt, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, NOW(), NOW(), NOW())`,
    [clientId, JSON.stringify(domainScores), JSON.stringify(facetScores), JSON.stringify({})]
  );

  console.log('\n=== Demo client created successfully ===');
  console.log('User ID:', userId);
  console.log('Client Profile ID:', clientId);
  console.log('Name: James Hartley (Demo)');
  console.log('DOB: 1979-04-12 (age 46)');
  console.log('Role: Senior Associate, Meridian Law LLP');

  await conn.end();
}
run().catch(console.error);
