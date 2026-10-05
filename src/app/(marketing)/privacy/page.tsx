import type { Metadata } from "next";
import Link from "next/link";

import { ProsePage } from "@/features/marketing/components/prose-page";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy",
  description: `How ${site.name} collects, uses and protects your data.`,
  alternates: { canonical: "/privacy" },
};

// Plain-language draft describing what the app actually does. Needs legal review before launch.
export default function PrivacyPage() {
  return (
    <ProsePage eyebrow="Legal" title="Privacy policy" updated="5 October 2026">
      <p>
        <strong>Draft.</strong> This policy is a plain-language draft and will
        be reviewed before public launch.
      </p>
      <h2>What we collect</h2>
      <ul>
        <li>
          Your account: name, display name, email and a hashed password (we
          never store the password itself).
        </li>
        <li>
          Your study data: syllabuses you upload, your plan, study sessions,
          test answers and scores.
        </li>
        <li>
          Group content you choose to share: notes, files, posts and shared
          tests.
        </li>
        <li>
          Basic technical data: IP address and browser type, used for security
          and rate limiting.
        </li>
      </ul>
      <h2>How we use it</h2>
      <p>
        To build and adjust your study plan, run tests, show progress and ranks,
        and keep the service secure. Uploaded syllabuses are processed by an AI
        model on our servers to extract subjects and topics.
      </p>
      <h2>What we never do</h2>
      <ul>
        <li>We don&apos;t sell your data or show ads.</li>
        <li>
          We never show your email to other users. Ranks use your display name,
          and you can hide as an anonymous aspirant.
        </li>
      </ul>
      <h2>Cookies</h2>
      <p>
        We use only the cookies needed to keep you logged in. Your theme choice
        is stored in your browser. There are no advertising or tracking cookies.
      </p>
      <h2>Your choices</h2>
      <p>
        You can ask for a copy of your data or for your account to be deleted.
        Deleted accounts are removed and their activity is anonymised.{" "}
        <Link href="/contact">Contact us</Link> to make a request.
      </p>
    </ProsePage>
  );
}
