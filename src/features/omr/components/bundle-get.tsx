"use client";

import { Check, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/toast";

import { claimBundleAction, stopBundleAction } from "../bundle-actions";
import { BundleBuy } from "./bundle-buy";

export type BundleState = {
  id: string;
  title: string;
  pricePaise: number | null;
  owner: boolean;
  have: boolean;
  hidden: boolean;
  selling: boolean;
  holders: number | null;
};

/**
 * The one thing to do with a bundle: add it (free), buy it, or, for whoever made it,
 * see how many have it and stop offering it. Having it, it just says so.
 */
export function BundleGet({ bundle }: { bundle: BundleState }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [stopping, setStopping] = useState(false);
  const run = (
    action: () => Promise<{ ok: boolean; error?: string }>,
    done?: () => void,
  ) =>
    start(async () => {
      const result = await action();
      if (!result.ok) return void toast.error(result.error);
      done?.();
      router.refresh();
    });

  if (bundle.owner)
    return (
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-small text-ink-muted">
          You made this. {bundle.holders ?? 0}{" "}
          {bundle.holders === 1 ? "person has" : "people have"} it.
          {bundle.hidden ? " It's no longer offered; they keep it." : ""}
        </p>
        {bundle.hidden ? null : (
          <Button variant="ghost" onClick={() => setStopping(true)}>
            <Trash2 aria-hidden /> Stop offering
          </Button>
        )}
        <Dialog open={stopping} onOpenChange={setStopping}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Stop offering this bundle?</DialogTitle>
              <DialogDescription>
                Nobody new can add or buy it. Everyone who has it keeps it.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button onClick={() => setStopping(false)}>Keep offering</Button>
              <Button
                variant="danger"
                disabled={pending}
                onClick={() =>
                  run(
                    () => stopBundleAction({ id: bundle.id }),
                    () => setStopping(false),
                  )
                }
              >
                Stop offering
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );

  if (bundle.have)
    return (
      <p className="flex items-center gap-2 text-small">
        <Check className="size-4 text-success" aria-hidden /> In your tests. Sit
        any paper below.
      </p>
    );

  if (bundle.pricePaise === null)
    return (
      <Button
        variant="primary"
        className="self-start"
        disabled={pending}
        onClick={() => run(() => claimBundleAction({ id: bundle.id }))}
      >
        <Plus aria-hidden /> Add to my tests
      </Button>
    );

  return bundle.selling ? (
    <BundleBuy
      id={bundle.id}
      title={bundle.title}
      pricePaise={bundle.pricePaise}
    />
  ) : (
    <p className="rounded-control bg-surface-muted p-3 text-small text-ink-muted">
      This bundle isn&apos;t on sale right now. Try again later.
    </p>
  );
}
