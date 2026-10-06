import { ChevronRight, GraduationCap } from "lucide-react";
import Link from "next/link";

type ExamCardProps = {
  id: string;
  title: string;
  examName: string | null;
  subjects: number;
  topics: number;
  topicsDone: number;
  items: number;
};

/** An exam pod at a glance: its subjects and how far through the syllabus the user is. */
export function ExamCard({
  id,
  title,
  examName,
  subjects,
  topics,
  topicsDone,
  items,
}: ExamCardProps) {
  const percent = topics ? Math.round((topicsDone / topics) * 100) : 0;
  return (
    <Link
      href={`/pods/exam/${id}`}
      className="group flex w-full flex-col gap-4 rounded-card border border-border bg-surface p-4 shadow-sm transition-[transform,box-shadow] duration-[120ms] hover:-translate-y-px hover:shadow-md md:p-5"
    >
      <span className="flex items-start gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-control bg-accent-soft text-accent-ink">
          <GraduationCap className="size-5" aria-hidden />
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="font-heading text-h3 font-medium break-words">
            {title}
          </span>
          <span className="text-small text-ink-muted">
            {[
              examName && examName !== title ? examName : null,
              `${subjects} subject${subjects === 1 ? "" : "s"}`,
              `${items} item${items === 1 ? "" : "s"} of material`,
            ]
              .filter(Boolean)
              .join(" · ")}
          </span>
        </span>
        <ChevronRight
          className="mt-1 size-4 shrink-0 text-ink-muted"
          aria-hidden
        />
      </span>
      <span className="flex flex-col gap-1.5">
        <span className="text-small text-ink-muted">
          {topicsDone} of {topics} topics done
        </span>
        <span
          className="h-1.5 overflow-hidden rounded-full bg-surface-muted"
          role="progressbar"
          aria-label={`${title} progress`}
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
    </Link>
  );
}
