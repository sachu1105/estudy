"use client";

import { Pencil, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";

import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FieldHint, Input, Label, fieldClasses } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";
import { BIO_MAX } from "@/lib/profile/profile";
import { cn } from "@/lib/utils/cn";

import { saveProfileAction, setAvatarAction } from "../actions";
import { uploadProfileImage } from "../upload";
import { ImageButton } from "./image-button";

/**
 * Name, photo and bio. The photo saves the moment it is chosen (there is nothing to
 * confirm about a picture); the name and bio save with the button.
 */
export function ProfileEditor({
  open,
  onOpenChange,
  initial,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial: {
    displayName: string;
    bio: string | null;
    avatarUrl: string | null;
    hasAvatar: boolean;
  };
}) {
  const [displayName, setDisplayName] = useState(initial.displayName);
  const [bio, setBio] = useState(initial.bio ?? "");
  const [avatar, setAvatar] = useState(initial.avatarUrl);
  const [hasAvatar, setHasAvatar] = useState(initial.hasAvatar);
  const [uploading, setUploading] = useState(false);
  const [pending, start] = useTransition();

  const pickPhoto = (file: File) => {
    const local = URL.createObjectURL(file);
    const before = { avatar, hasAvatar };
    setAvatar(local);
    setHasAvatar(true);
    setUploading(true);
    start(async () => {
      try {
        const key = await uploadProfileImage("avatar", file);
        const result = await setAvatarAction({ key });
        if (!result.ok) throw new Error(result.error);
        setAvatar(result.avatarUrl);
        toast.success("Photo updated");
      } catch (error) {
        setAvatar(before.avatar);
        setHasAvatar(before.hasAvatar);
        toast.error(
          error instanceof Error
            ? error.message
            : "That photo didn't upload. Try again.",
        );
      } finally {
        setUploading(false);
        URL.revokeObjectURL(local);
      }
    });
  };

  const removePhoto = () =>
    start(async () => {
      const before = { avatar, hasAvatar };
      setAvatar(null);
      setHasAvatar(false);
      const result = await setAvatarAction({ key: null });
      if (!result.ok) {
        setAvatar(before.avatar);
        setHasAvatar(before.hasAvatar);
        toast.error(result.error);
      }
    });

  const save = () =>
    start(async () => {
      const result = await saveProfileAction({
        displayName,
        bio: bio.trim() || null,
      });
      if (!result.ok) return void toast.error(result.error);
      toast.success("Profile saved");
      onOpenChange(false);
    });

  const over = bio.length > BIO_MAX;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit profile</DialogTitle>
          <DialogDescription>
            This is what squad mates and anyone with your link see.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-5">
          <div className="flex items-center gap-4">
            <Avatar
              name={displayName || "?"}
              src={avatar}
              size="lg"
              className="size-16 rounded-[18px] text-h3"
            />
            <div className="flex flex-wrap gap-2">
              <ImageButton
                label="Change photo"
                busy={uploading}
                onPick={pickPhoto}
              />
              {hasAvatar ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={pending}
                  onClick={removePhoto}
                >
                  <Trash2 aria-hidden /> Remove
                </Button>
              ) : null}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="displayName">Name others see</Label>
            <Input
              id="displayName"
              value={displayName}
              maxLength={50}
              onChange={(event) => setDisplayName(event.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="bio">About you</Label>
            <textarea
              id="bio"
              rows={3}
              value={bio}
              maxLength={BIO_MAX + 40}
              placeholder="Preparing for LDC 2026. Mornings for maths, evenings for GK."
              onChange={(event) => setBio(event.target.value)}
              className={cn(fieldClasses, "h-auto resize-none py-2.5")}
            />
            <FieldHint className={cn(over && "text-danger-ink")}>
              {bio.length}/{BIO_MAX}
            </FieldHint>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            disabled={pending || over || !displayName.trim()}
            onClick={save}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** The button that opens the editor, kept here so pages only import one thing. */
export function EditProfileButton(props: {
  initial: {
    displayName: string;
    bio: string | null;
    avatarUrl: string | null;
    hasAvatar: boolean;
  };
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
        <Pencil aria-hidden /> Edit profile
      </Button>
      <ProfileEditor open={open} onOpenChange={setOpen} {...props} />
    </>
  );
}
