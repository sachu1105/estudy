import { WifiOff } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Offline" };

/** Shown when a page is asked for with no connection and nothing cached. */
export default function OfflinePage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-content flex-col items-center justify-center gap-4 px-4 text-center">
      <WifiOff className="size-8 text-ink-subtle" aria-hidden />
      <h1 className="text-h1">You&apos;re offline</h1>
      <p className="max-w-sm text-body text-ink-muted">
        Today and your plan work from the last copy on this device. Everything
        else comes back as soon as you have a connection.
      </p>
      <Link
        href="/today"
        className="text-body font-medium text-accent-ink underline underline-offset-2"
      >
        Open today
      </Link>
    </main>
  );
}
