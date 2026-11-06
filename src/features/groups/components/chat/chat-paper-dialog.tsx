"use client";

import { FileCheck2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useTransition } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/toast";
import { myPapersAction } from "@/features/omr/actions";

import { sharePaperInChatAction } from "../../chat-actions";
import { ExamTimingForm } from "./exam-timing-form";

type Paper = Awaited<ReturnType<typeof myPapersAction>>[number];

/**
 * One of the person's question papers into the chat as an exam: pick the paper, then
 * when it runs. Everyone here sits it once for the rank list, under their own register
 * number, and the key stays hidden until the results time.
 */
export function ChatPaperDialog({
  groupId,
  channelId,
  open,
  onOpenChange,
  onShared,
}: {
  groupId: string;
  channelId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onShared: () => void;
}) {
  const [papers, setPapers] = useState<Paper[] | null>(null);
  const [picked, setPicked] = useState<Paper | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    if (!open) return;
    let live = true;
    void myPapersAction().then((list) => live && setPapers(list));
    return () => {
      live = false;
    };
  }, [open]);

  const close = (next: boolean) => {
    onOpenChange(next);
    if (!next) setPicked(null);
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Share a question paper</DialogTitle>
          <DialogDescription>
            Everyone here sits it once for the rank list. The key stays hidden
            until results come out.
          </DialogDescription>
        </DialogHeader>
        {picked ? (
          <ExamTimingForm
            paper={picked}
            pending={pending}
            onBack={() => setPicked(null)}
            onShare={(timing) =>
              start(async () => {
                const result = await sharePaperInChatAction({
                  groupId,
                  channelId,
                  paperId: picked.id,
                  ...timing,
                });
                if (!result.ok) return void toast.error(result.error);
                close(false);
                onShared();
              })
            }
          />
        ) : papers === null ? (
          <p className="py-6 text-center text-small text-ink-muted">
            Loading your papers
          </p>
        ) : papers.length === 0 ? (
          <p className="py-4 text-small text-ink-muted">
            No question papers yet.{" "}
            <Link
              href="/tests"
              className="font-medium text-accent-ink hover:underline"
            >
              Upload one in Tests
            </Link>{" "}
            and add its answer key, then share it here.
          </p>
        ) : (
          <ul
            aria-label="Your question papers"
            className="flex flex-col divide-y divide-border rounded-control border border-border"
          >
            {papers.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => setPicked(p)}
                  className="flex min-h-14 w-full cursor-pointer items-center gap-3 px-3 py-2 text-left hover:bg-surface-muted"
                >
                  <FileCheck2
                    className="size-5 shrink-0 text-ink-muted"
                    aria-hidden
                  />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-body font-medium">
                      {p.title.replaceAll("_", " ")}
                    </span>
                    <span className="text-small text-ink-muted">
                      {p.questions} questions · key {p.keyed} of {p.questions}
                      {p.limitMin ? ` · ${p.limitMin} min` : ""}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
