import { z } from "zod";

// Feedback: a rating of the app, ideas people vote on, and problems they report. Shared
// by the forms, the server actions and the service, so both ends check the same rules.

export const IDEA_AREAS = [
  "PODS",
  "PLAN",
  "TESTS",
  "SQUADS",
  "STORE",
  "OTHER",
] as const;
export type IdeaArea = (typeof IDEA_AREAS)[number];

export const AREA_LABEL: Record<IdeaArea, string> = {
  PODS: "Pods",
  PLAN: "Study plan",
  TESTS: "Tests",
  SQUADS: "Squads",
  STORE: "Store",
  OTHER: "Something else",
};

export const IDEA_STATUSES = [
  "REVIEW",
  "OPEN",
  "PLANNED",
  "BUILDING",
  "SHIPPED",
  "DECLINED",
] as const;
export type IdeaStatus = (typeof IDEA_STATUSES)[number];

export const IDEA_STATUS_LABEL: Record<IdeaStatus, string> = {
  REVIEW: "Waiting for review",
  OPEN: "Open for votes",
  PLANNED: "Planned",
  BUILDING: "Building",
  SHIPPED: "Shipped",
  DECLINED: "Not for now",
};

/** Everyone sees these. REVIEW and DECLINED are only shown to the idea's author. */
export const PUBLIC_IDEA: readonly IdeaStatus[] = [
  "OPEN",
  "PLANNED",
  "BUILDING",
  "SHIPPED",
];
/** Votes still count while the team is deciding or has planned it. */
export const VOTABLE_IDEA: readonly IdeaStatus[] = ["OPEN", "PLANNED"];

export const PROBLEM_CATEGORIES = [
  "BUG",
  "CONFUSING",
  "CONTENT",
  "ACCOUNT",
  "OTHER",
] as const;
export type ProblemCategory = (typeof PROBLEM_CATEGORIES)[number];

export const CATEGORY_LABEL: Record<ProblemCategory, string> = {
  BUG: "Something broke",
  CONFUSING: "Hard to use",
  CONTENT: "Wrong content",
  ACCOUNT: "Account or plan",
  OTHER: "Something else",
};

export const PROBLEM_STATUSES = [
  "RECEIVED",
  "LOOKING",
  "FIXED",
  "CLOSED",
] as const;
export type ProblemStatus = (typeof PROBLEM_STATUSES)[number];

export const PROBLEM_STATUS_LABEL: Record<ProblemStatus, string> = {
  RECEIVED: "Received",
  LOOKING: "Looking into it",
  FIXED: "Fixed",
  CLOSED: "Closed",
};

/** One word per star, low to high. */
export const STAR_WORDS = ["Poor", "Okay", "Good", "Great", "Love it"];

export const TITLE_MAX = 80;
export const IDEA_BODY_MAX = 1000;
export const PROBLEM_BODY_MAX = 2000;
export const NOTE_MAX = 500;
export const TEAM_NOTE_MAX = 600;

const text = (max: number, what: string) =>
  z.string().trim().max(max, `Keep ${what} under ${max} characters.`);

export const ratingSchema = z.object({
  stars: z.number().int().min(1, "Pick a star.").max(5),
  note: text(NOTE_MAX, "the note").default(""),
});

export const ideaSchema = z.object({
  title: text(TITLE_MAX, "the title").min(4, "Name the idea in a few words."),
  body: text(IDEA_BODY_MAX, "the details").default(""),
  area: z.enum(IDEA_AREAS),
  credit: z.boolean().default(true),
});

export const problemSchema = z.object({
  category: z.enum(PROBLEM_CATEGORIES),
  body: text(PROBLEM_BODY_MAX, "the description").min(
    10,
    "Say what happened in a sentence or two.",
  ),
  page: text(200, "the page").default(""),
  credit: z.boolean().default(true),
});

export const ideaDecisionSchema = z.object({
  id: z.uuid(),
  status: z.enum(IDEA_STATUSES),
  teamNote: text(TEAM_NOTE_MAX, "the reply").default(""),
});

export const problemDecisionSchema = z.object({
  id: z.uuid(),
  status: z.enum(PROBLEM_STATUSES),
  teamNote: text(TEAM_NOTE_MAX, "the reply").default(""),
});

export type RatingInput = z.infer<typeof ratingSchema>;
export type IdeaInput = z.infer<typeof ideaSchema>;
export type ProblemInput = z.infer<typeof problemSchema>;
export type IdeaDecision = z.infer<typeof ideaDecisionSchema>;
export type ProblemDecision = z.infer<typeof problemDecisionSchema>;
