"use client";

import { useState } from "react";

import {
  CoverPicker,
  type CoverChoice,
  type CoverSelection,
} from "@/components/blocks/cover-picker";
import { Button } from "@/components/ui/button";
import type { PodCover as Cover } from "@/lib/pods/covers";

import { setProfileCoverAction } from "../actions";
import { uploadProfileImage } from "../upload";

export type { CoverSelection };

/** The art behind the profile photo. Saves on every pick, like a pod's cover. */
export function CoverButton({
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
    <>
      <Button
        variant="secondary"
        size="sm"
        onClick={() => setOpen(true)}
        className="backdrop-blur-sm"
      >
        Change cover
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
    </>
  );
}
