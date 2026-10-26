"use client";

import { Eraser } from "lucide-react";
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

/** Rubs out every bubble, after asking. */
export function ClearSheetButton({
  disabled,
  onClear,
}: {
  disabled: boolean;
  onClear: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Clear the answer sheet"
        disabled={disabled}
        onClick={() => setOpen(true)}
      >
        <Eraser aria-hidden />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clear the answer sheet?</DialogTitle>
            <DialogDescription>
              Every marked bubble is rubbed out. The paper stays.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Keep my marks
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                onClear();
                setOpen(false);
              }}
            >
              Clear sheet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
