import type {
  IdeaArea,
  IdeaStatus,
  ProblemCategory,
  ProblemStatus,
} from "@/lib/feedback/schemas";

/** An idea as the board shows it, dates already written out for the reader. */
export type IdeaItem = {
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
  by: string | null;
  when: string;
};

export type ProblemItem = {
  id: string;
  category: ProblemCategory;
  body: string;
  page: string | null;
  status: ProblemStatus;
  teamNote: string | null;
  when: string;
};
