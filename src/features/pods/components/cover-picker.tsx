"use client";

import { Check, ImageUp, Shuffle, Trash2 } from "lucide-react";
import { useRef, useState, useTransition, type ReactNode } from "react";

import { PodCover } from "@/components/blocks/pod-cover";
import { Button } from "@/components/ui/button";
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
  meshBackground,
  type CoverChoice,
  type CoverPreset,
  type PodCover as Cover,
} from "@/lib/pods/covers";
import { cn } from "@/lib/utils/cn";

import { setCoverAction } from "../actions";
import { uploadCoverImage } from "../upload";

export type CoverTarget =
  { kind: "exam"; syllabusId: string } | { kind: "pod"; podId: string };

/** What is chosen now: automatic, a preset, or an image. */
export type CoverSelection = "auto" | CoverPreset | "image";

const PRESETS = Object.keys(COVER_PRESETS) as CoverPreset[];

/**
 * Pick a pod's cover: automatic, one of the gradients, or an image of your own. Each
 * pick saves at once and the preview follows; an image shows while it uploads.
 */
export function CoverPicker({
  open,
  onOpenChange,
  target,
  title,
  selection: initialSelection,
  cover: initialCover,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target: CoverTarget;
  title: string;
  selection: CoverSelection;
  cover: Cover;
}) {
  const id = target.kind === "pod" ? target.podId : target.syllabusId;
  const [selection, setSelection] = useState(initialSelection);
  const [cover, setCover] = useState(initialCover);
  const [progress, setProgress] = useState<number | null>(null);
  const [pending, start] = useTransition();
  const file = useRef<HTMLInputElement>(null);

  const save = (
    choice: CoverChoice,
    optimistic: { selection: CoverSelection; cover: Cover },
  ) => {
    const before = { selection, cover };
    setSelection(optimistic.selection);
    setCover(optimistic.cover);
    start(async () => {
      const result = await setCoverAction({ target, choice });
      if (!result.ok) {
        setSelection(before.selection);
        setCover(before.cover);
        return void toast.error(result.error);
      }
      setCover(result.cover);
    });
  };

  const pickImage = (picked: File) => {
    const local = URL.createObjectURL(picked);
    const before = { selection, cover };
    setSelection("image");
    setCover({ kind: "image", url: local });
    setProgress(0);
    start(async () => {
      try {
        const key = await uploadCoverImage(picked, setProgress);
        const result = await setCoverAction({
          target,
          choice: { kind: "image", key },
        });
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
        setProgress(null);
        URL.revokeObjectURL(local);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cover</DialogTitle>
          <DialogDescription>
            The art on {title}&apos;s card. Only you see it.
          </DialogDescription>
        </DialogHeader>

        <div className="relative h-28 overflow-hidden rounded-control border border-border">
          <PodCover cover={cover} className="absolute inset-0" />
          <span className="absolute bottom-3 left-3 max-w-[80%] truncate rounded-full bg-black/30 px-2.5 py-0.5 text-small font-medium text-white backdrop-blur-sm">
            {title}
          </span>
          {progress !== null ? (
            <span className="absolute inset-x-0 bottom-0 h-1 bg-black/20">
              <span
                className="block h-full bg-accent transition-[width] duration-[120ms]"
                style={{ width: `${Math.round(progress * 100)}%` }}
              />
            </span>
          ) : null}
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-small text-ink-muted">Colour</span>
          <div
            role="radiogroup"
            aria-label="Cover colour"
            className="grid grid-cols-4 gap-2 sm:grid-cols-7"
          >
            <Swatch
              label="Automatic"
              selected={selection === "auto"}
              disabled={pending}
              onPick={() =>
                save(
                  { kind: "auto" },
                  { selection: "auto", cover: coverFor(id) },
                )
              }
            >
              {selection === "auto" ? (
                <Check className="size-4 text-ink" aria-hidden />
              ) : (
                <Shuffle className="size-4 text-ink-muted" aria-hidden />
              )}
            </Swatch>
            {PRESETS.map((preset) => (
              <Swatch
                key={preset}
                label={preset}
                selected={selection === preset}
                disabled={pending}
                background={meshBackground(preset)}
                onPick={() =>
                  save(
                    { kind: "gradient", preset },
                    {
                      selection: preset,
                      cover: { kind: "gradient", preset },
                    },
                  )
                }
              />
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-small text-ink-muted">Your own image</span>
          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={file}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              aria-label="Cover image"
              onChange={(e) => {
                const picked = e.target.files?.[0];
                e.target.value = "";
                if (picked) pickImage(picked);
              }}
            />
            <Button
              variant="secondary"
              disabled={pending}
              onClick={() => file.current?.click()}
            >
              <ImageUp aria-hidden />
              {selection === "image"
                ? "Choose another image"
                : "Upload an image"}
            </Button>
            {selection === "image" ? (
              <Button
                variant="ghost"
                disabled={pending}
                onClick={() =>
                  save(
                    { kind: "auto" },
                    { selection: "auto", cover: coverFor(id) },
                  )
                }
              >
                <Trash2 aria-hidden /> Remove image
              </Button>
            ) : null}
          </div>
          <span className="text-small text-ink-muted">
            JPG, PNG or WebP, up to 3 MB.
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Swatch({
  label,
  selected,
  disabled,
  background,
  onPick,
  children,
}: {
  label: string;
  selected: boolean;
  disabled: boolean;
  background?: string;
  onPick: () => void;
  children?: ReactNode;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      aria-label={label}
      title={label}
      disabled={disabled && !selected}
      onClick={onPick}
      className={cn(
        "relative grid aspect-square min-h-11 cursor-pointer place-items-center rounded-control border border-border bg-surface-muted transition-transform duration-[120ms] active:scale-95",
        selected && "ring-2 ring-accent ring-offset-2 ring-offset-surface",
      )}
      style={background ? { background } : undefined}
    >
      {children}
      {selected && background ? (
        <span className="grid size-6 place-items-center rounded-full bg-black/35 text-white">
          <Check className="size-4" aria-hidden />
        </span>
      ) : null}
    </button>
  );
}
