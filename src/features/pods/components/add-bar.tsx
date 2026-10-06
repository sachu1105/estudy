"use client";

import { Camera, FileUp, Link2, NotebookPen } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";

import { addNoteAction } from "../actions";
import { uploadPodFiles } from "../upload";
import { LinkDialog } from "./link-dialog";
import { PhotoSheet } from "./photo-sheet";

const FILE_TYPES =
  ".pdf,.png,.jpg,.jpeg,.webp,application/pdf,image/png,image/jpeg,image/webp";

/**
 * Note, link, file or photo: one tap each. Inside a topic, what's added is linked to that
 * topic straight away.
 */
export function AddBar({
  podId,
  topicIds = [],
}: {
  podId: string;
  topicIds?: string[];
}) {
  const router = useRouter();
  const id = useId();
  const [linkOpen, setLinkOpen] = useState(false);
  const [pages, setPages] = useState<File[]>([]);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const newNote = () =>
    start(async () => {
      const result = await addNoteAction({ podId, topicIds });
      if (!result.ok) return void toast.error(result.error);
      router.push(`/pods/${podId}/items/${result.itemId}`);
    });

  const upload = (
    files: File[],
    options: { asDocument?: boolean; title?: string },
  ) =>
    start(async () => {
      setError(null);
      setProgress(0);
      try {
        await uploadPodFiles(
          podId,
          files,
          { ...options, topicIds },
          setProgress,
        );
        setPages([]);
        toast.success(
          files.length === 1 || options.asDocument
            ? "Added"
            : `${files.length} files added`,
        );
        router.refresh();
      } catch (e) {
        setError((e as Error).message);
        if (!options.asDocument) toast.error((e as Error).message);
      } finally {
        setProgress(null);
      }
    });

  return (
    <div
      className="flex flex-wrap gap-2"
      role="group"
      aria-label="Add material"
    >
      <Button variant="secondary" disabled={pending} onClick={newNote}>
        <NotebookPen aria-hidden /> Note
      </Button>
      <Button
        variant="secondary"
        disabled={pending}
        onClick={() => setLinkOpen(true)}
      >
        <Link2 aria-hidden /> Link
      </Button>
      <Button asChild variant="secondary">
        <label htmlFor={`${id}-file`} aria-disabled={pending}>
          <FileUp aria-hidden />
          {pending && progress !== null && pages.length === 0
            ? `Uploading ${Math.round(progress * 100)}%`
            : "File"}
        </label>
      </Button>
      <input
        id={`${id}-file`}
        type="file"
        accept={FILE_TYPES}
        multiple
        className="sr-only"
        disabled={pending}
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          e.target.value = "";
          if (files.length) upload(files, {});
        }}
      />
      <Button asChild variant="secondary">
        <label htmlFor={`${id}-camera`} aria-disabled={pending}>
          <Camera aria-hidden /> Photo
        </label>
      </Button>
      <input
        id={`${id}-camera`}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        className="sr-only"
        disabled={pending}
        onChange={(e) => {
          setPages([...pages, ...Array.from(e.target.files ?? [])]);
          e.target.value = "";
        }}
      />
      <LinkDialog
        open={linkOpen}
        onOpenChange={setLinkOpen}
        podId={podId}
        topicIds={topicIds}
        onAdded={() => router.refresh()}
      />
      <PhotoSheet
        pages={pages}
        onPagesChange={setPages}
        saving={pending}
        progress={progress}
        error={error}
        onSave={(title) =>
          upload(pages, { asDocument: true, title: title || undefined })
        }
      />
    </div>
  );
}
