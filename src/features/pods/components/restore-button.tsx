"use client";

import { RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";

import { restoreItemAction } from "../actions";

export function RestoreButton({ itemId }: { itemId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      variant="secondary"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const result = await restoreItemAction({ itemId });
          if (!result.ok) return void toast.error(result.error);
          toast.success("Restored");
          router.refresh();
        })
      }
    >
      <RotateCcw aria-hidden /> Restore
    </Button>
  );
}
