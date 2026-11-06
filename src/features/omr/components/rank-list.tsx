"use client";

import { Check, Search } from "lucide-react";
import { useId, useState } from "react";

import { Input } from "@/components/ui/input";
import { formatScore, type Fraction } from "@/lib/omr/fraction";
import { cn } from "@/lib/utils/cn";

export type RankRow = {
  rank: number;
  registerNo: number;
  name: string | null;
  score: Fraction;
  passed: boolean | null;
  mine: boolean;
};

/**
 * The rank list, as boards publish it: rank, register number (and name when the exam
 * shows names), score, and a tick for clearing the cut-off. A box finds one register
 * number; the reader's own row is marked.
 */
export function RankList({ rows, max }: { rows: RankRow[]; max: Fraction }) {
  const id = useId();
  const [find, setFind] = useState("");
  const wanted = find.trim();
  const shown = wanted
    ? rows.filter((r) => String(r.registerNo).startsWith(wanted))
    : rows;

  return (
    <section aria-labelledby={`${id}-h`} className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id={`${id}-h`} className="font-heading text-h2 font-semibold">
          Rank list
        </h2>
        <label className="relative w-full sm:w-64">
          <span className="sr-only">Find a register number</span>
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-muted"
            aria-hidden
          />
          <Input
            inputMode="numeric"
            placeholder="Find a register number"
            value={find}
            onChange={(e) => setFind(e.target.value.replace(/\D/g, ""))}
            className="pl-9"
          />
        </label>
      </div>
      {shown.length === 0 ? (
        <p className="rounded-card border border-dashed border-border p-6 text-center text-small text-ink-muted">
          {wanted ? `No result for ${wanted}.` : "Nobody has handed in yet."}
        </p>
      ) : (
        <ol
          aria-label="Results"
          className="divide-y divide-border overflow-hidden rounded-card border border-border bg-surface"
        >
          {shown.map((r) => (
            <li
              key={r.registerNo}
              aria-current={r.mine ? "true" : undefined}
              className={cn(
                "flex min-h-12 items-center gap-3 px-4 py-2 text-small",
                r.mine && "bg-accent-soft",
              )}
            >
              <span className="w-10 shrink-0 font-mono font-medium tabular-nums">
                #{r.rank}
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="font-mono tabular-nums">{r.registerNo}</span>
                {r.name || r.mine ? (
                  <span className="truncate text-ink-muted">
                    {r.mine ? "You" : r.name}
                  </span>
                ) : null}
              </span>
              <span className="font-mono font-medium tabular-nums">
                {formatScore(r.score)}
                <span className="font-normal text-ink-muted">
                  /{formatScore(max)}
                </span>
              </span>
              <span className="grid w-5 place-items-center">
                {r.passed ? (
                  <Check
                    className="size-4 text-success"
                    aria-label="Cleared the cut-off"
                  />
                ) : null}
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
