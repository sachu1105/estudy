import { Check, Files, FileText } from "lucide-react";
import Link from "next/link";

import { Notch } from "@/components/blocks/notch";
import { PodMark } from "@/components/blocks/pod-cover";
import { buttonVariants } from "@/components/ui/button";
import { coverFor } from "@/lib/pods/covers";
import { rupees } from "@/lib/pricing/pricing";
import { cn } from "@/lib/utils/cn";

export type StoreItem = {
  id: string;
  title: string;
  description: string;
  papers: number;
  questions: number;
  /** Every paper's time limit added up; null when a paper has none. */
  minutes: number | null;
  /** What a wrong answer costs: "1/3", "None", or "Varies" across a bundle. */
  penalty: string;
  pricePaise: number | null;
  /** The reader can sit it: bought, added, or in their plan. */
  have: boolean;
  /** In the reader's plan (a real subscription). */
  included: boolean;
  /** The plans that include it. */
  includedIn: string[];
  /** Who sells it: a seller's name, or null for the studypods library. */
  seller: string | null;
  /** Every key is the official one; otherwise it's the seller's own. */
  officialKey: boolean;
  /** The reader made it. */
  mine: boolean;
};

export const planName = (p: string) =>
  p === "PRO" ? "Pro" : p === "ELITE" ? "Elite" : p;

/** Short enough for a third of a card: "75 min", then "2.5 h". */
const hours = (m: number) =>
  m <= 120 ? `${m} min` : `${Number((m / 60).toFixed(1))} h`;

/** Three facts across, each a micro label over its value. */
function Facts({ item }: { item: StoreItem }) {
  const facts = [
    item.papers > 1
      ? { label: "Papers", value: String(item.papers) }
      : { label: "Questions", value: String(item.questions) },
    item.papers > 1
      ? { label: "Questions", value: String(item.questions) }
      : {
          label: "Time",
          value: item.minutes ? hours(item.minutes) : "Untimed",
        },
    {
      label: "Negative",
      value:
        item.penalty === "None"
          ? "None"
          : item.penalty === "Varies"
            ? "Varies"
            : `−${item.penalty}`,
    },
  ];
  return (
    <dl className="grid grid-cols-3 divide-x divide-border">
      {facts.map((f) => (
        <div
          key={f.label}
          className="flex min-w-0 flex-col gap-0.5 px-3 first:pl-0 last:pr-0"
        >
          <dt className="text-micro text-ink-muted uppercase">{f.label}</dt>
          <dd className="truncate text-body font-medium">{f.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** The footer band: where the reader stands with it, and what opening it lets them do. */
function Footer({ item }: { item: StoreItem }) {
  const yours = item.included || item.have;
  const free = item.pricePaise === null;
  const withPlan =
    !yours && !free && item.includedIn.length
      ? `Free with ${item.includedIn.map(planName).join(" or ")}`
      : null;
  return (
    <span className="flex min-h-18 items-center justify-between gap-3 rounded-b-card border-t border-border bg-surface-muted px-4 py-3">
      <span className="flex min-w-0 flex-col">
        {yours ? (
          <span className="flex items-center gap-1.5 font-heading text-h3 font-medium">
            <Check className="size-4 text-success" aria-hidden />
            {item.mine ? "Yours" : item.included ? "In your plan" : "Owned"}
          </span>
        ) : (
          <span className="font-heading text-h2 font-semibold tabular-nums">
            {free ? "Free" : rupees(item.pricePaise!)}
          </span>
        )}
        {withPlan ? (
          <span className="truncate text-small text-ink-muted">{withPlan}</span>
        ) : null}
      </span>
      {/* The whole card is the link; this only says what opening it is for. */}
      <span
        aria-hidden
        className={cn(
          buttonVariants({ variant: "secondary", size: "md" }),
          "pointer-events-none min-w-20 group-active:translate-x-[-2px] group-active:translate-y-[2px] group-active:shadow-ledge-neutral-pressed",
        )}
      >
        {yours ? "Open" : free ? "Add" : "Buy"}
      </span>
    </span>
  );
}

/**
 * One item in the Store, as a listing card: a pocket in the corner says what it is, then
 * its face and maker, the name, three facts, a line about it, and a footer band with the
 * price (or that it's yours). The whole card opens the item's page.
 */
export function StoreCard({ item }: { item: StoreItem }) {
  const bundle = item.papers > 1;
  return (
    <Link
      href={`/bundles/${item.id}`}
      className="group relative flex h-full flex-col rounded-card bg-surface ring-1 ring-border transition-transform duration-[120ms] ease-out hover:-translate-y-px focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
    >
      <Notch>
        <span className="flex h-8 items-center gap-1.5 rounded-full bg-surface px-3 text-micro text-ink-muted uppercase ring-1 ring-border [&_svg]:size-3.5">
          {bundle ? <Files aria-hidden /> : <FileText aria-hidden />}
          {bundle ? `Bundle · ${item.papers}` : "Paper"}
        </span>
      </Notch>
      <span className="flex flex-1 flex-col gap-4 p-4 pt-4">
        {/* Kept clear of the corner pocket. */}
        <span className="flex items-center gap-3 pr-28">
          <PodMark cover={coverFor(item.id)} name={item.title} />
          {/* Who sells it, and whose key it is: the app never vouches for one. */}
          <span className="flex min-w-0 flex-col">
            <span className="truncate text-small font-medium">
              {item.seller ?? "studypods"}
            </span>
            <span className="truncate text-small text-ink-muted">
              {item.officialKey ? "Official key" : "Own key"}
            </span>
          </span>
        </span>
        <span className="line-clamp-2 font-heading text-h2 font-semibold">
          {item.title}
        </span>
        <Facts item={item} />
        {item.description ? (
          <span className="line-clamp-3 text-small text-ink-muted">
            {item.description}
          </span>
        ) : null}
      </span>
      <Footer item={item} />
    </Link>
  );
}
