"use client";

import { FileUp, Search } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { PodTile } from "@/components/blocks/pod-tile";
import { Chip } from "@/components/ui/chip";
import { Input } from "@/components/ui/input";
import { coverFor } from "@/lib/pods/covers";

export type CatalogueExam = {
  id: string;
  name: string;
  board: string;
  description: string | null;
  syllabuses: {
    id: string;
    title: string;
    subjects: number;
    topics: number;
    /** The user already has this exam pod. */
    added: boolean;
  }[];
};

/** Search and board chips earn their space only once the catalogue is this big. */
const FILTER_FROM = 6;

const matches = (exam: CatalogueExam, query: string) =>
  [
    exam.name,
    exam.board,
    exam.description ?? "",
    ...exam.syllabuses.map((s) => s.title),
  ]
    .join(" ")
    .toLowerCase()
    .includes(query);

/**
 * Ready-made syllabuses, each shown as the exam pod it becomes (same folder card and
 * cover as on Pods), then the exams still waiting for one as a compact list that invites
 * an upload. One tap opens a syllabus; an added one opens its exam pod instead.
 */
export function CatalogueList({ exams }: { exams: CatalogueExam[] }) {
  const [query, setQuery] = useState("");
  const [board, setBoard] = useState<string | null>(null);
  const boards = [...new Set(exams.map((e) => e.board))];
  const filtering = exams.length >= FILTER_FROM;
  const q = query.trim().toLowerCase();
  const shown = exams.filter(
    (e) => (!board || e.board === board) && (!q || matches(e, q)),
  );
  const ready = shown.flatMap((e) => e.syllabuses.map((s) => ({ exam: e, s })));
  const waiting = shown.filter((e) => e.syllabuses.length === 0);

  return (
    <div className="flex flex-col gap-8">
      {filtering ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative sm:w-72">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-subtle"
              aria-hidden
            />
            <Input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search exams"
              aria-label="Search exams"
              className="pl-9"
            />
          </div>
          {boards.length > 1 ? (
            <div
              role="group"
              aria-label="Exam board"
              className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0 sm:pb-0"
            >
              {[null, ...boards].map((b) => (
                <Chip
                  key={b ?? "all"}
                  selected={board === b}
                  onClick={() => setBoard(b)}
                  className="shrink-0"
                >
                  {b ?? "All"}
                </Chip>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      <section aria-labelledby="ready" className="flex flex-col gap-4">
        <div className="flex items-baseline gap-2">
          <h2 id="ready" className="text-h2">
            Ready to use
          </h2>
          <span className="font-mono text-small text-ink-muted tabular-nums">
            {ready.length}
          </span>
        </div>
        {ready.length > 0 ? (
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {ready.map(({ exam, s }) => (
              <li key={s.id} className="flex">
                <PodTile
                  href={
                    s.added
                      ? `/pods/exam/${s.id}`
                      : `/syllabus/catalogue/${s.id}`
                  }
                  title={s.title}
                  subtitle={[
                    exam.name !== s.title ? exam.name : null,
                    exam.board,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                  tag={s.added ? "Added" : exam.board}
                  cover={coverFor(s.id)}
                  stat={{ value: s.subjects, unit: "subjects" }}
                  aside={`${s.topics} topics`}
                />
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-card border border-dashed border-border px-4 py-6 text-center text-body text-ink-muted">
            {q || board
              ? "No ready syllabus matches. Try another name, or upload yours."
              : "No ready-made syllabuses yet. Upload yours and it's set up in a minute."}
          </p>
        )}
      </section>

      {waiting.length > 0 ? (
        <section aria-labelledby="waiting" className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h2 id="waiting" className="text-h2">
              Not in the catalogue yet
            </h2>
            <p className="text-small text-ink-muted">
              Upload the official syllabus. It stays private to you, and you
              check it before a plan is built.
            </p>
          </div>
          <ul className="divide-y divide-border rounded-card border border-border bg-surface">
            {waiting.map((exam) => (
              <li key={exam.id}>
                <Link
                  href={`/pods?add=upload&exam=${exam.id}`}
                  className="group flex min-h-16 items-center gap-3 px-4 py-3 transition-colors duration-[120ms] first:rounded-t-card last:rounded-b-card hover:bg-surface-muted"
                >
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate font-heading text-body font-medium text-ink">
                      {exam.name}
                    </span>
                    <span className="truncate text-small text-ink-muted">
                      {[exam.board, exam.description]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-1.5 text-small font-medium text-accent-ink">
                    <FileUp className="size-4" aria-hidden />
                    <span className="hidden sm:inline">Upload syllabus</span>
                    <span className="sm:hidden">Upload</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
