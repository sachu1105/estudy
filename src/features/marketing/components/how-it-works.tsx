import type { ReactNode } from "react";

import { Reveal } from "@/components/ui/reveal";

import {
  PlanVisual,
  RateVisual,
  SquadVisual,
  UploadVisual,
} from "./how-it-works-visuals";
import { SectionHeading } from "./section-heading";

const steps: { title: string; body: string; visual: ReactNode }[] = [
  {
    title: "Add your syllabus",
    body: "Pick your exam from the catalogue, or upload the PDF. Every subject becomes a pod.",
    visual: <UploadVisual />,
  },
  {
    title: "Say where you stand",
    body: "Rate each subject from one to five stars and choose how hard to push it.",
    visual: <RateVisual />,
  },
  {
    title: "Follow today's plan",
    body: "A day-by-day plan that fits the hours you have. See why each task is there.",
    visual: <PlanVisual />,
  },
  {
    title: "Test, then keep up",
    body: "A short test after each task, and your squad's weekly rank to keep you going.",
    visual: <SquadVisual />,
  },
];

export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      aria-labelledby="how-title"
      className="border-y border-border bg-surface"
    >
      <div className="mx-auto max-w-content px-4 py-16 md:px-8 md:py-24">
        <Reveal>
          <SectionHeading
            id="how-title"
            eyebrow="How it works"
            title="From syllabus to a plan in minutes"
          >
            Four steps, and the plan keeps itself up to date: what you finish
            and how your tests go shape next week.
          </SectionHeading>
        </Reveal>
        <ol className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, index) => (
            <li key={step.title}>
              <Reveal className="flex h-full flex-col overflow-hidden rounded-[20px] border border-border bg-bg">
                <div
                  aria-hidden
                  className="flex min-h-40 items-center bg-[radial-gradient(var(--border)_1px,transparent_1px)] [background-size:14px_14px] p-4"
                >
                  {step.visual}
                </div>
                <div className="flex flex-1 flex-col gap-1.5 border-t border-border bg-surface p-5">
                  <span className="font-mono text-small font-medium text-accent-ink">
                    0{index + 1}
                  </span>
                  <h3>{step.title}</h3>
                  <p className="text-small text-ink-muted">{step.body}</p>
                </div>
              </Reveal>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
