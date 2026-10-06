import { ChevronLeft } from "lucide-react";
import Link from "next/link";

/** One step up the pods tree: subject pod to exam pod, exam pod to pods. */
export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="mb-3 -ml-1 inline-flex min-h-11 max-w-full items-center gap-1 text-small font-medium text-ink-muted hover:text-ink md:min-h-0"
    >
      <ChevronLeft className="size-4 shrink-0" aria-hidden />
      <span className="truncate">{label}</span>
    </Link>
  );
}
