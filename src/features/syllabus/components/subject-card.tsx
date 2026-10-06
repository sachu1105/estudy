import { ChevronRight, Folder } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

const PREVIEW = 4;

type SubjectCardProps = {
  href: string;
  name: string;
  topics: { id: string; name: string }[];
  /** A menu button, shown top right when the subject can be edited. */
  menu?: ReactNode;
  /** The link's call to action, e.g. "Open pod". */
  cta?: string;
  className?: string;
};

/** One subject as a folder: its name, how much is in it and a peek at the topics. */
export function SubjectCard({
  href,
  name,
  topics,
  menu,
  cta = "Open folder",
  className,
}: SubjectCardProps) {
  const rest = topics.length - PREVIEW;
  return (
    <article
      className={cn(
        "group relative flex flex-col rounded-card border border-border bg-surface shadow-sm",
        "transition-[transform,box-shadow] duration-[120ms] hover:-translate-y-px hover:shadow-md",
        className,
      )}
    >
      <div className="flex items-center gap-3 rounded-t-card bg-surface-muted px-4 py-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-control bg-surface text-accent">
          <Folder className="size-5" aria-hidden />
        </span>
        <span className="text-small text-ink-muted">
          {topics.length} topic{topics.length === 1 ? "" : "s"}
        </span>
        {menu ? <span className="ml-auto">{menu}</span> : null}
      </div>
      <Link
        href={href}
        className="flex flex-1 flex-col gap-3 rounded-b-card px-4 pt-3 pb-4 focus-visible:outline-2 focus-visible:outline-accent"
      >
        <h3 className="text-h3 break-words">{name}</h3>
        <ul className="flex flex-col gap-1.5">
          {topics.slice(0, PREVIEW).map((topic) => (
            <li key={topic.id} className="flex gap-2 text-small text-ink-muted">
              <span
                aria-hidden
                className="mt-2 size-1 shrink-0 rounded-full bg-ink-muted"
              />
              <span className="line-clamp-2 break-words">{topic.name}</span>
            </li>
          ))}
        </ul>
        <span className="mt-auto flex items-center gap-1 text-small font-medium text-accent-ink">
          {rest > 0 ? `${rest} more · ` : ""}
          {cta}
          <ChevronRight className="size-4" aria-hidden />
        </span>
      </Link>
    </article>
  );
}
