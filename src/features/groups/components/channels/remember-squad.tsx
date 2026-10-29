"use client";

import { useEffect } from "react";

import { LAST_SQUAD_COOKIE } from "@/lib/squads/last-squad";

/**
 * Notes the squad on screen, so Squads opens back on it next time, as Discord reopens
 * the last server. Only an id, read back against the viewer's own memberships.
 */
export function RememberSquad({ groupId }: { groupId: string }) {
  useEffect(() => {
    document.cookie = `${LAST_SQUAD_COOKIE}=${groupId}; path=/; max-age=31536000; samesite=lax`;
  }, [groupId]);
  return null;
}
