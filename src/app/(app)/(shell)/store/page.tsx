import { Store } from "lucide-react";
import type { Metadata } from "next";

import { EmptyState } from "@/components/ui/empty-state";
import { DiscoverHero } from "@/features/groups/components/discover/discover-hero";
import { StoreBrowser } from "@/features/omr/components/store-browser";
import { StoreHeroArt } from "@/features/omr/components/store-hero-art";
import { requireUser } from "@/server/auth/session";
import { bundleService } from "@/server/services/omr";

export const metadata: Metadata = { title: "Store" };

/**
 * The Store: every paper and bundle in the studypods library, as Discord's Shop. Free
 * ones to add, priced ones to buy, and the ones a plan includes. Each card opens the
 * item's page, where it's added, bought or sat.
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
    pricePaise: b.pricePaise,
    have: b.have,
    included: b.included,
    includedIn: b.includedIn,
  }));
  // Bundles lead, as the Shop's bundles do; newest first within each.
  items.sort((a, b) => Number(b.papers > 1) - Number(a.papers > 1));

  return (
    <div data-wide className="flex flex-col gap-8">
      <DiscoverHero
        title="Store"
        detail="Previous year papers and bundles, each with its answer key. Sit them on the OMR sheet with a timer and see your exact score."
        preset="dusk"
        full
        art={<StoreHeroArt />}
      />
      <div className="mx-auto w-full max-w-content px-4 md:px-8">
        {items.length === 0 ? (
          <EmptyState
            icon={Store}
            title="The store is stocking up"
            description="Papers and bundles show up here as they're added. Until then, upload your own in Tests."
          />
        ) : (
          <StoreBrowser items={items} />
        )}
      </div>
    </div>
  );
}
