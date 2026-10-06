import { ChevronRight, Folder, FolderHeart } from "lucide-react";
import Link from "next/link";

type PodCardProps = {
  id: string;
  name: string;
  kind: "SUBJECT" | "CUSTOM";
  topics: number;
  topicsDone: number;
  items: number;
};

/** A pod at a glance: how much is done and how much material it holds. */
export function PodCard({
  id,
  name,
  kind,
  topics,
  topicsDone,
  items,
}: PodCardProps) {
  const percent = topics ? Math.round((topicsDone / topics) * 100) : 0;
  const Icon = kind === "SUBJECT" ? Folder : FolderHeart;
  return (
    <Link
      href={`/pods/${id}`}
      className="group flex w-full flex-col rounded-card border border-border bg-surface shadow-sm transition-[transform,box-shadow] duration-[120ms] hover:-translate-y-px hover:shadow-md"
    >
      <span className="flex items-center gap-3 rounded-t-card bg-surface-muted px-4 py-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-control bg-surface text-accent">
          <Icon className="size-5" aria-hidden />
        </span>
        <span className="text-small text-ink-muted">
          {items} item{items === 1 ? "" : "s"}
        </span>
        <ChevronRight className="ml-auto size-4 text-ink-muted" aria-hidden />
      </span>
      <span className="flex flex-1 flex-col gap-3 px-4 pt-3 pb-4">
        <span className="font-heading text-h3 font-medium break-words">
          {name}
        </span>
        {topics > 0 ? (
          <span className="mt-auto flex flex-col gap-1.5">
            <span className="text-small text-ink-muted">
              {topicsDone} of {topics} topics done
            </span>
            <span
              className="h-1.5 overflow-hidden rounded-full bg-surface-muted"
              role="progressbar"
              aria-label={`${name} progress`}
              aria-valuenow={percent}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <span
                className="block h-full rounded-full bg-accent"
                style={{ width: `${percent}%` }}
              />
            </span>
          </span>
        ) : (
          <span className="mt-auto text-small text-ink-muted">
            Your own pod
          </span>
        )}
      </span>
    </Link>
  );
}
