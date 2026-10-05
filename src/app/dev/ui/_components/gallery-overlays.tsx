"use client";

import { Search } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { CommandPalette } from "@/components/ui/command-palette";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { toast } from "@/components/ui/toast";
import { Tooltip } from "@/components/ui/tooltip";

import { Row, Section } from "./section";

export function GalleryOverlays() {
  const [paletteOpen, setPaletteOpen] = useState(false);

  return (
    <Section title="Overlays and feedback">
      <Row label="Dialog, sheet, tooltip">
        <Dialog>
          <DialogTrigger asChild>
            <Button>Open dialog</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Leave this group?</DialogTitle>
              <DialogDescription>
                Your shared notes stay in the group. You can rejoin with an
                invite.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="ghost">Stay</Button>
              </DialogClose>
              <DialogClose asChild>
                <Button variant="danger">Leave group</Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {(["right", "left", "bottom"] as const).map((side) => (
          <Sheet key={side}>
            <SheetTrigger asChild>
              <Button>Sheet {side}</Button>
            </SheetTrigger>
            <SheetContent side={side}>
              <SheetTitle>Filters</SheetTitle>
              <SheetDescription>
                Narrow topics by subject and coverage.
              </SheetDescription>
            </SheetContent>
          </Sheet>
        ))}

        <Tooltip content="Ranks update every few minutes">
          <Button variant="ghost">Hover for tooltip</Button>
        </Tooltip>
      </Row>

      <Row label="Toast, command palette">
        <Button
          onClick={() =>
            toast("Session started", {
              description: "Indian Constitution · 45 minutes",
            })
          }
        >
          Toast
        </Button>
        <Button
          onClick={() =>
            toast.success("Task done", {
              action: { label: "Undo", onClick: () => {} },
            })
          }
        >
          Success toast
        </Button>
        <Button
          onClick={() =>
            toast.error(
              "Upload failed. The file is over 15 MB; try a smaller PDF.",
            )
          }
        >
          Error toast
        </Button>
        <Button onClick={() => setPaletteOpen(true)}>
          <Search aria-hidden /> Command palette
        </Button>
      </Row>

      <CommandPalette
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        groups={[
          {
            heading: "Demo",
            items: [
              {
                id: "one",
                label: "Start next task",
                onSelect: () => toast("Start next task"),
              },
              {
                id: "two",
                label: "Open plan",
                onSelect: () => toast("Open plan"),
              },
            ],
          },
        ]}
      />
    </Section>
  );
}
