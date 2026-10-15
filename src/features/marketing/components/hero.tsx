import Link from "next/link";

import { PodCover } from "@/components/blocks/pod-cover";
import { Button } from "@/components/ui/button";

import { HeroWindow } from "./hero-window";
import { ctaHref, ctaLabel } from "./section-heading";

/**
 * Quiet on purpose: the promise on the left, what it does on the right, one button,
 * then one window of the product on a cover-colour panel.
 */
export function Hero({ signedIn }: { signedIn: boolean }) {
  return (
    <section className="overflow-x-clip px-4 pt-12 pb-16 md:px-8 md:pt-20 md:pb-24">
      <div className="mx-auto grid max-w-content grid-cols-1 gap-6 lg:grid-cols-[1.5fr_1fr] lg:gap-16">
        <div className="flex flex-col items-start gap-6">
          <p className="text-small text-ink-muted">
            For competitive exam aspirants
          </p>
          <h1 className="-mt-3 text-[36px] leading-[44px] font-semibold tracking-[-0.03em] text-balance sm:text-[52px] sm:leading-[60px]">
            Your syllabus, one pod at a time.
          </h1>
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
              <a href="#how-it-works">See how it works</a>
            </Button>
          </div>
        </div>
        {/* What it does, beside the headline (under it on a phone). */}
        <div className="flex flex-col gap-3 lg:pt-12">
          <p className="text-body text-pretty text-ink-muted sm:text-[17px] sm:leading-7">
            Every subject becomes a pod. Tick off topics as you go, keep your
            notes, PDFs and links where they belong, and watch your progress
            grow. On Pro, AI writes mock tests from your own notes.
          </p>
          {signedIn ? null : (
            <p className="text-small text-ink-muted">
              Free during launch. No card needed.
            </p>
          )}
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
