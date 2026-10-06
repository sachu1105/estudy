"use client";

import { Flag, LayoutGrid } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils/cn";

/**
 * Every question at a glance: jump to any. Answered ones are filled, flagged ones carry a
 * flag; state is never shown by colour alone.
 */
export function QuestionPalette({
  ids,
  current,
  answered,
  flagged,
  onJump,
}: {
  ids: string[];
  current: number;
  answered: Set<string>;
  flagged: Set<string>;
  onJump: (index: number) => void;
}) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="All questions">
          <LayoutGrid aria-hidden />
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="overflow-y-auto">
        <SheetTitle>All questions</SheetTitle>
        <SheetDescription>
          {answered.size} of {ids.length} answered
          {flagged.size ? `, ${flagged.size} flagged to check` : ""}.
        </SheetDescription>
        <ol className="grid grid-cols-6 gap-2 sm:grid-cols-10">
          {ids.map((id, i) => {
            const done = answered.has(id);
            const flag = flagged.has(id);
            return (
              <li key={id}>
                <SheetClose asChild>
                  <button
                    type="button"
                    onClick={() => onJump(i)}
                    aria-current={i === current ? "step" : undefined}
                    aria-label={`Question ${i + 1}${done ? ", answered" : ""}${flag ? ", flagged" : ""}`}
                    className={cn(
                      "relative grid h-11 w-full place-items-center rounded-control border font-mono text-small tabular-nums",
                      done
                        ? "border-accent bg-accent-soft text-accent-ink"
                        : "border-border bg-surface text-ink-muted",
                      i === current && "ring-2 ring-accent",
                    )}
                  >
                    {i + 1}
                    {flag ? (
                      <Flag
                        className="absolute top-0.5 right-0.5 size-3 fill-current text-ink"
                        aria-hidden
                      />
                    ) : null}
                  </button>
                </SheetClose>
              </li>
            );
          })}
        </ol>
      </SheetContent>
    </Sheet>
  );
}
