/**
 * Embedding utilities for Virtual Peter semantic matching.
 * Uses the Manus Forge API (text-embedding-3-small, 1536 dimensions).
 */
import { ENV } from "./env";

const EMBEDDING_MODEL = "text-embedding-3-small";
const EMBEDDING_DIMENSIONS = 1536;

const resolveEmbeddingUrl = () =>
  ENV.forgeApiUrl && ENV.forgeApiUrl.trim().length > 0
    ? `${ENV.forgeApiUrl.replace(/\/$/, "")}/v1/embeddings`
    : "https://forge.manus.im/v1/embeddings";

/**
 * Generate an embedding vector for a single text string.
 * Returns a 1536-dimensional float array.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  if (!ENV.forgeApiKey) {
    throw new Error("BUILT_IN_FORGE_API_KEY is not configured");
  }

  const response = await fetch(resolveEmbeddingUrl(), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${ENV.forgeApiKey}`,
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: text,
      dimensions: EMBEDDING_DIMENSIONS,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Embedding API failed: ${response.status} ${response.statusText} – ${errorText}`
    );
  }

  const result = await response.json() as {
    data: Array<{ embedding: number[] }>;
  };

  return result.data[0].embedding;
}

/**
 * Compute cosine similarity between two vectors.
 * Returns a value between -1 and 1 (higher = more similar).
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error(`Vector length mismatch: ${a.length} vs ${b.length}`);
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  if (denom === 0) return 0;

  return dotProduct / denom;
}

/**
 * Build the embedding text for a historical client.
 * This is the text that gets embedded for matching purposes.
 * 
 * Per the methodology: the career description is the primary signal,
 * supplemented by narrative samples to capture the underlying life pattern.
 */
export function buildEmbeddingText(
  careerDescription: string,
  narrativeSample: string[]
): string {
  const parts = [
    `Career outcome: ${careerDescription}`,
  ];

  if (narrativeSample && narrativeSample.length > 0) {
    parts.push("\nLife history samples:");
    // Take up to 5 narrative samples to keep the embedding focused
    const samples = narrativeSample.slice(0, 5);
    for (const sample of samples) {
      if (sample && sample.trim().length > 20) {
        parts.push(`- ${sample.trim().slice(0, 200)}`);
      }
    }
  }

  return parts.join("\n");
}
