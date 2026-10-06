"use client";

import type { Editor } from "@tiptap/react";
import {
  Bold,
  Heading2,
  Heading3,
  Highlighter,
  ImagePlus,
  List,
  ListChecks,
  ListOrdered,
  Table,
  type LucideIcon,
} from "lucide-react";
import { useId } from "react";

import { cn } from "@/lib/utils/cn";

type Tool = {
  label: string;
  icon: LucideIcon;
  active: (e: Editor) => boolean;
  run: (e: Editor) => void;
};

const TOOLS: Tool[] = [
  {
    label: "Heading",
    icon: Heading2,
    active: (e) => e.isActive("heading", { level: 2 }),
    run: (e) => e.chain().focus().toggleHeading({ level: 2 }).run(),
  },
  {
    label: "Subheading",
    icon: Heading3,
    active: (e) => e.isActive("heading", { level: 3 }),
    run: (e) => e.chain().focus().toggleHeading({ level: 3 }).run(),
  },
  {
    label: "Bold",
    icon: Bold,
    active: (e) => e.isActive("bold"),
    run: (e) => e.chain().focus().toggleBold().run(),
  },
  {
    label: "Highlight",
    icon: Highlighter,
    active: (e) => e.isActive("highlight"),
    run: (e) => e.chain().focus().toggleHighlight().run(),
  },
  {
    label: "Bullet list",
    icon: List,
    active: (e) => e.isActive("bulletList"),
    run: (e) => e.chain().focus().toggleBulletList().run(),
  },
  {
    label: "Numbered list",
    icon: ListOrdered,
    active: (e) => e.isActive("orderedList"),
    run: (e) => e.chain().focus().toggleOrderedList().run(),
  },
  {
    label: "Checklist",
    icon: ListChecks,
    active: (e) => e.isActive("taskList"),
    run: (e) => e.chain().focus().toggleTaskList().run(),
  },
  {
    label: "Table",
    icon: Table,
    active: (e) => e.isActive("table"),
    run: (e) =>
      e
        .chain()
        .focus()
        .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
        .run(),
  },
];

const button =
  "grid size-11 shrink-0 cursor-pointer place-items-center rounded-control text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink md:size-9";

/** Formatting for notes. Scrolls sideways on phones rather than wrapping. */
export function NoteToolbar({
  editor,
  onImage,
}: {
  editor: Editor;
  onImage: (file: File) => void;
}) {
  const id = useId();
  return (
    <div
      role="toolbar"
      aria-label="Formatting"
      className="flex gap-1 overflow-x-auto border-b border-border px-2 py-1"
    >
      {TOOLS.map((tool) => {
        const active = tool.active(editor);
        return (
          <button
            key={tool.label}
            type="button"
            aria-label={tool.label}
            aria-pressed={active}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => tool.run(editor)}
            className={cn(button, active && "bg-accent-soft text-accent-ink")}
          >
            <tool.icon className="size-4" aria-hidden />
          </button>
        );
      })}
      <label htmlFor={id} className={button} aria-label="Insert image">
        <ImagePlus className="size-4" aria-hidden />
      </label>
      <input
        id={id}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) onImage(file);
        }}
      />
    </div>
  );
}
