// The deterministic day-by-day packer. Walks the horizon once, filling each day in a fixed
// priority order. No randomness and no clock; ties are broken by subject and topic order.
//
// Each day, in order:
//   1. revision touches that are due
//   2. FULL_MOCK on the days picked for it (review phase only)
//   3. SECTION_MOCK for subjects that are ready (learning phase only)
//   4. STUDY blocks, each followed by its CHECK_TEST (learning phase only), paced so study
//      spreads evenly over the learning phase instead of piling into the first weeks
//   5. touches clamped to the horizon end, pulled earlier into free review time
//   6. optional final-review revisions to fill what is left (review phase only)

import { fromDay } from "./dates";
import {
  BEGINNER_BLOCK,
  BEGINNER_DAYS,
  CHECK_TEST_MINUTES,
  floor5,
  FULL_MOCK_MINUTES,
  MAX_BLOCK,
  MIN_BLOCK,
  SECTION_MOCK_MINUTES,
} from "./minutes";

/** A new topic only starts with at least this long a block (or its whole length). */
const MIN_FIRST_BLOCK = 30;
/** Pacing headroom: plan 25% more study per day than an even spread needs. */
const PACE_HEADROOM_PCT = 125;
/** A continuing topic finishes today, past the pace, if this little is left. */
const FINISH_SLACK = 20;
import {
  plainReason,
  topicReason,
  type DraftTask,
  type Model,
  type ModelSubject,
  type ModelTopic,
} from "./model";
import type { ExtraTouch } from "./schemas";

export type { DraftTask } from "./model";

type Touch = {
  due: number;
  touch: number;
  offset: number;
  extra: ExtraTouch | null;
  pullable: boolean;
  placedDay: number | null;
};

type TopicState = {
  topic: ModelTopic;
  touches: Touch[];
  next: number;
  /** Day of the last study block or placed touch; touches must come after it. */
  lastActivity: number | null;
  /** Day the topic counted as "studied + 2 revisions" for its section mock. */
  readyDay: number | null;
  studyParts: number;
  finalReviewed: boolean;
  /** Day the study finished, which revision gaps count from. */
  studiedDay: number | null;
};

export type ScheduleResult = {
  days: DraftTask[][];
  unplacedStudyMinutes: number;
  unplacedTouches: number;
  unplacedTouchMinutes: number;
  droppedTouches: number;
  requiredMinutesPlaced: number;
};

