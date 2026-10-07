import {
  ChevronRight,
  FileText,
  Image as ImageIcon,
  Link2,
  NotebookPen,
} from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/ui/empty-state";
import { materialService } from "@/server/services/groups";

import { ChannelHeader } from "../components/channels/channel-header";
import { AddGroupLink, ShareFromPods } from "../components/share-controls";
import type { ChannelViewProps } from "./types";

const ICONS = {
  NOTE: NotebookPen,
  LINK: Link2,
  FILE: FileText,
  IMAGE: ImageIcon,
} as const;

/** A material or links channel: copies of pod items, and websites. */
export async function MaterialChannel({
  user,
  groupId,
  channel,
  canPost,
  manage,
}: ChannelViewProps) {
  const links = channel.type === "LINKS";
  const [items, shareable] = await Promise.all([
    materialService.list(user, groupId, channel.id),
    links ? Promise.resolve([]) : materialService.shareable(user),
  ]);

  return (
    <>
      <ChannelHeader
        manage={manage}
        groupId={groupId}
        channel={channel}
        actions={
          canPost ? (
            <>
              {links ? null : (
                <ShareFromPods
                  groupId={groupId}
                  channelId={channel.id}
                  items={shareable}
                />
              )}
              <AddGroupLink
                groupId={groupId}
                channelId={channel.id}
                primary={links}
              />
            </>
          ) : null
        }
      />
      {!items || items.length === 0 ? (
        <EmptyState
          icon={links ? Link2 : FileText}
          title={links ? "No links yet" : "Nothing shared yet"}
          description={
            links
              ? "Add a website worth studying from; everyone here can open it."
              : "Share a note, a PDF or a good website from your pods; everyone here can use it."
          }
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
    </>
  );
}
