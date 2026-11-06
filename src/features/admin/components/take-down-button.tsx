"use client";

import { Trash2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/** Taking a library entry down, asked first: nobody new gets it, those who have it keep it. */
export function TakeDownButton({
  title,
  disabled,
  onConfirm,
}: {
  title: string;
  disabled: boolean;
  onConfirm: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="ghost" disabled={disabled} onClick={() => setOpen(true)}>
        <Trash2 aria-hidden /> Take down
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Take down {title}?</DialogTitle>
            <DialogDescription>
              It leaves the Store for good. Everyone who bought or added it
              keeps it.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setOpen(false)}>Keep it</Button>
            <Button
              variant="danger"
              onClick={() => {
                setOpen(false);
                onConfirm();
              }}
            >
              Take down
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
