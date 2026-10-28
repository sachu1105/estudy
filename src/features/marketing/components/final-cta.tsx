import { ArrowUpRight } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/ui/reveal";

import { Band } from "./frame";
import { ctaHref, ctaLabel } from "./section-heading";

/**
 * The page's last word, on a stretch of the sheet with a faint drafting grid behind it.
 * The grid is lines in the border colour, faded out towards the edges; not a gradient.
 */
export function FinalCta({ signedIn }: { signedIn: boolean }) {
  return (
    <Band
      aria-labelledby="cta-title"
      inner="isolate overflow-hidden px-4 py-20 md:px-8 md:py-28"
    >
      <svg
        aria-hidden
        className="absolute inset-0 -z-10 size-full mask-[radial-gradient(ellipse_at_center,black_20%,transparent_75%)] text-border"
      >
        <defs>
          <pattern
            id="cta-grid"
            width="28"
            height="28"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(45)"
          >
            <path d="M28 0H0V28" fill="none" stroke="currentColor" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#cta-grid)" />
      </svg>

      <Reveal className="flex flex-col items-center gap-8 text-center">
        <h2
          id="cta-title"
          className="max-w-2xl text-[32px] leading-10 tracking-[-0.03em] text-balance sm:text-[48px] sm:leading-14"
        >
          {signedIn
            ? "Your pods are waiting. Pick up where you left off."
            : "Your exam date is set. Your plan can be ready in five minutes."}
        </h2>
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
          <Button
            asChild
            variant="primary"
            size="lg"
            className="w-full sm:w-auto"
          >
            <Link href={ctaHref(signedIn)}>{ctaLabel(signedIn)}</Link>
          </Button>
          <Button
            asChild
            variant="secondary"
            size="lg"
            className="w-full sm:w-auto"
          >
            <a href="#features">
              See what&apos;s inside
              <ArrowUpRight aria-hidden />
            </a>
          </Button>
        </div>
      </Reveal>
    </Band>
  );
}
