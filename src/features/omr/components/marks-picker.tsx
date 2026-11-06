"use client";

import { useId } from "react";

import { Chip } from "@/components/ui/chip";
import { Input, Label } from "@/components/ui/input";
import { formatRule } from "@/lib/omr/fraction";
import {
  CANCEL_RULES,
  MARKING_PRESETS,
  type CancelRule,
} from "@/lib/omr/marking";

const field = "flex flex-col gap-1.5";

/** The marks: a common scheme in one tap, or custom marks typed as 1, 0.25 or 1/3. */
export function MarksPicker({
  preset,
  onPreset,
  right,
  onRight,
  wrong,
  onWrong,
}: {
  /** A preset's key, or "custom". */
  preset: string;
  onPreset: (key: string) => void;
  right: string;
  onRight: (text: string) => void;
  wrong: string;
  onWrong: (text: string) => void;
}) {
  const id = useId();
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 text-small font-medium">Marks</legend>
      <div
        role="group"
        aria-label="Marking scheme"
        className="flex flex-wrap gap-2"
      >
        {MARKING_PRESETS.map((p) => (
          <Chip
            key={p.key}
            selected={preset === p.key}
            onClick={() => onPreset(p.key)}
          >
            {p.label}
            <span className="font-mono font-normal">
              +{formatRule(p.right)} −{formatRule(p.wrong)}
            </span>
          </Chip>
        ))}
        <Chip selected={preset === "custom"} onClick={() => onPreset("custom")}>
          Custom
        </Chip>
      </div>
      {preset === "custom" ? (
        <div className="grid grid-cols-2 gap-3 pt-1">
          <div className={field}>
            <Label htmlFor={`${id}-r`}>Right answer, +</Label>
            <Input
              id={`${id}-r`}
              inputMode="decimal"
              required
              placeholder="1"
              value={right}
              onChange={(e) => onRight(e.target.value)}
            />
          </div>
          <div className={field}>
            <Label htmlFor={`${id}-w`}>Wrong answer, −</Label>
            <Input
              id={`${id}-w`}
              inputMode="decimal"
              placeholder="1/3"
              value={wrong}
              onChange={(e) => onWrong(e.target.value)}
            />
          </div>
        </div>
      ) : null}
    </fieldset>
  );
}

/** What a cancelled question is worth, with what that means underneath. */
export function CancelRulePicker({
  value,
  onChange,
}: {
  value: CancelRule;
  onChange: (rule: CancelRule) => void;
}) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 text-small font-medium">
        A cancelled question
      </legend>
      <div
        role="group"
        aria-label="A cancelled question"
        className="grid gap-2 sm:grid-cols-2"
      >
        {CANCEL_RULES.map((rule) => (
          <Chip
            key={rule.value}
            selected={value === rule.value}
            onClick={() => onChange(rule.value)}
            className="w-full justify-center"
          >
            {rule.label}
          </Chip>
        ))}
      </div>
      <p className="text-small text-ink-muted">
        {CANCEL_RULES.find((r) => r.value === value)?.hint}
      </p>
    </fieldset>
  );
}
