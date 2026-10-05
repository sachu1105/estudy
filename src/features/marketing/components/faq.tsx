import { ChevronDown } from "lucide-react";

import { Reveal } from "@/components/ui/reveal";

import { SectionHeading } from "./section-heading";

// Answers stay honest: practice questions, not official ones.
export const faqs = [
  {
    q: "Is it free?",
    a: "Yes. Planning, check tests, mocks, groups and the study vault are free during launch, with no card needed. Only mock tests made from your own notes and PDFs need a paid plan. The free plan stays.",
  },
  {
    q: "Which exams does it support?",
    a: "Kerala PSC exams first (LDC, LGS, Degree level prelims, High Court Assistant), plus SSC CGL, SSC CHSL and RRB NTPC. You can upload the syllabus of any other exam too.",
  },
  {
    q: "Can I upload my own syllabus?",
    a: "Yes. Upload a PDF, Word file or photo, or paste the text. AI turns it into subjects and topics, and you review and edit the result before your plan is built. Your upload stays private.",
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
    q: "Are the questions official PSC questions?",
    a: "No. They are practice questions written to match each topic, checked before they reach you. They are not official PSC, SSC or RRB questions, and we don't claim they will appear in your exam.",
  },
  {
    q: "Is my data private?",
    a: "Your plans, uploads and test results are yours. We never sell data or show ads. On the ranks you appear by display name only, and you can hide as an anonymous aspirant.",
  },
];

// Native <details>: keyboard accessible and works with zero JavaScript.
export function Faq() {
  return (
    <section
      id="faq"
      aria-labelledby="faq-title"
      className="mx-auto max-w-3xl px-4 py-16 md:px-8 md:py-24"
    >
      <Reveal>
        <SectionHeading
          id="faq-title"
          eyebrow="FAQ"
          title="Questions, answered"
        />
      </Reveal>
      <Reveal className="mt-10 divide-y divide-border rounded-card border border-border bg-surface">
        {faqs.map((item) => (
          <details key={item.q} className="group px-5">
            <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-4 font-heading text-h3 font-medium [&::-webkit-details-marker]:hidden">
              {item.q}
              <ChevronDown
                className="size-5 shrink-0 text-ink-muted transition-transform duration-[200ms] group-open:rotate-180"
                aria-hidden
              />
            </summary>
            <p className="pb-5 text-body text-ink-muted">{item.a}</p>
          </details>
        ))}
      </Reveal>
    </section>
  );
}
