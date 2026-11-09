"use client";

import {
  Download,
  Eraser,
  KeyRound,
  MoreHorizontal,
  Settings2,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "@/components/ui/toast";

import { ClearSheetDialog } from "./clear-sheet-dialog";
import { SheetSettings } from "./sheet-settings";
import type { OmrPrefs } from "./use-omr-prefs";

/**
 * The sheet's quieter tools, kept apart from the exam's own actions (the clock and
 * Submit): for the paper's owner, its answer key (a labelled button on a laptop, in
 * the menu on smaller screens), then one menu for the sheet settings, the PDF and
 * clearing the sheet. A squad exam's sheet only has its settings.
 */
export function SheetTools({
  keyHref,
  inExam,
  marked,
  prefs,
  onPrefs,
  onDownload,
  onClear,
}: {
  /** The owner's way to the key, between sittings; null otherwise. */
  keyHref: string | null;
  /** A squad exam's sitting: no download, no clearing. */
  inExam: boolean;
  marked: number;
  prefs: OmrPrefs;
  onPrefs: (change: Partial<OmrPrefs>) => void;
  onDownload: () => Promise<void>;
  onClear: () => void;
}) {
  const [dialog, setDialog] = useState<"settings" | "clear" | null>(null);
  const opened = (which: "settings" | "clear") => (open: boolean) =>
    setDialog(open ? which : null);

  return (
    <div className="flex items-center gap-1">
      {keyHref ? (
        <Button asChild variant="ghost" className="hidden lg:inline-flex">
          <Link href={keyHref}>
            <KeyRound aria-hidden /> Answer key
          </Link>
        </Button>
      ) : null}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Sheet tools">
            <MoreHorizontal aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {keyHref ? (
            <DropdownMenuItem asChild className="lg:hidden">
              <Link href={keyHref}>
                <KeyRound aria-hidden /> Answer key and marking
              </Link>
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuItem onSelect={() => setDialog("settings")}>
            <Settings2 aria-hidden /> Sheet settings
          </DropdownMenuItem>
          {inExam ? null : (
            <>
              <DropdownMenuItem
                onSelect={() =>
                  void onDownload().catch(() =>
                    toast.error("The PDF didn't download. Try again."),
                  )
                }
              >
                <Download aria-hidden /> Download answer sheet
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                disabled={marked === 0}
                onSelect={() => setDialog("clear")}
              >
                <Eraser aria-hidden /> Clear the sheet
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <SheetSettings
        open={dialog === "settings"}
        onOpenChange={opened("settings")}
        prefs={prefs}
        onChange={onPrefs}
      />
      <ClearSheetDialog
        open={dialog === "clear"}
        onOpenChange={opened("clear")}
        onClear={onClear}
      />
    </div>
  );
}
