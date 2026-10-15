import "server-only";

import {
  AI_JOBS,
  AI_PROMPTS,
  type AiJob,
  type AiPromptKey,
  type AiProviderKind,
  type SettingValue,
} from "@/lib/settings/schemas";
import { missingSetup, providerConfig } from "@/server/ai/config";
import { activePrompt, PROMPT_DEFAULTS } from "@/server/ai/prompts";
import { hintOf, seal } from "@/server/crypto/secret-box";
import { env } from "@/server/env";
import { auditLogRepository } from "@/server/repositories/audit-log-repository";
import { getSetting, saveSetting } from "@/server/settings";

import { failure, type Result } from "../syllabus/deps";
import type { Admin } from "./admin-service";

export type ApiKeyChange =
  | { action: "keep" }
  | { action: "replace"; value: string }
  | { action: "remove" };

export type ProviderInput = {
  kind: AiProviderKind;
  model: string;
  baseUrl: string | null;
  priceInputPerMTok: number;
  priceOutputPerMTok: number;
  apiKey: ApiKeyChange;
};

const log = (
  by: Admin,
  action: string,
  metadata: Record<string, string | number | boolean | null>,
) =>
  auditLogRepository.append({
    actorId: by.id,
    action,
    targetId: null,
    metadata,
    ip: by.ip ?? null,
  });

/**
 * Admin > AI: the switch, the model and its key, and the prompts. Super admins only. The
 * key goes in sealed and never comes back out to a browser: the page sees a hint.
 */
export const aiSettings = {
  /** Everything the AI page shows. Safe to hand to a client component: no key in it. */
  async view() {
    const [ai, saved, prompts, config] = await Promise.all([
      getSetting("ai"),
      getSetting("aiProvider"),
      getSetting("aiPrompts"),
      providerConfig(),
    ]);
    const missing = missingSetup(config);
    return {
      enabled: ai?.enabled ?? false,
      jobs: Object.fromEntries(
        (Object.keys(AI_JOBS) as AiJob[]).map((job) => [
          job,
          ai?.jobs[job] ?? true,
        ]),
      ) as Record<AiJob, boolean>,
      provider: {
        source: config.source,
        kind: config.kind,
        model: config.model,
        baseUrl: config.baseUrl,
        priceInputPerMTok: config.priceInputPerMTok,
        priceOutputPerMTok: config.priceOutputPerMTok,
        keyHint:
          saved?.apiKey?.hint ??
          (config.apiKey ? "set in the server environment" : null),
        /** Saved, but sealed under a different AI_SECRET_KEY: it must be entered again. */
        keyUnreadable: Boolean(saved?.apiKey && !config.apiKey),
      },
      canStoreKeys: Boolean(env.AI_SECRET_KEY),
      missing,
      prompts: (Object.keys(AI_PROMPTS) as AiPromptKey[]).map((key) => {
        const active = activePrompt(key, prompts?.[key]);
        return {
          key,
          label: AI_PROMPTS[key].label,
          builtIn: PROMPT_DEFAULTS[key].system,
          text: active.system,
          version: active.version,
          custom: active.custom,
        };
      }),
    };
  },

  async saveProvider(by: Admin, input: ProviderInput): Promise<Result<object>> {
    const saved = await getSetting("aiProvider");
    let apiKey: SettingValue<"aiProvider">["apiKey"] = saved?.apiKey ?? null;
    if (input.apiKey.action === "remove") apiKey = null;
    if (input.apiKey.action === "replace") {
      if (!env.AI_SECRET_KEY)
        return failure(
          "NO_SECRET",
          "Set AI_SECRET_KEY in the server environment first, then save the key.",
        );
      const value = input.apiKey.value.trim();
      apiKey = { sealed: seal(value, env.AI_SECRET_KEY), hint: hintOf(value) };
    }
    await saveSetting(
      "aiProvider",
      {
        kind: input.kind,
        model: input.model,
        baseUrl: input.baseUrl,
        priceInputPerMTok: input.priceInputPerMTok,
        priceOutputPerMTok: input.priceOutputPerMTok,
        apiKey,
      },
      by.id,
    );
    // The audit row says what changed, never the key itself.
    await log(by, "admin.ai.provider", {
      kind: input.kind,
      model: input.model,
      key: input.apiKey.action,
    });
    return { ok: true };
  },

  /** Saves edited prompts; one equal to the built-in text (or empty) goes back to it. */
  async savePrompts(
    by: Admin,
    input: Partial<Record<AiPromptKey, string | null>>,
  ): Promise<Result<object>> {
    const current = (await getSetting("aiPrompts")) ?? {};
    const next: Partial<Record<AiPromptKey, string>> = { ...current };
    for (const key of Object.keys(input) as AiPromptKey[]) {
      const text = input[key]?.trim();
      if (!text || text === PROMPT_DEFAULTS[key].system.trim())
        delete next[key];
      else next[key] = text;
    }
    await saveSetting("aiPrompts", next, by.id);
    await log(by, "admin.ai.prompts", {
      ...Object.fromEntries(
        (Object.keys(AI_PROMPTS) as AiPromptKey[]).map((key) => [
          key,
          activePrompt(key, next[key]).version,
        ]),
      ),
    });
    return { ok: true };
  },
};