export function schedule(model: Model): ScheduleResult {
  const N = model.horizonDays;
  const L = model.learnDays;
  let droppedTouches = 0;
  let requiredMinutesPlaced = 0;

  const states = new Map<string, TopicState>();
  const queues = new Map<string, TopicState[]>();
  const subjectTotal = new Map<string, number>();
  const subjectRemaining = new Map<string, number>();
  const inProgress: TopicState[] = [];
  const sectionPlaced = new Set<string>();
  const leads: (string | null)[] = [];

  /** Scheduled tasks never take an id a pinned task already holds. */
  function uniqueKey(base: string) {
    let key = base;
    for (let n = 2; model.pinnedKeys.has(key); n++) key = `${base}~${n}`;
    return key;
  }

  function createTouches(state: TopicState, studiedDay: number) {
    const t = state.topic;
    state.studiedDay = studiedDay;
    const last = Math.max(studiedDay, t.lastRevisedDay ?? studiedDay);
    let touchNo = t.revisionsDone;
    for (let i = t.revisionsDone; i < t.offsets.length; i++) {
      const offset = t.offsets[i];
      let due = Math.max(studiedDay + offset, last + 1, 0);
      let pullable = false;
      if (due > N - 1) {
        due = N - 1;
        pullable = true;
      }
      const previousDue = state.touches.at(-1)?.due ?? last;
      // Collapsed onto the previous touch (missed while away, or clamped to the horizon).
      if (due <= previousDue || due <= last) {
        droppedTouches++;
        continue;
      }
      touchNo++;
      // The user pinned this touch by hand; theirs replaces ours.
      if (t.pinnedTouches.has(touchNo)) continue;
      state.touches.push({
        due,
        touch: touchNo,
        offset,
        extra: t.extras[i],
        pullable,
        placedDay: null,
      });
    }
    const pinnedCount = t.pinnedRevisionDays.length;
    if (
      t.revisionsDone >= 2 ||
      t.revisionsDone + state.touches.length + pinnedCount < 2
    ) {
      state.readyDay = Math.max(studiedDay, t.lastRevisedDay ?? studiedDay);
    } else if (t.revisionsDone + pinnedCount >= 2) {
      state.readyDay = Math.max(
        studiedDay,
        t.pinnedRevisionDays[1 - t.revisionsDone],
      );
    }
  }

  for (const subject of model.subjects) {
    const queue: TopicState[] = [];
    let total = 0;
    let remaining = 0;
    for (const topic of subject.topics) {
      const state: TopicState = {
        topic,
        touches: [],
        next: 0,
        lastActivity: topic.studiedDay,
        readyDay: null,
        studyParts: 0,
        finalReviewed: false,
        studiedDay: null,
      };
      states.set(topic.id, state);
      // Share of a subject's work left is measured against its full syllabus, so a re-plan
      // paces subjects exactly as the original plan did.
      total += topic.studyTotal;
      remaining += topic.studyRemaining;
      if (topic.skipped) {
        state.readyDay = -1; // already known: counts as ready for its section mock
      } else if (topic.started) {
        state.studyParts = 0;
        inProgress.push(state);
      } else if (topic.studyRemaining > 0) {
        queue.push(state);
      } else if (topic.studiedDay !== null) {
        createTouches(state, topic.studiedDay);
      } else if (topic.pinnedStudyLastDay !== null) {
        // Every remaining minute is pinned: revisions follow the last pinned block.
        state.lastActivity = topic.pinnedStudyLastDay;
        createTouches(state, topic.pinnedStudyLastDay);
      }
    }
    queues.set(subject.id, queue);
    subjectTotal.set(subject.id, Math.max(1, total));
    subjectRemaining.set(subject.id, remaining);
  }

  function sectionDue(subject: ModelSubject) {
    if (subject.sectionMockDone || sectionPlaced.has(subject.id)) return null;
    let latest = -Infinity;
    for (const topic of subject.topics) {
      const ready = states.get(topic.id)!.readyDay;
      if (ready === null) return null;
      latest = Math.max(latest, ready);
    }
    return Math.max(0, latest + 1);
  }

  /** Bigger share of its own work left goes first, so subjects finish at a similar pace. */
  function byRemainingShare(a: ModelSubject, b: ModelSubject) {
    const left = subjectRemaining.get(a.id)! * subjectTotal.get(b.id)!;
    const right = subjectRemaining.get(b.id)! * subjectTotal.get(a.id)!;
    return right - left || a.index - b.index;
  }

  const leadOn = (day: number) =>
    (day >= 0 ? leads[day] : model.recentLeads[2 + day]) ?? null;

  function pick(day: number, firstOfDay: boolean): TopicState | null {
    const banned =
      firstOfDay && leadOn(day - 1) && leadOn(day - 1) === leadOn(day - 2)
        ? leadOn(day - 1)
        : null;
    const continuing = inProgress.find((s) => s.topic.subjectId !== banned);
    if (continuing) return continuing;

    const withWork = model.subjects.filter((s) => queues.get(s.id)!.length > 0);
    let options = withWork.filter((s) => s.id !== banned);
    if (options.length === 0) {
      // Only the banned subject has work left: the interleaving rule can't apply.
      if (inProgress.length > 0) return inProgress[0];
      options = withWork;
    }
    if (options.length === 0) return null;
    if (model.beginner) {
      const foundational = options.filter(
        (s) => queues.get(s.id)![0].topic.foundational,
      );
      if (foundational.length > 0) options = foundational;
    }
    // The board: subjects the user is studying now get time before the rest.
    const studying = options.filter((s) => s.stage === "STUDYING");
    if (studying.length > 0) options = studying;
    const [subject] = [...options].sort(byRemainingShare);
    return queues.get(subject.id)!.shift()!;
  }

  for (const day of model.pinned)
    for (const task of day)
      if (
        task.type === "STUDY" ||
        task.type === "CHECK_TEST" ||
        task.type === "REVISION"
      )
        requiredMinutesPlaced += task.minutes;

  // Full mocks: spread evenly over review days that can hold one, ending on the last.
  const fullMockDays = new Set<number>();
  const eligible = Array.from({ length: N - L }, (_, i) => L + i).filter(
    (d) => model.capacities[d] >= FULL_MOCK_MINUTES,
  );
  const mockCount = eligible.length
    ? Math.min(eligible.length, Math.max(1, Math.floor((N - L) / 3)))
    : 0;
  for (let i = 1; i <= mockCount; i++) {
    fullMockDays.add(
      eligible[Math.ceil((i * eligible.length) / mockCount) - 1],
    );
  }

  // Pace study to finish ~11 days before review starts (at most a quarter of the learning
  // phase), so the second revision and the section mock can still land in the learning phase.
  const studyDeadline = Math.max(1, L - Math.min(11, Math.floor(L / 4)));
  const paceCapacityFrom = new Array<number>(L + 1).fill(0);
  for (let d = studyDeadline - 1; d >= 0; d--)
    paceCapacityFrom[d] = paceCapacityFrom[d + 1] + model.capacities[d];
  const remainingStudyLoad = () =>
    [...states.values()].reduce(
      (sum, s) =>
        sum +
        s.topic.studyRemaining +
        Math.ceil(s.topic.studyRemaining / MAX_BLOCK) * CHECK_TEST_MINUTES,
      0,
    );

  const days: DraftTask[][] = [];
  for (let d = 0; d < N; d++) {
    const capacity = model.capacities[d];
    const learning = d < L;
    const tasks: DraftTask[] = [];
    let used = 0;
    const fits = (minutes: number) => used + minutes <= capacity;
    const push = (task: DraftTask, required: boolean) => {
      tasks.push(task);
      used += task.minutes;
      if (required) requiredMinutesPlaced += task.minutes;
    };

    const placeTouch = (state: TopicState) => {
      const touch = state.touches[state.next];
      touch.placedDay = d;
      state.next++;
      state.lastActivity = d;
      const t = state.topic;
      const doneSoFar =
        t.revisionsDone +
        state.next +
        t.pinnedRevisionDays.filter((p) => p <= d).length;
      if (state.readyDay === null && doneSoFar >= 2) state.readyDay = d;
      push(
        {
          key: uniqueKey(`REVISION:${t.id}:${touch.touch}`),
          type: "REVISION",
          subjectId: t.subjectId,
          topicId: t.id,
          minutes: t.revMinutes,
          window: t.window,
          touch: touch.touch,
          finalReview: false,
          pinned: false,
          title: null,
          reason: topicReason(t, "SPACED_REVISION", {
            revision: {
              touch: touch.touch,
              gapDays: touch.offset,
              studiedOn: fromDay(model.startDay + state.studiedDay!),
              extra: touch.extra,
              clampedToEnd: touch.pullable,
              ...(t.fromBoard ? { fromBoard: t.fromBoard } : {}),
            },
          }),
        },
        true,
      );
    };

    const heads = (accept: (touch: Touch) => boolean) =>
      [...states.values()]
        .filter(
          (s) =>
            s.next < s.touches.length &&
            (s.lastActivity ?? -Infinity) < d &&
            !s.topic.pinnedRevisionDays.includes(d) &&
            accept(s.touches[s.next]),
        )
        .sort(
          (a, b) =>
            a.touches[a.next].due - b.touches[b.next].due ||
            a.topic.subjectIndex - b.topic.subjectIndex ||
            a.topic.rank - b.topic.rank,
        );

    // 1. Due touches.
    for (const state of heads((t) => t.due <= d))
      if (fits(state.topic.revMinutes)) placeTouch(state);

    // 2. Full mock (unless the user already pinned one today).
    if (
      !learning &&
      fullMockDays.has(d) &&
      !model.pinned[d].some((t) => t.type === "FULL_MOCK") &&
      fits(FULL_MOCK_MINUTES)
    ) {
      push(
        {
          key: uniqueKey(`FULL_MOCK:${fromDay(model.startDay + d)}`),
          type: "FULL_MOCK",
          subjectId: null,
          topicId: null,
          minutes: FULL_MOCK_MINUTES,
          window: model.defaultWindow,
          touch: null,
          finalReview: false,
          pinned: false,
          title: null,
          reason: plainReason("FULL_MOCK"),
        },
        false,
      );
    }

    if (learning) {
      // 3. Section mocks (none in a beginner's first week).
      for (const subject of model.subjects) {
        const due = sectionDue(subject);
        if (
          due === null ||
          due > d ||
          (model.beginner && d < BEGINNER_DAYS) ||
          !fits(SECTION_MOCK_MINUTES)
        )
          continue;
        sectionPlaced.add(subject.id);
        push(
          {
            key: uniqueKey(`SECTION_MOCK:${subject.id}`),
            type: "SECTION_MOCK",
            subjectId: subject.id,
            topicId: null,
            minutes: SECTION_MOCK_MINUTES,
            window: subject.window,
            touch: null,
            finalReview: false,
            pinned: false,
            title: null,
            reason: plainReason("SECTION_COMPLETE"),
          },
          false,
        );
      }

      // 4. Study blocks, each followed by a check test, within today's paced budget.
      const load = remainingStudyLoad();
      const paced =
        d < studyDeadline && paceCapacityFrom[d] > 0
          ? Math.ceil(
              (load * capacity * PACE_HEADROOM_PCT) /
                (paceCapacityFrom[d] * 100),
            )
          : capacity; // past the deadline: catch up with everything available
      const studyLimit =
        used + Math.max(paced, MIN_FIRST_BLOCK + CHECK_TEST_MINUTES);
      // A pinned study block leads the day; interleaving counts it.
      const pinnedLead = model.pinned[d].find((t) => t.type === "STUDY");
      if (pinnedLead) leads[d] = pinnedLead.subjectId;
      let firstOfDay = !pinnedLead;
      for (;;) {
        const limit =
          model.beginner && d < BEGINNER_DAYS ? BEGINNER_BLOCK : MAX_BLOCK;
        const room = floor5(
          Math.min(capacity, studyLimit) - used - CHECK_TEST_MINUTES,
        );
        if (room < MIN_BLOCK) break;
        const state = pick(d, firstOfDay);
        if (!state) break;
        const t = state.topic;
        const starting = state.studyParts === 0;
        // On days too short for a 30-minute block, a whole day's room is the minimum instead.
        const dayRoom = Math.max(
          MIN_BLOCK,
          floor5(capacity - CHECK_TEST_MINUTES),
        );
        const minimum = starting
          ? Math.min(t.studyRemaining, limit, MIN_FIRST_BLOCK, dayRoom)
          : Math.min(t.studyRemaining, MIN_BLOCK);
        let block = Math.min(t.studyRemaining, limit, room);
        const rest = t.studyRemaining - block;
        let shortened = false;
        if (
          state.studyParts > 0 &&
          rest > 0 &&
          rest <= FINISH_SLACK &&
          block + rest <= limit &&
          used + block + rest + CHECK_TEST_MINUTES <= capacity
        ) {
          block += rest; // finish the topic today rather than leave a short tail
        } else if (rest > 0 && rest < MIN_BLOCK) {
          // Avoid leaving a sliver: take it now if allowed, else leave one minimum block (a
          // 35-minute topic in a beginner's 25-minute week splits 20 + 15, not 25 + 10). On days
          // too short for either, accept the short tail rather than stall the topic forever.
          if (block + rest <= Math.min(room, limit)) block += rest;
          else if (t.studyRemaining - MIN_BLOCK >= MIN_BLOCK) {
            block = t.studyRemaining - MIN_BLOCK;
            // Capped by the block limit, not today's room: waiting a day would never help.
            shortened = limit <= room;
          }
        }
        if (block < minimum && !shortened) {
          // Not worth starting (or continuing) here; it goes first tomorrow.
          if (!inProgress.includes(state)) inProgress.unshift(state);
          break;
        }
        state.studyParts++;
        const studyKey = uniqueKey(`STUDY:${t.id}:${state.studyParts}`);
        push(
          {
            key: studyKey,
            type: "STUDY",
            subjectId: t.subjectId,
            topicId: t.id,
            minutes: block,
            window: t.window,
            touch: null,
            finalReview: false,
            pinned: false,
            title: null,
            reason: topicReason(t, "STUDY_BLOCK", {
              study: {
                blockCap: limit,
                beginnerBlock: model.beginner && d < BEGINNER_DAYS,
                foundationalFirst: model.beginner && t.foundational,
              },
            }),
          },
          true,
        );
        push(
          {
            key: uniqueKey(`CHECK_TEST:${studyKey.slice("STUDY:".length)}`),
            type: "CHECK_TEST",
            subjectId: t.subjectId,
            topicId: t.id,
            minutes: CHECK_TEST_MINUTES,
            window: t.window,
            touch: null,
            finalReview: false,
            pinned: false,
            title: null,
            reason: topicReason(t, "CHECK_AFTER_STUDY"),
          },
          true,
        );
        if (firstOfDay) leads[d] = t.subjectId;
        firstOfDay = false;
        t.studyRemaining -= block;
        subjectRemaining.set(
          t.subjectId,
          subjectRemaining.get(t.subjectId)! - block,
        );
        const index = inProgress.indexOf(state);
        if (t.studyRemaining === 0) {
          if (index >= 0) inProgress.splice(index, 1);
          // Revisions count from the last block, scheduled or pinned.
          const studied = Math.max(d, t.pinnedStudyLastDay ?? d);
          state.lastActivity = studied;
          createTouches(state, studied);
        } else if (index < 0) {
          inProgress.push(state);
        }
      }
    } else {
      // 5. Pull touches that were clamped to the horizon end into free review time.
      for (const state of heads((t) => t.pullable))
        if (fits(state.topic.revMinutes)) placeTouch(state);

      // 6. Optional final review of every studied topic, weakest first.
      const candidates = [...states.values()]
        .filter(
          (s) =>
            !s.finalReviewed &&
            !s.topic.skipped &&
            s.topic.studyRemaining === 0 &&
            s.next === s.touches.length &&
            (s.lastActivity ?? -Infinity) < d,
        )
        .sort(
          (a, b) =>
            a.topic.confidence - b.topic.confidence ||
            b.topic.weight - a.topic.weight ||
            a.topic.subjectIndex - b.topic.subjectIndex ||
            a.topic.rank - b.topic.rank,
        );
      for (const state of candidates) {
        if (!fits(state.topic.revMinutes)) continue;
        state.finalReviewed = true;
        state.lastActivity = d;
        push(
          {
            key: uniqueKey(`REVISION:${state.topic.id}:final`),
            type: "REVISION",
            subjectId: state.topic.subjectId,
            topicId: state.topic.id,
            minutes: state.topic.revMinutes,
            window: state.topic.window,
            touch: null,
            finalReview: true,
            pinned: false,
            title: null,
            reason: topicReason(state.topic, "FINAL_REVIEW"),
          },
          false,
        );
      }
    }

    if (leads[d] === undefined) leads[d] = null;
    days.push(tasks);
  }

  let unplacedStudyMinutes = 0;
  let unplacedTouches = 0;
  let unplacedTouchMinutes = 0;
  for (const state of states.values()) {
    unplacedStudyMinutes += state.topic.studyRemaining;
    const missing = state.touches.length - state.next;
    unplacedTouches += missing;
    unplacedTouchMinutes += missing * state.topic.revMinutes;
  }

  return {
    days,
    unplacedStudyMinutes,
    unplacedTouches,
    unplacedTouchMinutes,
    droppedTouches,
    requiredMinutesPlaced,
  };
}
