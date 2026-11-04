/**
 * Today's tasks, gathered by subject.
 *
 * A heavy day can hold thirty-odd short tasks. As a flat list (or one card per topic) that
 * reads as a wall; by subject it is five or six lines, each opening to its topics, which is
 * also how the user already thinks about their pods.
 */
export type SubjectTask = {
  subject: string;
  minutes: number;
};

export type SubjectGroup<T extends SubjectTask> = {
  subject: string;
  minutes: number;
  tasks: T[];
};

/** Keeps the plan's order: subjects by their first task, tasks as given. */
export function groupBySubject<T extends SubjectTask>(
  tasks: T[],
): SubjectGroup<T>[] {
  const groups = new Map<string, SubjectGroup<T>>();
  for (const task of tasks) {
    let group = groups.get(task.subject);
    if (!group) {
      group = { subject: task.subject, minutes: 0, tasks: [] };
      groups.set(task.subject, group);
    }
    group.tasks.push(task);
    group.minutes += task.minutes;
  }
  return [...groups.values()];
}
