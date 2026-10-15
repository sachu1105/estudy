-- CreateTable
CREATE TABLE "StudyAvailability" (
    "userId" UUID NOT NULL,
    "minutesByWeekday" INTEGER[],
    "preferredWindows" "TimeWindow"[],
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "StudyAvailability_pkey" PRIMARY KEY ("userId")
);

-- AddForeignKey
ALTER TABLE "StudyAvailability" ADD CONSTRAINT "StudyAvailability_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: the time each user is actually studying. Their newest active plan ran with a
-- real availability, so that wins; a plan draft is only a scratchpad and may hold an
-- abandoned experiment, so it is the fallback. Users with neither get no row, which the
-- app reads as the defaults.
INSERT INTO "StudyAvailability" ("userId", "minutesByWeekday", "preferredWindows", "updatedAt")
SELECT DISTINCT ON (p."userId")
    p."userId",
    ARRAY(SELECT jsonb_array_elements_text(p."inputs" -> 'availability' -> 'minutesByWeekday')::int),
    ARRAY(SELECT jsonb_array_elements_text(p."inputs" -> 'availability' -> 'preferredWindows')::"TimeWindow"),
    CURRENT_TIMESTAMP
FROM "StudyPlan" p
WHERE p."status" = 'ACTIVE'
  AND jsonb_typeof(p."inputs" -> 'availability' -> 'minutesByWeekday') = 'array'
  AND jsonb_array_length(p."inputs" -> 'availability' -> 'minutesByWeekday') = 7
  AND jsonb_typeof(p."inputs" -> 'availability' -> 'preferredWindows') = 'array'
  AND jsonb_array_length(p."inputs" -> 'availability' -> 'preferredWindows') > 0
  -- Every window must be a real enum value, or the cast above would fail the migration.
  AND p."inputs" -> 'availability' -> 'preferredWindows' <@ '["MORNING","AFTERNOON","EVENING","NIGHT"]'::jsonb
ORDER BY p."userId", p."createdAt" DESC;

INSERT INTO "StudyAvailability" ("userId", "minutesByWeekday", "preferredWindows", "updatedAt")
SELECT DISTINCT ON (d."userId")
    d."userId",
    ARRAY(SELECT jsonb_array_elements_text(d."data" -> 'minutesByWeekday')::int),
    ARRAY(SELECT jsonb_array_elements_text(d."data" -> 'preferredWindows')::"TimeWindow"),
    CURRENT_TIMESTAMP
FROM "PlanDraft" d
WHERE jsonb_typeof(d."data" -> 'minutesByWeekday') = 'array'
  AND jsonb_array_length(d."data" -> 'minutesByWeekday') = 7
  AND jsonb_typeof(d."data" -> 'preferredWindows') = 'array'
  AND jsonb_array_length(d."data" -> 'preferredWindows') > 0
  AND d."data" -> 'preferredWindows' <@ '["MORNING","AFTERNOON","EVENING","NIGHT"]'::jsonb
  AND NOT EXISTS (SELECT 1 FROM "StudyAvailability" a WHERE a."userId" = d."userId")
ORDER BY d."userId", d."updatedAt" DESC;
