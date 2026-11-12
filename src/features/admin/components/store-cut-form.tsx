"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

import { useSaveSetting } from "./use-save-setting";

/** studypods' share of each seller's Store sale. Fixed on each sale when it happens. */
export function StoreCutForm({ percent: initial }: { percent: number }) {
  const [percent, setPercent] = useState(String(initial));
  const { save, pending } = useSaveSetting("storeCut");
  const value = Number(percent);
  const valid = Number.isInteger(value) && value >= 0 && value <= 50;
  return (
    <form
      className="flex flex-wrap items-end gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (valid) save({ percent: value }, "Store share saved");
      }}
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="store-cut">studypods&apos; share of a sale (%)</Label>
        <Input
          id="store-cut"
          type="number"
          inputMode="numeric"
          min={0}
          max={50}
          value={percent}
          onChange={(e) => setPercent(e.target.value)}
          className="w-28"
        />
      </div>
      <Button type="submit" disabled={pending || !valid || value === initial}>
        Save share
      </Button>
      <p className="w-full text-small text-ink-muted">
        Taken from each sale of a seller&apos;s listing, 0 to 50%. A change
        counts from the next sale; past sales keep theirs. Payments are a demo
        for now.
      </p>
    </form>
  );
}
