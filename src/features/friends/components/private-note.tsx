import { EyeOff } from "lucide-react";
import Link from "next/link";

/** Shown to a private person on Add friend: what private means, and where to change it. */
export function PrivateNote() {
  return (
    <p className="flex items-start gap-2 rounded-control bg-surface-muted p-3 text-small text-ink-muted">
      <EyeOff className="mt-0.5 size-4 shrink-0" aria-hidden />
      <span>
        You&apos;re private: nobody can find you or send you a request, but you
        can add people yourself.{" "}
        <Link
          href="/settings"
          className="font-medium text-accent-ink underline-offset-4 hover:underline"
        >
          Change in Settings
        </Link>
      </span>
    </p>
  );
}
