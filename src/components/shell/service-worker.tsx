"use client";

import { useEffect } from "react";

/**
 * Registers the service worker that handles push and the offline page. Only in
 * production: in dev it would cache pages Next is still rebuilding.
 */
export function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    const register = () =>
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // An unregistered worker only costs offline support.
      });
    if (document.readyState === "complete") register();
    else {
      window.addEventListener("load", register, { once: true });
      return () => window.removeEventListener("load", register);
    }
  }, []);
  return null;
}
