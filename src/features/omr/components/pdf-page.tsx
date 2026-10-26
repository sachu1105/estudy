"use client";

import type { getDocumentProxy } from "unpdf";
import { useEffect, useRef, useState } from "react";

import { Skeleton } from "@/components/ui/skeleton";

type Doc = Awaited<ReturnType<typeof getDocumentProxy>>;

/** One page of the paper, drawn once it comes within a screen of view. */
export function PdfPage({
  doc,
  number,
  width,
}: {
  doc: Doc;
  number: number;
  width: number;
}) {
  const frame = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [near, setNear] = useState(false);
  const [ratio, setRatio] = useState(1.414);
  const [drawn, setDrawn] = useState(false);

  useEffect(() => {
    const el = frame.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => entry.isIntersecting && setNear(true),
      { rootMargin: "100% 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const target = canvas.current;
    if (!near || !target) return;
    let task: { cancel: () => void } | null = null;
    let cancelled = false;
    (async () => {
      const page = await doc.getPage(number);
      const base = page.getViewport({ scale: 1 });
      if (cancelled) return;
      setRatio(base.height / base.width);
      // Sharp on high-density screens, capped so a long paper doesn't eat memory.
      const density = Math.min(window.devicePixelRatio || 1, 2);
      const viewport = page.getViewport({
        scale: (width / base.width) * density,
      });
      target.width = Math.floor(viewport.width);
      target.height = Math.floor(viewport.height);
      const render = page.render({ canvas: target, viewport });
      task = render;
      await render.promise;
      if (!cancelled) setDrawn(true);
    })().catch(() => {});
    return () => {
      cancelled = true;
      task?.cancel();
    };
  }, [doc, number, width, near]);

  return (
    <div
      ref={frame}
      className="relative shrink-0 overflow-hidden rounded-[4px] border border-border bg-white"
      style={{ width, height: Math.round(width * ratio) }}
    >
      {drawn ? null : <Skeleton className="absolute inset-0 rounded-none" />}
      <canvas
        ref={canvas}
        className="block size-full"
        role="img"
        aria-label={`Page ${number}`}
      />
    </div>
  );
}
