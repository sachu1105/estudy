"use client";

import { KeyRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import { FieldHint, Input, Label } from "@/components/ui/input";

/**
 * The API key: the saved one shows only as its last four characters, never in full. A
 * pasted key replaces it on save; Remove drops it.
 */
export function AiKeyField({
  hint,
  unreadable,
  canStore,
  value,
  onChange,
  removing,
  onRemove,
}: {
  hint: string | null;
  unreadable: boolean;
  canStore: boolean;
  value: string;
  onChange: (value: string) => void;
  removing: boolean;
  onRemove: () => void;
}) {
  const saved = Boolean(hint) && !removing && !unreadable;
  return (
    <div className="flex flex-col gap-2 md:col-span-2">
      <Label htmlFor="ai-key">API key</Label>
      {saved ? (
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-2 font-mono text-small text-ink">
            <KeyRound className="size-4 text-ink-muted" aria-hidden />
            Saved key {hint}
          </span>
          <Button type="button" variant="ghost" size="sm" onClick={onRemove}>
            Remove
          </Button>
        </div>
      ) : null}
      <Input
        id="ai-key"
        type="password"
        value={value}
        maxLength={500}
        autoComplete="off"
        spellCheck={false}
        disabled={!canStore}
        onChange={(e) => onChange(e.target.value)}
        placeholder={saved ? "Paste a new key to replace it" : "Paste the key"}
      />
      <FieldHint>
        {!canStore
          ? "Set AI_SECRET_KEY in the server environment to store a key here."
          : unreadable
            ? "The saved key was sealed with a different AI_SECRET_KEY. Paste it again."
            : removing
              ? "The saved key is removed when you save."
              : "From the provider's console. It is never shown again after saving."}
      </FieldHint>
    </div>
  );
}
