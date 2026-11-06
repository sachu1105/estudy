import type { Metadata } from "next";

import { PageHeader } from "@/components/shell/page-header";
import { LibraryList } from "@/features/admin/components/library-list";
import { requireAdmin } from "@/server/services/admin";
import { bundleService, omrService } from "@/server/services/omr";

export const metadata: Metadata = { title: "Papers · Admin" };

// The app's own library of question papers: single papers or bundles, free, priced, or
// included in plans, built from papers the admin uploaded in Tests.
export default async function AdminPapers() {
  const admin = await requireAdmin("papers");
  const [entries, papers] = await Promise.all([
    bundleService.adminList(),
    omrService.list({ id: admin.id, subscription: null }),
  ]);
  return (
    <>
      <PageHeader
        title="Papers"
        description="The library everyone sees in Tests. List one paper or a bundle, free or priced, and choose the plans that include it. Build from papers you uploaded in Tests, with their answer keys."
      />
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
    </>
  );
}
