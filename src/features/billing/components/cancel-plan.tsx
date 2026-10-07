"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/toast";

import { cancelSubscriptionAction } from "../actions";

/** Stops the subscription at the end of the period already paid for. */
export function CancelPlan() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" className="self-start">
          Cancel plan
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancel your plan?</DialogTitle>
          <DialogDescription>
            It keeps working until the end of the period you have paid for.
            Nothing you have made is deleted; anything over the free limits
            becomes read-only.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Keep it
          </Button>
          <Button
            variant="danger"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const result = await cancelSubscriptionAction();
                if (!result.ok) return void toast.error(result.error);
                setOpen(false);
                toast.success("Your plan ends when the paid period does.");
                router.refresh();
              })
            }
          >
            Cancel plan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
