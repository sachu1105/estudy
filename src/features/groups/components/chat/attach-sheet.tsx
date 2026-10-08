"use client";

import { FileText, Paperclip } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export type Attachable = { id: string; title: string; pod: { name: string } };

/** Pick something from your pods to send with a message; the squad gets a copy. */
export function AttachSheet({
  items,
  onPick,
}: {
  items: Attachable[];
  onPick: (item: Attachable) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Attach from my pods">
          <Paperclip aria-hidden />
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="overflow-y-auto">
        <SheetTitle>Attach from your pods</SheetTitle>
        <SheetDescription>
          The squad gets a copy. Your pod stays yours.
        </SheetDescription>
        {items.length === 0 ? (
          <p className="text-body text-ink-muted">
            Nothing in your pods yet. Add notes, links or files there first.
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {items.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  className="flex min-h-12 w-full cursor-pointer items-center gap-3 py-2 text-left hover:bg-surface-muted"
                  onClick={() => {
                    onPick(item);
                    setOpen(false);
                  }}
                >
                  <FileText
                    className="size-4 shrink-0 text-ink-muted"
                    aria-hidden
                  />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-body">{item.title}</span>
                    <span className="truncate text-small text-ink-muted">
                      {item.pod.name}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </SheetContent>
    </Sheet>
  );
}
