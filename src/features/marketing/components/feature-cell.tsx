import { ArrowUpRight, Check } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

export type Feature = {
  title: string;
  body: string;
  points: string[];
  link: { label: string; href: string };
  scene: ReactNode;
};

/**
 * One cell of the features grid: the claim, the points that back it, a way in, then a
 * picture of the product that runs off the cell's edge.
 */
export function FeatureCell({
  feature,
  className,
}: {
  feature: Feature;
  className?: string;
}) {
  return (
    <article className={cn("flex min-w-0 flex-col overflow-hidden", className)}>
      <div className="flex flex-col items-start px-4 pt-10 sm:px-8 lg:px-12 lg:pt-12">
        <h3 className="text-h2 text-balance sm:text-h1">{feature.title}</h3>
        <p className="mt-2 max-w-[56ch] text-body text-pretty text-ink-muted">
          {feature.body}
        </p>
        <ul className="mt-5 flex flex-col gap-2">
          {feature.points.map((point) => (
            <li key={point} className="flex gap-2.5 text-body text-ink">
              <Check className="mt-1 size-4 shrink-0 text-accent" aria-hidden />
              {point}
            </li>
          ))}
        </ul>
        <Button asChild variant="secondary" className="mt-6">
          <Link href={feature.link.href}>
            {feature.link.label}
            <ArrowUpRight aria-hidden />
          </Link>
        </Button>
      </div>
      <div aria-hidden className="relative mt-10 min-h-[22rem] flex-1">
        {feature.scene}
      </div>
    </article>
  );
}
