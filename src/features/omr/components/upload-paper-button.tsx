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
  className,
}: {
  variant?: "primary" | "secondary";
  className?: string;
}) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);

  async function upload(file: File) {
    if (file.type && file.type !== "application/pdf")
      return void toast.error("Choose a PDF of the question paper.");
    setProgress(0);
    try {
      const { paperId } = await uploadPaper(file, setProgress);
      router.push(`/omr/${paperId}`);
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
        className={className}
        disabled={progress !== null}
        onClick={() => input.current?.click()}
      >
        <FileUp aria-hidden />
        {progress === null ? (
          // "Upload paper" on a phone, so it sits beside the Store button.
          <span>
            Upload<span className="hidden sm:inline"> question</span> paper
          </span>
        ) : (
          `Uploading ${Math.round(progress * 100)}%`
        )}
      </Button>
    </>
  );
}
