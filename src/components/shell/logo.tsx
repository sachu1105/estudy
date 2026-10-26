import Image from "next/image";

import { cn } from "@/lib/utils/cn";
import { site } from "@/lib/site";

/** The app's mark: stacked pods with a tick (public/logo, built from pod_logo.png). */
export function LogoMark({ className }: { className?: string }) {
  return (
    <Image
      src="/logo/mark.png"
      alt=""
      aria-hidden
      width={64}
      height={64}
      priority
      className={cn("size-8 shrink-0 select-none", className)}
    />
  );
}

export function Logo({
  className,
  showName = true,
}: {
  className?: string;
  showName?: boolean;
}) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <LogoMark />
      {showName ? (
        <span className="font-heading text-h3 font-semibold">{site.name}</span>
      ) : null}
    </span>
  );
}
