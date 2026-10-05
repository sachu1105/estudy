import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/ui/reveal";

export function FinalCta({ href }: { href: string }) {
  return (
    <section
      aria-labelledby="cta-title"
      className="mx-auto max-w-content px-4 pb-16 md:px-8 md:pb-24"
    >
      <Reveal className="flex flex-col items-center gap-5 rounded-card border border-border bg-surface px-5 py-12 text-center sm:px-10">
        <h2 id="cta-title" className="max-w-xl text-h1 sm:text-display">
          Your exam date is set. Your plan can be ready in five minutes.
        </h2>
        <Button
          asChild
          variant="primary"
          size="lg"
          className="w-full sm:w-auto"
        >
          <Link href={href}>Create your study plan</Link>
        </Button>
      </Reveal>
    </section>
  );
}
