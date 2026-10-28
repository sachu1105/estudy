"use client";

import { useEffect, useRef, useState } from "react";

import { toast } from "@/components/ui/toast";

const target = () =>
  /^#m-([0-9a-f-]{36})$/.exec(window.location.hash)?.[1] ?? null;

/**
 * Follows `#m-<id>` links (a search result, a reply, a link from elsewhere): loads back
 * to the message if it isn't on screen yet, brings it into view and lights it for a
 * moment. Returns the message that's lit.
 */
export function useJumpToMessage(reach: (id: string) => Promise<boolean>) {
  const [flashId, setFlashId] = useState<string | null>(null);
  const latest = useRef(reach);
  useEffect(() => {
    latest.current = reach;
  });

  useEffect(() => {
    const go = async () => {
      const id = target();
      if (!id) return;
      if (await latest.current(id)) return setFlashId(id);
      toast.error("That message is too far back to jump to. Scroll up to it.");
    };
    void go();
    window.addEventListener("hashchange", go);
    return () => window.removeEventListener("hashchange", go);
  }, []);

  // Once it's drawn: into the middle of the screen, then let the light fade.
  useEffect(() => {
    if (!flashId) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.getElementById(`m-${flashId}`)?.scrollIntoView({
      block: "center",
      behavior: still ? "auto" : "smooth",
    });
    const timer = setTimeout(() => setFlashId(null), 2400);
    return () => clearTimeout(timer);
  }, [flashId]);

  return flashId;
}
