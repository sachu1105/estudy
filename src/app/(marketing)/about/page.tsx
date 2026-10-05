import type { Metadata } from "next";
import Link from "next/link";

import { ProsePage } from "@/features/marketing/components/prose-page";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "About",
  description: `Why ${site.name} exists and who builds it.`,
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <ProsePage eyebrow="About" title="A plan you can actually finish">
      <p>
        Most aspirants don&apos;t fail for lack of material. They fail because
        the syllabus is huge, the days are short, and one missed week turns into
        a pile that never gets cleared.
      </p>
      <p>
        {site.name} turns your syllabus into a day-by-day plan that fits the
        hours you really have. It tests you after every task, spends more time
        where you are weak, and rebuilds the plan every week from where you
        actually are. There is no overdue list, ever.
      </p>
      <p>
        We started with Kerala PSC (LDC, LGS, Degree level prelims and High
        Court Assistant) and support SSC and RRB exams too. Beginner mode exists
        for anyone sitting their first PSC exam.
      </p>
      <h2>Who builds it</h2>
      <p>
        {site.name} is built by {site.company}. Questions or ideas?{" "}
        <Link href="/contact">Get in touch</Link>.
      </p>
    </ProsePage>
  );
}
