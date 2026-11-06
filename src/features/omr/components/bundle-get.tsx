"use client";

import { Plus, Trash2 } from "lucide-react";
import Link from "next/link";
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
  /** In the Store (Admin > Papers manages it), not a squad's. */
  library: boolean;
  /** A library bundle the reader's plan includes. */
  included: boolean;
  /** The plans that include it, offered to those who don't have it. */
  includedIn: string[];
};

const planName = (p: string) =>
  p === "PRO" ? "Pro" : p === "ELITE" ? "Elite" : p;

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

  if (bundle.owner && bundle.library)
    return (
      <p className="text-small text-ink-muted">
        Listed in the Store. {bundle.holders ?? 0}{" "}
        {bundle.holders === 1 ? "person has" : "people have"} it.{" "}
        <Link
          href="/admin/papers"
          className="font-medium text-accent-ink hover:underline"
        >
          Manage it in Admin
        </Link>
      </p>
    );

  if (bundle.owner)
    return (
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-small text-ink-muted">
          {bundle.holders ?? 0}{" "}
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

  // Having it, the panel's headline says so: nothing to do here.
  if (bundle.included || bundle.have) return null;

  if (bundle.pricePaise === null)
    return (
      <Button
        variant="primary"
        className="w-full"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const result = await claimBundleAction({ id: bundle.id });
            if (!result.ok) return void toast.error(result.error);
            router.push(`/tests?added=${bundle.id}`);
          })
        }
      >
        <Plus aria-hidden /> Add to my tests
      </Button>
    );

  const withPlan = bundle.includedIn.length ? (
    <p className="text-small text-ink-muted">
      Or get it free with {bundle.includedIn.map(planName).join(" or ")}.{" "}
      <Link
        href="/settings/plan"
        className="font-medium text-accent-ink hover:underline"
      >
        See the plans
      </Link>
    </p>
  ) : null;

  return bundle.selling ? (
    <div className="flex flex-col gap-3">
      <BundleBuy id={bundle.id} pricePaise={bundle.pricePaise} />
      {withPlan}
    </div>
  ) : (
    <p className="rounded-control bg-surface-muted p-3 text-small text-ink-muted">
      This bundle isn&apos;t on sale right now. Try again later.
    </p>
  );
}
