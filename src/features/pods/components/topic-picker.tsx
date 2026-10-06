"use client";

import { Tags } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { toast } from "@/components/ui/toast";

import { setItemTopicsAction } from "../actions";

/** Which topics this item covers: a checklist in a bottom sheet, saved on "Done". */
export function TopicPicker({
  itemId,
  topics,
  selected,
}: {
  itemId: string;
  topics: { id: string; name: string }[];
  selected: string[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [chosen, setChosen] = useState(selected);
  const [pending, start] = useTransition();

  const save = () =>
    start(async () => {
      const result = await setItemTopicsAction({ itemId, topicIds: chosen });
      if (!result.ok) return void toast.error(result.error);
      setOpen(false);
      router.refresh();
    });

  if (topics.length === 0) return null;
  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setChosen(selected);
      }}
    >
      <SheetTrigger asChild>
        <Button variant="secondary">
          <Tags aria-hidden />
          {selected.length === 0
            ? "Link to topics"
            : `${selected.length} topic${selected.length === 1 ? "" : "s"}`}
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="overflow-y-auto">
        <SheetTitle>Topics this covers</SheetTitle>
        <SheetDescription>
          It shows up inside each topic you tick.
        </SheetDescription>
        <ul className="flex flex-col">
          {topics.map((topic) => {
            const on = chosen.includes(topic.id);
            return (
              <li key={topic.id}>
                <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-control px-2 hover:bg-surface-muted">
                  <Checkbox
                    checked={on}
                    onCheckedChange={(v) =>
                      setChosen((prev) =>
                        v === true
                          ? [...prev, topic.id]
                          : prev.filter((id) => id !== topic.id),
                      )
                    }
                  />
                  <span className="text-body">{topic.name}</span>
                </label>
              </li>
            );
          })}
        </ul>
        <Button variant="primary" size="lg" disabled={pending} onClick={save}>
          {pending ? "Saving" : "Done"}
        </Button>
      </SheetContent>
    </Sheet>
  );
}
