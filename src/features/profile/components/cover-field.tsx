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

import { setProfileCoverAction } from "../actions";
import { uploadProfileImage } from "../upload";

export type { CoverSelection };

/**
 * The cover in Edit profile: the art behind the photo as a strip, with a button on it
 * that opens the picker. Saves on every pick, like a pod's cover.
 */
export function CoverField({
  userId,
  selection,
  cover,
}: {
  userId: string;
  selection: CoverSelection;
  cover: Cover;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative h-24 overflow-hidden rounded-control border border-border">
      <PodCover cover={cover} className="absolute inset-0" />
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={() => setOpen(true)}
        className="absolute right-2 bottom-2"
      >
        <ImageIcon aria-hidden /> Change cover
      </Button>
      <CoverPicker
        open={open}
        onOpenChange={setOpen}
        title="Cover"
        description="The art behind your photo. Everyone who sees your profile sees it."
        autoId={userId}
        selection={selection}
        cover={cover}
        onSave={(choice: CoverChoice) => setProfileCoverAction({ choice })}
        onUpload={(file) => uploadProfileImage("cover", file)}
      />
    </div>
  );
}
