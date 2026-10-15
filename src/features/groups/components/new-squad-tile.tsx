"use client";

import { Plus } from "lucide-react";

import { CreateGroupDialog } from "./create-group-dialog";

/**
 * The last cell of the squads grid: an outlined tile that opens the same dialog as the
 * button in the header. It gives the grid something to end on instead of a gap, and
 * puts the action where someone is already looking at their squads.
 */
export function NewSquadTile({
  exams,
}: {
  exams: { id: string; name: string }[];
}) {
  return (
    <CreateGroupDialog
      exams={exams}
      trigger={
        <button
          type="button"
          className="flex min-h-44 w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-card border border-dashed border-border bg-surface-muted/40 p-4 text-ink-muted transition-colors duration-[120ms] hover:border-ink-subtle hover:bg-surface-muted hover:text-ink"
        >
          <span
            aria-hidden
            className="grid size-10 place-items-center rounded-full border border-border bg-surface"
          >
            <Plus className="size-5" />
          </span>
          <span className="font-heading text-body font-medium">
            Create a squad
          </span>
          <span className="text-small">Invite friends or your batch</span>
        </button>
      }
    />
  );
}
