import { describe, it, expect } from "vitest";

describe("Anthropic API key validation", () => {
  it("should successfully call the Anthropic API with the stored key", async () => {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    expect(apiKey, "ANTHROPIC_API_KEY must be set").toBeTruthy();
    expect(apiKey!.startsWith("sk-ant-"), "Key should start with sk-ant-").toBe(true);

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey!,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5",
        max_tokens: 16,
        messages: [{ role: "user", content: "Say OK" }],
      }),
    });

    expect(response.status, `Anthropic API returned ${response.status}`).toBe(200);
    const data = await response.json() as { content: Array<{ text: string }> };
    expect(data.content[0].text.length).toBeGreaterThan(0);
  });
});
