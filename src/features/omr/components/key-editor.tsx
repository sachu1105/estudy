"use client";

import { Check, ClipboardPaste } from "lucide-react";
import { useCallback, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { toast } from "@/components/ui/toast";
import {
  applyEntries,
  keyedCount,
  toggleCancelled,
  toggleOption,
  type AnswerKey,
} from "@/lib/omr/key";
import type { Shape } from "@/lib/omr/marks";

import { KeyGrid } from "./key-grid";
import { KeyPaste } from "./key-paste";
import { useSavedKey, type KeySource } from "./use-saved-key";

/**
 * The answer key: who wrote it, a paste box for the whole key at once, and the grid to
 * key or fix one question at a time. Saves as it changes; results follow the new key.
 */
export function KeyEditor({
  paperId,
  shape,
  initialKey,
  initialSource,
}: {
  paperId: string;
  shape: Shape;
  initialKey: AnswerKey;
  initialSource: KeySource;
}) {
  const key = useSavedKey(paperId, {
    answerKey: initialKey,
    source: initialSource,
  });
  const { setKey } = key;
  const [pasting, setPasting] = useState(keyedCount(initialKey) === 0);
  const keyed = keyedCount(key.answerKey);

  const onToggle = useCallback(
    (q: number, o: number) => setKey((k) => toggleOption(k, q, o)),
    [setKey],
  );
  const onCancel = useCallback(
    (q: number) => setKey((k) => toggleCancelled(k, q)),
    [setKey],
  );

  return (
    <Card className="flex flex-col gap-4 p-4 md:p-5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <div className="flex min-w-0 flex-1 flex-col">
          <h2 className="font-heading text-h2 font-semibold">Answer key</h2>
          <p className="text-small text-ink-muted tabular-nums">
            {keyed} of {shape.questions} keyed ·{" "}
            <span role="status" className="inline-flex items-center gap-1">
              {key.saving ? (
                "Saving"
              ) : (
                <>
                  <Check className="size-3.5" aria-hidden /> Saved
                </>
              )}
            </span>
          </p>
        </div>
        <SegmentedControl
          size="sm"
          ariaLabel="Whose key"
          value={key.source}
          onValueChange={key.setSource}
          options={[
            { value: "OWN", label: "My key" },
            { value: "OFFICIAL", label: "Official key" },
          ]}
        />
      </div>

      {pasting ? (
        <KeyPaste
          shape={shape}
          onFill={(entries) => {
            setKey((k) => applyEntries(k, entries));
            setPasting(false);
            toast(
              `Filled ${entries.size} question${entries.size === 1 ? "" : "s"}. Check them below.`,
            );
          }}
        />
      ) : (
        <Button
          variant="ghost"
          className="self-start"
          onClick={() => setPasting(true)}
        >
          <ClipboardPaste aria-hidden /> Paste a key
        </Button>
      )}

      <KeyGrid
        answerKey={key.answerKey}
        options={shape.options}
        onToggle={onToggle}
        onCancel={onCancel}
      />
    </Card>
  );
}
