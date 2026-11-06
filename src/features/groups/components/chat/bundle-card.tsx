import { Layers } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { rupees } from "@/lib/pricing/pricing";
import type { PendingMessage } from "@/lib/squads/chat-types";

import { PaidMark } from "../pay/paid-mark";

/** A bundle of question papers offered in the chat: what it holds, its price, the way in. */
export function BundleCard({
  bundle,
}: {
  bundle: NonNullable<PendingMessage["bundle"]>;
}) {
  return (
    <div className="flex max-w-sm flex-wrap items-center gap-3 rounded-card border border-border bg-surface p-3">
      <span className="grid size-10 shrink-0 place-items-center rounded-control bg-accent-soft text-accent-ink">
        <Layers className="size-5" aria-hidden />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-body font-medium">{bundle.title}</span>
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-small text-ink-muted">
          Bundle · {bundle.papers} paper{bundle.papers === 1 ? "" : "s"} ·{" "}
          {bundle.pricePaise === null ? "Free" : rupees(bundle.pricePaise)}
          {bundle.pricePaise === null ? null : <PaidMark />}
        </span>
      </span>
      <Button asChild>
        <Link href={`/bundles/${bundle.id}`}>Open bundle</Link>
      </Button>
    </div>
  );
}
