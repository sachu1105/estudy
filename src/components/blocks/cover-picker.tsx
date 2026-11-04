"use client";

import { Check, ImageUp, Loader2, Shuffle } from "lucide-react";
import { useRef, useState, useTransition } from "react";

import { PodCover } from "@/components/blocks/pod-cover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/toast";
import {
  COVER_PRESETS,
  coverFor,
  type CoverPreset,
  type PodCover as Cover,
} from "@/lib/pods/covers";
import { cn } from "@/lib/utils/cn";

const PRESETS = Object.keys(COVER_PRESETS) as CoverPreset[];

/** A tile with an icon and a word (Automatic, Upload), the size of a swatch. */
const tileText =
  "flex h-16 cursor-pointer flex-col items-center justify-center gap-1 rounded-control border px-1 text-center text-micro leading-tight disabled:cursor-not-allowed disabled:opacity-60";

export type CoverSelection = "auto" | CoverPreset | "image";
export type CoverChoice =
  | { kind: "auto" }
  | { kind: "gradient"; preset: CoverPreset }
  | { kind: "image"; key: string };

type Saved = { ok: true; cover: Cover } | { ok: false; error: string };

/**
 * Pick cover art: automatic, one of the gradients, or an image of your own. Every pick
 * saves at once and the preview follows it; a failed save puts the old one back.
 *
 * The dialog knows nothing about what it is covering — the caller passes the action
 * that saves and the uploader that returns a storage key.
 */
export function CoverPicker({
  open,
  onOpenChange,
  title,
  description,
  autoId,
  selection: initialSelection,
  cover: initialCover,
  onSave,
  onUpload,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  /** The id the automatic gradient is derived from, for its swatch. */
  autoId: string;
  selection: CoverSelection;
  cover: Cover;
  onSave: (choice: CoverChoice) => Promise<Saved>;
  onUpload: (file: File) => Promise<string>;
}) {
  const [selection, setSelection] = useState(initialSelection);
  const [cover, setCover] = useState(initialCover);
  const [uploading, setUploading] = useState(false);
  const [pending, start] = useTransition();
  const input = useRef<HTMLInputElement>(null);

  const choose = (
    choice: CoverChoice,
    optimistic: { selection: CoverSelection; cover: Cover },
  ) => {
    const before = { selection, cover };
    setSelection(optimistic.selection);
    setCover(optimistic.cover);
    start(async () => {
      const result = await onSave(choice);
      if (!result.ok) {
        setSelection(before.selection);
        setCover(before.cover);
        return void toast.error(result.error);
      }
      setCover(result.cover);
    });
  };

  const pickImage = (file: File) => {
    const local = URL.createObjectURL(file);
    const before = { selection, cover };
    setSelection("image");
    setCover({ kind: "image", url: local });
    setUploading(true);
    start(async () => {
      try {
        const key = await onUpload(file);
        const result = await onSave({ kind: "image", key });
        if (!result.ok) throw new Error(result.error);
        setCover(result.cover);
      } catch (error) {
        setSelection(before.selection);
        setCover(before.cover);
        toast.error(
          error instanceof Error
            ? error.message
            : "That image didn't upload. Try again.",
        );
      } finally {
        setUploading(false);
        URL.revokeObjectURL(local);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <PodCover
            cover={cover}
            className="h-24 w-full rounded-card border border-border"
          />

          {/* Automatic, the six gradients and your own image: eight tiles, two full rows. */}
          <div className="grid grid-cols-4 gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                choose(
                  { kind: "auto" },
                  { selection: "auto", cover: coverFor(autoId) },
                )
              }
              className={cn(
                tileText,
                selection === "auto"
                  ? "border-accent bg-accent-soft text-accent-ink"
                  : "border-border text-ink-muted hover:bg-surface-muted",
              )}
            >
              <Shuffle className="size-4" aria-hidden />
              Automatic
            </button>
            {PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                disabled={pending}
                aria-label={preset}
                onClick={() =>
                  choose(
                    { kind: "gradient", preset },
                    { selection: preset, cover: { kind: "gradient", preset } },
                  )
                }
                className={cn(
                  "relative h-16 cursor-pointer overflow-hidden rounded-control border",
                  selection === preset ? "border-accent" : "border-border",
                )}
              >
                <PodCover
                  cover={{ kind: "gradient", preset }}
                  className="size-full"
                />
                {selection === preset ? (
                  <span className="absolute inset-0 grid place-items-center">
                    <Check
                      className="size-5 text-white drop-shadow"
                      aria-hidden
                    />
                  </span>
                ) : null}
              </button>
            ))}
            <button
              type="button"
              disabled={uploading || pending}
              onClick={() => input.current?.click()}
              className={cn(
                tileText,
                selection === "image"
                  ? "border-accent bg-accent-soft text-accent-ink"
                  : "border-dashed border-border text-ink-muted hover:bg-surface-muted",
              )}
            >
              {uploading ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <ImageUp className="size-4" aria-hidden />
              )}
              {selection === "image" ? "New image" : "Upload an image"}
            </button>
          </div>
          <p className="text-small text-ink-muted">
            JPG, PNG or WebP.
          </p>
        </div>

        <input
          ref={input}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) pickImage(file);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
