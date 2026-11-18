export const REPORT_TEST_TYPES = ["standard", "student", "job_returner", "retirement"] as const;

export function fourConditionsJson() {
  const pillar = (key: string) => ({
    heading: key.toUpperCase(),
    learning: `You find fulfilment in the specific ${key} described by your own evidence.`,
    example1: `At school you organised a fictional woodland project. This ${key} example comes from that childhood memory. You described the detail in your own words.`,
    example2: `Later you helped build a fictional community workshop. A different ${key} example appears in that later experience. The comparison remains an exploratory hypothesis.`,
  });
  return {
    places: pillar("places"), people: pillar("people"), problems: pillar("problems"), procedures: pillar("procedures"),
    combination: {
      synthesis: "You are most alive when a quiet place, collaborative people, worthwhile problems and a thoughtful method come together.",
      practical_question: "The practical question is not which label fits you, but which conditions make your contribution possible. Use your own evidence to test this pattern.",
    },
  };
}

export function makeVariantSections(reportType: string = "standard", long = false) {
  const paragraph = (chapter: string, index: number) => long
    ? (`Fictional ${chapter} evidence block ${index}. Your school and community experiences show a repeated preference for thoughtful collaboration. This complete paragraph deliberately tests the approved continuation layout rather than any real client story. `.repeat(2) + ` End of ${chapter} block ${index}.`)
    : `Fictional ${chapter} evidence block ${index}. You organised a school project and later a community workshop. These memories support a working hypothesis about what matters to you.`;
  const threeAreas = (chapter: string) => [1, 2, 3].map((index) => `## ${chapter} area ${index}\n\n${paragraph(chapter, index)}\n\n${paragraph(chapter, index + 3)}`).join("\n\n");
  const fp = fourConditionsJson();
  const headings = { places: "PLACES — Where Energy Was High", people: "PEOPLE — Who Was Present, and in What Role", problems: "PROBLEMS — The Nature of the Challenge", procedures: "PROCEDURES — How the Work Was Done" };
  const fourPillars = (Object.keys(headings) as Array<keyof typeof headings>).map((key) => `## ${headings[key]}\n\nLearning: ${fp[key].learning}\n\n${fp[key].example1}\n\n${fp[key].example2}`).join("\n\n") + `\n\n## The Combination\n\n${fp.combination.synthesis}\n\n${fp.combination.practical_question}`;
  return {
    clientName: "Fictional", clientFullName: "Fictional Review Client", generatedAt: "18 November 2026", reportType,
    summary: "You find energy in making complex ideas useful to others. Your school project and community workshop provide the evidence for this fictional portrait.\n\nFrom what you have told us, we can see:\n- You enjoy thoughtful collaboration.\n- You prefer clear methods.",
    lifeHistoryPattern: `## The Opening Bars\n\n${paragraph("life history", 1)}\n\n## Recurring Motifs\n\n${paragraph("life history", 2)}\n\n## What the Pattern Reveals\n\n${paragraph("life history", 3)}\n\nYou recorded one enjoyable, one satisfying and one fulfilling memory.`,
    fourPillars,
    viaSection: "## The Evidence Table\n\n| Strength | VIA Definition | Survey Rank | Freq (of N) | Identity Salience | Achievements with evidence |\n|---|---|---|---|---|---|\n| Curiosity | Taking interest | 1 | 2 | HIGH | School project |\n\n## The Key Findings\n\nYour fictional evidence supports curiosity and teamwork, offered as hypotheses rather than verdicts.",
    personalitySection: `## What the Psychometrics Show\n\n${paragraph("personality", 1)}\n\n## Where the Two Pictures Meet\n\n${paragraph("personality", 2)}\n\n## What This Means\n\n${paragraph("personality", 3)}`,
    behaviouralStyle: `## Colour Energy Profile\n\n${paragraph("behaviour", 1)}\n\n## At Your Best\n\n${paragraph("behaviour", 2)}`,
    primaryColour: "Cool Blue", secondaryColour: "Earth Green", jungianType: "INTJ",
    developmentEdge: threeAreas("Development"), careerDirections: threeAreas("Direction"),
    coachingQuestions: `## Past\n\n${paragraph("past", 1)}\n\n## Present\n\n${paragraph("present", 1)}\n\n## Future\n\n${paragraph("future", 1)}\n\n## Tell Me About Yourself\n\nI am fundamentally driven by:\n- Understanding ideas\n- Thoughtful collaboration\n- Practical usefulness\n\nI bring these drivers to the next chapter of my life. This fictional answer is a starting point for reflection, not a prescribed script.`,
    viaRanked: [{ name: "Curiosity", rank: 1, score: 20 }, { name: "Teamwork", rank: 2, score: 19 }, { name: "Creativity", rank: 3, score: 18 }],
    domainScores: { O: 65, C: 60, E: 40, A: 60, N: 45 }, facetScores: {},
  };
}
