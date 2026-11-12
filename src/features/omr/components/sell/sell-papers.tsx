"use client";

import Link from "next/link";

import { Checkbox } from "@/components/ui/checkbox";

export type SellPaper = {
  id: string;
  title: string;
  questions: number;
  keyed: number;
  official: boolean;
};

/**
 * The seller's papers to pick from. One with an unfinished key can't be picked yet; it
 * links to its key instead.
 */
export function SellPapers({
  papers,
  picked,
  onChange,
}: {
  papers: SellPaper[];
  picked: string[];
  onChange: (ids: string[]) => void;
}) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1 text-small font-medium">
        Papers · {picked.length} picked
      </legend>
      <ul className="flex max-h-80 flex-col divide-y divide-border overflow-y-auto rounded-control border border-border bg-surface">
        {papers.map((p) => {
          const ready = p.keyed >= p.questions;
          const name = p.title.replaceAll("_", " ");
          return (
            <li key={p.id}>
              <label
                className={
                  ready
                    ? "flex min-h-12 cursor-pointer items-center gap-3 px-3 py-2 hover:bg-surface-muted"
                    : "flex min-h-12 items-center gap-3 px-3 py-2"
                }
              >
                <Checkbox
                  disabled={!ready}
                  checked={picked.includes(p.id)}
                  onCheckedChange={(on) =>
                    onChange(
                      on === true
                        ? [...picked, p.id]
                        : picked.filter((x) => x !== p.id),
                    )
                  }
                  aria-label={name}
                />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-body">{name}</span>
                  <span className="text-small text-ink-muted">
                    {p.questions} questions ·{" "}
                    {ready
                      ? p.official
                        ? "official key"
                        : "your key"
                      : `key ${p.keyed} of ${p.questions}`}
                  </span>
                </span>
                {ready ? null : (
                  <Link
                    href={`/omr/${p.id}/key`}
                    className="flex min-h-11 shrink-0 items-center rounded-control px-2 text-small font-medium text-accent-ink hover:bg-surface-muted"
                  >
                    Finish key
                  </Link>
                )}
              </label>
            </li>
          );
        })}
      </ul>
    </fieldset>
  );
}
