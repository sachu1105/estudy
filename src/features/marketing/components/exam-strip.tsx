import { exams } from "@/lib/site";

// Exam names only. Real user numbers get added here once they exist; never invent stats.
export function ExamStrip() {
  return (
    <section
      aria-label="Supported exams"
      className="border-y border-border bg-surface"
    >
      <div className="mx-auto flex max-w-content flex-col items-center gap-3 px-4 py-6 md:flex-row md:px-8">
        <p className="shrink-0 text-small text-ink-muted">Built for</p>
        <ul className="flex flex-wrap justify-center gap-2 md:justify-start">
          {exams.map((exam) => (
            <li
              key={exam}
              className="rounded-chip border border-border bg-bg px-3 py-1.5 text-small font-medium text-ink-muted"
            >
              {exam}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
