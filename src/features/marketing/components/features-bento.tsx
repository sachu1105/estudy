import type { ReactNode } from "react";

import { Reveal } from "@/components/ui/reveal";
import { cn } from "@/lib/utils/cn";

import {
  BeginnerFragment,
  MaterialFragment,
  PodFragment,
  ReplanFragment,
  StreakFragment,
  TestFragment,
  WhyFragment,
} from "./feature-fragments";
import { SectionHeading } from "./section-heading";

// Only what the app does today. Squads have their own section; the plan's steps are
// under How it works.
type Feature = {
  title: string;
  body: string;
  fragment: ReactNode;
  /** Columns of six on large screens. */
  span: string;
  tag?: string;
};

const features: Feature[] = [
  {
    title: "A pod for every subject",
    body: "Topics straight from your syllabus, each one ticked off as you finish it. Notes, PDFs, links and photos of notebook pages sit under the topics they cover.",
    fragment: <PodFragment />,
    span: "lg:col-span-4",
  },
  {
    title: "A plan that shows its working",
    body: "Every task says why it's there and how long. Change the minutes, the day or the order, and the plan keeps your edit.",
    fragment: <WhyFragment />,
    span: "lg:col-span-2",
  },
  {
    title: "A test after every task",
    body: "Five questions on what you just studied, then section and full mocks with a timer.",
    fragment: <TestFragment />,
    span: "lg:col-span-2",
  },
  {
    title: "No overdue pile, ever",
    body: "Missed a day? Every week the plan is rebuilt from where you are.",
    fragment: <ReplanFragment />,
    span: "lg:col-span-2",
  },
  {
    title: "A streak that forgives",
    body: "Keep the habit going. One missed day a week is covered for you.",
    fragment: <StreakFragment />,
    span: "lg:col-span-2",
  },
  {
    title: "Mock tests from your own notes",
    body: "Questions written from what you saved in a pod, so you're tested on what you actually read.",
    fragment: <MaterialFragment />,
    span: "lg:col-span-3",
    tag: "Pro",
  },
  {
    title: "Beginner mode",
    body: "Sitting your first exam? A gentler start, fundamentals first, and an explanation on every question.",
    fragment: <BeginnerFragment />,
    span: "lg:col-span-3",
  },
];

export function FeaturesBento() {
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
          Your syllabus, your material and your plan in one place, with a test
          to show what stuck.
        </SectionHeading>
      </Reveal>
      <ul className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6">
        {features.map((f, i) => (
          <li key={f.title} className={cn(f.span, i === 0 && "sm:col-span-2")}>
            <Reveal className="group flex h-full flex-col gap-6 rounded-[24px] border border-border bg-surface p-5 transition-[transform,box-shadow] duration-[120ms] hover:-translate-y-px hover:shadow-md sm:p-6">
              <div className="flex flex-col gap-2">
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
              <div
                aria-hidden
                className="mt-auto rounded-[18px] bg-surface-muted/60 bg-[radial-gradient(var(--border)_1px,transparent_1px)] [background-size:14px_14px] p-3 sm:p-4"
              >
                {f.fragment}
              </div>
            </Reveal>
          </li>
        ))}
      </ul>
    </section>
  );
}
