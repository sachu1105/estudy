"use client";

import { toast } from "@/components/ui/toast";
import type { Pen } from "@/lib/omr/ink";

/**
 * Saves the marked answer sheet as a PDF, in the person's pen. Fetched rather than
 * linked, so a failure says so here instead of opening an error page.
 */
export async function downloadAnswerSheet(id: string, title: string, pen: Pen) {
  const response = await fetch(`/api/omr/${id}/answers?pen=${pen}`).catch(
    () => null,
  );
  if (!response?.ok)
    return void toast.error(
      "The answer sheet PDF didn't download. Check your connection and try again.",
    );
  const url = URL.createObjectURL(await response.blob());
  const link = document.createElement("a");
  link.href = url;
  link.download = `${title.replaceAll("_", " ")} answer sheet.pdf`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
