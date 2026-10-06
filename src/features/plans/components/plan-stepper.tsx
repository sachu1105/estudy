"use client";

import { Check } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { PLAN_STEPS, stepLabels } from "@/lib/plans/draft";
import { cn } from "@/lib/utils/cn";

/** The setup's steps. Any step can be revisited; nothing entered is lost. */
export function PlanStepper({ draftId }: { draftId: string }) {
  const pathname = usePathname();
  const current = Math.max(
    0,
    PLAN_STEPS.findIndex((s) => pathname.endsWith(`/${s}`)),
  );
  return (
    <nav aria-label="Plan setup steps" className="mb-6">
      <ol className="grid grid-cols-4 gap-2">
        {PLAN_STEPS.map((step, i) => {
          const state = i < current ? "done" : i === current ? "now" : "next";
          return (
            <li key={step}>
              <Link
                href={`/plan/new/${draftId}/${step}`}
                aria-current={state === "now" ? "step" : undefined}
                className="group flex min-h-11 flex-col gap-1.5 rounded-control pt-1"
              >
                <span
                  className={cn(
                    "h-1 rounded-full transition-colors duration-[200ms]",
                    state === "next" ? "bg-border" : "bg-accent",
                  )}
                />
                <span
                  className={cn(
                    "flex items-center gap-1 text-small",
                    state === "now"
                      ? "font-medium text-ink"
                      : "text-ink-muted group-hover:text-ink",
                  )}
                >
                  {state === "done" ? (
                    <Check className="size-3.5 shrink-0" aria-hidden />
                  ) : null}
                  <span className="truncate">{stepLabels[step]}</span>
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
