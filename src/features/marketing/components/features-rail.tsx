import type { ReactNode } from "react";

import { CardRail } from "@/components/blocks/card-rail";
import { Reveal } from "@/components/ui/reveal";

import {
  BeginnerFragment,
  MaterialFragment,
  PodFragment,
  RankFragment,
  ReplanFragment,
  SquadFragment,
  StreakFragment,
  TestFragment,
  WhyFragment,
} from "./feature-fragments";
import { SectionHeading } from "./section-heading";

// Only what the app does today, one card each, in the order a user meets them. The
// plan's steps stay under How it works; squads live here too, as two of the cards.
type Feature = {
  title: string;
  body: string;
  fragment: ReactNode;
  tag?: string;
};

const features: Feature[] = [
  {
    title: "A pod for every subject",
    body: "Topics straight from your syllabus, ticked off as you finish them. Your notes, PDFs, links and photos sit under the topics they cover.",
    fragment: <PodFragment />,
  },
  {
    title: "A plan that shows its working",
    body: "Every task says why it's there and how long it should take. Change the minutes, the day or the order, and the plan keeps your edit.",
    fragment: <WhyFragment />,
  },
  {
    title: "A test after every task",
    body: "Five questions on what you just studied, then section and full mocks with a timer when you're ready.",
    fragment: <TestFragment />,
  },
  {
    title: "No overdue pile, ever",
    body: "Missed a few days? Nothing stacks up. Every week the plan is rebuilt from where you actually are.",
    fragment: <ReplanFragment />,
  },
  {
    title: "A streak that forgives",
    body: "One study minute at a time builds the habit, and one missed day a week is covered for you.",
    fragment: <StreakFragment />,
  },
  {
    title: "Squads with channels",
    body: "Chat, announcements, shared material and group mock tests, each in its own channel. Only what you share leaves your pod.",
    fragment: <SquadFragment />,
  },
  {
    title: "A weekly squad rank",
    body: "Your squad ranked by this week's study. It starts fresh every Monday, so no one runs away with it.",
    fragment: <RankFragment />,
  },
  {
    title: "Mock tests from your own notes",
    body: "AI writes questions from the material you saved in a pod, so you're tested on what you actually read.",
    fragment: <MaterialFragment />,
    tag: "Pro",
  },
  {
    title: "Beginner mode",
    body: "Sitting your first exam? A gentler start, fundamentals first, and an explanation on every question.",
    fragment: <BeginnerFragment />,
  },
];

export function FeaturesRail() {
  return (
    <section
      id="features"
      aria-labelledby="features-title"
      className="mx-auto max-w-content px-4 py-16 md:px-8 md:py-24"
    >
      <Reveal>
        <SectionHeading
          id="features-title"
          eyebrow="Features"
          title="Everything between today and exam day"
        >
          One card for each thing it does.
        </SectionHeading>
      </Reveal>
      <Reveal className="mt-10">
        <CardRail label="Features">
          {features.map((f) => (
            <article
              key={f.title}
              className="flex w-[278px] shrink-0 snap-start flex-col gap-4 rounded-[24px] border border-border bg-surface p-4 transition-[transform,box-shadow] duration-[120ms] hover:-translate-y-px hover:shadow-md sm:w-[320px] sm:p-5"
            >
              <div
                aria-hidden
                className="flex h-44 items-center overflow-hidden rounded-[18px] bg-surface-muted/60 bg-[radial-gradient(var(--border)_1px,transparent_1px)] [background-size:14px_14px] p-4"
              >
                <div className="w-full">{f.fragment}</div>
              </div>
              <div className="flex flex-col gap-1.5">
                <h3 className="flex items-center gap-2">
                  {f.title}
                  {f.tag ? (
                    <span className="rounded-full bg-accent-soft px-2 py-0.5 text-micro font-medium text-accent-ink uppercase">
                      {f.tag}
                    </span>
                  ) : null}
                </h3>
                <p className="text-small text-ink-muted">{f.body}</p>
              </div>
            </article>
          ))}
        </CardRail>
      </Reveal>
    </section>
  );
}
