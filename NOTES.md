# Notes

Read after `CLAUDE.md` at the start of every session. Append, don't rewrite.

## Milestone 1 — scaffold, Docker and the design system (2026-10-05)

### Versions differ from CLAUDE.md
- **Next.js 16.3**, not 15 (create-next-app installed it). Read `node_modules/next/dist/docs/`
  before using an API. Notable: `middleware.ts` is now **`proxy.ts`** (docs `16-proxy.md`) —
  milestone 2 must use that name. Only one `next dev` may run per project directory.
- **Prisma 7.10**: `prisma.config.ts` holds the datasource URL and seed command (the schema
  has no `url`). Generator is `prisma-client` with output `src/server/db/generated/prisma`
  (gitignored, generated on `postinstall`). The client needs a driver adapter:
  `@prisma/adapter-pg`. `pnpm add -D prisma` resolved to an 8.0 rc — keep prisma and
  @prisma/client pinned to the same 7.x.
- zod 4 (`z.url()`, `z.email()`, `z.stringbool()`), motion 14 (`motion/react`), lucide 1.x,
  `radix-ui` monolithic package (`import { Dialog } from "radix-ui"`), Vitest 5 (use
  `resolve.tsconfigPaths: true`, not the vite-tsconfig-paths plugin).

### Decisions
- Path alias `@/*` -> `src/*`.
- Env: pure schema in `server/env.schema.ts` (unit-tested), `server/env.ts` adds
  `server-only` and parses. `src/instrumentation.ts` imports it so the server crashes at boot.
- The worker imports `server-only` modules, so it runs with `tsx --conditions=react-server`
  and loads `.env` via `dotenv/config`.
- ESLint enforces rule 10: prisma imports banned in app/components/features/services;
  plan-engine may not import next, react, server, app or features.
- Route groups: `(app)/(shell)/*` get the sidebar/top bar/tab bar; `(app)/onboarding` sits
  outside the shell. `/dev/ui` calls `notFound()` in production.
- Theme: an inline `BootScript` in `<head>` sets `data-theme` (+ `data-theme-pref`,
  `data-sidebar`) from localStorage before paint and follows the OS while on "system";
  `lib/theme.ts` mirrors it via `useSyncExternalStore`.
- Tailwind's default palette is removed (`--color-*: initial`), so only token colours exist.

### Tokens added beyond CLAUDE.md (for WCAG AA)
- `on-accent` (#FFF light / #0E0E11 dark): white on dark accent #6A84FF is only 3.3:1.
- `danger-ink`, `success-ink`, `streak-ink`: text on the soft backgrounds. #E5484D on white is
  3.9:1 and #F59E0B on streakSoft is about 2:1. The danger button is soft (danger-soft +
  danger-ink), not filled. The flame uses `streak`; the count uses `streak-ink`.

### Gotchas
- Base-layer CSS must use the raw tokens (`var(--ink)`), not `var(--color-ink)`: the `@theme`
  alias resolves at `:root`, so nested `[data-theme]` subtrees wouldn't re-theme.
- motion `layoutId`s are global — scope each list with `<LayoutGroup id={useId()}>` or two
  instances on one page animate into each other.
- motion springs accept only two keyframes; multi-keyframe animations must be tweens.
- Reduced-motion CSS uses 1ms, not 0, so Radix exit animations still fire `animationend`.
- Portaled overlays (dialog, sheet, menu, toast, cmdk) follow the `<html>` theme, not a
  nested `[data-theme]` panel.

