import { Quote } from "lucide-react";

import { Reveal } from "@/components/ui/reveal";
import { testimonials, type Testimonial } from "@/lib/testimonials";

import { SectionHeading } from "./section-heading";

const initials = (name: string) =>
  name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

function Card({ t }: { t: Testimonial }) {
  return (
    <figure className="flex w-[300px] shrink-0 flex-col gap-4 rounded-[20px] border border-border bg-surface p-5 sm:w-[340px]">
      <Quote className="size-5 text-accent" aria-hidden />
      <blockquote className="text-body text-ink">
        &ldquo;{t.quote}&rdquo;
      </blockquote>
      <figcaption className="mt-auto flex items-center gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-accent-soft font-heading text-small font-medium text-accent-ink">
          {initials(t.name)}
        </span>
        <span className="flex min-w-0 flex-col">
          <span className="truncate text-small font-medium text-ink">
            {t.name}
          </span>
          <span className="truncate text-micro text-ink-muted uppercase">
            {t.role}
          </span>
        </span>
      </figcaption>
    </figure>
  );
}

/**
 * One row drifting past. Each half of the track is wider than any screen (the quotes
 * repeat), and the track holds two halves, so the loop is seamless.
 */
function Row({
  quotes,
  reverse,
}: {
  quotes: Testimonial[];
  reverse?: boolean;
}) {
  const half = [...quotes, ...quotes, ...quotes];
  return (
    <div className="group flex overflow-hidden [mask-image:linear-gradient(90deg,transparent,black_6%,black_94%,transparent)]">
      <div
        className="flex w-max gap-4 pr-4 group-hover:[animation-play-state:paused] motion-safe:animate-marquee"
        style={reverse ? { animationDirection: "reverse" } : undefined}
      >
        {[...half, ...half].map((t, i) => (
          <div key={i} aria-hidden={i >= quotes.length || undefined}>
            <Card t={t} />
          </div>
        ))}
      </div>
    </div>
  );
}

export function Testimonials() {
  const { quotes, sample } = testimonials;
  const half = Math.ceil(quotes.length / 2);
  return (
    <section
      aria-labelledby="stories-title"
      className="overflow-x-clip py-16 md:py-24"
    >
      <Reveal className="px-4 md:px-8">
        <SectionHeading
          id="stories-title"
          eyebrow="Stories"
          title="Aspirants who stopped guessing what to study"
        >
          {sample
            ? "Sample quotes, shown only while developing. Replace them with real ones before launch."
            : "In their own words."}
        </SectionHeading>
      </Reveal>
      <div className="mt-12 flex flex-col gap-4">
        <Row quotes={quotes.slice(0, half)} />
        <Row quotes={quotes.slice(half)} reverse />
      </div>
    </section>
  );
}
