"use client";

import { RotateCcw } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

/** A page that failed to load: what happened and what to do (copy rules, no apology). */
export default function ShellError({
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-16 text-center">
      <h1>This page didn&apos;t load</h1>
      <p className="text-body text-ink-muted">
        Something went wrong on our side. Try again; if it keeps happening, go
        to Today and come back in a minute.
      </p>
      <div className="flex gap-2">
        <Button variant="primary" onClick={reset}>
          <RotateCcw aria-hidden /> Try again
        </Button>
        <Button asChild variant="secondary">
          <Link href="/today">Go to Today</Link>
        </Button>
      </div>
    </div>
  );
}
