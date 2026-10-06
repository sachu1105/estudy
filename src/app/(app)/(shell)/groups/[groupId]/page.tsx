import {
  ChevronRight,
  FileText,
  Image as ImageIcon,
  Link2,
  NotebookPen,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { EmptyState } from "@/components/ui/empty-state";
import {
  AddGroupLink,
  ShareFromPods,
} from "@/features/groups/components/share-controls";
import { isId } from "@/lib/ids";
import { requireUser } from "@/server/auth/session";
import { groupService, materialService } from "@/server/services/groups";

export const metadata: Metadata = { title: "Group" };

const ICONS = {
  NOTE: NotebookPen,
  LINK: Link2,
  FILE: FileText,
  IMAGE: ImageIcon,
} as const;

/** Material the members shared: copies of pod items, and links. */
export default async function GroupMaterialPage({
  params,
}: PageProps<"/groups/[groupId]">) {
  const user = await requireUser();
  const { groupId } = await params;
  if (!isId(groupId)) notFound();
  const [view, items, shareable] = await Promise.all([
    groupService.view(user, groupId),
    materialService.list(user, groupId),
    materialService.shareable(user),
  ]);
  if (!view?.role || !items) return null; // the layout shows how to join

  return (
    <div className="flex flex-col gap-4">
      {view.muted ? null : (
        <div className="flex flex-wrap gap-2">
          <ShareFromPods groupId={groupId} items={shareable} />
          <AddGroupLink groupId={groupId} />
        </div>
      )}
      {items.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Nothing shared yet"
          description="Share a note, a PDF or a good website from your pods; everyone here can use it."
        />
      ) : (
        <ul className="divide-y divide-border rounded-card border border-border bg-surface">
          {items.map((item) => {
            const Icon = ICONS[item.type];
            return (
              <li key={item.id}>
                <Link
                  href={`/groups/${groupId}/items/${item.id}`}
                  className="flex min-h-14 items-center gap-3 px-4 py-2 hover:bg-surface-muted"
                >
                  <span className="grid size-9 shrink-0 place-items-center rounded-control bg-surface-muted text-ink-muted">
                    <Icon className="size-4" aria-hidden />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-body font-medium">
                      {item.title}
                    </span>
                    <span className="truncate text-small text-ink-muted">
                      {[
                        item.sharedBy.displayName,
                        item.subjectName,
                        item.topicName,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </span>
                  <ChevronRight
                    className="size-4 shrink-0 text-ink-muted"
                    aria-hidden
                  />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
