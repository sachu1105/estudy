"use client";

import { Info } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

import { useSheetSide } from "./use-sheet-side";

/** Why the plan gave this task its minutes and its place (rule 14), behind one chip. */
export function WhySheet({ lines }: { lines: string[] }) {
  const side = useSheetSide();
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="sm">
          <Info aria-hidden /> Why this?
        </Button>
      </SheetTrigger>
      <SheetContent side={side} className="overflow-y-auto">
        <SheetTitle>Why this?</SheetTitle>
        <SheetDescription>
          How the plan chose this task for today.
        </SheetDescription>
        <ul className="flex list-disc flex-col gap-2 pl-5 text-body text-ink">
          {lines.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </SheetContent>
    </Sheet>
  );
}
