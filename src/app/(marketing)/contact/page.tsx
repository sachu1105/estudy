import { Mail } from "lucide-react";
import type { Metadata } from "next";

import { ProsePage } from "@/features/marketing/components/prose-page";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contact",
  description: `Get in touch with the ${site.company} team.`,
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <ProsePage eyebrow={site.company} title="Contact us">
      <p>
        Found a wrong question, have an idea, or need help with your account?
        Write to us. A real person reads every message.
      </p>
      <a
        href={`mailto:${site.contactEmail}`}
        className="flex min-h-14 items-center gap-3 rounded-card border border-border bg-surface px-4 py-3 text-body font-medium text-ink no-underline! hover:bg-surface-muted"
      >
        <Mail className="size-5 shrink-0 text-accent" aria-hidden />
        <span className="break-all">{site.contactEmail}</span>
      </a>
      <p>
        Reporting a question? Include the exam, the topic and what looks wrong.
        It helps us fix it faster.
      </p>
    </ProsePage>
  );
}
