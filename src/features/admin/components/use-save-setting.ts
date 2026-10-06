"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { toast } from "@/components/ui/toast";

import { saveSettingAction } from "../actions";

/** Saves one runtime setting and says so. */
export function useSaveSetting(key: Parameters<typeof saveSettingAction>[0]) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const save = (value: unknown, done = "Saved") =>
    start(async () => {
      const result = await saveSettingAction(key, value);
      if (!result.ok) return void toast.error(result.error);
      toast.success(done);
      router.refresh();
    });
  return { save, pending };
}
