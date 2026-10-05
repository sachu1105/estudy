import Link from "next/link";

import { Button } from "@/components/ui/button";
import { site } from "@/lib/site";

import { HeroPreview } from "./hero-preview";
import { ctaHref } from "./section-heading";

export function Hero({ signedIn }: { signedIn: boolean }) {
  return (
    <section className="mx-auto grid max-w-content grid-cols-1 items-center gap-10 overflow-x-clip px-4 pt-8 pb-14 md:px-8 md:pt-14 lg:grid-cols-[1.1fr_1fr] lg:gap-12 lg:pb-20">
      <div className="flex flex-col items-start gap-5">
        <p className="text-micro text-ink-muted uppercase">
          For Kerala PSC, SSC and RRB aspirants
        </p>
        <h1 className="text-[28px] leading-[36px] sm:text-display">
          {site.tagline}
        </h1>
        <p className="max-w-xl text-body text-ink-muted sm:text-[17px] sm:leading-7">
          Upload your syllabus, set how strong you are in each subject, and get
          a day-by-day plan with a mock test after every task.
        </p>
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
          <Button
            asChild
            variant="primary"
            size="lg"
            className="w-full sm:w-auto"
          >
            <Link href={ctaHref(signedIn)}>Create your study plan</Link>
          </Button>
          <Button
            asChild
            variant="ghost"
            size="lg"
            className="w-full sm:w-auto"
          >
            <a href="#how-it-works">See how it works</a>
          </Button>
        </div>
        <p className="text-small text-ink-muted">
          Free during launch. No card needed.
        </p>
      </div>
      <HeroPreview />
    </section>
  );
}
