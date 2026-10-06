import Link from "next/link";

import { Button } from "@/components/ui/button";

/** Shown for anything that doesn't exist or isn't the user's (rule 9: no hints which). */
export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-16 text-center">
      <h1>Nothing here</h1>
      <p className="text-body text-ink-muted">
        This page doesn&apos;t exist, or it isn&apos;t yours. Check the link, or
        start from your pods.
      </p>
      <Button asChild variant="primary">
        <Link href="/pods">Go to your pods</Link>
      </Button>
    </div>
  );
}
