"use client";

import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils/cn";

const clock = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
};

/** Time left on a timed test. At zero the test submits itself with what's answered. */
export function TestTimer({
  deadline,
  onExpire,
}: {
  deadline: number;
  onExpire: () => void;
}) {
  const [left, setLeft] = useState(() =>
    Math.max(0, Math.round((deadline - Date.now()) / 1000)),
  );
  const expire = useRef(onExpire);
  useEffect(() => {
    expire.current = onExpire;
  });

  useEffect(() => {
    const tick = setInterval(() => {
      const next = Math.max(0, Math.round((deadline - Date.now()) / 1000));
      setLeft(next);
      if (next === 0) {
        clearInterval(tick);
        expire.current();
      }
    }, 1000);
    return () => clearInterval(tick);
  }, [deadline]);

  return (
    <span
      role="timer"
      aria-label={`${Math.ceil(left / 60)} minutes left`}
      className={cn(
        "font-mono text-body font-medium tabular-nums",
        left <= 60 ? "text-danger-ink" : "text-ink",
      )}
    >
      {clock(left)}
    </span>
  );
}
