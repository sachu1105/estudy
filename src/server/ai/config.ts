import "server-only";

import { AI_PROVIDERS, type AiProviderKind } from "@/lib/settings/schemas";
import { open } from "@/server/crypto/secret-box";
import { env } from "@/server/env";
import { getSetting } from "@/server/settings";

import { createHostedProvider } from "./hosted";
import { createOllamaProvider } from "./ollama";
import { createOpenAiProvider } from "./openai";
import type { AIProvider } from "./types";

/** The model the AI jobs call, with its key opened. Server and worker only (rule 1). */
export type ProviderConfig = {
  kind: AiProviderKind;
  model: string;
  baseUrl: string | null;
  priceInputPerMTok: number;
  priceOutputPerMTok: number;
  apiKey: string | null;
  /** "admin" once saved in Admin > AI; until then the server's environment. */
  source: "admin" | "env";
};

function fromEnv(): ProviderConfig {
  const hosted = env.AI_PROVIDER === "hosted";
  return {
    kind: hosted ? "anthropic" : "ollama",
    model: (hosted ? env.AI_MODEL : env.OLLAMA_MODEL) ?? "",
    baseUrl: (hosted ? env.AI_API_URL : env.OLLAMA_BASE_URL) ?? null,
    priceInputPerMTok: env.AI_PRICE_INPUT_PER_MTOK,
    priceOutputPerMTok: env.AI_PRICE_OUTPUT_PER_MTOK,
    apiKey: (hosted ? env.AI_API_KEY : null) ?? null,
    source: "env",
  };
}

export async function providerConfig(): Promise<ProviderConfig> {
  const saved = await getSetting("aiProvider");
  if (!saved) return fromEnv();
  return {
    kind: saved.kind,
    model: saved.model,
    baseUrl: saved.baseUrl,
    priceInputPerMTok: saved.priceInputPerMTok,
    priceOutputPerMTok: saved.priceOutputPerMTok,
    // Sealed under another AI_SECRET_KEY (or none set): treated as no key at all.
    apiKey:
      saved.apiKey && env.AI_SECRET_KEY
        ? open(saved.apiKey.sealed, env.AI_SECRET_KEY)
        : null,
    source: "admin",
  };
}

/** Why the configured model can't be called yet, or null when it can. */
export function missingSetup(config: ProviderConfig) {
  if (!config.model) return "Choose a model.";
  if (AI_PROVIDERS[config.kind].needsKey && !config.apiKey)
    return "Add the API key.";
  return null;
}

export function buildProvider(config: ProviderConfig): AIProvider {
  const priced = {
    model: config.model,
    priceInputPerMTok: config.priceInputPerMTok,
    priceOutputPerMTok: config.priceOutputPerMTok,
  };
  switch (config.kind) {
    case "anthropic":
      return createHostedProvider({
        ...priced,
        apiKey: config.apiKey ?? "",
        baseUrl: config.baseUrl ?? undefined,
      });
    case "openai":
      return createOpenAiProvider({
        ...priced,
        apiKey: config.apiKey ?? "",
        baseUrl: config.baseUrl ?? undefined,
      });
    case "ollama":
      return createOllamaProvider({
        model: config.model,
        baseUrl: config.baseUrl ?? AI_PROVIDERS.ollama.defaultUrl,
      });
  }
}

/** The provider as configured right now; the worker builds one per job, so edits apply at once. */
export async function currentAiProvider() {
  return buildProvider(await providerConfig());
}
