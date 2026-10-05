import type { Metadata } from "next";

export const metadata: Metadata = { title: "Terms" };

export default function TermsPage() {
  return (
    <article className="flex flex-col gap-3">
      <h1>Terms</h1>
      <p className="text-ink-muted">
        The full terms of use are published before launch.
      </p>
    </article>
  );
}
