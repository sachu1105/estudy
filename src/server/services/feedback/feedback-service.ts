import type { Clock } from "@/lib/clock";
import {
  AREA_LABEL,
  IDEA_STATUS_LABEL,
  PROBLEM_STATUS_LABEL,
  VOTABLE_IDEA,
  type IdeaArea,
  type IdeaDecision,
  type IdeaInput,
  type IdeaStatus,
  type ProblemCategory,
  type ProblemDecision,
  type ProblemInput,
  type ProblemStatus,
  type RatingInput,
} from "@/lib/feedback/schemas";
import type { AuditLogRepository } from "@/server/repositories/audit-log-repository";
import type { FeedbackRepository } from "@/server/repositories/feedback-repository";
import type { NewNotification } from "@/server/repositories/notification-repository";

import { failure, type Result } from "../syllabus/deps";

export type FeedbackDeps = {
  feedback: FeedbackRepository;
  audit: Pick<AuditLogRepository, "append">;
  notify: (rows: NewNotification[]) => Promise<void>;
  clock: Clock;
};

type Viewer = { id: string };
type Staff = { id: string; ip: string | null };

/** Ideas a person can have waiting for review at once: room to think, not to flood. */
export const REVIEW_CAP = 5;

export type IdeaView = {
  id: string;
  title: string;
  body: string;
  area: IdeaArea;
  areaLabel: string;
  status: IdeaStatus;
  fromTeam: boolean;
  teamNote: string | null;
  votes: number;
  voted: boolean;
  mine: boolean;
  /** Who suggested it, or null when they chose not to be named. */
  by: string | null;
  createdAt: Date;
};

export type ProblemView = {
  id: string;
  category: ProblemCategory;
  body: string;
  page: string | null;
  status: ProblemStatus;
  teamNote: string | null;
  createdAt: Date;
};

export type Contributor = {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  ideas: number;
  fixes: number;
};

const GONE = failure("NOT_FOUND", "That idea is no longer there.");

