"use client";

import { Camera, X } from "lucide-react";
import { useEffect, useId, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { FieldError, Input, Label } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";

/**
 * Pages photographed one after another, saved as one document: the way students copy a
 * few pages of a notebook or a guide. Opens with the first photos already taken.
 */
export function PhotoSheet({
  pages,
  onPagesChange,
  onSave,
  saving,
  progress,
  error,
}: {
  pages: File[];
  onPagesChange: (pages: File[]) => void;
  onSave: (title: string) => void;
  saving: boolean;
  progress: number | null;
  error: string | null;
}) {
  const id = useId();
  const [title, setTitle] = useState("");
  const urls = useMemo(() => pages.map((p) => URL.createObjectURL(p)), [pages]);
  useEffect(() => () => urls.forEach((u) => URL.revokeObjectURL(u)), [urls]);

  return (
    <Sheet
      open={pages.length > 0}
      onOpenChange={(open) => !open && !saving && onPagesChange([])}
    >
      <SheetContent side="bottom" className="overflow-y-auto">
        <SheetTitle>
          {pages.length} page{pages.length === 1 ? "" : "s"}
        </SheetTitle>
        <SheetDescription>
          Saved together as one document, in this order.
        </SheetDescription>
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {urls.map((url, i) => (
            <li
              key={url}
              className="relative aspect-[3/4] overflow-hidden rounded-control border border-border"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- a local preview blob */}
              <img
                src={url}
                alt={`Page ${i + 1}`}
                className="size-full object-cover"
              />
              <button
                type="button"
                aria-label={`Remove page ${i + 1}`}
                disabled={saving}
                onClick={() => onPagesChange(pages.filter((_, j) => j !== i))}
                className="absolute top-1 right-1 grid size-8 place-items-center rounded-full bg-surface/90 text-ink"
              >
                <X className="size-4" aria-hidden />
              </button>
            </li>
          ))}
          <li>
            <label
              htmlFor={id}
              className="grid aspect-[3/4] cursor-pointer place-items-center rounded-control border-[1.5px] border-dashed border-border text-ink-muted hover:bg-surface-muted"
            >
              <span className="flex flex-col items-center gap-1 text-small">
                <Camera className="size-5" aria-hidden /> Add page
              </span>
            </label>
            <input
              id={id}
              type="file"
              accept="image/*"
              capture="environment"
              multiple
              className="sr-only"
              disabled={saving}
              onChange={(e) => {
                onPagesChange([...pages, ...Array.from(e.target.files ?? [])]);
                e.target.value = "";
              }}
            />
          </li>
        </ul>
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${id}-title`}>Title</Label>
          <Input
            id={`${id}-title`}
            value={title}
            maxLength={120}
            placeholder="Notebook pages"
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        {error ? <FieldError role="alert">{error}</FieldError> : null}
        <Button
          variant="primary"
          size="lg"
          disabled={saving}
          onClick={() => onSave(title)}
        >
          {saving
            ? progress !== null && progress < 1
              ? `Uploading ${Math.round(progress * 100)}%`
              : "Saving"
            : "Save pages"}
        </Button>
      </SheetContent>
    </Sheet>
  );
}
