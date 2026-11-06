import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { BundleHero } from "@/features/omr/components/bundle/bundle-hero";
import { BundlePanel } from "@/features/omr/components/bundle/bundle-panel";
import { BundlePapers } from "@/features/omr/components/bundle/bundle-papers";
import { isId } from "@/lib/ids";
import { requireUser } from "@/server/auth/session";
import { bundleService, omrService } from "@/server/services/omr";

export const metadata: Metadata = { title: "Bundle" };

/**
 * A bundle of question papers, laid out as a store's product page: its cover and name,
 * then its papers beside a panel with where the reader stands, the one thing to do and
 * what having it gives. On a phone the panel comes first.
 */
export default async function BundlePage({
  params,
}: PageProps<"/bundles/[bundleId]">) {
  const user = await requireUser();
  const { bundleId } = await params;
  const bundle = isId(bundleId)
    ? await bundleService.get(user, bundleId)
    : null;
  if (!bundle) notFound();
  const open = bundle.have || bundle.owner;
  // Where the reader stands on each paper: attempted, how often, the last score.
  const sat = new Map(
    (open
      ? await omrService.list(
          user,
          bundle.papers.map((p) => p.id),
        )
      : []
    ).map((p) => [p.id, p]),
  );
  const questions = bundle.papers.reduce((n, p) => n + p.questions, 0);
  const squad = bundle.squad
    ? ` in ${bundle.squad.name}${bundle.channel ? ` · #${bundle.channel.name}` : ""}`
    : "";
  const from = bundle.library
    ? "From the studypods store"
    : `By ${bundle.by}${squad}`;
  const back = bundle.library
    ? { href: "/store", label: "Store" }
    : { href: "/tests", label: "Tests" };

  return (
    <div className="flex flex-col gap-6">
      <Link
        href={back.href}
        className="-mb-2 -ml-2 inline-flex min-h-11 items-center gap-1.5 self-start rounded-control px-2 text-small font-medium text-ink-muted hover:bg-surface-muted hover:text-ink"
      >
        <ArrowLeft className="size-4" aria-hidden /> {back.label}
      </Link>
      <BundleHero
        id={bundle.id}
        title={bundle.title}
        kicker={
          bundle.papers.length === 1
            ? "Paper"
            : `Bundle · ${bundle.papers.length} papers`
        }
        from={from}
      />
      <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_20rem] md:items-start">
        <aside className="md:sticky md:top-6 md:col-start-2 md:row-start-1">
          <BundlePanel
            papers={bundle.papers.length}
            questions={questions}
            bundle={{
              id: bundle.id,
              title: bundle.title,
              pricePaise: bundle.pricePaise,
              owner: bundle.owner,
              have: bundle.have,
              hidden: bundle.hidden,
              selling: bundle.selling,
              holders: bundle.holders,
              included: bundle.included,
              library: bundle.library,
              includedIn: bundle.includedIn,
            }}
          />
        </aside>
        <div className="flex min-w-0 flex-col gap-6 md:col-start-1 md:row-start-1">
          {bundle.description ? (
            <section aria-labelledby="about" className="flex flex-col gap-2">
              <h2 id="about" className="font-heading text-h2 font-semibold">
                About
              </h2>
              <p className="text-body whitespace-pre-line text-ink-muted">
                {bundle.description}
              </p>
            </section>
          ) : null}
          <BundlePapers
            open={open}
            papers={bundle.papers.map((p) => {
              const mine = sat.get(p.id);
              return {
                id: p.id,
                title: p.title,
                questions: p.questions,
                limitMin: p.limitMin,
                sat: mine
                  ? {
                      marks: mine.marks,
                      timer: mine.timer,
                      attempts: mine.attempts,
                      last: mine.last,
                    }
                  : null,
              };
            })}
          />
        </div>
      </div>
    </div>
  );
}
