"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

/**
 * Back to wherever the person came from (the paper, its result, the Tests page), or to
 * `fallback` when this page was opened on its own.
 */
export function BackLink({
  fallback,
  label,
}: {
  fallback: string;
  label: string;
}) {
  const router = useRouter();
  return (
    <Link
      href={fallback}
      aria-label={label}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || window.history.length < 2) return;
        e.preventDefault();
        router.back();
      }}
      className="grid size-11 shrink-0 place-items-center rounded-control text-ink-muted hover:bg-surface-muted hover:text-ink"
    >
      <ArrowLeft className="size-5" aria-hidden />
    </Link>
  );
}
