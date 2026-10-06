/** The exam board's columns, in order. Shared by the server and the board UI. */
export const POD_STAGES = ["TO_STUDY", "STUDYING", "REVISING", "DONE"] as const;

export type PodStage = (typeof POD_STAGES)[number];

export const stageLabels: Record<PodStage, string> = {
  TO_STUDY: "To study",
  STUDYING: "Studying",
  REVISING: "Revising",
  DONE: "Done",
};

/** What each column tells the plan; shown under the column name. */
export const stageHints: Record<PodStage, string> = {
  TO_STUDY: "The plan starts these top first",
  STUDYING: "Gets time first",
  REVISING: "Revision touches only",
  DONE: "A light revision now and then",
};

export type Board = Record<PodStage, string[]>;

/** Pods into columns, each column in the user's order (syllabus order breaks ties). */
export function toBoard<
  T extends { id: string; stage: PodStage; stageOrder: number; order: number },
>(pods: T[]): Record<PodStage, T[]> {
  const board = Object.fromEntries(
    POD_STAGES.map((s) => [s, [] as T[]]),
  ) as Record<PodStage, T[]>;
  for (const pod of pods) board[pod.stage].push(pod);
  for (const stage of POD_STAGES)
    board[stage].sort(
      (a, b) => a.stageOrder - b.stageOrder || a.order - b.order,
    );
  return board;
}
