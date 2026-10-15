"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { Button } from "@/components/ui/button";

/**
 * A row of cards that scrolls sideways: swipe on a phone, arrows on a desktop. The
 * children are the cards (server-rendered); this only moves them.
 *
 * The track snaps to card starts and keeps the page's 16px gutter, so the next card
 * peeks in from the edge and it reads as "there is more here".
 */
export function CardRail({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  const track = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: true, end: false });

  const measure = useCallback(() => {
    const el = track.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setEdges({ start: el.scrollLeft < 8, end: el.scrollLeft > max - 8 });
  }, []);

  useEffect(() => {
    measure();
    const el = track.current;
    if (!el) return;
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [measure]);

  function page(direction: 1 | -1) {
    const el = track.current;
    if (!el) return;
    // One card plus its gap, so a click always lands on a card edge.
    const card = el.firstElementChild as HTMLElement | null;
    const step = card ? card.offsetWidth + 16 : el.clientWidth;
    el.scrollBy({ left: direction * step, behavior: "smooth" });
  }

  return (
    <div className="relative">
      <div
        ref={track}
        onScroll={measure}
        role="region"
        aria-label={label}
        tabIndex={0}
        className="-mx-4 flex snap-x snap-mandatory [scrollbar-width:none] gap-4 overflow-x-auto scroll-smooth px-4 pb-2 md:-mx-8 md:px-8 [&::-webkit-scrollbar]:hidden"
      >
        {children}
      </div>
      <div className="mt-6 hidden justify-end gap-2 md:flex">
        <Button
          variant="secondary"
          size="icon"
          aria-label="Previous"
          disabled={edges.start}
          onClick={() => page(-1)}
        >
          <ChevronLeft aria-hidden />
        </Button>
        <Button
          variant="secondary"
          size="icon"
          aria-label="Next"
          disabled={edges.end}
          onClick={() => page(1)}
        >
          <ChevronRight aria-hidden />
        </Button>
      </div>
    </div>
  );
}
