import type { ReactNode } from "react";

import { Avatar } from "@/components/ui/avatar";

/**
 * One person in a friends list, as in Discord: face, name, username or a status line, and
 * the actions at the end. A divider between rows, no card per row (dense rows).
 */
export function PersonRow({
  person,
  status,
  live = false,
  actions,
}: {
  person: {
    displayName: string;
    avatarUrl: string | null;
    handle: string | null;
  };
  /** Under the name: "Studying · 25 min", a request's note. Defaults to the username. */
  status?: ReactNode;
  /** Studying right now: the face gets an accent dot. */
  live?: boolean;
  actions: ReactNode;
}) {
  return (
    <li className="flex min-h-16 items-center gap-3 border-t border-border py-2 first:border-t-0">
      <span className="relative shrink-0">
        <Avatar name={person.displayName} src={person.avatarUrl} />
        {live ? (
          <span
            aria-hidden
            className="absolute -right-0.5 -bottom-0.5 size-3.5 rounded-full border-2 border-bg bg-accent"
          />
        ) : null}
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-body font-medium">
          {person.displayName}
        </span>
        <span className="truncate text-small text-ink-muted">
          {status ?? (person.handle ? `@${person.handle}` : null)}
        </span>
      </span>
      <span className="flex shrink-0 items-center gap-1">{actions}</span>
    </li>
  );
}
