"use client";

import { Search, Store } from "lucide-react";
import { useState } from "react";

import { Chip } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";

import { StoreCard, type StoreItem } from "./store-card";

const FILTERS = [
  { key: "all", label: "All", test: () => true },
  { key: "free", label: "Free", test: (i: StoreItem) => i.pricePaise === null },
  { key: "plan", label: "In your plan", test: (i: StoreItem) => i.included },
  { key: "owned", label: "Owned", test: (i: StoreItem) => i.have },
] as const;

type FilterKey = (typeof FILTERS)[number]["key"];

/**
 * The Store's shelves: a search, a row of filters, and the items as cards, three across
 * on a wide screen and one on a phone.
 */
export function StoreBrowser({ items }: { items: StoreItem[] }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");
  const words = query.trim().toLowerCase();
  const test = FILTERS.find((f) => f.key === filter)!.test;
  const shown = items.filter(
    (i) =>
      test(i) &&
      (!words || `${i.title} ${i.description}`.toLowerCase().includes(words)),
  );
  // Filters with nothing behind them stay out of the way.
  const filters = FILTERS.filter(
    (f) => f.key === "all" || f.key === filter || items.some(f.test),
  );

  return (
    <section aria-labelledby="store-items" className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h2 id="store-items" className="font-heading text-h2 font-semibold">
          Papers and bundles
        </h2>
        <label className="relative md:w-72">
          <span className="sr-only">Search the store</span>
          <Search
            className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-ink-muted"
            aria-hidden
          />
          <Input
            type="search"
            placeholder="Search, e.g. police constable"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-10"
          />
        </label>
      </div>
      {filters.length > 1 ? (
        <div
          role="group"
          aria-label="Show"
          className="flex [scrollbar-width:none] gap-2 overflow-x-auto"
        >
          {filters.map((f) => (
            <Chip
              key={f.key}
              selected={filter === f.key}
              onClick={() => setFilter(f.key)}
            >
              {f.label}
            </Chip>
          ))}
        </div>
      ) : null}
      {shown.length === 0 ? (
        <EmptyState
          icon={Store}
          title="Nothing matches"
          description="Try another name, or clear the filter to see everything."
        />
      ) : (
        <ul
          aria-label="Store"
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {shown.map((item) => (
            <li key={item.id}>
              <StoreCard item={item} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
