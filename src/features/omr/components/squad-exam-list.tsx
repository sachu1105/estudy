import { ChevronRight, FileCheck2 } from "lucide-react";
import Link from "next/link";

import type { ExamStatus } from "@/lib/omr/exam";

export type SquadExam = {
  id: string;
  title: string;
  squad: string;
  channel: string;
  status: ExamStatus;
  released: boolean;
  host: boolean;
  done: boolean;
  started: boolean;
  /** Already written out in the reader's time zone. */
  opens: string;
  closes: string | null;
  results: string | null;
};

/** Where an exam stands for this reader, in a few words. */
function standing(e: SquadExam) {
  if (e.host)
    return `You shared it · ${e.status === "open" ? "open" : e.status}`;
  if (e.done)
    return e.released
      ? "Results are out"
      : `Handed in · results ${e.results ? `at ${e.results}` : "soon"}`;
  if (e.status === "upcoming") return `Opens ${e.opens}`;
  if (e.status === "closed") return "Closed";
  if (e.started) return "In progress: your clock is running";
  return e.closes ? `Open until ${e.closes}` : "Open now";
}

/**
 * Question papers shared as exams in the reader's squads, newest first: one dense row
 * each, with where it stands and the way to its page.
 */
export function SquadExamList({ exams }: { exams: SquadExam[] }) {
  return (
    <section aria-labelledby="squad-exams" className="flex flex-col gap-3">
      <h2 id="squad-exams" className="font-heading text-h2 font-semibold">
        Squad exams
      </h2>
      <ul className="divide-y divide-border overflow-hidden rounded-card border border-border bg-surface">
        {exams.map((e) => (
          <li key={e.id}>
            <Link
              href={`/exams/${e.id}`}
              className="flex min-h-14 items-center gap-3 px-4 py-2 hover:bg-surface-muted"
            >
              <FileCheck2
                className="size-5 shrink-0 text-ink-muted"
                aria-hidden
              />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-body font-medium">
                  {e.title.replaceAll("_", " ")}
                </span>
                <span className="text-small text-ink">{standing(e)}</span>
                <span className="truncate text-small text-ink-muted">
                  {e.squad} · #{e.channel}
                </span>
              </span>
              <ChevronRight
                className="size-4 shrink-0 text-ink-muted"
                aria-hidden
              />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
