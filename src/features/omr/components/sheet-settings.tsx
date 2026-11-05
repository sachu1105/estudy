"use client";

import { Settings2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/input";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Switch } from "@/components/ui/switch";

import type { OmrPrefs, Pen } from "./use-omr-prefs";

const PENS: { value: Pen; label: string; swatch: string }[] = [
  { value: "black", label: "Black", swatch: "bg-ink" },
  { value: "blue", label: "Blue", swatch: "bg-pen-blue" },
];

/** The pen the sheet is marked with, and whether a mark can be taken back. */
export function SheetSettings({
  prefs,
  onChange,
}: {
  prefs: OmrPrefs;
  onChange: (change: Partial<OmrPrefs>) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Sheet settings"
        onClick={() => setOpen(true)}
      >
        <Settings2 aria-hidden />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Answer sheet</DialogTitle>
            <DialogDescription>
              Mark it the way you will in the exam hall.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-5">
            <div className="flex items-center justify-between gap-4">
              <span className="text-body font-medium">Pen</span>
              <SegmentedControl
                ariaLabel="Pen colour"
                value={prefs.pen}
                onValueChange={(pen) => onChange({ pen })}
                options={PENS.map((p) => ({
                  value: p.value,
                  label: (
                    <>
                      <span
                        aria-hidden
                        className={`size-3 rounded-full ${p.swatch}`}
                      />
                      {p.label}
                    </>
                  ),
                }))}
              />
            </div>
            <div className="flex items-start justify-between gap-4">
              <div className="flex min-w-0 flex-col">
                <Label htmlFor="omr-final" className="text-body">
                  Marks are final
                </Label>
                <span className="text-small text-ink-muted">
                  {prefs.final
                    ? "Like pen on paper: a marked answer stays as it is."
                    : "Tap another option to change an answer, or the same one to rub it out."}
                </span>
              </div>
              <Switch
                id="omr-final"
                checked={prefs.final}
                onCheckedChange={(final) => onChange({ final })}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
