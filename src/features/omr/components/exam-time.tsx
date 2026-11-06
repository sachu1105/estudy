"use client";

import { useState } from "react";

import { short } from "./limit-picker";

/** "4:35 pm", in the reader's own time. */
const clockTime = (date: Date) =>
  date.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });

/**
 * A squad exam's time, set by whoever shared it: shown large, with when it ends. Someone
 * starting late gets until the exam closes, so the earlier of the two is the end.
 */
export function ExamTime({
  limitMin,
  closesAt,
}: {
  limitMin: number | null;
  closesAt: string | null;
}) {
  // The moment the card opened: a start now would end from here.
  const [opened] = useState(() => Date.now());
  const close = closesAt ? new Date(closesAt) : null;
  const byLimit = limitMin ? new Date(opened + limitMin * 60_000) : null;
  const end =
    byLimit && close ? (byLimit < close ? byLimit : close) : (byLimit ?? close);
  const cut = !!(byLimit && close && close < byLimit);
  return (
    <div aria-live="polite" className="flex flex-col items-center py-1">
      <span className="font-heading text-display font-semibold tabular-nums">
        {limitMin ? short(limitMin) : "No limit"}
      </span>
      <span className="text-small text-ink-muted" suppressHydrationWarning>
        {end
          ? cut
            ? `The exam closes at ${clockTime(end)}, so you get until then`
            : `Ends at ${clockTime(end)}`
          : "The clock counts up"}
      </span>
    </div>
  );
}
