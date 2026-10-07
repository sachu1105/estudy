/**
 * Today's tasks, gathered by the topic they belong to.
 *
 * The plan writes two to four tasks per topic (study parts, then a check test each).
 * Shown flat that is twenty near-identical rows; shown by topic it is five things to
 * learn today. Mocks and the user's own tasks have no topic, so each stands alone.
 */
export type GroupableTask = {
  id: string;
  /** Full title, e.g. "Study Earth Structure (part 1 of 2)". */
  title: string;
  topicId: string | null;
  topicName: string | null;
  subject: string;
  minutes: number;
  done: boolean;
};

export type TaskGroup<T extends GroupableTask> = {
  key: string;
  title: string;
  subject: string;
  topicId: string | null;
  /** Minutes still to do in this group. */
  minutes: number;
  left: number;
  total: number;
  tasks: T[];
};

export function groupTasks<T extends GroupableTask>(
  tasks: T[],
): TaskGroup<T>[] {
  const groups = new Map<string, TaskGroup<T>>();
  for (const task of tasks) {
    // Topic-less tasks (mocks, custom) never merge: each is its own group.
    const key = task.topicId ?? `one:${task.id}`;
    let group = groups.get(key);
    if (!group) {
      group = {
        key,
        title: task.topicName ?? task.title,
        subject: task.subject,
        topicId: task.topicId,
        minutes: 0,
        left: 0,
        total: 0,
        tasks: [],
      };
      groups.set(key, group);
    }
    group.tasks.push(task);
    group.total += 1;
    if (!task.done) {
      group.left += 1;
      group.minutes += task.minutes;
    }
  }
  return [...groups.values()];
}
