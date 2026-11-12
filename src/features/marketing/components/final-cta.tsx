import Image from "next/image";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/ui/reveal";

import { Band } from "./frame";
import { ctaHref, ctaLabel } from "./section-heading";
import landscape from "../../../../public/landscapepurple.png";

/**
 * The page's last word, on a purple landscape lit from below (public/landscapepurple.png),
 * filling the stretch of the sheet between the frame's rails.
 */
export function FinalCta({ signedIn }: { signedIn: boolean }) {
  return (
    <Band
      aria-labelledby="cta-title"
      marks={false}
      inner="isolate overflow-hidden px-4 py-20 md:px-8 md:py-28"
    >
      {/* A dark landscape lit from below, the same in both themes, so the type is white. */}
      <Image
        src={landscape}
        alt=""
        fill
        sizes="(min-width: 1184px) 1120px, 100vw"
        placeholder="blur"
        className="-z-10 object-cover object-bottom"
      />

      <Reveal className="flex flex-col items-center gap-8 text-center">
        <h2
          id="cta-title"
          className="max-w-2xl text-[32px] leading-10 tracking-[-0.03em] text-balance text-white sm:text-[48px] sm:leading-14"
        >
          {signedIn
            ? "Your pods are waiting. Pick up where you left off."
            : "Your exam date is set. Your plan can be ready in five minutes."}
        </h2>
        {/* White on the dark landscape in both themes: the light theme's raised button. */}
        <Button
          asChild
          variant="secondary"
          size="lg"
          data-theme="light"
          className="w-full sm:w-auto"
        >
          <Link href={ctaHref(signedIn)}>{ctaLabel(signedIn)}</Link>
        </Button>
      </Reveal>
    </Band>
  );
}
