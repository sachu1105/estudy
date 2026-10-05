import { ChevronRight, FileText } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";

import { stateLabels, type SyllabusState } from "../state";

type SyllabusCardProps = {
  id: string;
  title: string;
  examName: string | null;
  subjects: number;
  state: SyllabusState;
};

export function SyllabusCard({
  id,
  title,
  examName,
  subjects,
  state,
}: SyllabusCardProps) {
  const badge = stateLabels[state];
  return (
    <Link
      href={`/syllabus/${id}`}
      className="group flex min-h-16 items-center gap-3 rounded-card border border-border bg-surface p-4 transition-[transform,box-shadow] duration-[120ms] hover:-translate-y-px hover:shadow-md"
    >
      <span className="grid size-10 shrink-0 place-items-center rounded-control bg-surface-muted text-ink-muted">
        <FileText className="size-5" aria-hidden />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="truncate font-heading text-h3 font-medium">
          {title}
        </span>
        <Badge tone={badge.tone} className="self-start sm:hidden">
          {badge.label}
        </Badge>
        <span className="truncate text-small text-ink-muted">
          {[
            examName,
            subjects > 0
              ? `${subjects} subject${subjects === 1 ? "" : "s"}`
              : null,
          ]
            .filter(Boolean)
            .join(" · ") || "Your upload"}
        </span>
      </span>
      <Badge tone={badge.tone} className="hidden sm:inline-flex">
        {badge.label}
      </Badge>
      <ChevronRight className="size-4 shrink-0 text-ink-muted" aria-hidden />
    </Link>
  );
}
