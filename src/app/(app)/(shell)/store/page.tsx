import { Store, Tag } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { DiscoverHero } from "@/features/groups/components/discover/discover-hero";
import { StoreBrowser } from "@/features/omr/components/store-browser";
import { StoreHeroArt } from "@/features/omr/components/store-hero-art";
import { formatRule, frac } from "@/lib/omr/fraction";
import { requireUser } from "@/server/auth/session";
import { bundleService } from "@/server/services/omr";

export const metadata: Metadata = { title: "Store" };

/** What a wrong answer costs across an item's papers: "1/3", "None", or "Varies". */
function penaltyOf(penalties: { n: number; d: number }[]) {
  const rules = new Set(
    penalties.map((p) => (p.n === 0 ? "None" : formatRule(frac(p.n, p.d)))),
  );
  return rules.size === 1 ? [...rules][0]! : "Varies";
}

const SellButton = () => (
  <Button asChild>
    <Link href="/store/sell">
      <Tag aria-hidden /> Sell your papers
    </Link>
  </Button>
);

/**
 * The Store: the studypods library and sellers' approved listings, as Discord's Shop.
 * Free ones to add, priced ones to buy, and the ones a plan includes. Each card opens
 * the item's page, where it's added, bought or sat. Anyone may sell their own papers.
 */
export default async function StorePage() {
  const user = await requireUser();
  const library = await bundleService.library(user);
  const items = library.map((b) => ({
    id: b.id,
    title: b.title,
    description: b.description,
    papers: b.papers.length,
    questions: b.papers.reduce((sum, p) => sum + p.questions, 0),
    minutes: b.papers.every((p) => p.limitMin)
      ? b.papers.reduce((sum, p) => sum + p.limitMin!, 0)
      : null,
    penalty: penaltyOf(b.papers.map((p) => p.penalty)),
    pricePaise: b.pricePaise,
    have: b.have,
    included: b.included,
    includedIn: b.includedIn,
    seller: b.library ? null : b.by,
    officialKey: b.officialKey,
    mine: b.owner,
  }));
  // Bundles lead, as the Shop's bundles do; newest first within each.
  items.sort((a, b) => Number(b.papers > 1) - Number(a.papers > 1));

  return (
    <div data-wide className="flex flex-col gap-8">
      <DiscoverHero
        title="Store"
        detail="Previous year papers and bundles. Sit them on the OMR sheet with a timer and see your exact score."
        preset="dusk"
        full
        art={<StoreHeroArt />}
      />
      <div className="mx-auto w-full max-w-content px-4 md:px-8">
        {items.length === 0 ? (
          <EmptyState
            icon={Store}
            title="The store is stocking up"
            description="Papers and bundles show up here as they're added. Have your own with answer keys? Sell them here."
            action={<SellButton />}
          />
        ) : (
          <div className="flex flex-col gap-6">
            <StoreBrowser items={items} />
            <aside className="flex flex-col gap-3 rounded-card border border-border bg-surface p-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-body">
                <span className="font-medium">
                  Have papers with answer keys?
                </span>{" "}
                <span className="text-ink-muted">
                  Sell them here, free or priced. An admin checks each one
                  first.
                </span>
              </p>
              <SellButton />
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}
