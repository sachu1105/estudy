"use client";

import { ClipboardCheck, Share2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { ItemPicker } from "@/components/blocks/item-picker";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";

import { shareGroupTestAction, takeGroupTestAction } from "../actions";

/** Share a test you took: the same questions, for the group to try. */
export function ShareTestSheet({
  groupId,
  channelId,
  tests,
}: {
  groupId: string;
  channelId: string;
  tests: { mockTestId: string; title: string }[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <ItemPicker
      align="end"
      disabled={pending}
      trigger={
        <Button variant="secondary">
          <Share2 aria-hidden /> Share a test
        </Button>
      }
      title="Share one of your tests"
      description="Members take the same questions and compare scores."
      empty="Take a test first; it shows up here to share."
      items={tests.map((t) => ({
        id: t.mockTestId,
        title: t.title,
        icon: <ClipboardCheck />,
      }))}
      onPick={(mockTestId) =>
        start(async () => {
          const result = await shareGroupTestAction({
            groupId,
            channelId,
            mockTestId,
          });
          if (!result.ok) return void toast.error(result.error);
          toast.success("Test shared");
          router.refresh();
        })
      }
    />
  );
}

/** Opens the member's own copy of a shared test in the player. */
export function TakeGroupTest({
  groupId,
  groupTestId,
  label,
}: {
  groupId: string;
  groupTestId: string;
  label: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      variant="secondary"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const result = await takeGroupTestAction({ groupId, groupTestId });
          if (!result.ok) return void toast.error(result.error);
          router.push(`/test/${result.testId}`);
        })
      }
    >
      {label}
    </Button>
  );
}
