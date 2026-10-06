import { ChevronLeft, Search } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { fieldClasses, Input } from "@/components/ui/input";
import { Snippet } from "@/features/pods/components/snippet";
import { requireUser } from "@/server/auth/session";
import { itemService } from "@/server/services/pods";
import { cn } from "@/lib/utils/cn";

export const metadata: Metadata = { title: "Search pods" };

const TYPES = {
  NOTE: "Notes",
  LINK: "Links",
  FILE: "PDFs",
  IMAGE: "Photos",
} as const;
type ItemType = keyof typeof TYPES;

export default async function PodSearchPage({
  searchParams,
}: PageProps<"/pods/search">) {
  const user = await requireUser();
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.slice(0, 200) : "";
  const type =
    typeof params.type === "string" && params.type in TYPES
      ? (params.type as ItemType)
      : undefined;
  const results = q ? await itemService.search(user, q, { type }) : null;
  const none =
    results && results.items.length === 0 && results.topics.length === 0;

  return (
    <>
      <Link
        href="/pods"
        className="mb-3 -ml-1 inline-flex min-h-11 items-center gap-1 text-small font-medium text-ink-muted hover:text-ink md:min-h-0"
      >
        <ChevronLeft className="size-4" aria-hidden /> Pods
      </Link>
      <PageHeader title="Search pods" />
      <form
        role="search"
        className="mb-6 flex flex-col gap-2 sm:flex-row"
        action="/pods/search"
      >
        <Input
          name="q"
          type="search"
          defaultValue={q}
          aria-label="Search your notes, links, files and topics"
          placeholder="Notes, links, files, topics"
          className="sm:flex-1"
        />
        <select
          name="type"
          defaultValue={type ?? ""}
          aria-label="Type"
          className={cn(fieldClasses, "h-11 appearance-auto sm:w-40 md:h-10")}
        >
          <option value="">Everything</option>
          {Object.entries(TYPES).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <Button type="submit" variant="primary">
          <Search aria-hidden /> Search
        </Button>
      </form>

      {none ? (
        <EmptyState
          icon={Search}
          title="Nothing found"
          description="Try fewer or shorter words."
        />
      ) : null}
      {results && results.topics.length > 0 ? (
        <section
          aria-labelledby="topic-results"
          className="mb-6 flex flex-col gap-2"
        >
          <h2 id="topic-results" className="text-h3">
            Topics
          </h2>
          <ul className="divide-y divide-border rounded-card border border-border bg-surface">
            {results.topics.map((t) => (
              <li key={`${t.podId}-${t.topicId}`}>
                <Link
                  href={`/pods/${t.podId}/topics/${t.topicId}`}
                  className="flex min-h-12 flex-col justify-center px-4 py-2 hover:bg-surface-muted"
                >
                  <span className="text-body font-medium">{t.name}</span>
                  <span className="text-small text-ink-muted">{t.podName}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {results && results.items.length > 0 ? (
        <section aria-labelledby="item-results" className="flex flex-col gap-2">
          <h2 id="item-results" className="text-h3">
            Material
          </h2>
          <ul className="divide-y divide-border rounded-card border border-border bg-surface">
            {results.items.map((item) => (
              <li key={item.id}>
                <Link
                  href={`/pods/${item.podId}/items/${item.id}`}
                  className="flex min-h-12 flex-col gap-0.5 px-4 py-2 hover:bg-surface-muted"
                >
                  <span className="text-body font-medium">{item.title}</span>
                  <span className="text-small text-ink-muted">
                    {TYPES[item.type]} in {item.podName}
                  </span>
                  {item.snippet?.trim() ? (
                    <Snippet text={item.snippet} />
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </>
  );
}
