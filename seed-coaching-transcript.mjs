// Seed script: insert an imagined coaching session transcript for Jamie (clientId=1)
// This allows the counsellor to immediately test the "Generate Draft Annex" flow.
import mysql from 'mysql2/promise';

const TRANSCRIPT = `
COACHING SESSION TRANSCRIPT
Client: Jamie Pennington
Counsellor: Jamie Pennington (self-coaching demonstration)
Date: 11 March 2026
Duration: 2 hours

---

Jamie: I have to say, reading the report before this call was a strange experience. Some of it felt completely obvious — like, of course I care about people and ideas — but then there were things that surprised me. The Perspective strength coming out so high. I hadn't thought of myself as someone who gives advice, but when I read the description I thought, actually, yes, people do come to me for that.

Counsellor: What did that feel like to recognise?

Jamie: Slightly uncomfortable, if I'm honest. I think I've always been a bit wary of positioning myself as the wise one. There's something about it that feels presumptuous. But the report made me see it differently — it's not about being wise, it's about being able to hold a lot of different perspectives at once and help someone find their own way through. That's what I do in the coaching work.

Counsellor: Let's go back to the life history. When you look at the achievements across the decades, is there a thread you can see now that you couldn't see before?

Jamie: Yes. It's the combination of building things and bringing people along. The sailing club, the school debating society, the early career stuff — in every case I wasn't just doing something, I was creating a context in which other people could do something. I think I'd always described myself as entrepreneurial, but that's not quite right. It's more that I'm a... context creator? I build the conditions for things to happen.

Counsellor: That's a striking phrase. Does it feel accurate?

Jamie: It does. And it explains something that's always puzzled me about my career — why I've never been happy just being good at a job. I need to be shaping the environment, not just performing within it. That's why the Lifework platform feels right. It's not just a product, it's a context in which young people can discover something real about themselves.

Counsellor: The report flagged a tension between your high Openness and your relatively lower Conscientiousness scores. Did that land for you?

Jamie: Painfully accurately. I have a thousand ideas and I start most of them. Finishing is harder. I've learned to build structures around myself — deadlines, accountability partners, the platform itself is partly that — but left to my own devices I'd be a brilliant starter and a mediocre finisher.

Counsellor: What does that mean for the careers you're considering?

Jamie: It means I need to be in roles where starting things is the job. Founder, advisor, consultant — roles where you come in, create the conditions, and then hand over. The worst thing for me would be a role that required sustained execution of someone else's system. I'd be miserable within six months.

Counsellor: Looking at the VIA results — Love of Learning is in your top five. How does that show up?

Jamie: Constantly. I read obsessively. I'm always doing courses, listening to podcasts, going down rabbit holes. The Lifework methodology itself came out of a period where I was just deeply curious about why some people find their work meaningful and others don't. I couldn't stop reading about it. That curiosity is what drove the whole thing.

Counsellor: If you imagine yourself in ten years, doing work that feels completely right — what does that look like?

Jamie: I'm running something small and excellent. Not a big organisation — I don't want to manage a hundred people. Something where I can still be close to the work, close to the clients, still learning. The Lifework platform is part of it. But I think there's also a writing dimension — I want to have written something substantial about the methodology, something that outlasts me. Not a self-help book. Something more rigorous.

Counsellor: What's stopping you starting that now?

Jamie: [laughs] The finishing problem. And a slight fear that if I commit to writing it, I'll have to actually know what I think. At the moment I can keep it fluid. Writing forces clarity.

Counsellor: Is that a bad thing?

Jamie: No. It's probably the next thing. The platform gets to a certain point of maturity, and then I write the book. That's the sequence.

Counsellor: What's the one thing you're taking away from today?

Jamie: Context creator. I'm going to sit with that. It explains so much about what's worked and what hasn't. And it gives me a frame for what to say yes to and what to say no to. If a role or a project is asking me to create a context, I'm in. If it's asking me to operate within someone else's context, I need to think very carefully.

---
END OF TRANSCRIPT
`;

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  
  // Check if annex already exists
  const [existing] = await conn.execute(
    'SELECT id FROM coaching_annexes WHERE clientId = 1'
  );
  
  if (existing.length > 0) {
    // Update existing
    await conn.execute(
      'UPDATE coaching_annexes SET transcriptText = ?, status = "draft", draftAnnex = NULL, approvedAnnex = NULL, approvedAt = NULL WHERE clientId = 1',
      [TRANSCRIPT.trim()]
    );
    console.log('Updated existing coaching annex transcript for clientId=1');
  } else {
    // Insert new
    await conn.execute(
      'INSERT INTO coaching_annexes (clientId, transcriptText, status) VALUES (1, ?, "draft")',
      [TRANSCRIPT.trim()]
    );
    console.log('Inserted coaching annex transcript for clientId=1');
  }
  
  await conn.end();
  console.log('Done.');
}

main().catch(console.error);
