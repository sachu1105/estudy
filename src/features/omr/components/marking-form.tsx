"use client";

import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { toast } from "@/components/ui/toast";
import { formatRule } from "@/lib/omr/fraction";
import {
  MARKING_PRESETS,
  presetOf,
  type CancelRule,
  type Marking,
} from "@/lib/omr/marking";
import type { Shape } from "@/lib/omr/marks";

import { savePaperSettingsAction } from "../actions";
import { CancelRulePicker, MarksPicker } from "./marks-picker";

const field = "flex flex-col gap-1.5";

/**
 * How the paper is marked: questions and options, the marks (a preset or custom), the
 * cut-off, the time limit, and what a cancelled question is worth.
 */
export function MarkingForm({
  paperId,
  shape,
  marking,
  limitMin,
  onDone,
}: {
  paperId: string;
  shape: Shape;
  marking: Marking;
  limitMin: number | null;
  onDone: () => void;
}) {
  const id = useId();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [questions, setQuestions] = useState(String(shape.questions));
  const [options, setOptions] = useState(String(shape.options) as "4" | "5");
  const [preset, setPreset] = useState(presetOf(marking) ?? "custom");
  const [right, setRight] = useState(formatRule(marking.right));
  const [wrong, setWrong] = useState(formatRule(marking.wrong));
  const [cutoff, setCutoff] = useState(
    marking.cutoff ? formatRule(marking.cutoff) : "",
  );
  const [limit, setLimit] = useState(limitMin === null ? "" : String(limitMin));
  const [cancelled, setCancelled] = useState<CancelRule>(marking.cancelled);
  const fewer = Number(questions) < shape.questions;

  function pick(key: string) {
    setPreset(key);
    const chosen = MARKING_PRESETS.find((p) => p.key === key);
    if (!chosen) return;
    setRight(formatRule(chosen.right));
    setWrong(formatRule(chosen.wrong));
  }

  function save() {
    start(async () => {
      const result = await savePaperSettingsAction({
        id: paperId,
        questionCount: Number(questions),
        optionCount: Number(options),
        right: right.trim(),
        wrong: wrong.trim() || "0",
        cutoff: cutoff.trim() || null,
        limitMin: limit.trim() ? Number(limit) : null,
        cancelRule: cancelled,
      });
      if (!result.ok) return void toast.error(result.error);
      toast("Marking saved.");
      router.refresh();
      onDone();
    });
  }

  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      <div className="grid grid-cols-2 gap-3">
        <div className={field}>
          <Label htmlFor={`${id}-q`}>Questions</Label>
          <Input
            id={`${id}-q`}
            type="number"
            inputMode="numeric"
            min={1}
            max={200}
            required
            value={questions}
            onChange={(e) => setQuestions(e.target.value)}
          />
        </div>
        <div className={field}>
          <span className="text-small font-medium">Options</span>
          <SegmentedControl
            ariaLabel="Options per question"
            value={options}
            onValueChange={setOptions}
            className="w-full [&>*]:flex-1"
            options={[
              { value: "4", label: "A–D" },
              { value: "5", label: "A–E" },
            ]}
          />
        </div>
      </div>
      {fewer ? (
        <p className="-mt-2 text-small text-ink-muted">
          Questions past {questions || 0} leave the key and the sheet.
        </p>
      ) : null}

      <MarksPicker
        preset={preset}
        onPreset={pick}
        right={right}
        onRight={setRight}
        wrong={wrong}
        onWrong={setWrong}
      />

      <div className="grid grid-cols-2 gap-3">
        <div className={field}>
          <Label htmlFor={`${id}-c`}>Cut-off</Label>
          <Input
            id={`${id}-c`}
            inputMode="decimal"
            placeholder="None"
            value={cutoff}
            onChange={(e) => setCutoff(e.target.value)}
          />
        </div>
        <div className={field}>
          <Label htmlFor={`${id}-t`}>Time, minutes</Label>
          <Input
            id={`${id}-t`}
            type="number"
            inputMode="numeric"
            min={1}
            max={300}
            placeholder="No limit"
            value={limit}
            onChange={(e) => setLimit(e.target.value)}
          />
        </div>
      </div>

      <CancelRulePicker value={cancelled} onChange={setCancelled} />

      <div className="flex gap-2">
        <Button type="submit" variant="primary" disabled={pending}>
          {pending ? "Saving" : "Save marking"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          disabled={pending}
          onClick={onDone}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
