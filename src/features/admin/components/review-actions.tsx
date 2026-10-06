"use client";

import { Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";

import { reviewAction } from "../actions";
import { ReasonDialog } from "./reason-dialog";

/** Approve (everyone can use it) or reject with a note saying what to fix. */
export function ReviewActions({ versionId }: { versionId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        variant="primary"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const result = await reviewAction({
              versionId,
              approve: true,
              note: null,
            });
            if (!result.ok) return void toast.error(result.error);
            toast.success("Approved: it's in the catalogue now");
            router.push("/admin/catalogue");
          })
        }
      >
        <Check aria-hidden /> Approve
      </Button>
      <ReasonDialog
        danger
        trigger="Reject"
        title="Reject this syllabus"
        description="Say what's wrong so it can be fixed and sent again."
        confirm="Reject"
        run={async (note) => {
          const result = await reviewAction({
            versionId,
            approve: false,
            note,
          });
          if (result.ok) router.push("/admin/catalogue");
          return result;
        }}
        done="Rejected"
      />
    </div>
  );
}
