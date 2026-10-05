import type { Metadata } from "next";

export const metadata: Metadata = { title: "Privacy" };

export default function PrivacyPage() {
  return (
    <article className="flex flex-col gap-3">
      <h1>Privacy</h1>
      <p className="text-ink-muted">
        The full privacy policy is published before launch.
      </p>
    </article>
  );
}
