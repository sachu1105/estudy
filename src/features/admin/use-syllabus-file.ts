"use client";

import { useState } from "react";

import { toast } from "@/components/ui/toast";

const isImage = (file: File) => file.type.startsWith("image/");

/**
 * The builder's "Fill from a file": the text layer goes into the box to check. For the AI,
 * the file itself is kept too, so a model that reads pages gets the pages (a scan or a
 * photo included); editing the text afterwards means the text is what gets read.
 */
export function useSyllabusFile({
  setText,
  keepFile,
  readsPages,
}: {
  setText: (text: string) => void;
  keepFile: boolean;
  readsPages: boolean;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [reading, setReading] = useState(false);

  async function pick(next: File) {
    setFile(null);
    if (keepFile && readsPages && isImage(next)) {
      setFile(next);
      setText("");
      return void toast.success("Photo added. The AI reads it page by page");
    }
    setReading(true);
    try {
      const body = new FormData();
      body.set("file", next);
      const response = await fetch("/api/admin/syllabus-text", {
        method: "POST",
        body,
      });
      const json = (await response.json().catch(() => ({}))) as {
        text?: string;
        error?: string;
      };
      if (response.ok && json.text) {
        setText(json.text);
        if (keepFile) setFile(next);
        return void toast.success("Text added. Check it, then read it");
      }
      // A scanned PDF has no text layer, but a model that reads pages doesn't need one.
      if (keepFile && readsPages && next.type === "application/pdf") {
        setFile(next);
        setText("");
        return void toast.success(
          "No text in this PDF. The AI reads its pages",
        );
      }
      toast.error(json.error ?? "Couldn't read that file.");
    } finally {
      setReading(false);
    }
  }

  return { file, clearFile: () => setFile(null), pick, reading };
}
