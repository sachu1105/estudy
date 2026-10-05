import { Badge } from "@/components/ui/badge";

type TreeViewProps = {
  subjects: {
    id: string;
    name: string;
    topics: {
      id: string;
      name: string;
      weight: number;
      difficulty: number;
      foundational: boolean;
    }[];
  }[];
};

/** Read-only subject -> topic list for confirmed and catalogue syllabuses. */
export function SyllabusTreeView({ subjects }: TreeViewProps) {
  return (
    <div className="flex flex-col gap-4">
      {subjects.map((subject) => (
        <section
          key={subject.id}
          aria-label={subject.name}
          className="rounded-card border border-border bg-surface"
        >
          <h2 className="flex items-baseline justify-between gap-3 border-b border-border px-4 py-3 text-h3">
            <span className="min-w-0 break-words">{subject.name}</span>
            <span className="shrink-0 text-small font-normal text-ink-muted">
              {subject.topics.length} topic
              {subject.topics.length === 1 ? "" : "s"}
            </span>
          </h2>
          <ul className="divide-y divide-border">
            {subject.topics.map((topic) => (
              <li
                key={topic.id}
                className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-4 py-3"
              >
                <span className="min-w-0 flex-1 basis-48 text-body break-words">
                  {topic.name}
                </span>
                <span className="flex flex-wrap gap-1.5">
                  <Badge tone="outline">Weight {topic.weight}</Badge>
                  <Badge tone="outline">Difficulty {topic.difficulty}</Badge>
                  {topic.foundational ? (
                    <Badge tone="accent">Foundation</Badge>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
