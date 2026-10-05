import type { Metadata } from "next";

export const metadata: Metadata = { title: "About" };

export default function AboutPage() {
  return (
    <article className="flex flex-col gap-3">
      <h1>About</h1>
      <p className="text-ink-muted">
        Study planner turns any competitive exam syllabus into a daily plan you
        can finish. Built by Veraft.
      </p>
    </article>
  );
}
