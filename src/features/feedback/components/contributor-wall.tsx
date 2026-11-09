import { BadgeCheck, Bug, Lightbulb, Rocket } from "lucide-react";

import { Avatar } from "@/components/ui/avatar";

type Person = {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  ideas: number;
  fixes: number;
};

const STEPS = [
  {
    icon: Lightbulb,
    title: "Suggest an idea",
    body: "People back it, and the team plans it.",
  },
  {
    icon: Bug,
    title: "Report a problem",
    body: "Bugs, confusing screens, wrong answers.",
  },
  {
    icon: Rocket,
    title: "It ships or gets fixed",
    body: "Your name goes up here, for good.",
  },
];

const plural = (n: number, one: string, many: string) =>
  `${n} ${n === 1 ? one : many}`;

/** The people whose ideas shipped or whose reports got fixed, and how to join them. */
export function ContributorWall({
  people,
  me,
}: {
  people: Person[];
  me: string;
}) {
  return (
    <div className="flex flex-col gap-6">
      <ol className="grid gap-3 sm:grid-cols-3">
        {STEPS.map((step, i) => (
          <li
            key={step.title}
            className="flex items-start gap-3 rounded-card border border-border bg-surface p-4"
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-control bg-surface-muted text-ink-muted">
              <step.icon className="size-4" aria-hidden />
            </span>
            <span className="flex flex-col gap-0.5">
              <span className="text-small font-medium text-ink">
                <span className="font-mono text-ink-subtle">{i + 1}.</span>{" "}
                {step.title}
              </span>
              <span className="text-small text-ink-muted">{step.body}</span>
            </span>
          </li>
        ))}
      </ol>

      <section aria-labelledby="wall" className="flex flex-col gap-3">
        <h2 id="wall" className="text-h3">
          People who made studypods better
        </h2>
        {people.length === 0 ? (
          <p className="rounded-card border border-dashed border-border px-4 py-8 text-center text-body text-ink-muted">
            No one on the wall yet. The first idea that ships or the first fix
            you report puts your name here.
          </p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {people.map((p) => (
              <li
                key={p.id}
                className="flex items-center gap-3 rounded-card border border-border bg-surface p-3"
              >
                <Avatar name={p.displayName} src={p.avatarUrl} />
                <span className="flex min-w-0 flex-col">
                  <span className="flex items-center gap-1.5 truncate text-body font-medium text-ink">
                    {p.displayName}
                    {p.id === me ? (
                      <span className="text-small font-normal text-ink-muted">
                        (you)
                      </span>
                    ) : null}
                    <BadgeCheck
                      className="size-4 shrink-0 text-accent"
                      aria-label="Contributor"
                    />
                  </span>
                  <span className="text-small text-ink-muted">
                    {[
                      p.ideas
                        ? plural(p.ideas, "idea shipped", "ideas shipped")
                        : null,
                      p.fixes ? plural(p.fixes, "fix", "fixes") : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
