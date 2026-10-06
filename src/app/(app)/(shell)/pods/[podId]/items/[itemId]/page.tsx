import { ChevronLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/shell/page-header";
import { ItemActions } from "@/features/pods/components/item-actions";
import { ItemView } from "@/features/pods/components/item-view";
import { NoteEditor } from "@/features/pods/components/note-editor";
import { TopicPicker } from "@/features/pods/components/topic-picker";
import { isId } from "@/lib/ids";
import { emptyDoc, type DocNode } from "@/lib/notes/doc";
import { requireUser } from "@/server/auth/session";
import { itemService, podService } from "@/server/services/pods";

export const metadata: Metadata = { title: "Material" };

export default async function ItemPage({
  params,
}: PageProps<"/pods/[podId]/items/[itemId]">) {
  const user = await requireUser();
  const { podId, itemId } = await params;
  const item = isId(itemId) ? await itemService.get(user, itemId) : null;
  if (!item || item.podId !== podId) notFound();
  const pod = await podService.get(user, item.podId);
  if (!pod) notFound();

  const actions = (
    <div className="flex flex-wrap items-center gap-2">
      <TopicPicker
        itemId={item.id}
        topics={pod.topics.map((t) => ({ id: t.id, name: t.name }))}
        selected={item.topics.map((t) => t.topicId)}
      />
      <ItemActions
        itemId={item.id}
        podId={pod.id}
        title={item.title}
        canRename={item.type !== "NOTE"}
      />
    </div>
  );

  return (
    <>
      <Link
        href={`/pods/${pod.id}`}
        className="mb-3 -ml-1 inline-flex min-h-11 items-center gap-1 text-small font-medium text-ink-muted hover:text-ink md:min-h-0"
      >
        <ChevronLeft className="size-4" aria-hidden /> {pod.name}
      </Link>
      {item.type === "NOTE" ? (
        <div className="flex flex-col gap-4">
          {actions}
          <NoteEditor
            itemId={item.id}
            initialTitle={item.title}
            initialDoc={(item.noteJson as DocNode | null) ?? emptyDoc()}
          />
        </div>
      ) : (
        <>
          <PageHeader title={item.title} actions={actions} />
          <ItemView item={item} />
        </>
      )}
    </>
  );
}
