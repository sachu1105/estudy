"use client";

import {
  motion,
  useReducedMotionConfig,
  useScroll,
  useTransform,
  type MotionValue,
} from "motion/react";
import {
  useEffect,
  useRef,
  type CSSProperties,
  type ReactNode,
} from "react";

/** Share of the pinned scroll spent dealing; the rest holds the finished pile. */
const DEAL_END = 0.85;

/**
 * The section scrolls up until it sits in the middle of the screen, stops there, and the
 * scroll deals the cards one by one, each sliding in from the right onto the last. Once
 * the pile is complete the page carries on to the next section.
 *
 * The pinned panel is only as tall as its content and centred under the 64px nav, so
 * there is no full-screen band. Under reduced motion nothing pins: it is the finished pile.
 */
export function HowItWorksDeck({
  heading,
  cards,
}: {
  heading: ReactNode;
  cards: ReactNode[];
}) {
  const count = cards.length;
  const reduceMotion = Boolean(useReducedMotionConfig());
  const track = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);

  // The sticky top centres the panel, so CSS needs its height.
  useEffect(() => {
    const element = panel.current;
    if (!element) return;
    const observer = new ResizeObserver(() =>
      element.style.setProperty("--panel-h", `${element.offsetHeight}px`),
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  // 0 when the panel pins, 1 when it lets go: how far the track has scrolled past the pin.
  const { scrollY } = useScroll();
  const progress = useTransform(scrollY, () => {
    const outer = track.current;
    const inner = panel.current;
    if (!outer || !inner) return 0;
    const range = outer.offsetHeight - inner.offsetHeight;
    if (range <= 0) return 1;
    const pinTop = parseFloat(getComputedStyle(inner).top) || 0;
    const scrolled = pinTop - outer.getBoundingClientRect().top;
    return Math.min(1, Math.max(0, scrolled / range));
  });

  return (
    <div className="mx-auto max-w-content px-4 py-16 md:px-8 md:py-24">
      <div ref={track} style={{ "--stack": count - 1 } as CSSProperties}>
        <div
          ref={panel}
          className="sticky top-[calc(50dvh+2rem-var(--panel-h,30rem)/2)] motion-reduce:static md:grid md:grid-cols-[1fr_minmax(0,520px)] md:items-center md:gap-16"
        >
          {heading}

          <ol className="relative mt-10 h-[calc(26rem+var(--stack)*0.875rem)] sm:h-[calc(24rem+var(--stack)*0.875rem)] md:mt-0">
            {cards.map((card, index) => (
              <DeckCard
                key={index}
                index={index}
                count={count}
                progress={progress}
                still={reduceMotion}
              >
                {card}
              </DeckCard>
            ))}
          </ol>
        </div>
        {/* The scroll the panel stays pinned for: a stretch per card and a short hold.
            A sticky element only travels within its parent's content, so this is a
            spacer rather than padding. */}
        <div
          aria-hidden
          className="h-[calc(var(--stack)*40dvh+15dvh)] motion-reduce:hidden"
        />
      </div>
    </div>
  );
}

function DeckCard({
  index,
  count,
  progress,
  still,
  children,
}: {
  index: number;
  count: number;
  progress: MotionValue<number>;
  still: boolean;
  children: ReactNode;
}) {
  // The first card is already down; each of the others gets an equal stretch of scroll.
  const segment = DEAL_END / (count - 1);
  const from = (index - 1) * segment;
  const to = index * segment;
  const first = index === 0;
  const last = index === count - 1;

  const x = useTransform(
    progress,
    [from, to],
    first ? ["0%", "0%"] : ["70%", "0%"],
  );
  const opacity = useTransform(
    progress,
    [from, from + segment * 0.4],
    first ? [1, 1] : [0, 1],
  );
  // Cards underneath settle back a little as the pile grows on top of them.
  const scale = useTransform(
    progress,
    last ? [0, 1] : [index * segment, DEAL_END],
    last ? [1, 1] : [1, 1 - 0.04 * (count - 1 - index)],
  );

  return (
    <motion.li
      // Each card parks a notch below the last, leaving the ones behind it peeking out.
      className="absolute inset-x-0 h-104 origin-top sm:h-96"
      style={{
        top: `${index * 0.875}rem`,
        ...(still
          ? { scale: 1 - 0.04 * (count - 1 - index) }
          : { x, opacity, scale }),
      }}
    >
      {children}
    </motion.li>
  );
}
