"use client";

import { Store } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "@/components/ui/toast";

import { listingAction } from "../../store-actions";

type Listing = "PENDING" | "LIVE" | "REJECTED" | null;

const COPY: Record<
  Exclude<Listing, null> | "NONE",
  {
    badge: string | null;
    text: string;
    action: "list" | "withdraw";
    label: string;
  }
> = {
  NONE: {
    badge: null,
    text: "Sell it to everyone, not only your squad. An admin checks it first.",
    action: "list",
    label: "List in the Store",
  },
  PENDING: {
    badge: "Waiting for review",
    text: "An admin is checking it. You'll get a notification either way.",
    action: "withdraw",
    label: "Withdraw",
  },
  LIVE: {
    badge: "Live in the Store",
    text: "Anyone can find it in the Store. Taking it out keeps it for whoever has it.",
    action: "withdraw",
    label: "Take out of the Store",
  },
  REJECTED: {
    badge: "Sent back",
    text: "Fix what the note says (keys are edited on each paper), then send it again.",
    action: "list",
    label: "Send again",
  },
};

/** For a bundle's maker: where it stands in the Store, and the one thing to do next. */
export function StoreListingCard({
  id,
  listing,
  note,
}: {
  id: string;
  listing: Listing;
  note: string | null;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const copy = COPY[listing ?? "NONE"];

  const act = () =>
    start(async () => {
      const result = await listingAction({ id, op: copy.action });
      if (!result.ok) return void toast.error(result.error);
      toast.success(
        copy.action === "list"
          ? "Sent for review."
          : listing === "LIVE"
            ? "Taken out of the Store."
            : "Withdrawn.",
      );
      router.refresh();
    });

  return (
    <Card className="flex flex-col gap-3 p-5" aria-labelledby={`${id}-store`}>
      <div className="flex flex-wrap items-center gap-2">
        <Store className="size-4 text-ink-muted" aria-hidden />
        <h2 id={`${id}-store`} className="font-heading text-h3 font-medium">
          Store
        </h2>
        {copy.badge ? (
          <Badge tone={listing === "LIVE" ? "accent" : "neutral"}>
            {copy.badge}
          </Badge>
        ) : null}
      </div>
      <p className="text-small text-ink-muted">{copy.text}</p>
      {listing === "REJECTED" && note ? (
        <p className="rounded-control bg-surface-muted p-3 text-small">
          <span className="font-medium">From the review: </span>
          {note}
        </p>
      ) : null}
      <Button
        variant={copy.action === "list" ? "secondary" : "ghost"}
        className="self-start"
        disabled={pending}
        onClick={act}
      >
        {copy.label}
      </Button>
    </Card>
  );
}
