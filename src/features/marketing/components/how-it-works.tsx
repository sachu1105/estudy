import {
  CalendarCheck2,
  FileUp,
  Star,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";

import { MeshArt } from "@/components/blocks/pod-cover";
import { Reveal } from "@/components/ui/reveal";
import type { Mesh } from "@/lib/pods/covers";

import {
  PlanVisual,
  RateVisual,
  SquadVisual,
  UploadVisual,
} from "./how-it-works-visuals";
import { SectionHeading } from "./section-heading";

/**
 * Each card gets a pale wash for its cover and the deep version of the same hue for its
 * icon tile, so the colour is stated once and echoed once. All four sit either side of
 * the accent, blue through violet: a family, not a rainbow.
 */
const ART: Record<string, { wash: Mesh; tile: string }> = {
  blue: {
    wash: { base: "#cfe4fa", blobs: ["#f2fbff", "#a8cdf2", "#dcefff"] },
    tile: "#3b6fd4",
  },
  indigo: {
    wash: { base: "#d8dcfa", blobs: ["#f3f4ff", "#b2baf2", "#e6e9ff"] },
    tile: "#4752c4",
  },
  blurple: {
    wash: { base: "#dfe1fd", blobs: ["#f4f5ff", "#c3c8fb", "#ecedfe"] },
    tile: "#5865f2",
  },
  violet: {
    wash: { base: "#e7dbfa", blobs: ["#faf4ff", "#cbb2f2", "#f2e9ff"] },
    tile: "#6d5ae0",
  },
};

type Step = {
  icon: LucideIcon;
  title: string;
  body: string;
  visual: ReactNode;
  art: { wash: Mesh; tile: string };
  /** Degrees of tilt, so the deck looks dealt by hand rather than printed. */
  tilt: number;
};

const steps: Step[] = [
  {
    icon: FileUp,
    title: "Add your syllabus",
    body: "Pick your exam from the catalogue, or upload the PDF. Every subject becomes a pod.",
    visual: <UploadVisual />,
    art: ART.blue!,
    tilt: -1.4,
  },
  {
    icon: Star,
    title: "Say where you stand",
    body: "Rate each subject from one to five stars and choose how hard to push it.",
    visual: <RateVisual />,
    art: ART.indigo!,
    tilt: 1.1,
  },
  {
    icon: CalendarCheck2,
    title: "Follow today's plan",
    body: "A day-by-day plan that fits the hours you have. See why each task is there.",
    visual: <PlanVisual />,
    art: ART.blurple!,
    tilt: -0.8,
  },
  {
    icon: Trophy,
    title: "Test, then keep up",
    body: "A short test after each task, and your squad's weekly rank to keep you going.",
    visual: <SquadVisual />,
    art: ART.violet!,
    tilt: 0.5,
  },
];

/**
 * A deck that deals itself as you scroll: each card is sticky a little lower than the
 * one before, so they pile up and the last one finishes the section. CSS only, no
 * scroll listener.
 *
 * Each card is shaped like a pod card, which is the app's own idiom: cover art on top,
 * an icon tile straddling its edge, then the content on plain surface. That keeps the
 * colour to the strip and the tile, and leaves the step's picture looking like the real
 * product.
 */
export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      aria-labelledby="how-title"
      className="border-y border-border bg-surface-muted"
    >
      <div className="mx-auto max-w-content px-4 py-16 md:grid md:grid-cols-[1fr_minmax(0,520px)] md:gap-16 md:px-8 md:py-24">
        <Reveal className="md:sticky md:top-28 md:self-start">
          <SectionHeading
            id="how-title"
            align="left"
            eyebrow="How it works"
            title="From syllabus to a plan in minutes"
          >
            Four steps, and the plan keeps itself up to date: what you finish
            and how your tests go shape next week.
          </SectionHeading>
        </Reveal>

        <ol className="mt-10 md:mt-0">
          {steps.map((step, index) => (
            <li
              key={step.title}
              // Each card parks a notch below the last, leaving the one behind it
              // peeking out. The margin is the scroll it takes to deal the next one.
              className={`sticky h-104 sm:h-96 ${index < steps.length - 1 ? "mb-[8vh]" : ""}`}
              style={{ top: `calc(5.5rem + ${index} * 0.875rem)` }}
            >
              <article
                className="flex h-full flex-col overflow-hidden rounded-[28px] border border-border bg-surface shadow-lg"
                style={{ transform: `rotate(${step.tilt}deg)` }}
              >
                <MeshArt
                  mesh={step.art.wash}
                  className="h-28 shrink-0 overflow-hidden sm:h-32"
                />
                {/* The tile straddles the art, the way a pod card's does. */}
                <div className="relative z-10 -mt-7 px-5">
                  <span
                    aria-hidden
                    className="grid size-14 place-items-center rounded-[18px] border-4 border-surface"
                    style={{ background: step.art.tile }}
                  >
                    <step.icon className="size-6 text-white" />
                  </span>
                </div>

                <div className="flex flex-1 flex-col px-5 pt-3 pb-5">
                  <div className="flex items-baseline justify-between gap-3">
                    <h3 className="text-h2">{step.title}</h3>
                    <span className="shrink-0 font-mono text-micro text-ink-subtle tabular-nums">
                      {index + 1}/{steps.length}
                    </span>
                  </div>
                  <p className="mt-1.5 text-small text-pretty text-ink-muted">
                    {step.body}
                  </p>
                  <div aria-hidden className="mt-auto pt-5">
                    {step.visual}
                  </div>
                </div>
              </article>
            </li>
          ))}
          {/* Holds the finished deck on screen for a beat before the section ends. */}
          <li aria-hidden className="h-[10vh]" />
        </ol>
      </div>
    </section>
  );
}
