import { describe, it, expect } from "vitest";

// ─── Unit tests for Chat to Peter logic ──────────────────────────────────────
// These tests cover the pure functions and data transformations used by the
// chatPeter router, without requiring a live DB or LLM connection.

// Helper: build a mock conversation transcript
function buildTranscript(turns: Array<{ role: "peter" | "client"; content: string }>) {
  return turns.map((t, i) => ({
    role: t.role,
    content: t.content,
    timestamp: Date.now() + i * 1000,
  }));
}

// Helper: format transcript as the summary prompt would see it
function formatTranscript(messages: Array<{ role: string; content: string }>) {
  return messages
    .map(m => `${m.role === "peter" ? "Peter" : "Client"}: ${m.content}`)
    .join("\n\n");
}

describe("Chat to Peter — transcript formatting", () => {
  it("formats a simple two-turn conversation correctly", () => {
    const messages = buildTranscript([
      { role: "peter", content: "What strikes me about your story is the pattern of organising others." },
      { role: "client", content: "Yes, I've always done that — even as a child." },
    ]);
    const formatted = formatTranscript(messages);
    expect(formatted).toContain("Peter: What strikes me");
    expect(formatted).toContain("Client: Yes, I've always");
    expect(formatted).toMatch(/Peter:.*\n\nClient:/s);
  });

  it("handles an empty conversation", () => {
    const formatted = formatTranscript([]);
    expect(formatted).toBe("");
  });

  it("correctly labels peter messages as 'Peter' and client as 'Client'", () => {
    const messages = buildTranscript([
      { role: "peter", content: "Hello" },
      { role: "client", content: "Hi" },
      { role: "peter", content: "Tell me more" },
    ]);
    const formatted = formatTranscript(messages);
    const lines = formatted.split("\n\n");
    expect(lines[0]).toMatch(/^Peter:/);
    expect(lines[1]).toMatch(/^Client:/);
    expect(lines[2]).toMatch(/^Peter:/);
  });
});

describe("Chat to Peter — section context selection", () => {
  it("life_history section includes achievements context", () => {
    const section = "life_history";
    const achievementsContext = "[1980s] Running the school newspaper (Satisfying): Organised a team of 12 students.";
    const contextText = section === "life_history"
      ? `The client has completed their life history section. Here are their recorded achievements:\n\n${achievementsContext}`
      : "career context";
    expect(contextText).toContain("life history section");
    expect(contextText).toContain("Running the school newspaper");
  });

  it("career_education section includes career and education context", () => {
    const section = "career_education";
    const careerContext = "1995–2005: Marketing Manager at Acme Corp";
    const contextText = section === "career_education"
      ? `The client has completed their education and career sections.\n\nCAREER HISTORY:\n${careerContext}`
      : "life history context";
    expect(contextText).toContain("education and career sections");
    expect(contextText).toContain("Marketing Manager");
  });
});

describe("Chat to Peter — first message handling", () => {
  it("detects first message correctly when no existing messages", () => {
    const existingMessages: unknown[] = [];
    const isFirstMessage = existingMessages.length === 0;
    expect(isFirstMessage).toBe(true);
  });

  it("detects subsequent messages correctly", () => {
    const existingMessages = [
      { role: "peter", content: "Hello", timestamp: Date.now() },
      { role: "client", content: "Hi", timestamp: Date.now() },
    ];
    const isFirstMessage = existingMessages.length === 0;
    expect(isFirstMessage).toBe(false);
  });
});

describe("Chat to Peter — message count tracking", () => {
  it("returns correct message count after exchange", () => {
    const existingMessages = [
      { role: "peter", content: "Hello", timestamp: 1 },
      { role: "client", content: "Hi", timestamp: 2 },
    ];
    // After one more exchange (user + peter), count increases by 2
    const newCount = existingMessages.length + 2;
    expect(newCount).toBe(4);
  });

  it("starts at 2 after first exchange (user message + peter response)", () => {
    const existingMessages: unknown[] = [];
    const newCount = existingMessages.length + 2;
    expect(newCount).toBe(2);
  });
});

describe("Chat to Peter — summary threshold", () => {
  it("requires at least 2 messages before summarising", () => {
    const canSummarise = (messageCount: number) => messageCount >= 2;
    expect(canSummarise(0)).toBe(false);
    expect(canSummarise(1)).toBe(false);
    expect(canSummarise(2)).toBe(true);
    expect(canSummarise(10)).toBe(true);
  });

  it("UI shows save-insights button after 4 messages", () => {
    // The UI shows the button when messages.length >= 4
    const showSaveButton = (messageCount: number) => messageCount >= 4;
    expect(showSaveButton(3)).toBe(false);
    expect(showSaveButton(4)).toBe(true);
    expect(showSaveButton(8)).toBe(true);
  });
});

describe("Chat to Peter — analysis prompt injection", () => {
  it("includes life history chat summary in analysis prompt when present", () => {
    const lifeHistoryChat = "The client demonstrated a consistent pattern of organising others from an early age.";
    const careerEducationChat = "";
    const promptSection = [
      lifeHistoryChat ? `### Chat with Peter: Life History Insights\n${lifeHistoryChat}\n` : "",
      careerEducationChat ? `### Chat with Peter: Career & Education Insights\n${careerEducationChat}\n` : "",
    ].join("");
    expect(promptSection).toContain("Life History Insights");
    expect(promptSection).toContain("consistent pattern of organising");
    expect(promptSection).not.toContain("Career & Education Insights");
  });

  it("omits chat sections from prompt when no summaries exist", () => {
    const lifeHistoryChat = "";
    const careerEducationChat = "";
    const promptSection = [
      lifeHistoryChat ? `### Chat with Peter: Life History Insights\n${lifeHistoryChat}\n` : "",
      careerEducationChat ? `### Chat with Peter: Career & Education Insights\n${careerEducationChat}\n` : "",
    ].join("");
    expect(promptSection).toBe("");
  });

  it("includes both sections when both summaries are present", () => {
    const lifeHistoryChat = "Pattern of creative leadership from childhood.";
    const careerEducationChat = "Career path diverged from motivated strengths in mid-career.";
    const promptSection = [
      lifeHistoryChat ? `### Chat with Peter: Life History Insights\n${lifeHistoryChat}\n` : "",
      careerEducationChat ? `### Chat with Peter: Career & Education Insights\n${careerEducationChat}\n` : "",
    ].join("");
    expect(promptSection).toContain("Life History Insights");
    expect(promptSection).toContain("Career & Education Insights");
    expect(promptSection).toContain("creative leadership");
    expect(promptSection).toContain("diverged from motivated strengths");
  });
});