## Rule 14 added — mobile first (2026-10-05)
- The user's top requirement: the whole app must fit phones. Now CLAUDE.md rule 14 plus a
  "### Mobile" design section (also copied into the build plan's Part A).
- Primitives bumped for touch: inputs and md buttons are 44px tall under 768px (40px from
  md up); inputs use 16px text on mobile so iOS doesn't zoom; chips 40px on mobile.
- `tests/e2e/mobile-fit.spec.ts` fails any route that scrolls sideways at 360px. Add new
  routes to it in every milestone.

## Milestone 2 — auth, roles and entitlements (2026-10-05)

### Decisions
- Access token: HS256 JWT (jose), 15 min, claims `sub`, `role`, `sid` (refresh family id).
  Refresh token: opaque 32 random bytes; only its SHA-256 is stored. `JWT_REFRESH_SECRET`
  is validated but unused so far (refresh tokens are opaque, not JWTs).
- Rotation on every refresh, in one transaction (`refreshTokenRepository.rotate`). Presenting
  a token that was *rotated* (has `replacedBy`) more than 10s later revokes the family and
  writes `auth.refresh_reuse_detected`. Inside 10s it's treated as a concurrent request and
  gets an access token only. A token revoked without a successor (logout) is just invalid.
- `src/proxy.ts` (Next 16's middleware) runs on the Node runtime, so it rotates refresh
  tokens against Postgres directly, sets the new cookies, and forwards the fresh access token
  into the same request's Cookie header. It also sets `x-pathname` for `requireUser()`'s
  `?next=`. API routes are excluded from the proxy; `/api/auth/refresh` exists for clients.
- Guards: `requireUser()` / `requireRole()` in `server/auth/session.ts` (redirect);
  `withUser()` in `server/auth/route.ts` for route handlers (401/403 plus CSRF check).
  The shell, onboarding and admin layouts call them. From milestone 5 on, every page that
  reads data must also call `requireUser()` itself; client navigation doesn't re-run layouts.
- Public auth actions can't call `requireUser()`; they zod-parse and rate-limit instead.
- Email must be verified before login. Verification needs a button click, so link-scanning
  email clients can't burn the token. Reset links last 1h, verify links 24h, both single-use.
  A password reset revokes every refresh token for the user.
- Every user gets a FREE `Subscription` row at signup; `BILLING_ENABLED=false` still
  resolves them to ELITE through `server/entitlements`. The seed's super admin gets ELITE.
- The AuditLog append-only rule is enforced in Postgres: the `reject_mutation()` trigger
  function (in the auth migration) is reusable for every log table later.
- Rate limits: Redis sorted-set sliding window (`server/ratelimit`); keys `rl:<rule>:<subject>`.

### Gotchas
- **Prisma 7 `migrate dev` does not regenerate the client.** `pnpm db:migrate` now runs
  `prisma generate` too. A dev server started before regenerating keeps the old client cached
  on `globalThis` (`prisma.user` is undefined). Restart `pnpm dev` after schema changes.
- Windows: `localhost` can resolve to `::1` and Prisma then fails with P1001. `.env` uses
  `127.0.0.1` for every service.
- `server-only` throws outside the react-server condition: the worker and seed run with
  `tsx --conditions=react-server`; Vitest aliases it to `tests/support/empty.ts`.
- ioredis 6 types: `zrange` wants string bounds (`"0"`), not numbers.
- `@node-rs/argon2` is a native addon: listed in `serverExternalPackages`.
- Playwright: Next's route announcer is a `role="alert"`, so match error text, not the role.

### Tests
- `pnpm test` runs a `unit` and an `integration` Vitest project. Integration uses the
  `studyplanner_test` database (created and migrated automatically) and Redis db 1. It needs
  `docker compose up -d`.
- E2E: a `setup` project registers a user through the UI, reads the email from Mailpit
  (:8025 API), and saves `playwright/.auth/user.json`. Desktop and mobile projects reuse it.
  The global setup clears `rl:*` keys so repeated runs don't hit rate limits.

## Milestone 2.5 — public landing page (2026-10-05)

### Decisions
- Landing lives in `src/features/marketing/components`, one file per section. `src/lib/site.ts`
  holds the product name, exams, section anchors, contact email and social links.
  **TODO(owner):** `site.contactEmail` is a placeholder and `site.social` is empty; the footer
  renders only listed social links.
- Signed-in detection on public pages uses `hasSession()` (access-token check only, no DB).
  Never use it to authorize. Marketing pages are therefore dynamic.
- "Create your study plan" goes to `/register?next=/onboarding` (or `/onboarding` when signed
  in). `next` is threaded through register -> verify-email -> login links. The link inside the
  verification email has no `next`, so that path lands on /today; milestone 5 should send
  users without a plan to /onboarding.
- Pricing cards are generated from `server/entitlements/config.ts`, so they can't drift from
  real limits. No prices are shown until billing exists.
- Reveal-on-scroll is `components/ui/reveal.tsx` (IntersectionObserver) plus CSS keyed on
  `<html data-js>` (set by BootScript), so content is visible without JS and under reduced motion.
- The hero preview is a server component with CSS-only animations (no motion on public
  pages). SegmentedControl's indicator is CSS-only now for the same reason. The Toaster
  mounts in the app shell and /dev/ui only, not the root layout.
- FAQ uses native `<details>`. JSON-LD: SoftwareApplication plus FAQPage.
- SEO: per-page `opengraph-image.tsx` via `app/_og/render.tsx`, `sitemap.ts`, `robots.ts`
  (app routes disallowed), `icon.svg`, `apple-icon.tsx`. Next serves OG images at hashed URLs
  (`/opengraph-image-<hash>`), so tests read the URL from the `og:image` meta tag.
- Privacy and terms are plain-language drafts that say so on the page. They need legal review.

### Lighthouse (production build, 2026-10-05)
- Desktop: performance, accessibility, best practices and SEO all 100.
- Mobile (simulated slow 4G, 4x CPU): performance 92; accessibility, best practices, SEO 100.
  Observed LCP is ~350ms; the simulated 3.3s comes from about 187 KB of JS (React, Next, Radix).
  Next lever if needed: replace the Radix Sheet in the marketing nav with native `<dialog>`.

### Gotchas
- CSS grid items default to `min-width: auto`, so a single implicit column grows to fit
  `truncate`d content and overflows a 360px screen. Always write `grid-cols-1` (minmax(0,1fr)).
- `ink-subtle` fails WCAG AA for text in both themes. Use it only for placeholders, disabled
  states and decorative icons; readable text uses `ink-muted`. CLAUDE.md updated.
- Radix Sheet locks scrolling while open, so in-page anchors tapped inside it don't scroll.
  The marketing nav defers the scroll to `onCloseAutoFocus`.
- Auth submit buttons stay disabled until hydration (`lib/use-hydrated.ts`) and the forms use
  `method="post"`. Before this, an early tap on a slow phone did a native GET submit, which
  would have put the password in the URL.
- E2E against `next dev`: at most 4 workers locally and a 10s expect timeout. More workers
  starve the on-demand compiler and look like random auth failures. Retry keyboard shortcuts
  with `expect(...).toPass()` because listeners attach on hydration.

## Milestone 3 — the plan engine (2026-10-05)

`src/lib/plan-engine`: pure TypeScript. No clock, no randomness, and no next, react, server
or prisma imports (checked by ESLint and by grep). Entry points: `generatePlan(input)` and
`replan(input & { history, previousPlan? })`, exported from `index.ts`.

### Decisions (where the spec left room)
- Dates are integer day numbers (`dates.ts`, Hinnant's algorithms); minutes use integer
  percentages rounded to 5. No floating point, so output is byte-identical everywhere.
- Horizon: today through min(examDate - 1, today + targetDays - 1). Day capacity is
  floor(minutes x 90%). The review window is the last 15% of the *timeline*, measured from
  `timelineStart` (the original plan start), so it doesn't move on every replan.
- Study minutes = (30 + 12(weight-1) + 8(difficulty-1)) x intensity x confidence, rounded
  to 5 (minimum 15). A revision touch is 20% of that (minimum 10). Check test 10 min,
  section mock 30, full mock 75.
- Topics longer than a block (60 min, or 25 in beginner week one) split into parts. **Each
  part is followed by its own CHECK_TEST**, matching the "test after every task" product rule.
- "Led by" = the subject of the day's first STUDY block. The no-3-days rule is relaxed only
  when no other subject has study left. `recentLeads` carries the two days before a replan.
- Revision touches at +3/+10/+30 days (plus +1 for confidence 1-2, and +6 for a weak topic).
  Touches past the horizon clamp to its last day; duplicates collapse and are counted in
  `droppedTouches`. Clamped touches may be pulled earlier into free review days.
- Pacing: study is spread over the learning phase (25% headroom) and aims to finish ~11
  days before review starts, leaving room for second revisions and section mocks.
- Section mock: the day after every topic in a subject has STUDY + 2 revisions, learning
  phase only, and never in a beginner's first week. Full mocks: one per 3 review days.
- Final-review revisions (`finalReview: true`) fill spare review time. They are optional
  and not counted in `requiredMinutes`.
- Weak topics (confidence 1-2) get the earliest preferred window (by time of day); everything
  else gets the first-listed preference.
- Beginner mode: foundational topics first within each subject, preferred across subjects
  when interleaving allows, 25-min blocks in week one, no section mock in week one. The engine
  does not force confidence to 1; onboarding pre-fills it.
- CoverageWarning has two reasons. WORKLOAD: the up-front estimate exceeds total capacity,
  or study exceeds learning capacity. PLACEMENT: the minutes exist but the scheduler couldn't
  place everything. Never a compressed plan.
- replan: accuracy >= 85% raises confidence by 1. < 60% lowers it by 1 and adds a touch.
  Doing fewer than half of the due revisions lowers it by 1. **Persist the returned
  `adjustments`** and pass them back next week. Partly studied topics continue first with
  only the remaining minutes.
- Diff coverage = study minutes done or still planned / total study minutes. Before uses the
  old plan; after is 100 for a plan, or the warning's projection.

### Fixtures
- `pnpm fixtures:plan` regenerates all 30 pairs in `fixtures/plan-engine` from
  `scripts/plan-fixtures.ts`. The fixtures test compares byte-for-byte and runs
  `assertPlanInvariants` on every plan. An expected file changing in a diff means engine
  output changed, so review it deliberately. Fixtures are excluded from Prettier.

### Gotchas
- A short day (27 usable min) plus the 30-minute "new topic" minimum used to deadlock.
  Minimums are now capped by what a day can hold, and an unavoidable short tail is allowed.
- A replan computing pace from *remaining* totals drifted the schedule even when the user was
  on track (11 "moved" topics). Subject share now uses full totals, partly done topics start
  in progress, and recent leads carry over: an on-track replan now moves 0 topics.
- zod 4: `.extend()` on a refined object throws, so the refinement is a shared function
  applied to both `planInputSchema` and `replanInputSchema`.

## Build plan update — explainability, overrides, vault, paidOnly (2026-10-05)

The owner edited the build plan: new rules 14 (every AI decision explainable and
overridable) and 15 (vault material is private), a study vault (milestones 7.5, 7.6), and
paidOnly entitlements. Their edit dropped the mobile-first rule; it stays, renumbered to
rule 16. `inkSubtle` is still kept off readable text (WCAG AA floor), timestamps included.

### Entitlements
- `PAID_ONLY` in `config.ts` lists `vaultMocksPerMonth` and `pagesPerVaultMock`. Those
  resolve against the user's real subscription (`subscribedPlanOf`) even while
  BILLING_ENABLED=false. An admin grant is a Subscription row with source ADMIN_GRANT.
- New limits: `vaultStorageBytes` 200 MB / 5 GB / 20 GB, `vaultFolders` unlimited.
- Landing, FAQ and terms now say vault mock tests are the one paid feature.

### Plan engine: reasons
- Every PlanTask has `reason`: `rule` (STUDY_BLOCK, CHECK_AFTER_STUDY, SPACED_REVISION,
  FINAL_REVIEW, SECTION_COMPLETE, FULL_MOCK, USER_TASK), a minutes `breakdown` on topic
  tasks, `study` (block cap, beginner block, foundations first), `revision` (touch, gap,
  studied on, extra touch cause, clamped to end) and `override`. Codes, not sentences:
  the "Why this?" UI (milestone 6) turns them into copy, ready for Malayalam.
- `topicAdjustment.causes` (HIGH_SCORE, LOW_SCORE, MISSED_REVISIONS) explains a
  confidence that differs from the user's own. Milestone 6 stores them with adjustments.
- `assertPlanInvariants` now checks every task's reason is complete.

### Plan engine: overrides
- `overrides` on both functions. MOVE, RESIZE, LOCK and CUSTOM all pin one task: the
  engine places it exactly (id, date, minutes) and schedules around it in what is left of
  the day. A pinned STUDY brings its CHECK_TEST and counts toward the topic's minutes;
  revisions count from the later of the pinned and scheduled blocks. A pinned REVISION
  replaces the engine's touch of the same number. A pinned SECTION_MOCK replaces the
  automatic one. TOPIC_DONE removes a topic from the plan.
- Pins before today or past the horizon are ignored, as are pins naming a topic or subject
  that no longer exists, so replans never fail on a stale override. Milestone 6 stores
  them as PlanOverride rows; "Reset to suggested" deletes the row.
- Pinned tasks are exempt from phase, block-size, capacity and interleaving rules: the
  user's choice wins. Scheduled ids never collide with pinned ids (`~2` suffix).
- FULL_MOCK ids are now date-based (`FULL_MOCK:2026-12-01`) so they stay stable across
  replans. Part numbers are counted in date order rather than read from the id.

### Bug fixed
- Beginner mode could leave week one empty: a 30-35 minute topic was cut below the
  25-minute starting block to avoid a sliver, deferred, and the same happened daily. It
  now splits (e.g. 15 + 15 or 20 + 15). Regression test and `beginner-120-days` fixture
  added. The other 30 fixtures are unchanged apart from the new fields (checked by
  diffing with reason, pinned and title stripped).

## Milestone 4 — catalogue, syllabus upload and AI parsing (2026-10-05)

### Data
- `SyllabusParse` holds one validated AI tree per file hash (rule 4), shared by every upload of
  the same bytes. Each `SyllabusVersion` gets its own editable copy of the tree (fresh uuids),
  so one user's review edits never reach another user, and nobody gets someone else's edits.
- The hash is computed on the server from the bytes that actually arrived in storage, never
  sent by the client, so a user can't claim another user's hash to read their parse.
- `AiUsage` is append-only (trigger, like AuditLog); its user FK is RESTRICT for that reason.
- `Exam` rows are seeded by `pnpm db:seed` (7 exams). Catalogue syllabuses start empty; the
  admin upload and approval flow (PENDING -> APPROVED) arrives with the admin panel (M12).

### Upload flow
1. `POST /api/uploads/syllabus` checks type, size (15 MB) and `limit(user,'syllabusUploads')`,
   returns a presigned PUT (Content-Type and Content-Length signed) under
   `syllabus/<userId>/<uuid>`. Nothing is saved yet.
2. The browser PUTs straight to MinIO/R2 (XHR for progress).
3. `POST /api/uploads/syllabus/complete` checks the key belongs to the user, re-checks size,
   sniffs the real type from magic bytes (PDF, DOCX, PNG/JPEG/WebP; HTML/SVG/other zips are
   rejected and deleted), hashes, then either links an existing parse instantly (READY job,
   `reused: true`) or creates a ParseJob and enqueues it. Pasted text takes the same path.
- Production R2/S3 needs a CORS rule allowing PUT from APP_URL. `S3_PUBLIC_ENDPOINT` lets a
  phone on the LAN upload to MinIO in dev.
- The file picker offers PDF and DOCX only. The server accepts photos, but OCR is a placeholder
  (`unavailableOcr`) until milestone 7.5, so photos fail with a clear message.

### Worker pipeline (`pnpm worker`)
- BullMQ queue `syllabus-parse`, job id = ParseJob id (no double queueing), ELITE gets
  priority, 3 attempts with backoff for infrastructure errors only. Bad input (`ParseInputError`)
  and invalid AI output after one retry (`AiOutputError`) fail at once with a user-facing
  message. Stages go to Redis pub/sub `job:<id>`; `/api/jobs/[id]/stream` (SSE) relays them,
  `/api/jobs/[id]` is the polling fallback. API routes aren't refreshed by proxy.ts, so the
  client retries once through `/api/auth/refresh` on a 401.
- Extraction: unpdf (PDF text layer; a PDF with none is reported as a scan), mammoth (DOCX).
- Structuring is section by section (`server/ai/sections.ts`): the syllabus's own headings
  ("Part I ...", "1. History") and marks are found with regexes first, and the model is asked
  for one section at a time. A first version sent whole pages to qwen2.5:3b, which dropped
  General English and Malayalam entirely, collapsed General Knowledge into 8 topics, and
  rated everything weight 5. Section by section, the same sample gives 12 subjects and about
  200 topics, nothing dropped, nothing invented.
- Safeguards: a short untitled preamble (the notification header) is skipped, because the
  model invented topics from it; a reply with under half the section's listed items is asked
  again once and the better reply kept; a section the model returns nothing for keeps its
  listed items; a subject the model names after the container part takes the section heading.
- Topic weight comes from the syllabus's marks when most topics have them: a part's marks are
  spread over the topics of all its subjects, and the most marks per topic is weight 5
  (`applyMarkWeights`). Deterministic, so milestone 6's "Why this?" can explain it.
  Difficulty and foundational still come from the model; the 3B model rates nearly everything
  difficulty 3 and nothing foundational. Users fix that in review; the hosted model should do
  better.
- Prompt `structure-syllabus@3` in `server/ai/prompts/`. Ollama gets the JSON schema as
  `format` (structured outputs), temperature 0, num_ctx 8192. Pieces are capped at 3,500
  characters so replies fit the 4,096-token output budget.
- Real run, qwen2.5:3b on this laptop's CPU: the 5.5k-character LDC sample
  (`fixtures/syllabus/ldc-sample.txt`) takes about 150 s and 12 calls. Check a real file
  with `pnpm tsx --conditions=react-server scripts/try-parse.ts <file>` while `pnpm worker`
  runs.
- AIProvider has `generate()`; `structureSyllabus` and `generateValidated` (zod + one retry +
  AiUsage logging for every attempt) sit on top. Question generation (M7) and summaries (M6)
  add prompts beside it rather than new provider methods. The hosted provider targets the
  Anthropic Messages API; cost is logged from `AI_PRICE_*_PER_MTOK`.

### Review screen
- Tree state is a pure reducer (`features/syllabus/tree-reducer.ts`): rename, add, delete
  (a subject keeps at least one topic), move up/down, drag reorder (motion `Reorder` with a
  handle, so it works on touch), merge selected topics (names joined, higher weight and
  difficulty, foundational if any), edit weight, difficulty and foundational.
- Autosave 2 s after the last change (`saveDraftAction`, rate limited); "Fill in every name to
  save" while invalid. Confirm saves the whole tree and sets the private version APPROVED;
  "Edit" reopens it as DRAFT. Phones switch between Topics and Source text; the confirm bar
  is sticky above the tab bar.
- Weight and difficulty use native selects, so phones get their own picker and hundreds of
  rows stay light.

### Malayalam (checked after the owner asked)
- Name keys keep Unicode marks (`\p{M}`): Malayalam vowel signs are marks, and stripping them
  made കല and കാല the same key, so one was dropped as a duplicate.
- Section headings and marks also match ഭാഗം / വിഭാഗം / പേപ്പർ / മൊഡ്യൂൾ and മാർക്ക്.
- A headed section is always one subject named by its heading: on Malayalam, qwen2.5:3b named
  a section after one of its topics (മണ്ണിനങ്ങൾ) and invented a second subject.
- `isGrounded`: a topic is kept only if a strict majority of its words appear in its section's
  text. `withMissingItems`: listed items no topic covers are added back. Together: nothing
  invented, nothing dropped. The cost: a model typo plus the rescued original can both
  appear (കേരളത്തി / കേരളത്തിലെ ദേശീയ പ്രസ്ഥാനം); the user merges them in review.
- `fixtures/syllabus/malayalam-sample.txt` parses in about 40 s with every item present.
- Not yet checked: real PSC PDFs typeset in legacy (non-Unicode) Malayalam fonts such as
  ML-TT. Their text layer extracts as Latin gibberish; that needs a real file to design for.

### Subject folders replace the topic-by-topic review (owner's request)
- After parsing, `/syllabus/[id]` is a board of subject folder cards (grid, row by row in
  syllabus order, one column on phones). Subjects are renamed, moved, removed or added from a
  card's menu; one tap confirms. Nobody rates topics one by one to get started: weights come
  from the marks and the model, and stay editable.
- `/syllabus/[id]/subjects/[subjectId]` is the folder: Topics (read view; "Edit topics" opens
  the editor with drag, merge, weight, difficulty, foundation), Materials and Tests (honest
  empty states until the vault, milestones 7.5 and 7.6), Progress (links to plan creation).
- A private syllabus stays editable after confirming (no reopen step); plans will snapshot
  the tree in milestone 5. Confirm remains the rule 5 gate before a plan.
- Agreed order with the owner: folders now, the study plan (milestone 5) next, the vault later.

### Real PSC PDFs (two uploaded by the owner, kept as text in fixtures/syllabus)
- `degree-level-ldc.txt` and `plus-two-prelims-2022.txt` are unpdf's output for real Kerala
  PSC notifications. The first version of the splitter made 33 and 40 subjects of them.
- Layout the splitter now knows: a "Distribution of Marks" table (skipped up to "Detailed
  Syllabus"), parts as "I. GENERAL KNOWLEDGE" / "Part I" / "ഭാഗം", sections as "(i) HISTORY
  (5 Marks)", "ii) GEOGRAPHY", "(i). ...", "ii Vocabulary", "(1) ...", "A. ...", "Part I (1)
  ചരിത്രം (5 Marks)" on one line, "Part III" with its title on the next line, spaced-out
  "( 1 0 M a r k s )". Numbered "1)" lines are topics unless the document has no other
  section style. ALL-CAPS headings become sentence case.
- Result: the LDC PDF gives exactly its 17 marks-table sections and 461 topics (about 6 min
  on CPU with qwen2.5:3b); plus-two gives 15 sections.
- Marks belong to the section that states them; weight is 3 for the median marks per topic,
  plus or minus one per doubling (log2), clamped to 1-5. Scaling to the maximum let Current
  Affairs (15 marks, one topic) flatten every other weight to 1.
- `listedItems` joins PDF line wraps and splits on commas, semicolons and dashes (a dash
  splits only when spaced or before a capital, so "Quasi-judicial" survives).
- Malayalam in old PSC fonts: `server/ai/malayalam.ts` detects visual-order text (a vowel
  sign with no consonant before it can't occur in valid Unicode) and repairs order and the
  misread ാ glyph. Lost conjunct letters can't be recovered, so the parse records
  `MALAYALAM_GARBLED` and the board tells the user to check names. The plus-two PDF is the
  bad case; the LDC PDF's Malayalam is broken differently and only partly repairable. Real fix:
  OCR the rendered pages (Tesseract `mal`, or a vision model) with the vault's OcrProvider.
- Parses are cached per (file hash, parser version) now, not per hash: the parser version
  (`structure-syllabus@4`) covers splitting, repairs and prompt. A syllabus read by an older
  version shows "Read again", which replaces its tree (after a confirm dialog).

### Hosted page reading and the parse caches (owner's choice, 2026-10-05)
- `AI_PROVIDER=hosted`: PDFs and photos go to the model as pages (`structureDocument`, prompt
  `structure-document@1`, one call, up to 20k output tokens). The rendered page is read, so
  Malayalam in old fonts and scanned PDFs need no repair; the text layer is still extracted
  (best effort) for "Source text" and the near-duplicate check. DOCX and pasted text still go
  through the section path. Photo uploads are offered only when pages can be read.
- Ollama (dev, offline) keeps the text path: section splitting, per-section calls, Malayalam
  repair. The format rules there are a crutch for the 3B model, not syllabus content.
- Parser version per file: `parserFor(readsDocuments, kind)`. Caches and "Read again" use it.
- Cache order, before any AI call: (1) same file + parser version; (2) near-duplicate: MinHash
  of word 5-shingles (`server/ai/fingerprint.ts`), similarity >= 0.9 against parses of the
  same parser, the same post (from the heading) checked first; a match is copied into a new
  SyllabusParse (`provider: cache`, `copiedFromId`) so the next identical file hits (1);
  (3) text path only: `SectionCache`, keyed by parser version + hash of the normalised heading
  and section text, so a section any earlier syllabus had (Simple Arithmetic, English
  grammar) costs no AI call.
- Not yet checked against the real hosted API: there was no key. Tests cover the request
  shape and the pipeline with a fake page-reading model.

## Direction change — a study space built on subject pods (2026-10-06)
- The owner repositioned the app: a personal study space where each syllabus subject is a
  pod (topics with completion, material mapped to topics, mock tests, suggestions,
  progress). CLAUDE.md and the build plan were rewritten to match; Part A and CLAUDE.md
  are identical again (Mobile section and the inkSubtle contrast note included).
- New rule 17: AI has four jobs only (syllabus extraction on a cache miss, mock test
  questions, previous year paper parsing, topic suggestions). Rule 4 now states the cache
  order. Rule 15 is about pod material. TopicCompletion joins the append-only logs.
- Milestones renumbered: 5 pods, 6 plan from pods, 7 today/progress/re-plan, 8 mock tests
  (including from my material), 9 previous year questions, 10 suggestions, 11 use it
  yourself, 12-17 rank, groups, discussion, admin, billing, launch. 4.5 records what was
  built after milestone 4.
- Entitlement keys in code keep their names (vaultStorageBytes, vaultMocksPerMonth,
  pagesPerVaultMock); the docs call them pod storage and mock tests from my material.

## Milestone 5 — subject pods (2026-10-06)

### Data
- Pod (SUBJECT per syllabus subject, or CUSTOM), PodItem (NOTE, LINK, FILE, IMAGE), PodFile
  (a PDF, each page photo, or an image inside a note), PodItemTopic (an item covers any
  number of topics of its pod), TopicCompletion (append-only, latest row wins; no FK on
  topicId so history outlives a removed topic).
- The syllabus tree now saves in place (update changed rows, create new, delete removed,
  removals last) instead of delete-and-recreate, so topic ids stay stable and mappings,
  ticks and plans survive autosaves. Unchanged rows are skipped (461-topic syllabuses).
- Pods follow the syllabus: confirming creates them, every later save syncs them (new
  subject -> new pod, rename -> rename, removed subject -> pod deleted if empty, else it
  becomes the user's own pod so material is never lost). A catalogue syllabus is adopted
  with "Use this syllabus".
- Full-text search: a GIN expression index on to_tsvector('simple', title, note text, url,
  link description, PDF text); queries are prefix matches built from letters/digits only,
  so Malayalam works word by word and nothing typed can break the syntax.

### Behaviour
- /pods groups subject pods by syllabus, own pods last; Pods replaced Syllabus in the nav
  (syllabus pages highlight Pods). Mobile tabs: Today, Pods, Plan, Tests, More.
- Pod page: progress ring, Topics (optimistic ticks), Material (add bar; "Not linked to a
  topic" section), Tests and Progress (placeholders until milestones 7-8). Topic page:
  done toggle, its material, add bar that links new material to the topic. Board cards of
  a confirmed syllabus open its pods (/pods/subject/[id] resolves or creates the pod).
- Notes: Tiptap 3 (StarterKit incl. link, highlight, task list, table, image, placeholder),
  autosave 2 s. The server cleans each document: images only from /api/pods/files/<id>,
  links only http/https/mailto; plain text stored for search.
- Links: added at once after an SSRF check, title/description/icon fetched by the worker
  (private and reserved ranges blocked per DNS answer and per redirect hop, 5 s, 1 MB).
  A title the user changed first is kept. DNS rebinding between check and connect is not
  covered yet (would need a pinned lookup in the HTTP agent; milestone 17 security pass).
- Files: PDFs and photos (25 MB each), presigned PUT, then the server sniffs real types,
  hashes and creates items; photos can be saved as one multi-page document (camera sheet).
  Photos are shrunk to 2000 px JPEG in the browser with EXIF rotation applied. Storage
  counts every PodFile, trash included, against limit(user, 'vaultStorageBytes').
- Viewing: /api/pods/files/[id] checks ownership and redirects to a 5-minute signed URL
  with a forced content type. proxy.ts now also runs on that route so note images keep
  loading after the 15-minute access token expires. Phones get "Open PDF" (no inline PDF).
- Text: the worker reads a PDF's text layer (unpdf) for search. Photos and scans are not
  OCR'd here: rule 17 keeps AI to four jobs, so page reading happens when a mock test is
  made from them (milestone 8).
- Trash: soft delete with undo toast and a trash page; a BullMQ scheduler purges items
  older than 30 days daily at 03:30 IST, deleting their files from storage.
- Settings shows pod storage used of the plan's limit.

### Exam pods (2026-10-06)

The user found two places (Syllabus and Pods) confusing and asked for a master pod per
syllabus with the subject pods inside it.

- `/pods/exam/[syllabusId]` is the exam pod. Nothing new is stored: `podService.exams()`
  groups the subject pods by syllabus and totals topics, ticks and material. It shows
  progress, the study plan card (what the plan will ask for; the plan arrives in
  milestone 6, so there is no dead button) and full mock tests (milestone 8).
- The pods home lists exam pods, then syllabuses still being read or checked ("Being
  set up"), then the user's own pods. `/syllabus` redirects there.
- Confirming a syllabus or adopting a catalogue one opens its exam pod. A subject pod's
  back link goes to its exam pod. A confirmed syllabus page is now "Edit syllabus".
- Fixed: BullMQ job ids can't contain ":", so adding a link failed at enqueue. Pod job
  ids are now `link-meta-<itemId>`. The integration tests use a fake queue, so only the
  e2e run caught it.

### Exam board (2026-10-06)

The user asked for a kanban board like a task app's, to drag subject pods into the
order they'll study them, before the plan.

- The exam pod's Subjects section is a board with four columns: To study, Studying,
  Revising, Done. They're stored on Pod as `stage` and `stageOrder`
  (migration `20261006120000_pod_board`). Each column's hint says what it tells the plan.
  Milestone 6 reads it: Studying gets time first, To study is introduced top first,
  Revising gets revision touches only, and Done gets a light revision now and then.
- dnd-kit (core and sortable). Mouse drags the whole card (6 px threshold, so a click
  still opens the pod). Touch drags after a 250 ms long press, so the page still
  scrolls. The keyboard drags from the grip handle, with spoken announcements. Every
  card also has a "Move to" menu, the easy way on a phone.
- Under 1024px the columns stack, so nothing scrolls sideways. At 1024px and wider
  they sit side by side.
- A move saves the whole board in one action (`arrangeBoard`). The server checks that
  the columns hold exactly the user's subject pods for that syllabus, each once; a
  stale board is refused and the UI rolls back.
- Cards stay neutral (the design system's 90% rule) instead of the pastel cards in the
  reference. Topic progress shows as ten dots.
- Dev fix: the Prisma client cached on globalThis is keyed by its generated class, so
  `prisma generate` after a migration no longer leaves the dev server on a stale
  client. Route modules already in memory can still be stale after big changes:
  restart `pnpm dev` if an API route behaves like old code.

## Milestone 6 — the study plan from pods (2026-10-06)

- Plan engine: subjects take an optional `stage` from the exam board, defaulting to
  TO_STUDY, so every existing fixture is byte-identical.
  - STUDYING subjects win the study pick over TO_STUDY. TO_STUDY ties already break by
    input order, which is board order.
  - REVISING and DONE topics count as studied the day before the timeline began. That
    anchor is fixed, so weekly re-plans keep the spacing.
  - DONE starts at revision 3 (the first two count as done) and gets no section mock.
  - Their revision reasons carry `fromBoard`, so "Why this?" says why instead of
    showing a made-up study date.
  - Tests: `board.test.ts`.
- Data (migration `20261006140000_study_plans`):
  - PlanDraft (one per user and exam) holds the setup steps.
  - StudyPlan keeps a copy of the engine input with every name, so later pod edits
    never rewrite a plan.
  - PlanDay and PlanTask carry the engine's task key and its reason JSON. Task
    subject and topic ids are snapshot ids with no foreign keys.
  - A partial unique index allows one ACTIVE plan per user and exam; a new plan
    archives the old one in the same transaction.
- Setup at /plan/new/[draftId]/{timeline,time,subjects,review}:
  - One route per step, with a stepper. `usePlanDraft` autosaves after 700 ms, and
    Back and Next save first, so nothing is lost.
  - The "I'm new to PSC" switch sets every subject's confidence to 1.
  - The subjects step lists subjects in board order with confidence 1-5 and
    intensity. Its live hours estimate uses the engine's own minute rules
    (`lib/plans/draft.ts`).
- Coverage warning: nothing is saved. It shows honest numbers and three choices:
  - Add time: the extra minutes spread over study days.
  - Leave out the least important topics: `leaveOutToFit`, a deterministic binary
    search over a fixed removal order. Lowest weight goes first, then lower on the
    board, then later in the syllabus. The plan lists what it left out.
  - Move the date: about N more days.
- Plan page /plan/[planId]:
  - Summary tiles, a "Your plan is ready" panel, and the next 7 days.
  - Every task has a "Why this?" built from the engine's reason
    (`features/plans/task-text.ts`).
  - The Plan tab opens the plan straight away when there is only one.
  - Today and the full calendar are milestone 7.
- Elsewhere:
  - The exam pod's plan card shows the state: Create, Continue setting up, or
    Open plan plus Change.
  - Onboarding lists the user's exams with "Plan this exam".
  - Limits: activePlans via `limit()`; re-planning the same exam doesn't count again.
  - Rate limits: `planDraftPerUser` and `planGeneratePerUser`.

## Milestone 7 — today, progress and the weekly re-plan (2026-10-07)

- Logs (migration `20261007090000_progress`):
  - TaskCompletion, StudySession and XpLedger are append-only, with triggers
    (rule 6).
  - ActiveSession is the live timer, one per user. PlanOverride stores hand edits
    per exam.
  - StudyPlan gains `adjustments`, `replanDiff`, `diffSeenAt` and `replanWarning`.
- Ticking a task appends to the log and moves XP either way (±10).
  - The streak bonus (2 XP per streak day, up to 20) comes once, on the day's first
    activity.
  - The topic is marked done in its pod when its last STUDY block is.
- Streak (`lib/progress/streak.ts`, tested):
  - A day counts with a finished task or 10 active minutes.
  - Today stays open until midnight.
  - One freeze per Monday-to-Sunday week covers a single missed day, but only when
    it bridges to an earlier active day.
- XP: 1 per study minute, capped at 300 a day, plus task and streak XP.
- Today: a bento grid with tasks (optimistic, Start and Open pod on each), streak
  (with "How your streak works"), minutes, days left, coverage, next mock, and one
  accent action, "Start next task".
- Focus view at /study/[taskId], outside the shell:
  - The server holds the time. The browser beats every 60 s; a gap counts at most
    90 s, and paused time never counts.
  - Starting another task closes the running one and saves its minutes.
  - Finish logs a StudySession plus capped study XP, and ticks the task.
  - Material opens in a sheet: from the bottom on a phone, from the side on desktop.
- One engine path, `engine()` in plan-service:
  - A fresh plan, or `replan()` when the exam has an active plan.
  - Re-plans feed in: history (still-ticked tasks of every plan of the exam), last
    week's adjustments, pins (done ones dropped), the previous plan, and the
    original timelineStart.
  - The end date is kept (the remaining days). Left-out topics stay out.
  - "Change plan" runs through it too, so progress survives.
  - If the rest doesn't fit, the plan stays and `replanWarning` shows a card linking
    to the setup's options.
- Weekly re-plan: on the pods queue, Sundays at 04:00 IST (`replan-week`), plus
  "Re-plan now".
  - The diff card ("made fresh from today") shows once, on the plan and on Today.
  - Re-plans make a new plan id, and old plan links redirect to the active one.
  - Today keeps tasks ticked earlier the same day.
- Hand edits: move, change minutes, keep on a day, and custom tasks, all PlanOverride
  pins.
  - "Reset to suggested" deletes the pin. Rows say "placed by you".
  - Check tests can't be pinned (they travel with their study block), and nothing
    can be dated before today.
- Views:
  - The plan pages by week (`?from=`, never before today).
  - /calendar is a Monday-first month grid: planned time ahead, ticks behind, never
    misses.
  - Each pod's Progress tab shows time studied, tasks done and last studied.
  - Topic pages show "In your plan" with "Why this?".
  - /plan/[id]/how is "How your plan was built": every input plus the engine's real
    constants.
- Loading skeletons are only on Today and Calendar. A loading boundary streams a 200
  before `notFound()` can run, which would turn other users' pages into soft 404s
  (Next docs, loading.md "Status codes"). There's a shell error page and a not-found
  page.
- e2e: today.spec seeds its own user (`seedAndLogin`). There's one timer per user,
  and registering through the form is limited to 5 per IP per hour.
- Known flake: syllabus.spec "pasting a syllabus…" fails when a running worker
  finishes the parse before the progress list renders. It passes on its own.

