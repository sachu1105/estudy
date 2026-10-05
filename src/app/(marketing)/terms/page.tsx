import type { Metadata } from "next";
import Link from "next/link";

import { ProsePage } from "@/features/marketing/components/prose-page";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Terms",
  description: `The terms for using ${site.name}.`,
  alternates: { canonical: "/terms" },
};

// Plain-language draft. Needs legal review before launch.
export default function TermsPage() {
  return (
    <ProsePage eyebrow="Legal" title="Terms of use" updated="5 October 2026">
      <p>
        <strong>Draft.</strong> These terms are a plain-language draft and will
        be reviewed before public launch.
      </p>
      <h2>The service</h2>
      <p>
        {site.name} helps you plan and practise for competitive exams. It is a
        study aid. It does not guarantee any exam result.
      </p>
      <h2>Practice questions</h2>
      <p>
        Questions in the app are practice questions matched to syllabus topics.
        They are not official Kerala PSC, SSC or RRB questions, and we make no
        claim that they will appear in any exam.
      </p>
      <h2>Your account</h2>
      <ul>
        <li>
          Keep your password private. You are responsible for activity on your
          account.
        </li>
        <li>
          One person per account. Ranks are for real study effort; gaming them
          can lead to suspension.
        </li>
      </ul>
      <h2>What you share</h2>
      <p>
        You keep ownership of what you upload. Only share material you have the
        right to share. Don&apos;t post anything abusive, illegal or misleading
        in groups; we may remove it and suspend accounts that do.
      </p>
      <h2>Plans and pricing</h2>
      <p>
        Every feature except mock tests made from your own study vault is free
        during launch. Vault mock tests need a paid plan. If other features
        become paid, we will tell you in advance, and moving to the free plan will never delete
        your data.
      </p>
      <h2>Questions</h2>
      <p>
        <Link href="/contact">Contact us</Link> about anything in these terms.
      </p>
    </ProsePage>
  );
}
