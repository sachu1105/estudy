import {
  BEGINNER_BLOCK,
  BEGINNER_DAYS,
  BUFFER_PCT,
  CHECK_TEST_MINUTES,
  CONFIDENCE_PCT,
  FULL_MOCK_MINUTES,
  INTENSITY_PCT,
  MAX_BLOCK,
  REVIEW_PCT,
  SECTION_MOCK_MINUTES,
} from "@/lib/plan-engine";

/** The fixed rules every plan follows, with the real numbers the engine uses. */
export function HowRules() {
  const rules = [
    `A topic's study time starts from its weight and difficulty, then is multiplied by the subject's intensity (light ${INTENSITY_PCT.LIGHT}%, steady ${INTENSITY_PCT.STEADY}%, intense ${INTENSITY_PCT.INTENSE}%) and your confidence (1: ${CONFIDENCE_PCT[1]}% down to 5: ${CONFIDENCE_PCT[5]}%).`,
    `Study comes in blocks of up to ${MAX_BLOCK} minutes (${BEGINNER_BLOCK} in a beginner's first ${BEGINNER_DAYS} days), each followed by a ${CHECK_TEST_MINUTES}-minute check test on the topic.`,
    "Each topic is revised about 3, 10 and 30 days after you study it. Confidence 1 or 2 adds a revision the next day; a check test under 60% adds one more at the next re-plan.",
    "No subject leads more than two days in a row, so subjects stay mixed.",
    `Once every topic of a subject is studied and revised twice, a ${SECTION_MOCK_MINUTES}-minute section mock follows.`,
    `The last ${REVIEW_PCT}% of your time is for revision and ${FULL_MOCK_MINUTES}-minute full mock tests.`,
    `${BUFFER_PCT}% of each day stays free, so a slow day doesn't break the plan.`,
    "If the work doesn't fit, the plan is never squeezed: you see the numbers and choose.",
    "Every Sunday the plan is made fresh from that day, using what you actually did. Missed tasks are never carried over as a backlog.",
  ];
  return (
    <section aria-labelledby="how-rules" className="flex flex-col gap-3">
      <h2 id="how-rules" className="text-h2">
        The rules
      </h2>
      <ol className="flex list-decimal flex-col gap-2 pl-5 text-body">
        {rules.map((rule) => (
          <li key={rule}>{rule}</li>
        ))}
      </ol>
      <p className="text-small text-ink-muted">
        These are fixed rules, not AI. The same inputs always give the same
        plan.
      </p>
    </section>
  );
}
