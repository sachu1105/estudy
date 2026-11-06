import { ChevronRight, FileCheck2, Lock } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/shell/page-header";
import { Card } from "@/components/ui/card";
import { PaidMark } from "@/features/groups/components/pay/paid-mark";
import { BundleGet } from "@/features/omr/components/bundle-get";
import { isId } from "@/lib/ids";
import { rupees } from "@/lib/pricing/pricing";
import { requireUser } from "@/server/auth/session";
import { bundleService } from "@/server/services/omr";

export const metadata: Metadata = { title: "Bundle" };

// A bundle of question papers: what's in it, its price, and (once you have it) a way
// into each paper.
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
  const where = bundle.squad
    ? ` in ${bundle.squad.name}${bundle.channel ? ` · #${bundle.channel.name}` : ""}`
    : "";

  return (
    <>
      <PageHeader
        title={bundle.title}
        badge={bundle.pricePaise === null ? undefined : <PaidMark />}
        description={
          bundle.library
            ? "From the studypods library"
            : `Bundle by ${bundle.by}${where}`
        }
      />
      <div className="flex flex-col gap-6">
        <Card className="flex flex-col gap-4 p-5">
          {bundle.description ? (
            <p className="text-body whitespace-pre-line">
              {bundle.description}
            </p>
          ) : null}
          <p className="text-small text-ink-muted">
            {bundle.papers.length} paper{bundle.papers.length === 1 ? "" : "s"}{" "}
            ·{" "}
            {bundle.pricePaise === null
              ? "Free"
              : `${rupees(bundle.pricePaise)} once, yours for good`}{" "}
            · each paper&apos;s key shows after you sit it
          </p>
          <BundleGet
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
              includedIn: bundle.includedIn,
            }}
          />
        </Card>
        <section
          aria-labelledby="bundle-papers"
          className="flex flex-col gap-3"
        >
          <h2 id="bundle-papers" className="font-heading text-h2 font-semibold">
            Papers
          </h2>
          <ul className="divide-y divide-border overflow-hidden rounded-card border border-border bg-surface">
            {bundle.papers.map((p) => {
              const body = (
                <>
                  <FileCheck2
                    className="size-5 shrink-0 text-ink-muted"
                    aria-hidden
                  />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-body font-medium">
                      {p.title.replaceAll("_", " ")}
                    </span>
                    <span className="text-small text-ink-muted">
                      {p.questions} questions
                      {p.limitMin ? ` · ${p.limitMin} min` : ""}
                    </span>
                  </span>
                  {open ? (
                    <ChevronRight
                      className="size-4 shrink-0 text-ink-muted"
                      aria-hidden
                    />
                  ) : (
                    <Lock
                      className="size-4 shrink-0 text-ink-muted"
                      aria-label="Locked"
                    />
                  )}
                </>
              );
              return (
                <li key={p.id}>
                  {open ? (
                    <Link
                      href={`/omr/${p.id}`}
                      className="flex min-h-14 items-center gap-3 px-4 py-2 hover:bg-surface-muted"
                    >
                      {body}
                    </Link>
                  ) : (
                    <div className="flex min-h-14 items-center gap-3 px-4 py-2">
                      {body}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </>
  );
}