/** Rating the app, suggesting and backing ideas, reporting problems, and the team's answers. */
export function createFeedbackService(deps: FeedbackDeps) {
  const now = () => deps.clock.now();

  async function contributors(): Promise<Contributor[]> {
    const { people, ideas, fixes } = await deps.feedback.contributions();
    return people
      .map((p) => ({
        ...p,
        ideas: ideas.get(p.id) ?? 0,
        fixes: fixes.get(p.id) ?? 0,
      }))
      .sort(
        (a, b) =>
          b.ideas + b.fixes - (a.ideas + a.fixes) ||
          a.displayName.localeCompare(b.displayName),
      );
  }

  return {
    /** Everything the feedback page shows one person. */
    async overview(viewer: Viewer) {
      const [rating, ideas, problems, wall] = await Promise.all([
        deps.feedback.ratingOf(viewer.id),
        deps.feedback.ideasFor(viewer.id),
        deps.feedback.problemsOf(viewer.id),
        contributors(),
      ]);
      const views: IdeaView[] = ideas.map((i) => {
        const mine = i.authorId === viewer.id;
        return {
          id: i.id,
          title: i.title,
          body: i.body,
          area: i.area,
          areaLabel: AREA_LABEL[i.area],
          status: i.status,
          fromTeam: i.fromTeam,
          teamNote: i.teamNote,
          votes: i.votes,
          voted: i.voters.length > 0,
          mine,
          by: i.fromTeam
            ? "studypods team"
            : mine
              ? "You"
              : i.credit
                ? i.author.displayName
                : null,
          createdAt: i.createdAt,
        };
      });
      return {
        rating: rating && { stars: rating.stars, note: rating.note ?? "" },
        ideas: views,
        problems: problems as ProblemView[],
        contributors: wall,
        /** Whether this person is on the wall themselves. */
        isContributor: wall.some((c) => c.id === viewer.id),
      };
    },

    async rate(viewer: Viewer, input: RatingInput) {
      await deps.feedback.rate(viewer.id, input, now());
      return { ok: true as const };
    },

    async suggest(
      viewer: Viewer,
      input: IdeaInput,
    ): Promise<Result<{ id: string }>> {
      if ((await deps.feedback.countInReview(viewer.id)) >= REVIEW_CAP)
        return failure(
          "LIMIT",
          `You have ${REVIEW_CAP} ideas waiting for review. Once the team has read them, suggest more.`,
        );
      const idea = await deps.feedback.createIdea({
        authorId: viewer.id,
        ...input,
        status: "REVIEW",
        fromTeam: false,
        at: now(),
      });
      return { ok: true, id: idea.id };
    },

    /** "I'd use this", or taking it back. Only while the idea is open or planned. */
    async vote(
      viewer: Viewer,
      ideaId: string,
      on: boolean,
    ): Promise<Result<{ votes: number }>> {
      const idea = await deps.feedback.ideaById(ideaId);
      if (!idea) return GONE;
      if (!VOTABLE_IDEA.includes(idea.status))
        return failure(
          "CLOSED",
          idea.status === "REVIEW"
            ? "This idea opens for votes once the team has read it."
            : "Voting on this idea has closed.",
        );
      const votes = await deps.feedback.setVote(ideaId, viewer.id, on, now());
      return { ok: true, votes };
    },

    async report(
      viewer: Viewer,
      input: ProblemInput,
      device: string | null,
    ): Promise<Result<{ id: string }>> {
      const row = await deps.feedback.createProblem({
        userId: viewer.id,
        category: input.category,
        body: input.body,
        page: input.page || null,
        device: device?.slice(0, 200) ?? null,
        credit: input.credit,
        at: now(),
      });
      return { ok: true, id: row.id };
    },

    // ---- Staff -----------------------------------------------------------------

    async adminOverview() {
      const [summary, ideas, problems] = await Promise.all([
        deps.feedback.ratingSummary(),
        deps.feedback.allIdeas(),
        deps.feedback.allProblems(),
      ]);
      const counts = [1, 2, 3, 4, 5].map(
        (stars) =>
          summary.groups.find((g) => g.stars === stars)?._count._all ?? 0,
      );
      const total = counts.reduce((a, b) => a + b, 0);
      const average = total
        ? counts.reduce((sum, n, i) => sum + n * (i + 1), 0) / total
        : null;
      return {
        ratings: { counts, total, average, recent: summary.recent },
        ideas,
        problems,
      };
    },

    /** The team asks "Would you use this?": it opens for votes straight away. */
    async postTeamIdea(staff: Staff, input: IdeaInput) {
      const idea = await deps.feedback.createIdea({
        authorId: staff.id,
        ...input,
        credit: true,
        status: "OPEN",
        fromTeam: true,
        at: now(),
      });
      await deps.audit.append({
        actorId: staff.id,
        action: "feedback.idea.post",
        targetId: idea.id,
        metadata: { title: input.title },
        ip: staff.ip,
      });
      return { ok: true as const, id: idea.id };
    },

    async decideIdea(
      staff: Staff,
      input: IdeaDecision,
    ): Promise<Result<object>> {
      const idea = await deps.feedback.ideaById(input.id);
      if (!idea) return GONE;
      const teamNote = input.teamNote || null;
      if (idea.status === input.status && idea.teamNote === teamNote)
        return { ok: true };
      await deps.feedback.decideIdea(idea.id, input.status, teamNote);
      await deps.audit.append({
        actorId: staff.id,
        action: "feedback.idea.decide",
        targetId: idea.id,
        metadata: { from: idea.status, to: input.status, note: !!teamNote },
        ip: staff.ip,
      });

      const href = `/feedback?tab=ideas#idea-${idea.id}`;
      const subject =
        `${IDEA_STATUS_LABEL[input.status]} · ${idea.title}`.slice(0, 140);
      const told = new Set<string>([staff.id]);
      const rows: NewNotification[] = [];
      const tell = (userId: string) => {
        if (told.has(userId)) return;
        told.add(userId);
        rows.push({
          userId,
          actorId: null,
          kind: "FEEDBACK",
          groupId: null,
          href,
          subject,
        });
      };
      if (!idea.fromTeam) tell(idea.authorId);
      // Everyone who backed it hears when it ships.
      if (input.status === "SHIPPED" && idea.status !== "SHIPPED")
        for (const id of await deps.feedback.voterIds(idea.id)) tell(id);
      if (rows.length) await deps.notify(rows);
      return { ok: true };
    },

    async decideProblem(
      staff: Staff,
      input: ProblemDecision,
    ): Promise<Result<object>> {
      const problem = await deps.feedback.problemById(input.id);
      if (!problem)
        return failure("NOT_FOUND", "That report is no longer there.");
      const teamNote = input.teamNote || null;
      if (problem.status === input.status && problem.teamNote === teamNote)
        return { ok: true };
      await deps.feedback.decideProblem(problem.id, input.status, teamNote);
      await deps.audit.append({
        actorId: staff.id,
        action: "feedback.problem.decide",
        targetId: problem.id,
        metadata: { from: problem.status, to: input.status, note: !!teamNote },
        ip: staff.ip,
      });
      if (problem.userId !== staff.id)
        await deps.notify([
          {
            userId: problem.userId,
            actorId: null,
            kind: "FEEDBACK",
            groupId: null,
            href: `/feedback?tab=problems#problem-${problem.id}`,
            subject:
              `${PROBLEM_STATUS_LABEL[input.status]} · ${problem.body}`.slice(
                0,
                140,
              ),
          },
        ]);
      return { ok: true };
    },
  };
}

export type FeedbackService = ReturnType<typeof createFeedbackService>;
