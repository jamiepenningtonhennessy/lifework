export const WEBINAR_BOOKING_URL =
  "mailto:jamie@penningtonhennessy.com?subject=Lifework%20September%20webinar%20registration";

export const WEBINAR_SESSIONS = [
  {
    title: "An introduction to Lifework",
    timing: "12:30 BST on 16 September",
    registrationUrl: "https://us02web.zoom.us/meeting/register/fuGdT3CTTiyJj1Ax1fBPAw",
  },
  {
    title: "An introduction to Lifework",
    timing: "18:00 BST on 24 September",
    registrationUrl: "https://us02web.zoom.us/meeting/register/fPl8rbYYSOCWSS39PHzqYA",
  },
] as const;

export const WEBINAR_VALUE_THEMES = [
  {
    number: "01",
    title: "A clearer pattern",
    description: "Significant moments across a life can reveal the recurring conditions in which a person is most alive and effective.",
  },
  {
    number: "02",
    title: "Beyond the CV",
    description: "The conversation looks beyond titles and milestones to understand the person, their strengths and the contribution they want to make.",
  },
  {
    number: "03",
    title: "Language for what matters",
    description: "Lifework helps put precise language around the environments, relationships and challenges that allow someone to be fully themselves.",
  },
  {
    number: "04",
    title: "A considered next step",
    description: "The result is not a prescribed answer, but a more thoughtful basis for career conversations, choices and change.",
  },
] as const;

export const WEBINAR_AGENDA = [
  "Why CVs and career ladders are yesterday's solutions to yesterday's organisations.",
  "How the Lifework journey reveals what needs to be present for you to be fully you.",
  "The Lifework process, and how you can benefit from it.",
] as const;
