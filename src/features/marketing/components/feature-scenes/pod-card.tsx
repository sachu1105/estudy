import { FileText, Link2, NotebookPen } from "lucide-react";
import type { Ref } from "react";

import { PodCover } from "@/components/blocks/pod-cover";

const counts = [
  { icon: NotebookPen, n: 3 },
  { icon: FileText, n: 2 },
  { icon: Link2, n: 1 },
];

/** The pod at the centre of the pods picture, where every beam lands. Sample content. */
export function PodCard({ ref }: { ref?: Ref<HTMLDivElement> }) {
  return (
    <div
      ref={ref}
      className="absolute top-1/2 left-1/2 w-48 -translate-x-1/2 -translate-y-1/2"
    >
      <span className="absolute -top-3.5 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-ink px-3 py-1 text-small font-medium whitespace-nowrap text-bg">
        <Link2 className="size-3.5" /> Mapped to 3 topics
      </span>
      <div className="overflow-hidden rounded-card border border-border bg-surface shadow-md">
        <PodCover
          cover={{ kind: "gradient", preset: "blurple" }}
          className="h-14"
        />
        <div className="p-3">
          <p className="truncate font-heading text-body font-medium text-ink">
            Indian Constitution
          </p>
          <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-surface-muted">
            <span className="block h-full w-2/5 rounded-full bg-accent" />
          </span>
          <p className="mt-1.5 flex justify-between text-small text-ink-muted">
            <span>12 of 30 topics</span>
            <span className="font-mono tabular-nums">40%</span>
          </p>
          <div className="mt-3 flex gap-1.5">
            {counts.map((c, i) => (
              <span
                key={i}
                className="flex items-center gap-1 rounded-chip bg-surface-muted px-2 py-1 font-mono text-small text-ink-muted"
              >
                <c.icon className="size-3.5" /> {c.n}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
