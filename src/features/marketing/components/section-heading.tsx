import type { ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

type SectionHeadingProps = {
  eyebrow: string;
  title: string;
  children?: ReactNode;
  align?: "left" | "center";
  id?: string;
};

export function SectionHeading({
  eyebrow,
  title,
  children,
  align = "center",
  id,
}: SectionHeadingProps) {
  return (
    <div
      className={cn(
        "flex max-w-2xl flex-col gap-3",
        align === "center" && "mx-auto items-center text-center",
      )}
    >
      <p className="text-micro text-accent-ink uppercase">{eyebrow}</p>
      <h2 id={id} className="text-h1 sm:text-display">
        {title}
      </h2>
      {children ? (
        <p className="text-body text-ink-muted sm:text-[17px] sm:leading-7">
          {children}
        </p>
      ) : null}
    </div>
  );
}

/**
 * Signed in, every landing CTA goes straight to the dashboard: someone already using
 * studypods is never sent back through a setup screen. Signed out, it goes to register,
 * which lands on the dashboard too.
 */
export function ctaHref(signedIn: boolean) {
  return signedIn ? "/today" : "/register";
}

export function ctaLabel(signedIn: boolean) {
  return signedIn ? "Go to dashboard" : "Get started free";
}
