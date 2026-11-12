import { ArrowLeft, FileText } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { SellForm } from "@/features/omr/components/sell/sell-form";
import { DEFAULT_STORE_CUT_PERCENT } from "@/lib/omr/store";
import { requireUser } from "@/server/auth/session";
import { omrService, storeListingService } from "@/server/services/omr";
import { getSetting } from "@/server/settings";

export const metadata: Metadata = { title: "Sell in the Store" };

/**
 * Sell your own papers in the Store. Pick papers uploaded in Tests with complete keys,
 * name it, price it (when the plan sells) and send it to an admin for review.
 */
export default async function SellPage() {
  const user = await requireUser();
  const [listed, canPrice, cut] = await Promise.all([
    omrService.list(user),
    storeListingService.canPrice(user),
    getSetting("storeCut"),
  ]);
  const papers = listed
    .filter((p) => p.owner)
    .map((p) => ({
      id: p.id,
      title: p.title,
      questions: p.shape.questions,
      keyed: p.keyed,
      official: p.keySource === "OFFICIAL",
    }));

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <Link
        href="/store"
        className="-mb-2 -ml-2 inline-flex min-h-11 items-center gap-1.5 self-start rounded-control px-2 text-small font-medium text-ink-muted hover:bg-surface-muted hover:text-ink"
      >
        <ArrowLeft className="size-4" aria-hidden /> Store
      </Link>
      <PageHeader
        title="Sell in the Store"
        description="List one paper or a bundle of your own, with complete answer keys. An admin checks it first; you'll get a notification when it's live."
      />
      {papers.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No papers to sell yet"
          description="Upload a question paper in Tests and fill in its answer key. Then come back to list it."
          action={
            <Button asChild variant="primary">
              <Link href="/tests">Go to Tests</Link>
            </Button>
          }
        />
      ) : (
        <SellForm
          papers={papers}
          canPrice={canPrice}
          cutPercent={cut?.percent ?? DEFAULT_STORE_CUT_PERCENT}
        />
      )}
    </div>
  );
}
