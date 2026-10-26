"use client";

import { ExternalLink, Minus, Plus } from "lucide-react";
import type { getDocumentProxy } from "unpdf";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

import { PdfPage } from "./pdf-page";

type Doc = Awaited<ReturnType<typeof getDocumentProxy>>;

/** Sizes relative to the pane's width: 100% fills it, smaller leaves room around. */
const ZOOMS = [0.5, 0.67, 0.75, 0.9, 1, 1.25, 1.5, 2] as const;
const FIT = ZOOMS.indexOf(1);
const ZOOM_KEY = "omr-zoom";

/** The size this viewer picked last time, if storage allows it. */
function storedZoom() {
  try {
    const i = ZOOMS.indexOf(Number(localStorage.getItem(ZOOM_KEY)) as never);
    return i === -1 ? FIT : i;
  } catch {
    return FIT;
  }
}

/**
 * The question paper, drawn page by page with PDF.js, so it scrolls the same on a phone
 * as on a laptop (phones can't show a PDF inside a page). Pages draw as they come near.
 */
export function PdfPages({ src, title }: { src: string; title: string }) {
  const box = useRef<HTMLDivElement>(null);
  const [doc, setDoc] = useState<Doc | null>(null);
  const [failed, setFailed] = useState(false);
  const [width, setWidth] = useState(0);
  const [zoom, setZoomIndex] = useState(FIT);
  const setZoom = (next: number) => {
    const i = Math.min(ZOOMS.length - 1, Math.max(0, next));
    setZoomIndex(i);
    try {
      localStorage.setItem(ZOOM_KEY, String(ZOOMS[i]));
    } catch {
      // Storage blocked: the size still applies for this visit.
    }
  };

  useEffect(() => {
    let cancelled = false;
    let loaded: Doc | null = null;
    (async () => {
      const response = await fetch(src);
      if (!response.ok) throw new Error("Not found");
      const bytes = new Uint8Array(await response.arrayBuffer());
      const { getDocumentProxy } = await import("unpdf");
      loaded = await getDocumentProxy(bytes);
      if (cancelled) return void loaded.loadingTask.destroy();
      setZoomIndex(storedZoom());
      setDoc(loaded);
    })().catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
      void loaded?.loadingTask.destroy();
    };
  }, [src]);

  // Fit the pane's width; redraw only when it changes by a few pixels.
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) =>
      setWidth(Math.floor(entry.contentRect.width / 8) * 8),
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const pageWidth = Math.max(0, width - 24) * ZOOMS[zoom];

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex h-12 shrink-0 items-center gap-1 border-b border-border px-2">
        <span className="min-w-0 flex-1 truncate px-2 text-small text-ink-muted">
          {doc
            ? `${doc.numPages} page${doc.numPages === 1 ? "" : "s"}`
            : "Question paper"}
        </span>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Zoom out"
          disabled={zoom === 0}
          onClick={() => setZoom(zoom - 1)}
        >
          <Minus aria-hidden />
        </Button>
        <button
          type="button"
          aria-label="Fit the page to the width"
          title="Fit to width"
          onClick={() => setZoom(FIT)}
          className="h-11 w-14 cursor-pointer rounded-control text-center font-mono text-small tabular-nums hover:bg-surface-muted md:h-10"
        >
          {Math.round(ZOOMS[zoom] * 100)}%
        </button>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Zoom in"
          disabled={zoom === ZOOMS.length - 1}
          onClick={() => setZoom(zoom + 1)}
        >
          <Plus aria-hidden />
        </Button>
        <Button asChild variant="ghost" size="icon">
          <a
            href={src}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Open the PDF in a new tab"
          >
            <ExternalLink aria-hidden />
          </a>
        </Button>
      </div>
      <div
        ref={box}
        className="min-h-0 flex-1 overflow-auto overscroll-contain bg-surface-muted"
        aria-label={`${title}, the question paper`}
        role="region"
        tabIndex={0}
      >
        {failed ? (
          <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
            <p className="text-body text-ink-muted">
              The paper couldn&apos;t be shown here. Open it in a new tab and
              keep marking on this sheet.
            </p>
            <Button asChild variant="secondary">
              <a href={src} target="_blank" rel="noopener noreferrer">
                <ExternalLink aria-hidden /> Open PDF
              </a>
            </Button>
          </div>
        ) : !doc || pageWidth === 0 ? (
          <div className="flex flex-col items-center gap-3 p-3">
            <Skeleton className="aspect-[1/1.414] w-full rounded-[4px]" />
          </div>
        ) : (
          <div className="flex w-max min-w-full flex-col items-center gap-3 p-3">
            {Array.from({ length: doc.numPages }, (_, i) => (
              <PdfPage key={i} doc={doc} number={i + 1} width={pageWidth} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
