import type { Metadata } from "next";

import { PageHeader } from "@/components/shell/page-header";
import { ContributorWall } from "@/features/feedback/components/contributor-wall";
import {
  FEEDBACK_TABS,
  FeedbackTabs,
  type FeedbackTab,
} from "@/features/feedback/components/feedback-tabs";
import { IdeaBoard } from "@/features/feedback/components/idea-board";
import { ProblemForm } from "@/features/feedback/components/problem-form";
import { ProblemList } from "@/features/feedback/components/problem-list";
import { RateCard } from "@/features/feedback/components/rate-card";
import { systemClock } from "@/lib/clock";
import { timeAgo } from "@/lib/format/ago";
import { requireUser } from "@/server/auth/session";
import { feedbackService } from "@/server/services/feedback";

export const metadata: Metadata = { title: "Feedback" };

/** Where people rate studypods, ask for what's missing, back ideas and report problems. */
export default async function FeedbackPage({
  searchParams,
}: PageProps<"/feedback">) {
  const user = await requireUser();
  const params = await searchParams;
  const tab: FeedbackTab = FEEDBACK_TABS.includes(params.tab as FeedbackTab)
    ? (params.tab as FeedbackTab)
    : "ideas";
  // Where they came from (the command palette passes it), to fill in "Where?".
  const from =
    typeof params.from === "string" && params.from.startsWith("/")
      ? params.from.slice(0, 200)
      : "";

  const data = await feedbackService.overview(user);
  const now = systemClock.now();
  const when = (at: Date) => timeAgo(at, now, user.timezone);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <PageHeader
        title="Help shape studypods"
        description="Rate it, ask for what's missing, and back the ideas you'd use. We read every word."
      />
      <div className="-mt-4">
        <RateCard saved={data.rating} contributor={data.isContributor} />
      </div>
      <FeedbackTabs tab={tab} />
      {tab === "ideas" ? (
        <IdeaBoard
          ideas={data.ideas.map(({ createdAt, ...idea }) => ({
            ...idea,
            when: when(createdAt),
          }))}
        />
      ) : tab === "problems" ? (
        <div className="flex flex-col gap-8">
          <ProblemForm from={from} />
          <ProblemList
            problems={data.problems.map(({ createdAt, ...p }) => ({
              ...p,
              when: when(createdAt),
            }))}
          />
        </div>
      ) : (
        <ContributorWall people={data.contributors} me={user.id} />
      )}
    </div>
  );
}
