import Link from "next/link";

import { PodCover } from "@/components/blocks/pod-cover";
import { Button } from "@/components/ui/button";

import { HeroWindow } from "./hero-window";
import { ctaHref } from "./section-heading";

/**
 * Quiet on purpose: the promise on the left, what it does on the right, one button,
 * then one window of the product on a cover-colour panel.
 */
export function Hero({ signedIn }: { signedIn: boolean }) {
  return (
    <section className="overflow-x-clip px-4 pt-12 pb-16 md:px-8 md:pt-20 md:pb-24">
      <div className="mx-auto grid max-w-content grid-cols-1 gap-6 lg:grid-cols-[1.25fr_1fr] lg:items-end lg:gap-16">
        <h1 className="text-[36px] leading-[44px] font-semibold tracking-[-0.03em] text-balance sm:text-[52px] sm:leading-[60px]">
          Your syllabus, one pod at a time.
        </h1>
        <div className="flex flex-col items-start gap-5 lg:pb-2">
          <p className="text-body text-pretty text-ink-muted sm:text-[17px] sm:leading-7">
            Every subject becomes a pod. Tick off topics as you go, keep your
            notes, PDFs and links where they belong, and watch your progress
            grow. On Pro, AI writes mock tests from your own notes.
          </p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <Button asChild variant="primary" size="lg">
              <Link href={ctaHref(signedIn)}>Get started free</Link>
            </Button>
            <span className="text-small text-ink-muted">
              Free during launch. No card needed.
            </span>
          </div>
        </div>
      </div>

      <div className="relative isolate mx-auto mt-12 max-w-content overflow-hidden rounded-[28px] px-4 pt-8 sm:px-10 sm:pt-12 md:mt-16 md:px-16 md:pt-16">
        <PodCover
          cover={{ kind: "gradient", preset: "dusk" }}
          className="absolute inset-0 -z-10"
        />
        {/* The window sits low and runs off the bottom of the panel. */}
        <HeroWindow />
      </div>
    </section>
  );
}
