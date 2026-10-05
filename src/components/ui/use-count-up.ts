"use client";

import { animate, useReducedMotionConfig } from "motion/react";
import { useEffect, useRef, useState } from "react";

/** Counts from 0 to `target` on mount and animates between later values. */
export function useCountUp(target: number, durationMs = 600) {
  const reduceMotion = useReducedMotionConfig();
  const [value, setValue] = useState(0);
  const latest = useRef(0);

  useEffect(() => {
    if (reduceMotion) return;
    const controls = animate(latest.current, target, {
      duration: durationMs / 1000,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (next) => {
        latest.current = next;
        setValue(next);
      },
    });
    return () => controls.stop();
  }, [target, durationMs, reduceMotion]);

  return reduceMotion ? target : value;
}
