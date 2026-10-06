import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { TestPlayer } from "@/features/tests/components/test-player";
import { isId } from "@/lib/ids";
import { requireUser } from "@/server/auth/session";
import { testService } from "@/server/services/tests";

export const metadata: Metadata = { title: "Test" };

export default async function TestPage({
  params,
}: PageProps<"/test/[testId]">) {
  const user = await requireUser();
  const { testId } = await params;
  const test = isId(testId) ? await testService.forPlayer(user, testId) : null;
  if (!test) notFound();
  if (test.submitted) redirect(`/tests/${test.id}`);
  // The clock runs from first opening, on the server's time.
  const deadline = test.durationSec
    ? test.startedAt.getTime() + test.durationSec * 1000
    : null;
  return (
    <TestPlayer
      testId={test.id}
      title={test.title}
      questions={test.questions}
      deadline={deadline}
      negativeMarking={test.negativeMarking}
    />
  );
}
