"use client";

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
import { canChargeAction } from "@/features/omr/bundle-actions";
import { myPapersAction } from "@/features/omr/actions";

import { shareBundleInChatAction } from "../../chat-actions";
import { BundleForm } from "./bundle-form";

type Loaded = {
  papers: Awaited<ReturnType<typeof myPapersAction>>;
  canCharge: boolean;
};

/**
 * A bundle of the person's question papers into the chat. Whoever adds it (free) or buys
 * it sits every paper in it, with the key after each sitting, and keeps it for good.
 */
export function ChatBundleDialog({
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
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    if (!open) return;
    let live = true;
    void Promise.all([
      myPapersAction(),
      canChargeAction({ groupId, channelId }),
    ]).then(([papers, canCharge]) => live && setLoaded({ papers, canCharge }));
    return () => {
      live = false;
    };
  }, [open, groupId, channelId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Share a paper bundle</DialogTitle>
          <DialogDescription>
            A set of your question papers for everyone here to sit, keys and
            all. They keep it for good.
          </DialogDescription>
        </DialogHeader>
        {loaded === null ? (
          <p className="py-6 text-center text-small text-ink-muted">
            Loading your papers
          </p>
        ) : loaded.papers.length === 0 ? (
          <p className="py-4 text-small text-ink-muted">
            No question papers yet.{" "}
            <Link
              href="/tests"
              className="font-medium text-accent-ink hover:underline"
            >
              Upload some in Tests
            </Link>{" "}
            with their answer keys, then bundle them here.
          </p>
        ) : (
          <BundleForm
            papers={loaded.papers}
            canCharge={loaded.canCharge}
            pending={pending}
            onShare={(draft) =>
              start(async () => {
                const result = await shareBundleInChatAction({
                  groupId,
                  channelId,
                  ...draft,
                });
                if (!result.ok) return void toast.error(result.error);
                onOpenChange(false);
                onShared();
              })
            }
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
