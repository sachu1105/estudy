import { Info, Megaphone } from "lucide-react";

import { cn } from "@/lib/utils/cn";

/** The admin's site announcement, above every app page while it's on. */
export function AnnouncementBanner({
  text,
  tone,
}: {
  text: string;
  tone: "info" | "important";
}) {
  const Icon = tone === "important" ? Megaphone : Info;
  return (
    <div
      role="status"
      className={cn(
        "flex items-start gap-2 px-4 py-2.5 text-small md:px-8",
        tone === "important"
          ? "bg-accent-soft text-accent-ink"
          : "bg-surface-muted text-ink",
      )}
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <p className="mx-auto w-full max-w-content">{text}</p>
    </div>
  );
}
