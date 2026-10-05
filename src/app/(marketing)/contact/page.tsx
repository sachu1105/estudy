import type { Metadata } from "next";

export const metadata: Metadata = { title: "Contact" };

export default function ContactPage() {
  return (
    <article className="flex flex-col gap-3">
      <h1>Contact</h1>
      <p className="text-ink-muted">
        Write to the Veraft team. A contact form arrives before launch.
      </p>
    </article>
  );
}
