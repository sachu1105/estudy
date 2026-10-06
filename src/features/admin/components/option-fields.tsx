"use client";

import { Input, Label } from "@/components/ui/input";
import { SegmentedControl } from "@/components/ui/segmented-control";

/** The four options of a question and which one is right. */
export function OptionFields({
  options,
  correctIndex,
  onChange,
}: {
  options: string[];
  correctIndex: number;
  onChange: (change: { options?: string[]; correctIndex?: number }) => void;
}) {
  return (
    <>
      {options.map((option, i) => (
        <div key={i} className="flex flex-col gap-2">
          <Label htmlFor={`q-option-${i}`}>
            Option {String.fromCharCode(65 + i)}
          </Label>
          <Input
            id={`q-option-${i}`}
            value={option}
            maxLength={500}
            onChange={(e) =>
              onChange({
                options: options.map((o, j) => (j === i ? e.target.value : o)),
              })
            }
          />
        </div>
      ))}
      <div className="flex flex-col gap-2">
        <span className="text-small font-medium">Right answer</span>
        <SegmentedControl
          ariaLabel="Right answer"
          value={String(correctIndex)}
          onValueChange={(v) => onChange({ correctIndex: Number(v) })}
          options={["A", "B", "C", "D"].map((l, i) => ({
            value: String(i),
            label: l,
          }))}
          className="self-start"
        />
      </div>
    </>
  );
}
