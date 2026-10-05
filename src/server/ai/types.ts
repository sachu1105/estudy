// The AI boundary (CLAUDE.md rule 1): server and worker only. Nothing here may be imported by
// a client component, and no key or provider detail is ever sent to the browser.

export type AiPurpose =
  "STRUCTURE_SYLLABUS" | "GENERATE_QUESTIONS" | "SUMMARIZE";

export type AiRequest = {
  purpose: AiPurpose;
  promptVersion: string;
  system: string;
  prompt: string;
  /** JSON Schema the reply must follow; providers that support it enforce it natively. */
  jsonSchema: Record<string, unknown>;
  maxOutputTokens: number;
};

export type AiResponse = {
  text: string;
  inputTokens: number;
  outputTokens: number;
  /** Millionths of a US dollar. */
  costMicros: number;
  durationMs: number;
};

/** One model behind one API. Chosen by AI_PROVIDER; see server/ai/index.ts. */
export interface AIProvider {
  readonly name: "ollama" | "hosted" | "fake";
  readonly model: string;
  generate(request: AiRequest): Promise<AiResponse>;
}

/** Logged for every call, successful or not, into AiUsage. */
export type AiUsageEntry = {
  purpose: AiPurpose;
  provider: string;
  model: string;
  promptVersion: string;
  inputTokens: number;
  outputTokens: number;
  costMicros: number;
  durationMs: number;
  ok: boolean;
};

/** The provider could not be reached or errored. Worth retrying later. */
export class AiUnavailableError extends Error {
  override name = "AiUnavailableError";
}

/** The model answered, but not with valid output, even after one retry (rule 5). */
export class AiOutputError extends Error {
  override name = "AiOutputError";
}
