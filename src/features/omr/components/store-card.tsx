import { Check } from "lucide-react";
import Link from "next/link";

import { PodCover } from "@/components/blocks/pod-cover";
import { Badge } from "@/components/ui/badge";
import { coverFor } from "@/lib/pods/covers";
import { rupees } from "@/lib/pricing/pricing";

export type StoreItem = {
  id: string;
  title: string;
  description: string;
  papers: number;
  questions: number;
  pricePaise: number | null;
  /** The reader can sit it: bought, added, or in their plan. */
  have: boolean;
  /** In the reader's plan (a real subscription). */
  included: boolean;
  /** The plans that include it. */
  includedIn: string[];
};

export const planName = (p: string) =>
  p === "PRO" ? "Pro" : p === "ELITE" ? "Elite" : p;

/** Where an item stands for the reader: owned, in their plan, free, or its price. */
function Standing({ item }: { item: StoreItem }) {
  if (item.included) return <Badge tone="accent">In your plan</Badge>;
  if (item.have)
    return (
      <Badge tone="neutral">
        <Check aria-hidden /> Owned
      </Badge>
    );
  return (
    <span className="font-mono text-body font-medium tabular-nums">
      {item.pricePaise === null ? "Free" : rupees(item.pricePaise)}
    </span>
  );
}

/**
 * One item in the Store, as a card in Discord's Shop: its cover art with what's inside,
 * the name and a line about it, then its price (or that it's yours).
 */
export function StoreCard({ item }: { item: StoreItem }) {
  const plans =
    !item.have && item.includedIn.length
      ? `Free with ${item.includedIn.map(planName).join(" or ")}`
      : null;
  return (
    <Link
      href={`/bundles/${item.id}`}
      className="group flex h-full flex-col overflow-hidden rounded-card border border-border bg-surface transition-transform duration-[120ms] ease-out hover:-translate-y-px hover:shadow-md focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
    >
      <span className="relative block h-28">
        <PodCover cover={coverFor(item.id)} className="absolute inset-0" />
        <span className="absolute bottom-3 left-3 rounded-full bg-black/35 px-2.5 py-1 text-micro text-white uppercase backdrop-blur-sm">
          {item.papers === 1 ? "Paper" : `Bundle · ${item.papers} papers`}
        </span>
      </span>
      <span className="flex flex-1 flex-col gap-1 p-4">
        <span className="line-clamp-2 font-heading text-h3 font-medium">
          {item.title}
        </span>
        {item.description ? (
          <span className="line-clamp-2 text-small text-ink-muted">
            {item.description}
          </span>
        ) : null}
        <span className="text-small text-ink-muted">
          {item.questions} questions · answer keys
        </span>
        <span className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-3">
          <Standing item={item} />
          {plans ? (
            <span className="text-small text-ink-muted">{plans}</span>
          ) : null}
        </span>
      </span>
    </Link>
  );
}
