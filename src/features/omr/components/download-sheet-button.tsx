"use client";

import { Download } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import type { Pen } from "@/lib/omr/ink";

import { downloadAnswerSheet } from "./download-sheet";

/** The marked sheet as a PDF to keep, once the latest marks are saved. */
export function DownloadSheetButton({
  id,
  title,
  pen,
  flush,
}: {
  id: string;
  title: string;
  pen: Pen;
  flush: () => Promise<void>;
}) {
  const [pending, setPending] = useState(false);
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Download the answer sheet as a PDF"
      disabled={pending}
      onClick={async () => {
        setPending(true);
        await flush();
        await downloadAnswerSheet(id, title, pen);
        setPending(false);
      }}
    >
      <Download aria-hidden />
    </Button>
  );
}
