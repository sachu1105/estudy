import type { Metadata } from "next";

import { PageHeader } from "@/components/shell/page-header";
import { Card } from "@/components/ui/card";
import { LibraryList } from "@/features/admin/components/library-list";
import { ListingReview } from "@/features/admin/components/listing-review";
import { StoreCutForm } from "@/features/admin/components/store-cut-form";
import { DEFAULT_STORE_CUT_PERCENT } from "@/lib/omr/store";
import { requireAdmin } from "@/server/services/admin";
import {
  bundleService,
  omrService,
  storeListingService,
} from "@/server/services/omr";
import { getSetting } from "@/server/settings";

export const metadata: Metadata = { title: "Papers · Admin" };

const asked = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  timeZone: "Asia/Kolkata",
});

// The Store: sellers' listings to review (rule 5), studypods' share of their sales, and
// the app's own library of papers, built from papers the admin uploaded in Tests.
export default async function AdminPapers() {
  const admin = await requireAdmin("papers");
  const [entries, papers, listings, cut] = await Promise.all([
    bundleService.adminList(),
    omrService.list({ id: admin.id, subscription: null }),
    storeListingService.adminListings(),
    getSetting("storeCut"),
  ]);
  const waiting = listings.filter((l) => l.listing === "PENDING");
  const live = listings.filter((l) => l.listing === "LIVE");
  const toEntry = (l: (typeof listings)[number]) => ({
    ...l,
    live: l.listing === "LIVE",
    asked: l.listedAt ? asked.format(l.listedAt) : null,
  });

  return (
    <>
      <PageHeader
        title="Papers"
        description="What everyone sees in the Store: sellers' listings once you approve them, and the studypods library. Build library entries from papers you uploaded in Tests, with their answer keys."
      />
      <div className="flex flex-col gap-8">
        <section aria-labelledby="waiting" className="flex flex-col gap-3">
          <h2 id="waiting" className="font-heading text-h2 font-semibold">
            Waiting for review · {waiting.length}
          </h2>
          {waiting.length === 0 ? (
            <p className="rounded-card border border-dashed border-border p-6 text-center text-small text-ink-muted">
              Nothing to review. Sellers&apos; listings show up here before
              anyone sees them.
            </p>
          ) : (
            <ul aria-label="Waiting for review" className="flex flex-col gap-3">
              {waiting.map((l) => (
                <li key={l.id}>
                  <ListingReview entry={toEntry(l)} />
                </li>
              ))}
            </ul>
          )}
        </section>
        {live.length > 0 ? (
          <section aria-labelledby="sellers" className="flex flex-col gap-3">
            <h2 id="sellers" className="font-heading text-h2 font-semibold">
              Live from sellers · {live.length}
            </h2>
            <ul aria-label="Live from sellers" className="flex flex-col gap-3">
              {live.map((l) => (
                <li key={l.id}>
                  <ListingReview entry={toEntry(l)} />
                </li>
              ))}
            </ul>
          </section>
        ) : null}
        <Card className="p-5">
          <StoreCutForm percent={cut?.percent ?? DEFAULT_STORE_CUT_PERCENT} />
        </Card>
        <section aria-labelledby="library" className="flex flex-col gap-3">
          <h2 id="library" className="font-heading text-h2 font-semibold">
            studypods library
          </h2>
          <LibraryList
            papers={papers.map((p) => ({
              id: p.id,
              title: p.title,
              questions: p.shape.questions,
              keyed: p.keyed,
            }))}
            entries={entries.map((e) => ({
              id: e.id,
              title: e.title,
              description: e.description,
              paperIds: e.papers.map((p) => p.id),
              papers: e.papers.length,
              rupees: e.pricePaise === null ? null : e.pricePaise / 100,
              includedIn: e.includedIn.filter(
                (p): p is "PRO" | "ELITE" => p !== "FREE",
              ),
              published: e.publishedAt !== null,
              holders: e.holders,
            }))}
          />
        </section>
      </div>
    </>
  );
}
