import { Reveal } from "@/components/ui/reveal";

import { SectionHeading } from "./section-heading";

const steps = [
  {
    title: "Upload syllabus",
    body: "Drop in your PDF, or pick an exam from our catalogue.",
  },
  {
    title: "Rate your subjects",
    body: "Choose an intensity and how confident you are in each.",
  },
  {
    title: "Get your daily plan",
    body: "A day-by-day schedule that fits the hours you actually have.",
  },
  {
    title: "Test and climb the rank",
    body: "A short test after each task, and a rank that tracks your effort.",
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
          />
        </Reveal>
        <Reveal className="relative mt-12">
          {/* The connecting line draws in once the steps scroll into view. */}
          <span
            aria-hidden
            className="absolute top-5 left-5 h-[calc(100%-40px)] w-px origin-top scale-y-0 bg-accent transition-transform delay-100 duration-[600ms] ease-out group-data-visible/reveal:scale-y-100 md:top-5 md:right-[12.5%] md:left-[12.5%] md:h-px md:w-auto md:origin-left md:scale-x-0 md:scale-y-100 md:group-data-visible/reveal:scale-x-100"
          />
          <ol className="relative grid gap-8 md:grid-cols-4 md:gap-6">
            {steps.map((step, index) => (
              <li
                key={step.title}
                className="flex gap-4 md:flex-col md:items-center md:text-center"
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-full border border-accent bg-surface font-mono text-body font-medium text-accent-ink">
                  {index + 1}
                </span>
                <div className="flex flex-col gap-1 pt-1.5 md:pt-0">
                  <h3>{step.title}</h3>
                  <p className="text-small text-ink-muted">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </Reveal>
      </div>
    </section>
  );
}
