import { FolderOpen } from "lucide-react";

import { EmptyState } from "@/components/ui/empty-state";

import { AddBar } from "./add-bar";
import { ItemList } from "./item-list";

type Items = Parameters<typeof ItemList>[0]["items"];

/** Everything in a pod (or a topic), with the add bar on top. */
export function MaterialPanel({
  podId,
  items,
  topicIds,
  splitUnlinked = false,
}: {
  podId: string;
  items: Items;
  /** Inside a topic: what's added is linked to it. */
  topicIds?: string[];
  /** In a subject pod: list items not yet linked to any topic on their own. */
  splitUnlinked?: boolean;
}) {
  const unlinked = splitUnlinked
    ? items.filter((i) => i.topics.length === 0)
    : [];
  const linked = splitUnlinked
    ? items.filter((i) => i.topics.length > 0)
    : items;
  return (
    <div className="flex flex-col gap-4">
      <AddBar podId={podId} topicIds={topicIds} />
      {items.length === 0 ? (
        <EmptyState
          icon={FolderOpen}
          title="Nothing here yet"
          description="Add a note, a link or a photo of your notebook."
        />
      ) : (
        <>
          {linked.length > 0 ? (
            <ItemList items={linked} showTopics={!topicIds} />
          ) : null}
          {unlinked.length > 0 ? (
            <section aria-labelledby="unlinked" className="flex flex-col gap-2">
              <h3 id="unlinked" className="text-h3">
                Not linked to a topic
              </h3>
              <ItemList items={unlinked} showTopics={false} />
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}
