import "server-only";

import { env } from "@/server/env";

import { createHostedProvider } from "./hosted";
import { createOllamaProvider } from "./ollama";
import type { AIProvider } from "./types";

export { structureSyllabus } from "./structure";
export type { SyllabusTree } from "./syllabus-tree";
export * from "./types";

/** The provider AI_PROVIDER selects. Question generation (milestone 7) and weekly summaries
 * (milestone 6) add their prompts next to structureSyllabus and reuse generateValidated. */
export function createAiProvider(): AIProvider {
  if (env.AI_PROVIDER === "hosted") {
    return createHostedProvider({
      apiKey: env.AI_API_KEY!,
      model: env.AI_MODEL!,
      baseUrl: env.AI_API_URL,
      priceInputPerMTok: env.AI_PRICE_INPUT_PER_MTOK,
      priceOutputPerMTok: env.AI_PRICE_OUTPUT_PER_MTOK,
    });
  }
  return createOllamaProvider({
    baseUrl: env.OLLAMA_BASE_URL,
    model: env.OLLAMA_MODEL,
  });
}
