import type { ReactNode } from "react";

import { PodCover } from "@/components/blocks/pod-cover";
import type { CoverPreset } from "@/lib/pods/covers";
import { cn } from "@/lib/utils/cn";

// The small pieces of the squads picture on the landing page (squad-scene.tsx).

/** A squad on the rail, in its own art; the open one is squarer, with a bar beside it. */
export function SquadTile({
  initials,
  preset,
  active = false,
}: {
  initials: string;
  preset: CoverPreset;
  active?: boolean;
}) {
  return (
    <span className="relative grid place-items-center">
      {active ? (
        <span className="absolute top-1/2 -left-3 h-7 w-1 -translate-y-1/2 rounded-r-full bg-ink" />
      ) : null}
      <span
        className={cn(
          "relative isolate grid size-10 place-items-center overflow-hidden font-heading text-small font-medium text-white",
          active ? "rounded-xl" : "rounded-3xl",
        )}
      >
        <PodCover
          cover={{ kind: "gradient", preset }}
          className="absolute inset-0 -z-10"
        />
        <span className="drop-shadow-[0_1px_2px_rgba(0,0,0,0.55)]">
          {initials}
        </span>
      </span>
    </span>
  );
}

export function Message({
  name,
  time,
  children,
}: {
  name: string;
  time: string;
  children: ReactNode;
}) {
  return (
    <div className="flex gap-3">
      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-surface-muted font-heading text-small font-medium text-ink-muted">
        {name[0]}
      </span>
      <div className="flex min-w-0 flex-col items-start gap-1">
        <p className="text-small">
          <span className="font-medium text-ink">{name}</span>{" "}
          <span className="font-mono text-ink-muted">{time}</span>
        </p>
        {children}
      </div>
    </div>
  );
}

export function PollOption({
  label,
  votes,
  width,
}: {
  label: string;
  votes: number;
  width: string;
}) {
  return (
    <span className="relative flex items-center justify-between overflow-hidden rounded-chip border border-border px-2.5 py-1.5 text-small">
      <span className={cn("absolute inset-y-0 left-0 bg-accent-soft", width)} />
      <span className="relative text-ink">{label}</span>
      <span className="relative font-mono text-ink-muted tabular-nums">
        {votes}
      </span>
    </span>
  );
}
