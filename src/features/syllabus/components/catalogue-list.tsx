import { BookOpen, ChevronRight } from "lucide-react";
import Link from "next/link";

type CatalogueListProps = {
  exams: {
    id: string;
    name: string;
    board: string;
    description: string | null;
    syllabuses: { id: string; title: string; _count: { subjects: number } }[];
  }[];
};

/** Exams with their approved catalogue syllabuses; an exam without one invites an upload. */
export function CatalogueList({ exams }: CatalogueListProps) {
  return (
    <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {exams.map((exam) => (
        <li
          key={exam.id}
          className="flex flex-col gap-3 rounded-card border border-border bg-surface p-4"
        >
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-control bg-surface-muted text-ink-muted">
              <BookOpen className="size-5" aria-hidden />
            </span>
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="text-small text-ink-muted">{exam.board}</span>
              <h2 className="text-h3">{exam.name}</h2>
              {exam.description ? (
                <p className="text-small text-ink-muted">{exam.description}</p>
              ) : null}
            </div>
          </div>
          {exam.syllabuses.length > 0 ? (
            <ul className="flex flex-col gap-2">
              {exam.syllabuses.map((s) => (
                <li key={s.id}>
                  <Link
                    href={`/syllabus/catalogue/${s.id}`}
                    className="flex min-h-11 items-center gap-2 rounded-control border border-border px-3 py-2 hover:bg-surface-muted"
                  >
                    <span className="min-w-0 flex-1 truncate text-body">
                      {s.title}
                    </span>
                    <span className="text-small text-ink-muted">
                      {s._count.subjects} subjects
                    </span>
                    <ChevronRight
                      className="size-4 text-ink-muted"
                      aria-hidden
                    />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-small text-ink-muted">
              No syllabus here yet.{" "}
              <Link
                href={`/syllabus/new?exam=${exam.id}`}
                className="font-medium text-accent-ink underline-offset-2 hover:underline"
              >
                Upload yours
              </Link>{" "}
              and build a plan from it.
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}
