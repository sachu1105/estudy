"use client";

import { FileUp } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";

import { uploadPaper } from "../upload";

/** Pick a question paper's PDF; it opens beside a fresh answer sheet. */
export function UploadPaperButton({
  variant = "primary",
}: {
  variant?: "primary" | "secondary";
}) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);

  async function upload(file: File) {
    if (file.type && file.type !== "application/pdf")
      return void toast.error("Choose a PDF of the question paper.");
    setProgress(0);
    try {
      const { sheetId } = await uploadPaper(file, setProgress);
      router.push(`/omr/${sheetId}`);
    } catch (error) {
      toast.error((error as Error).message);
      setProgress(null);
    }
  }

  return (
    <>
      <input
        ref={input}
        type="file"
        accept="application/pdf,.pdf"
        className="sr-only"
        tabIndex={-1}
        aria-label="Question paper PDF"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) void upload(file);
        }}
      />
      <Button
        variant={variant}
        disabled={progress !== null}
        onClick={() => input.current?.click()}
      >
        <FileUp aria-hidden />
        {progress === null
          ? "Upload question paper"
          : `Uploading ${Math.round(progress * 100)}%`}
      </Button>
    </>
  );
}
