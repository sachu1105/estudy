"use client";

import { MoreHorizontal, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "@/components/ui/toast";

import {
  deleteCategoryAction,
  moveCategoryAction,
} from "../../channel-actions";
import { CategoryDialog } from "./category-dialog";
import { ChannelDialog } from "./channel-dialog";

const iconButton =
  "grid size-11 shrink-0 cursor-pointer place-items-center rounded-chip text-ink-muted hover:bg-surface-muted hover:text-ink focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none md:size-7";

/** An admin's tools on a category heading: add a channel in it, rename, move, delete. */
export function CategoryTools({
  groupId,
  category,
  categories,
  first,
  last,
}: {
  groupId: string;
  category: { id: string; name: string };
  categories: { id: string; name: string }[];
  first: boolean;
  last: boolean;
}) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [pending, start] = useTransition();
  const run = (
    action: () => Promise<{ ok: true } | { ok: false; error: string }>,
    done?: string,
  ) =>
    start(async () => {
      const result = await action();
      if (!result.ok) return void toast.error(result.error);
      if (done) toast.success(done);
      router.refresh();
    });
  const move = (direction: "up" | "down") =>
    run(() =>
      moveCategoryAction({ groupId, categoryId: category.id, direction }),
    );

  return (
    <>
      <button
        type="button"
        aria-label={`Add a channel to ${category.name}`}
        className={iconButton}
        onClick={() => setAdding(true)}
      >
        <Plus className="size-4" aria-hidden />
      </button>
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label={`Manage ${category.name}`}
          disabled={pending}
          className={iconButton}
        >
          <MoreHorizontal className="size-4" aria-hidden />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setRenaming(true)}>
            Rename category
          </DropdownMenuItem>
          {first ? null : (
            <DropdownMenuItem onSelect={() => move("up")}>
              Move up
            </DropdownMenuItem>
          )}
          {last ? null : (
            <DropdownMenuItem onSelect={() => move("down")}>
              Move down
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={() =>
              run(
                () =>
                  deleteCategoryAction({ groupId, categoryId: category.id }),
                "Category deleted. Its channels stay.",
              )
            }
          >
            Delete category
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {adding ? (
        <ChannelDialog
          groupId={groupId}
          categories={categories}
          categoryId={category.id}
          open={adding}
          onOpenChange={setAdding}
        />
      ) : null}
      {renaming ? (
        <CategoryDialog
          groupId={groupId}
          category={category}
          open={renaming}
          onOpenChange={setRenaming}
        />
      ) : null}
    </>
  );
}
