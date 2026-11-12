"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { toast } from "@/components/ui/toast";

import { saveSettingAction } from "../actions";

/**
 * Saves one runtime setting and says so. `onSaved` runs once it's stored, for a form
 * that tracks what is saved (to clear its unsaved marks) or rolls back on error.
 */
export function useSaveSetting(key: Parameters<typeof saveSettingAction>[0]) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const save = (
    value: unknown,
    done = "Saved",
    on?: { saved?: () => void; failed?: () => void },
  ) =>
    start(async () => {
      const result = await saveSettingAction(key, value);
      if (!result.ok) {
        on?.failed?.();
        return void toast.error(result.error);
      }
      on?.saved?.();
      toast.success(done);
      router.refresh();
    });
  return { save, pending };
}
