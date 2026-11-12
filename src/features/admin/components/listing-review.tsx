"use client";

import { Check, X } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { rupees } from "@/lib/pricing/pricing";

import { reviewListingAction } from "../library-actions";
import { ReasonDialog } from "./reason-dialog";
import { useAdminRun } from "./use-admin-run";

export type ListingEntry = {
  id: string;
  title: string;
  description: string;
  pricePaise: number | null;
  live: boolean;
  /** When the seller asked, already formatted. */
  asked: string | null;
  seller: { displayName: string; email: string };
  squad: string | null;
  holders: number;
  papers: {
    id: string;
    title: string;
    questions: number;
    keyed: boolean;
    official: boolean;
  }[];
};

/**
 * One seller's listing for review: who sells it, the price, and each paper with its key
 * (opened as the admin's own stamped copy). Approve it, or send it back with a note the
 * seller reads; a live one is taken down the same way.
 */
export function ListingReview({ entry }: { entry: ListingEntry }) {
  const { run, withRefresh, pending } = useAdminRun();
  const sendBack = withRefresh((note) =>
    reviewListingAction({ id: entry.id, op: "reject", note }),
  );
  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="min-w-0 flex-1 truncate font-heading text-h3">
          {entry.title}
        </h3>
        <Badge tone={entry.live ? "accent" : "neutral"}>
          {entry.live ? "Live" : "Waiting"}
        </Badge>
      </div>
      <p className="text-small text-ink-muted">
        By {entry.seller.displayName} ({entry.seller.email})
        {entry.squad ? ` · also in ${entry.squad}` : ""} ·{" "}
        {entry.pricePaise === null ? "Free" : rupees(entry.pricePaise)}
        {entry.asked ? ` · asked ${entry.asked}` : ""}
        {entry.live ? ` · ${entry.holders} have it` : ""}
      </p>
      {entry.description ? (
        <p className="text-small whitespace-pre-line">{entry.description}</p>
      ) : null}
      <ul className="flex flex-col divide-y divide-border rounded-control border border-border">
        {entry.papers.map((p) => (
          <li key={p.id}>
            <Link
              href={`/omr/${p.id}`}
              className="flex min-h-12 items-center gap-3 px-3 py-2 hover:bg-surface-muted"
            >
              <span className="min-w-0 flex-1 truncate text-body">
                {p.title.replaceAll("_", " ")}
              </span>
              <span className="flex shrink-0 items-center gap-1 text-small text-ink-muted">
                {p.questions} Q ·{" "}
                {p.keyed ? (
                  <Check className="size-3.5 text-success" aria-hidden />
                ) : (
                  <X className="size-3.5 text-danger" aria-hidden />
                )}
                {p.keyed ? "keyed" : "key incomplete"} ·{" "}
                {p.official ? "official" : "own"}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap gap-2">
        {entry.live ? null : (
          <Button
            disabled={pending}
            onClick={() =>
              run(
                () =>
                  reviewListingAction({
                    id: entry.id,
                    op: "approve",
                    note: null,
                  }),
                "Approved. It's live in the Store.",
              )
            }
          >
            <Check aria-hidden /> Approve
          </Button>
        )}
        <ReasonDialog
          trigger={entry.live ? "Take down" : "Send back"}
          title={
            entry.live
              ? `Take down ${entry.title}?`
              : `Send back ${entry.title}?`
          }
          description={
            entry.live
              ? "It leaves the Store; everyone who has it keeps it. The seller reads your note."
              : "The seller reads your note, fixes it and can send it again."
          }
          confirm={entry.live ? "Take down" : "Send back"}
          danger={entry.live}
          label="Note to the seller"
          placeholder="What to change, e.g. the key for Q12 looks wrong"
          run={sendBack}
          done={entry.live ? "Taken down." : "Sent back."}
        />
      </div>
    </Card>
  );
}
