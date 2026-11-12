import { ChevronDown } from "lucide-react";
import Link from "next/link";

import { Reveal } from "@/components/ui/reveal";

import { Band } from "./frame";
import { SectionHeading } from "./section-heading";

// Answers stay honest: only what the app does today. Papers are the user's own or from
// the Store, and no key is sold as exam-accurate.
export const faqs = [
  {
    q: "Is it free?",
    a: "Yes. Pods, the study plan, practice papers and squads are free during launch, with no card needed. Only mock tests made from your own notes need a paid plan, and some papers in the Store are priced. The free plan stays.",
  },
  {
    q: "Which exams does it support?",
    a: "Any competitive exam, state exams included. Pick its syllabus from our catalogue if it's there, or upload it (PDF, Word or pasted text) and every subject becomes a pod.",
  },
  {
    q: "Is it linked to any exam board?",
    a: "No. studypods is an independent study app, not affiliated with any exam board or commission. Every answer key says whose it is, and we never claim a key or a question is official or exam-accurate.",
  },
  {
    q: "Can I upload my own syllabus?",
    a: "Yes. Upload a PDF or Word file, or paste the text. We read its headings and lists into subjects and topics, and you check and edit the result before your plan is built. Your upload stays private.",
  },
  {
    q: "Does it work on mobile?",
    a: "Yes. It's built for phones first and works in any modern browser. You can add it to your home screen like an app.",
  },
  {
    q: "What if I miss a few days?",
    a: "Nothing piles up. Every week your plan is rebuilt from where you actually are, and one missed day a week is forgiven so your streak survives.",
  },
  {
    q: "Where do the practice papers come from?",
    a: "From you, or from the Store. Upload any question paper as a PDF and mark your answers on the OMR sheet beside it, or get previous year papers and bundles from the Store: some free, some paid once, some included in a plan. Every answer key says whose it is, and we never claim a key is exam-accurate or that a question will appear in your exam.",
  },
  {
    q: "Is my data private?",
    a: "Your plans, uploads and test results are yours. We never sell data or show ads. In squads you appear by display name only.",
  },
];

// Native <details>: keyboard accessible and works with zero JavaScript. Two columns on
// the sheet from 1024px: the heading holds still on the left, the questions are ruled
// rows on the right, split from it by a rule like the features grid.
export function Faq() {
  return (
    <Band
      id="faq"
      aria-labelledby="faq-title"
      // Its bottom corners are the closing banner's top ones: no marks on the banner.
      marks={false}
      inner="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]"
    >
      <Reveal className="px-4 pt-16 pb-8 md:px-8 lg:px-12 lg:py-24">
        <div className="flex flex-col items-start gap-4 lg:sticky lg:top-28">
          <SectionHeading
            id="faq-title"
            align="left"
            eyebrow="FAQ"
            title="Questions, answered"
          />
          <p className="text-body text-ink-muted">
            Something else?{" "}
            <Link
              href="/contact"
              className="font-medium text-accent-ink hover:underline"
            >
              Ask us
            </Link>
            .
          </p>
        </div>
      </Reveal>
      <Reveal className="border-t border-border lg:border-t-0 lg:border-l">
        {faqs.map((item) => (
          <details
            key={item.q}
            className="group border-b border-border px-4 last:border-b-0 md:px-8 lg:px-12"
          >
            <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-4 py-5 font-heading text-h3 font-medium [&::-webkit-details-marker]:hidden">
              {item.q}
              <ChevronDown
                className="size-5 shrink-0 text-ink-muted transition-transform duration-[200ms] group-open:rotate-180"
                aria-hidden
              />
            </summary>
            <p className="max-w-[60ch] pb-6 text-body text-ink-muted">
              {item.a}
            </p>
          </details>
        ))}
      </Reveal>
    </Band>
  );
}
