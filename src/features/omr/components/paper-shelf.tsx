"use client";

import { useState } from "react";

import { Chip } from "@/components/ui/chip";

import {
  PaperCard,
  standingOf,
  type PaperCardSheet,
  type PaperStanding,
} from "./paper-card";

const FILTERS: { key: "all" | PaperStanding; label: string }[] = [
  { key: "all", label: "All" },
  { key: "new", label: "Not attempted" },
  { key: "going", label: "In progress" },
  { key: "done", label: "Attempted" },
];

/**
 * Every paper the person can sit, theirs and their bundles', in one grid, with filters
 * by where each stands and how many are in each.
 */
export function PaperShelf({
  sheets,
  now,
  timeZone,
}: {
  sheets: PaperCardSheet[];
  now: Date;
  timeZone: string;
}) {
  const [filter, setFilter] = useState<"all" | PaperStanding>("all");
  const standing = new Map(sheets.map((s) => [s.id, standingOf(s)]));
  const count = (key: "all" | PaperStanding) =>
    key === "all"
      ? sheets.length
      : sheets.filter((s) => standing.get(s.id) === key).length;
  const shown =
    filter === "all"
      ? sheets
      : sheets.filter((s) => standing.get(s.id) === filter);

  return (
    <section aria-labelledby="papers" className="flex flex-col gap-4">
      <h2 id="papers" className="font-heading text-h2 font-semibold">
        Papers
      </h2>
      <div
        role="group"
        aria-label="Show"
        className="flex [scrollbar-width:none] gap-2 overflow-x-auto"
      >
        {FILTERS.filter(
          (f) => f.key === "all" || count(f.key) > 0 || f.key === filter,
        ).map((f) => (
          <Chip
            key={f.key}
            selected={filter === f.key}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
            <span className="font-mono tabular-nums opacity-70">
              {count(f.key)}
            </span>
          </Chip>
        ))}
      </div>
      <ul
        aria-label="Question papers"
        className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
      >
        {shown.map((sheet) => (
          <PaperCard
            key={sheet.id}
            sheet={sheet}
            now={now}
            timeZone={timeZone}
          />
        ))}
      </ul>
    </section>
  );
}
