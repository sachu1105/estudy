"use client";

import {
  ArrowLeft,
  BarChart3,
  Boxes,
  Camera,
  CircleHelp,
  ClipboardCheck,
  FileText,
  Images,
  Paperclip,
  type LucideIcon,
} from "lucide-react";
import { useRef, useState } from "react";

import { PickerBody } from "@/components/blocks/item-picker";
import { PodItemIcon } from "@/components/blocks/pod-item-icon";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from "@/components/ui/popover";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useMediaQuery } from "@/lib/use-media-query";

import type { Attachable } from "./attachable";

const PHOTOS = "image/png,image/jpeg,image/webp";

type TileKey =
  "gallery" | "camera" | "pdf" | "pods" | "test" | "poll" | "doubt";

const TILES: { key: TileKey; label: string; icon: LucideIcon }[] = [
  { key: "gallery", label: "Gallery", icon: Images },
  { key: "camera", label: "Camera", icon: Camera },
  { key: "pdf", label: "Document", icon: FileText },
  { key: "pods", label: "From my pods", icon: Boxes },
  { key: "test", label: "Mock test", icon: ClipboardCheck },
  { key: "poll", label: "Poll", icon: BarChart3 },
  { key: "doubt", label: "Ask a doubt", icon: CircleHelp },
];

/**
 * Everything a message can carry, behind the paperclip: a grid of round tiles, as in
 * WhatsApp, kept in our quiet colours. A panel above the box on md+, a sheet from the
 * bottom on phones. "From my pods" swaps the tiles for the pod list in the same place.
 */
export function AttachPanel({
  attachable,
  onFiles,
  onPod,
  onTest,
  onPoll,
  onDoubt,
}: {
  attachable: Attachable[];
  onFiles: (files: File[]) => void;
  onPod: (item: Attachable) => void;
  onTest: () => void;
  onPoll: () => void;
  onDoubt: () => void;
}) {
  const wide = useMediaQuery("(min-width: 768px)");
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"tiles" | "pods">("tiles");
  const gallery = useRef<HTMLInputElement>(null);
  const camera = useRef<HTMLInputElement>(null);
  const pdf = useRef<HTMLInputElement>(null);
  const show = (next: boolean) => {
    setOpen(next);
    if (!next) setView("tiles");
  };
  // Pickers open from the tap itself (browsers want a gesture), then the panel closes;
  // only "From my pods" stays open, to show the list.
  const tap = (key: TileKey) => {
    if (key === "pods") return setView("pods");
    if (key === "gallery") gallery.current?.click();
    if (key === "camera") camera.current?.click();
    if (key === "pdf") pdf.current?.click();
    if (key === "test") onTest();
    if (key === "poll") onPoll();
    if (key === "doubt") onDoubt();
    show(false);
  };

  const body =
    view === "pods" ? (
      <div className="flex min-h-0 flex-1 flex-col">
        <button
          type="button"
          onClick={() => setView("tiles")}
          className="mx-2 mt-2 inline-flex min-h-11 cursor-pointer items-center gap-1 self-start rounded-control px-2 text-small font-medium text-ink-muted hover:text-ink"
        >
          <ArrowLeft className="size-4" aria-hidden /> Back
        </button>
        <PickerBody
          heading={wide ? "h3" : "sheet"}
          title="From your pods"
          description="The squad gets a copy. Your pod stays yours."
          empty="Nothing in your pods yet. Add notes, links or files there first."
          items={attachable.map((item) => ({
            id: item.id,
            title: item.title,
            subtitle: item.pod.name,
            icon: <PodItemIcon type={item.type} />,
          }))}
          onPick={(id) => {
            const item = attachable.find((i) => i.id === id);
            if (item) onPod(item);
            show(false);
          }}
        />
      </div>
    ) : (
      <ul className="grid grid-cols-4 gap-x-1 gap-y-4 px-3 pt-12 pb-4 md:pt-4">
        {TILES.map((t) => (
          <li key={t.key} className="flex">
            <button
              type="button"
              onClick={() => tap(t.key)}
              className="group flex w-full cursor-pointer flex-col items-center gap-1.5 rounded-control py-1 text-center"
            >
              <span className="grid size-14 place-items-center rounded-full bg-surface-muted text-ink transition-colors duration-[120ms] group-hover:bg-border group-active:bg-accent-soft group-active:text-accent-ink">
                <t.icon className="size-6" aria-hidden />
              </span>
              <span className="text-small leading-tight text-ink-muted">
                {t.label}
              </span>
            </button>
          </li>
        ))}
      </ul>
    );

  const trigger = (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="md:size-11"
      aria-label="Attach"
      aria-expanded={open}
      aria-haspopup="dialog"
      onClick={() => show(!open)}
    >
      <Paperclip aria-hidden />
    </Button>
  );

  return (
    <>
      <Popover modal open={open && wide} onOpenChange={show}>
        <PopoverAnchor asChild>
          <span className="inline-flex">{trigger}</span>
        </PopoverAnchor>
        <PopoverContent
          side="top"
          align="start"
          aria-label="Attach"
          className="flex max-h-[min(460px,70dvh)] w-[360px] flex-col overflow-hidden p-0"
        >
          {body}
        </PopoverContent>
      </Popover>
      <Sheet open={open && !wide} onOpenChange={show}>
        <SheetContent
          side="bottom"
          className="max-h-[80dvh] gap-0 rounded-t-[20px] p-0 pb-[env(safe-area-inset-bottom)]"
        >
          <span
            aria-hidden
            className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-border"
          />
          {view === "tiles" ? (
            <SheetTitle className="sr-only">Attach</SheetTitle>
          ) : null}
          {body}
        </SheetContent>
      </Sheet>
      {/* Outside the panel, so a picker still answers after the panel closes. */}
      <input
        ref={gallery}
        type="file"
        accept={PHOTOS}
        multiple
        hidden
        data-chat-files
        onChange={pick(onFiles)}
      />
      <input
        ref={camera}
        type="file"
        accept={PHOTOS}
        capture="environment"
        hidden
        onChange={pick(onFiles)}
      />
      <input
        ref={pdf}
        type="file"
        accept="application/pdf"
        hidden
        data-chat-document
        onChange={pick(onFiles)}
      />
    </>
  );
}

const pick =
  (onFiles: (files: File[]) => void) =>
  (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = [...(e.target.files ?? [])];
    e.target.value = "";
    if (files.length) onFiles(files);
  };
