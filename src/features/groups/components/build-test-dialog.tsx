"use client";

import { ClipboardCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/toast";

import { buildGroupTestAction } from "../actions";
import { BuildTestForm } from "./build-test-form";

/** A test for the group from the verified pool: pick topics, how many questions, how long. */
export function BuildTestDialog({
  groupId,
  channelId,
  topics,
}: {
  groupId: string;
  channelId: string;
  topics: string[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="primary">
          <ClipboardCheck aria-hidden /> Build a test
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Build a test for the squad</DialogTitle>
        </DialogHeader>
        <BuildTestForm
          topics={topics}
          pending={pending}
          onSubmit={(test) =>
            start(async () => {
              const result = await buildGroupTestAction({
                groupId,
                channelId,
                ...test,
              });
              if (!result.ok) return void toast.error(result.error);
              toast.success("Test shared with the squad");
              setOpen(false);
              router.refresh();
            })
          }
        />
      </DialogContent>
    </Dialog>
  );
}
