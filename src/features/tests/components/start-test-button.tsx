"use client";

import { ClipboardCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";

import {
  fullMockAction,
  practiceTopicAction,
  sectionMockAction,
  startTaskTestAction,
} from "../actions";

const ACTIONS = {
  task: startTaskTestAction,
  topic: practiceTopicAction,
  subject: sectionMockAction,
  exam: fullMockAction,
};

/** Builds a test (or reopens the open one) and goes to the player. */
export function StartTestButton({
  kind,
  id,
  label,
  variant = "secondary",
  icon = true,
  className,
}: {
  kind: keyof typeof ACTIONS;
  id: string;
  label: string;
  variant?: "primary" | "secondary" | "ghost";
  icon?: boolean;
  className?: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      variant={variant}
      className={className}
      disabled={pending}
      onClick={() =>
        start(async () => {
          const result = await ACTIONS[kind]({ id });
          if (!result.ok) return void toast.error(result.error);
          router.push(`/test/${result.testId}`);
        })
      }
    >
      {icon ? <ClipboardCheck aria-hidden /> : null}
      {pending ? "Getting questions" : label}
    </Button>
  );
}
