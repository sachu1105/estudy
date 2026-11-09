"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/** Asks before rubbing out every bubble. Opened from the sheet tools menu. */
export function ClearSheetDialog({
  open,
  onOpenChange,
  onClear,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClear: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Clear the answer sheet?</DialogTitle>
          <DialogDescription>
            Every marked bubble is rubbed out. The paper stays.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Keep my marks
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              onClear();
              onOpenChange(false);
            }}
          >
            Clear sheet
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
