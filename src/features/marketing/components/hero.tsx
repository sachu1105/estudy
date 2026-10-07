import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { PodCover } from "@/components/blocks/pod-cover";
import { Button } from "@/components/ui/button";

import { HeroPods } from "./hero-pods";
import { HeroPreview } from "./hero-preview";
import { ctaHref } from "./section-heading";

/**
 * Centred promise, one clear call to action, then the product itself in a window: the
 * pods a syllabus becomes, and today's plan built from them.
 */
export function Hero({ signedIn }: { signedIn: boolean }) {
  return (
    <section className="relative overflow-x-clip px-4 pt-10 pb-16 md:px-8 md:pt-20 md:pb-24">
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-6 text-center">
        <a
          href="#pricing"
          className="group flex items-center gap-2 rounded-full border border-border bg-surface py-1 pr-3 pl-1 text-small text-ink-muted shadow-sm transition-colors duration-[120ms] hover:text-ink"
        >
          <span className="rounded-full bg-accent-soft px-2 py-0.5 font-medium text-accent-ink">
            Free
          </span>
          <span>
            <span className="hidden sm:inline">During launch, for </span>
            Kerala PSC aspirants
          </span>
          <ArrowRight
            className="size-3.5 transition-transform duration-[120ms] group-hover:translate-x-0.5"
            aria-hidden
          />
        </a>
        <h1 className="text-[34px] leading-[42px] tracking-[-0.02em] text-balance sm:text-[48px] sm:leading-[56px] lg:text-[56px] lg:leading-[64px]">
          Your syllabus, turned into a{" "}
          <span className="text-accent">daily plan</span> you can actually
          finish.
        </h1>
        <p className="max-w-xl text-body text-pretty text-ink-muted sm:text-[17px] sm:leading-7">
          Every subject becomes a pod for its topics, notes and tests. Tell us
          your hours and how strong you are, and get a day-by-day plan with a
          short test after every task.
        </p>
        <div className="flex w-full flex-col justify-center gap-3 sm:w-auto sm:flex-row">
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

      <div className="relative mx-auto mt-14 max-w-5xl md:mt-20">
        {/* A soft glow of pod-cover colour behind the window. */}
        <PodCover
          cover={{ kind: "gradient", preset: "blurple" }}
          className="absolute inset-x-6 -top-6 bottom-6 -z-10 rounded-[40px] opacity-50 blur-3xl md:inset-x-16"
        />
        <div className="rounded-[28px] border border-border bg-surface/70 p-2 shadow-lg backdrop-blur md:p-3">
          <div className="grid grid-cols-1 gap-4 rounded-[22px] border border-border bg-bg p-3 md:grid-cols-[1.1fr_1fr] md:p-5">
            <HeroPods />
            <HeroPreview />
          </div>
        </div>
      </div>
    </section>
  );
}
