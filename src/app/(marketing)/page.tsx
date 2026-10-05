import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

// Placeholder. The real landing page is milestone 2.5.
export default function LandingPage() {
  return (
    <section className="flex flex-col items-start gap-6 py-12">
      <p className="text-micro text-ink-muted uppercase">
        For Kerala PSC, SSC and RRB aspirants
      </p>
      <h1 className="max-w-2xl text-display">
        Your syllabus, turned into a daily plan you can actually finish.
      </h1>
      <p className="max-w-xl text-ink-muted">
        Upload your syllabus, set how strong you are in each subject, and get a
        day-by-day plan with mock tests after every task.
      </p>
      <div className="flex flex-wrap gap-3">
        <Button asChild variant="primary" size="lg">
          <Link href="/today">Open the app</Link>
        </Button>
        {process.env.NODE_ENV !== "production" ? (
          <Button asChild variant="ghost" size="lg">
            <Link href="/dev/ui">Design system</Link>
          </Button>
        ) : null}
      </div>
      <Badge tone="accent">Free during launch. No card needed.</Badge>
    </section>
  );
}
