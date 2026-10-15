"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FieldHint, Label } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import type { AiPromptKey } from "@/lib/settings/schemas";

import { saveAiPromptsAction } from "../actions";

type Prompt = {
  key: AiPromptKey;
  label: string;
  builtIn: string;
  text: string;
  version: string;
  custom: boolean;
};

/**
 * The instructions each AI task runs with. An edit gets its own version, so syllabuses read
 * with the old instructions can be read again, and every reading says which one made it.
 * The JSON shape the app expects is added by the app itself; it can't be edited away.
 */
export function AiPromptsForm({ prompts }: { prompts: Prompt[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [texts, setTexts] = useState(
    Object.fromEntries(prompts.map((p) => [p.key, p.text])) as Record<
      AiPromptKey,
      string
    >,
  );
  const save = () =>
    start(async () => {
      const result = await saveAiPromptsAction(texts);
      if (!result.ok) return void toast.error(result.error);
      toast.success("Prompts saved. New readings use them");
      router.refresh();
    });

  return (
    <section
      className="flex flex-col gap-4 rounded-card border border-border bg-surface p-4 md:p-5"
      aria-labelledby="ai-prompts"
    >
      <div className="flex flex-col gap-1">
        <h2 id="ai-prompts" className="text-h3">
          Prompts
        </h2>
        <p className="text-small text-ink-muted">
          What the model is told for each task. Every reply is still checked
          against the expected shape and refused if it doesn&apos;t fit.
        </p>
      </div>
      {prompts.map((p) => {
        const edited = texts[p.key].trim() !== p.builtIn.trim();
        return (
          <div key={p.key} className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Label htmlFor={`prompt-${p.key}`}>{p.label}</Label>
              <div className="flex items-center gap-2">
                <Badge tone={p.custom ? "accent" : "outline"}>
                  {p.custom ? "edited" : "built-in"}
                </Badge>
                {edited ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setTexts({ ...texts, [p.key]: p.builtIn })}
                  >
                    Reset to built-in
                  </Button>
                ) : null}
              </div>
            </div>
            <Textarea
              id={`prompt-${p.key}`}
              rows={10}
              maxLength={20_000}
              spellCheck={false}
              value={texts[p.key]}
              onChange={(e) => setTexts({ ...texts, [p.key]: e.target.value })}
              className="font-mono text-base md:text-small"
            />
            <FieldHint>
              Version <span className="font-mono">{p.version}</span>
            </FieldHint>
          </div>
        );
      })}
      <Button
        variant="secondary"
        className="self-start"
        disabled={pending}
        onClick={save}
      >
        {pending ? "Saving" : "Save prompts"}
      </Button>
    </section>
  );
}
