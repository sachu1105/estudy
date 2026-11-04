import { Avatar } from "@/components/ui/avatar";

export type StudyingFriend = {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  studyingMinutes: number | null;
};

export const studyingLine = (minutes: number) => `Studying · ${minutes} min`;

/**
 * Discord's "Active now", for studying: friends with a focus timer running this moment.
 * Presence only; nothing is kept once the timer stops.
 */
export function StudyingNow({ friends }: { friends: StudyingFriend[] }) {
  const live = friends.filter((f) => f.studyingMinutes !== null);
  return (
    <section aria-labelledby="now" className="flex flex-col gap-3">
      <h2 id="now" className="text-h3">
        Studying now
      </h2>
      {live.length === 0 ? (
        <div className="flex flex-col gap-1 rounded-card bg-surface-muted p-4 text-center">
          <p className="font-medium">It&apos;s quiet for now</p>
          <p className="text-small text-ink-muted">
            When a friend starts a study session, it shows here.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {live.map((f) => (
            <li
              key={f.id}
              className="flex items-center gap-3 rounded-card border border-border bg-surface p-3"
            >
              <Avatar name={f.displayName} src={f.avatarUrl} />
              <span className="flex min-w-0 flex-col">
                <span className="truncate font-medium">{f.displayName}</span>
                <span className="text-small text-ink-muted">
                  {studyingLine(f.studyingMinutes!)}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
