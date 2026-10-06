"use client";

import { Share2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { toast } from "@/components/ui/toast";

import { shareGroupTestAction, takeGroupTestAction } from "../actions";

/** Share a test you took: the same questions, for the group to try. */
export function ShareTestSheet({
  groupId,
  tests,
}: {
  groupId: string;
  tests: { mockTestId: string; title: string }[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="secondary">
          <Share2 aria-hidden /> Share a test
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="overflow-y-auto">
        <SheetTitle>Share one of your tests</SheetTitle>
        <SheetDescription>
          Members take the same questions and compare scores.
        </SheetDescription>
        {tests.length === 0 ? (
          <p className="text-body text-ink-muted">
            Take a test first; it shows up here to share.
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {tests.map((t) => (
              <li key={t.mockTestId} className="flex items-center gap-3 py-2">
                <span className="min-w-0 flex-1 truncate text-body">
                  {t.title}
                </span>
                <Button
                  variant="secondary"
                  disabled={pending}
                  aria-label={`Share ${t.title}`}
                  onClick={() =>
                    start(async () => {
                      const result = await shareGroupTestAction({
                        groupId,
                        mockTestId: t.mockTestId,
                      });
                      if (!result.ok) return void toast.error(result.error);
                      toast.success("Test shared");
                      router.refresh();
                    })
                  }
                >
                  Share
                </Button>
              </li>
            ))}
          </ul>
        )}
      </SheetContent>
    </Sheet>
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
