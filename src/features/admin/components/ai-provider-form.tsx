"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { FieldHint, Input, Label } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/toast";
import { AI_PROVIDERS, type AiProviderKind } from "@/lib/settings/schemas";

import { saveAiProviderAction } from "../actions";
import { AiKeyField } from "./ai-key-field";

const MODEL_EXAMPLES: Record<AiProviderKind, string> = {
  anthropic: "claude-sonnet-5-5",
  openai: "gpt-5-mini",
  ollama: "qwen2.5:3b-instruct",
};

type Provider = {
  kind: AiProviderKind;
  model: string;
  baseUrl: string | null;
  priceInputPerMTok: number;
  priceOutputPerMTok: number;
  keyHint: string | null;
  keyUnreadable: boolean;
};

/**
 * Which model the AI jobs call, and the key for it. The saved key never comes back to the
 * browser: only its last four characters, to tell keys apart. Replace or remove it here.
 */
export function AiProviderForm({
  initial,
  canStoreKeys,
}: {
  initial: Provider;
  canStoreKeys: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [kind, setKind] = useState(initial.kind);
  const [model, setModel] = useState(initial.model);
  const [baseUrl, setBaseUrl] = useState(initial.baseUrl ?? "");
  const [priceIn, setPriceIn] = useState(String(initial.priceInputPerMTok));
  const [priceOut, setPriceOut] = useState(String(initial.priceOutputPerMTok));
  const [newKey, setNewKey] = useState("");
  const [removeKey, setRemoveKey] = useState(false);
  const info = AI_PROVIDERS[kind];

  const submit = () =>
    start(async () => {
      const result = await saveAiProviderAction({
        kind,
        model,
        baseUrl,
        priceInputPerMTok: priceIn,
        priceOutputPerMTok: priceOut,
        apiKey: newKey.trim()
          ? { action: "replace", value: newKey }
          : removeKey
            ? { action: "remove" }
            : { action: "keep" },
      });
      if (!result.ok) return void toast.error(result.error);
      toast.success("Model saved. The next job uses it");
      setNewKey("");
      setRemoveKey(false);
      router.refresh();
    });

  return (
    <section
      className="flex flex-col gap-4 rounded-card border border-border bg-surface p-4 md:p-5"
      aria-labelledby="ai-provider"
    >
      <div className="flex flex-col gap-1">
        <h2 id="ai-provider" className="text-h3">
          Model and API key
        </h2>
        <p className="text-small text-ink-muted">
          The key is encrypted before it is stored and is only used on the
          server. Claude reads syllabus PDFs and photos page by page; the others
          read the file&apos;s text.
        </p>
      </div>
      <form
        className="grid grid-cols-1 gap-4 md:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <div className="flex flex-col gap-2">
          <Label htmlFor="ai-kind">Provider</Label>
          <Select
            value={kind}
            onValueChange={(v) => setKind(v as AiProviderKind)}
          >
            <SelectTrigger id="ai-kind">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(AI_PROVIDERS) as AiProviderKind[]).map((k) => (
                <SelectItem key={k} value={k}>
                  {AI_PROVIDERS[k].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="ai-model">Model</Label>
          <Input
            id="ai-model"
            value={model}
            maxLength={200}
            autoComplete="off"
            spellCheck={false}
            onChange={(e) => setModel(e.target.value)}
            placeholder={MODEL_EXAMPLES[kind]}
          />
        </div>
        <div className="flex flex-col gap-2 md:col-span-2">
          <Label htmlFor="ai-url">API address</Label>
          <Input
            id="ai-url"
            type="url"
            inputMode="url"
            value={baseUrl}
            maxLength={500}
            spellCheck={false}
            onChange={(e) => setBaseUrl(e.target.value)}
            placeholder={info.defaultUrl}
          />
          <FieldHint>
            Leave empty for {info.defaultUrl}.
            {kind === "openai"
              ? " Any OpenAI-compatible API works here: OpenAI, Gemini, OpenRouter, Groq."
              : ""}
          </FieldHint>
        </div>

        {info.needsKey ? (
          <AiKeyField
            hint={initial.keyHint}
            unreadable={initial.keyUnreadable}
            canStore={canStoreKeys}
            value={newKey}
            onChange={setNewKey}
            removing={removeKey}
            onRemove={() => setRemoveKey(true)}
          />
        ) : null}

        {(
          [
            ["ai-price-in", "Input price", priceIn, setPriceIn],
            ["ai-price-out", "Output price", priceOut, setPriceOut],
          ] as const
        ).map(([id, label, value, set]) => (
          <div key={id} className="flex flex-col gap-2">
            <Label htmlFor={id}>{label}</Label>
            <Input
              id={id}
              type="number"
              inputMode="decimal"
              min={0}
              step="0.01"
              value={value}
              onChange={(e) => set(e.target.value)}
            />
            <FieldHint>
              US dollars per million tokens, for the cost log.
            </FieldHint>
          </div>
        ))}
        <Button
          type="submit"
          variant="secondary"
          className="self-start md:col-span-2 md:justify-self-start"
          disabled={pending}
        >
          {pending ? "Saving" : "Save model"}
        </Button>
      </form>
    </section>
  );
}
