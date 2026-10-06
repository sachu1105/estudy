import { ExternalLink } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Button } from "@/components/ui/button";
import { ItemTools } from "@/features/groups/components/item-tools";
import { NoteView } from "@/features/groups/components/note-view";
import { BackLink } from "@/features/pods/components/back-link";
import { isId } from "@/lib/ids";
import type { DocNode } from "@/lib/notes/doc";
import { requireUser } from "@/server/auth/session";
import { materialService } from "@/server/services/groups";

export const metadata: Metadata = { title: "Shared material" };

/** One shared item, in the app: a note to read, a link to open, or the files. */
export default async function GroupItemPage({
  params,
}: PageProps<"/groups/[groupId]/items/[itemId]">) {
  const user = await requireUser();
  const { groupId, itemId } = await params;
  const found =
    isId(groupId) && isId(itemId)
      ? await materialService.get(user, groupId, itemId)
      : null;
  if (!found) notFound();
  const { item } = found;

  return (
    <article className="flex flex-col gap-4">
      <BackLink href={`/groups/${groupId}`} label="Material" />
      <div className="flex flex-col gap-1">
        <h2 className="text-h2 break-words">{item.title}</h2>
        <p className="text-small text-ink-muted">
          Shared by {item.sharedBy.displayName}
          {item.subjectName ? ` · ${item.subjectName}` : ""}
          {item.topicName ? ` · ${item.topicName}` : ""}
        </p>
      </div>
      {item.type === "NOTE" && item.noteJson ? (
        <div className="rounded-card border border-border bg-surface p-4 md:p-6">
          <NoteView doc={item.noteJson as DocNode} />
        </div>
      ) : null}
      {item.type === "LINK" && item.url ? (
        <div className="flex flex-col gap-3 rounded-card border border-border bg-surface p-4">
          <p className="text-small break-all text-ink-muted">{item.url}</p>
          {item.linkDescription ? (
            <p className="text-body">{item.linkDescription}</p>
          ) : null}
          <Button asChild variant="primary" className="self-start">
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer nofollow"
            >
              <ExternalLink aria-hidden /> Open link
            </a>
          </Button>
        </div>
      ) : null}
      {item.type === "FILE" ? (
        <ul className="flex flex-col gap-2">
          {item.files.map((f, i) => (
            <li key={f.id}>
              <Button asChild variant="secondary">
                <a
                  href={`/api/groups/files/${f.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Open PDF{item.files.length > 1 ? ` ${i + 1}` : ""}
                </a>
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
      {item.type === "IMAGE" ? (
        <ol className="flex flex-col gap-4">
          {item.files.map((f, i) => (
            <li key={f.id}>
              {/* eslint-disable-next-line @next/next/no-img-element -- a members-only, signed file */}
              <img
                src={`/api/groups/files/${f.id}`}
                alt={`${item.title}, page ${i + 1}`}
                loading="lazy"
                className="w-full rounded-card border border-border bg-surface"
              />
            </li>
          ))}
        </ol>
      ) : null}
      <ItemTools
        groupId={groupId}
        itemId={item.id}
        canRemove={found.canRemove}
      />
    </article>
  );
}
