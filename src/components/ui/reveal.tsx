"use client";

import { useEffect, useRef, type ComponentProps } from "react";

import { cn } from "@/lib/utils/cn";

/**
 * Fades and rises 12px once when it enters the viewport. Content is fully visible without
 * JavaScript and under reduced motion; the hidden start state only applies once the boot
 * script has marked <html data-js>.
 */
export function Reveal({ className, ...props }: ComponentProps<"div">) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          element.setAttribute("data-visible", "");
          observer.disconnect();
        }
      },
      { rootMargin: "0px 0px -10% 0px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      data-reveal=""
      className={cn("group/reveal", className)}
      {...props}
    />
  );
}
