"use client";

import { Paperclip } from "lucide-react";

import { ItemPicker } from "@/components/blocks/item-picker";
import { PodItemIcon } from "@/components/blocks/pod-item-icon";
import { Button } from "@/components/ui/button";

export type Attachable = {
  id: string;
  title: string;
  type: string;
  pod: { name: string };
};

/**
 * Pick something from your pods to send with a message; the squad gets a copy. Opens
 * upward from the paperclip on md+, as a sheet on phones.
 */
export function AttachSheet({
  items,
  onPick,
}: {
  items: Attachable[];
  onPick: (item: Attachable) => void;
}) {
  return (
    <ItemPicker
      side="top"
      align="start"
      trigger={
        <Button variant="ghost" size="icon" aria-label="Attach from my pods">
          <Paperclip aria-hidden />
        </Button>
      }
      title="Attach from your pods"
      description="The squad gets a copy. Your pod stays yours."
      empty="Nothing in your pods yet. Add notes, links or files there first."
      items={items.map((item) => ({
        id: item.id,
        title: item.title,
        subtitle: item.pod.name,
        icon: <PodItemIcon type={item.type} />,
      }))}
      onPick={(id) => {
        const item = items.find((i) => i.id === id);
        if (item) onPick(item);
      }}
    />
  );
}
