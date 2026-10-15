"use client";

import { ImageIcon } from "lucide-react";
import { useState } from "react";

import {
  CoverPicker,
  type CoverChoice,
  type CoverSelection,
} from "@/components/blocks/cover-picker";
import { PodCover } from "@/components/blocks/pod-cover";
import { Button } from "@/components/ui/button";
import type { PodCover as Cover } from "@/lib/pods/covers";

import { setSquadCoverAction } from "../actions";
import { uploadSquadCover } from "../upload";

/**
 * The squad's banner, with the art itself as the control. It shows wherever the squad
 * does — its card, the rail in chat, the top of the squad — so the preview here is the
 * real thing at a smaller size.
 */
export function SquadCoverButton({
  groupId,
  selection,
  cover,
}: {
  groupId: string;
  selection: CoverSelection;
  cover: Cover;
}) {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState(cover);

  return (
    <div className="flex flex-col gap-3">
      <div className="relative overflow-hidden rounded-card border border-border">
        <PodCover cover={current} className="h-24 sm:h-28" />
        <div className="absolute top-3 right-3">
          <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
            <ImageIcon aria-hidden /> Change banner
          </Button>
        </div>
      </div>
      <CoverPicker
        open={open}
        onOpenChange={setOpen}
        title="Squad banner"
        description="The art on this squad's card and beside it in chat. Everyone in the squad sees it."
        autoId={groupId}
        selection={selection}
        cover={current}
        onSave={async (choice: CoverChoice) => {
          const result = await setSquadCoverAction({ groupId, choice });
          if (result.ok) setCurrent(result.cover);
          return result;
        }}
        onUpload={(file) => uploadSquadCover(groupId, file)}
      />
    </div>
  );
}
