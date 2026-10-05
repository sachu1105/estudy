# Study planner web app — build plan for Claude Code

Oct 5, 2026 · @ssk

## How to use this file

The project is now a web-first study planner for Kerala PSC and other Indian competitive exams, built entirely in Next.js with Postgres, Redis and a background worker. Paste Part A into `CLAUDE.md` at the repo root, then feed Claude Code one milestone from Part B per session.

1. Create an empty repo and add `CLAUDE.md` with the content of Part A.
2. Start Claude Code, switch to plan mode, and paste one milestone prompt.
3. Read the plan before approving. Reject any plan that touches more than one milestone.
4. One milestone per session. Run tests, lint and typecheck, then commit.
5. End every session by asking Claude Code to append what it learned to `NOTES.md`.

Never run two milestones in one session. Context degrades and the architecture drifts.

## Part A — CLAUDE.md

Copy everything inside the block below into `CLAUDE.md`. It is the contract every session reads first.

```markdown
# Study planner (web)

A web app for Indian competitive exam aspirants, starting with Kerala PSC (LDC, LGS,
Degree level, High Court Assistant) and extending to SSC, RRB and banking.

Core loop: the user uploads their syllabus (or picks one from our catalogue). AI turns it
into a subject -> topic tree. The user sets an intensity and a confidence level for each
subject, picks an exam date or a number of days to finish, and gets a day-by-day study
plan. Every finished task unlocks a short mock test. Test results change next week's
plan. A daily streak keeps them coming back. Groups let them share material, share mock
tests, discuss, ask questions and compete on a group rank. A global rank shows every user.

Beginner mode exists for people who are new to PSC: gentler ramp, fundamentals first,
explanations on every question.

## Stack

One Next.js app for frontend, backend and admin. One separate worker process from the
same codebase.

App:       Next.js 15 (App Router, Server Components, Server Actions, Route Handlers),
           TypeScript strict, Tailwind CSS v4, shadcn/ui (restyled to our tokens),
           motion (Framer Motion), lucide-react, TanStack Query for interactive client
           state, React Hook Form + zod, next-intl (English now, Malayalam later)
Data:      PostgreSQL 16 via Prisma, Redis 7 via ioredis
Jobs:      BullMQ. Worker entrypoint src/worker/index.ts, run as its own process
Auth:      Custom JWT with jose. Access token 15 min, refresh token 30 days with
           rotation and reuse detection. argon2 for passwords (@node-rs/argon2).
           Tokens in httpOnly, Secure, SameSite=Lax cookies. Never in localStorage.
Files:     S3-compatible storage. MinIO locally, Cloudflare R2 or S3 in production.
AI:        Provider interface with two implementations: Ollama (local dev) and a hosted
           API (production), chosen by AI_PROVIDER env var. Server and worker only.
Realtime:  Server-Sent Events from Route Handlers, fan-out through Redis pub/sub.
           No WebSocket server.
Email:     SMTP adapter. Mailpit locally.
Tests:     Vitest (unit, integration), Playwright (e2e)
Infra:     Docker Compose on a VPS in an India region: web, worker, postgres, redis,
           minio, caddy (automatic TLS). Next.js output: standalone.

## Repo layout

studyplanner/
  src/
    app/
      (marketing)/     landing (hero, features, how it works, groups, pricing, FAQ),
                       about, privacy, terms, contact
      (auth)/          login, register, verify-email, reset-password
      (app)/           today, plan, calendar, syllabus, tests, groups, rank,
                       progress, settings, onboarding
      admin/           super admin panel (role-gated)
      api/             route handlers: REST, SSE streams, upload signing
    components/
      ui/              primitives: button, input, card, badge, ring, skeleton, sheet
      blocks/          composed micro-components: topic-row, streak-chip, plan-day,
                       stat-tile, question-card, rank-row
    features/<name>/   components, server actions, queries for one feature
    server/
      auth/ db/ ai/ queue/ storage/ entitlements/ realtime/
      services/        business logic
      repositories/    the only code that touches prisma
    lib/
      plan-engine/     pure TypeScript, no server, next or prisma imports
      clock.ts  ids.ts  utils/
    worker/
      index.ts  jobs/
  prisma/              schema.prisma, migrations, seed.ts
  fixtures/plan-engine/  input + expected output JSON pairs
  tests/e2e/
  docker-compose.yml  Dockerfile  Caddyfile  .env.example

## Commands

pnpm install
docker compose up -d          postgres, redis, ollama, minio, mailpit
pnpm db:migrate               prisma migrate dev
pnpm db:seed
pnpm dev                      next dev
pnpm worker                   tsx watch src/worker/index.ts
pnpm test                     vitest
pnpm e2e                      playwright
pnpm lint && pnpm typecheck

Run test, lint and typecheck before declaring any task done.

## Rules that must not be broken

1. NO AI KEY EVER REACHES THE BROWSER. No NEXT_PUBLIC_ variable for AI. Client
   components never call an AI provider. The browser has no idea an LLM exists.

2. AI NEVER BLOCKS A REQUEST. Syllabus parsing, question generation and weekly
   summaries are BullMQ jobs. The UI shows an honest job status (queued, reading,
   structuring, ready, failed) via SSE or polling.

3. THE PLAN ENGINE IS A DETERMINISTIC ALGORITHM, NOT AN LLM CALL. It lives in
   src/lib/plan-engine, is pure, takes `today` as a parameter, and the same input
   always produces byte-identical output. It is tested against fixtures/plan-engine.

4. PARSE EACH SYLLABUS ONCE. Hash every uploaded file (SHA-256). If the hash exists,
   reuse the existing parse. Catalogue syllabuses are parsed once, ever, for all users.

5. AI OUTPUT PASSES A HUMAN GATE.
   - Catalogue syllabuses and question-pool questions enter PENDING and need admin
     approval before anyone else sees them.
   - A user's own upload goes to a review screen where the user edits and confirms the
     tree before a plan is generated. It stays private. Admin may promote it to the
     catalogue, which puts it through the admin gate.
   - Every AI response is validated with zod. Invalid output is retried once, then the
     job fails visibly. Never save unvalidated AI output.

6. LOGS ARE APPEND-ONLY. StudySession, TaskCompletion, TestAttempt, AttemptAnswer,
   XpLedger and AuditLog are never updated or deleted. Streaks, XP, proficiency,
   coverage and ranks are derived from them. Redis rank caches are rebuildable from
   Postgres at any time.

7. NO OVERDUE LIST ANYWHERE. Missed tasks are never shown as a backlog, red badge or
   guilt counter. The weekly re-plan discards the unfinished schedule and builds a
   fresh one from today. One streak freeze per week is granted automatically.

8. ENTITLEMENTS GO THROUGH ONE FUNCTION. Use `can(user, feature)` and
   `limit(user, feature)` from server/entitlements. Never write `plan === 'PRO'`
   anywhere else. While BILLING_ENABLED=false, every user resolves to ELITE.

9. AUTHORIZATION IS SERVER-SIDE ON EVERY ENTRYPOINT. Every route handler and server
   action starts with requireUser() or requireRole(). Middleware only refreshes tokens
   and redirects; it is never the only guard. Group actions also check membership and
   group role.

10. LAYERING: app -> features -> server/services -> server/repositories -> prisma.
    Components never import prisma. lib/plan-engine imports nothing from server,
    next or prisma.

11. Server Components by default. "use client" only on interactive leaves. Every input
    crossing a boundary (form, route, action, job payload, AI output) is parsed with zod.

12. All ids are uuid strings. All timestamps are timestamptz. Never call Date.now() or
    new Date() in services or the plan engine - inject `clock`. "Today" is computed in
    the user's timezone (default Asia/Kolkata).

13. Rate-limit auth, uploads, AI-triggering actions and test submissions with Redis.

14. MOBILE FIRST, EVERY SCREEN. Most users study on a phone. Every page, dialog, form,
    table and admin screen is designed at 360px wide first, then scaled up. No horizontal
    scroll at 360px, tap targets at least 44x44px, text never below 13px, inputs 16px on
    mobile (no iOS zoom), safe-area insets respected, nothing hidden behind the bottom tab
    bar. A feature is not done until it is checked at 360px, 390px and 1366px, and its
    Playwright tests run on both the desktop and mobile projects.

## Plans and entitlements

Three plans. At launch BILLING_ENABLED=false and everyone gets ELITE. Payments arrive
later (Razorpay). Limits live in server/entitlements/config.ts and are admin-editable.

  feature                    FREE        PRO          ELITE
  syllabus uploads           1           5            unlimited
  active study plans         1           3            unlimited
  after-task mock tests      3 / day     unlimited    unlimited
  section and full mocks     1 / week    unlimited    unlimited
  AI answer explanations     no          yes          yes
  groups created             1           5            unlimited
  groups joined              3           10           unlimited
  group file storage         50 MB       1 GB         5 GB
  analytics                  basic       full         full + topper comparison
  parsing queue              normal      normal       priority

## Product rules

- Plan horizon: the user gives an exam date OR "finish in N days". If both, the earlier
  wins.
- Intensity per subject: light 0.75, steady 1.0, intense 1.3 (time multiplier).
  Confidence per subject: 1-5 (proficiency multiplier).
- Beginner mode ("I'm new to PSC"): confidence starts at 1 everywhere, the first 7 days
  use 25-minute blocks and fundamentals-first ordering, no section mock in week one,
  and every question shows its explanation.
- After every completed task: a 5-question check test on that topic from the verified
  pool. Below 60% adds an extra revision touch at the next re-plan.
- Section complete: a section mock (20-30 questions). Final 15% of the timeline: full
  mock tests and revision only.
- XP: 1 per verified study minute (capped at 300 a day), test points, streak bonus.
  Ranks use XP. Users can hide from the global rank and appear as "Anonymous aspirant".

## Design system

Modern, quiet, mostly neutral. Colour is rare and meaningful. About 90% of every screen is
neutral; the accent marks the one thing that matters.

### Light

  bg            #F7F7F5   page background, warm off-white
  surface       #FFFFFF   cards, sheets, inputs
  surfaceMuted  #F0F0EC   hover rows, segmented controls, empty tiles
  border        #E6E6E1   1px borders and dividers
  ink           #16161A   headings and body text
  inkMuted      #5F5F6B   secondary text, labels
  inkSubtle     #9A9AA3   placeholders, disabled, timestamps
  accent        #3B5BFD   primary button, active nav, links, focus ring, progress
  accentSoft    #EBEEFF   selected rows, active chips
  accentInk     #2238C9   text on accentSoft
  streak        #F59E0B   streak flame and streak count ONLY
  streakSoft    #FEF3DC
  success       #1F9D61   correct answers, completed tasks
  successSoft   #E6F5EE
  danger        #E5484D   wrong answers, destructive actions
  dangerSoft    #FDECEC

### Dark

  bg #0E0E11  surface #16161B  surfaceMuted #1E1E25  border #2A2A33
  ink #EDEDF0  inkMuted #A1A1AB  inkSubtle #6E6E78
  accent #6A84FF  accentSoft #1C2350  accentInk #B7C3FF
  streak #FBBF24  streakSoft #3A2C0A
  success #3CCB85  successSoft #12301F
  danger #FF6B6F  dangerSoft #3A1517

Tokens are CSS variables on :root and [data-theme="dark"], mapped into Tailwind v4
@theme. Components use token names only, never raw hex.

### Colour rules

- One filled accent button per view. If two actions are both primary, neither is.
- streak colour appears only on the streak. success and danger only mean right/wrong
  or done/destructive.
- Never signal state with colour alone: correct = success + check icon, wrong =
  danger + cross icon.
- No gradients except a single subtle accent glow behind the streak celebration.

### Typography (next/font/google)

  Poppins          headings and numbers that are focal points. 600 for h1-h2, 500 for
                   h3, buttons and nav. Never 700+.
  Inter            body and UI text, 400 and 500.
  JetBrains Mono   timers, scores, countdowns, ranks. tabular-nums.

  display 32/40  h1 24/32  h2 20/28  h3 16/24  body 15/24  small 13/20
  micro 11/16 uppercase, letter-spacing 0.06em (labels above numbers only)

Sentence case everywhere. Never Title Case.

### Shape, depth, spacing

  radius: cards 16, buttons and inputs 12, chips 8, pills full
  borders first, shadows second. Shadows are neutral and soft:
    sm  0 1px 2px rgba(16,16,24,.04), 0 1px 1px rgba(16,16,24,.03)
    md  0 4px 16px rgba(16,16,24,.06)
    lg  0 16px 40px rgba(16,16,24,.10)   sheets, dialogs, command palette
  Dark mode: replace shadows with a 1px border plus a slightly lighter surface.
  Spacing: 4pt grid - 4, 8, 12, 16, 20, 24, 32, 40, 48, 64.
  Layout: left sidebar on desktop (collapsible), bottom tab bar under 768px.
  Content max width 1120px. Bento grid of stat tiles on Today and Progress.

### Motion and micro-interactions

motion library. Durations: 120ms hover/press, 200ms enter/exit, 300ms page and
sheet. Ease cubic-bezier(0.22, 1, 0.36, 1). Springs only for celebrations.

Signature micro-interactions (build these well, keep everything else still):
- task checkbox: tick draws in, row slides to the done group
- progress ring fills on mount; numbers count up
- streak flame flickers once on the first task of the day
- answer reveal: chosen option settles, correct option gets success + check
- buttons press to scale 0.98; cards lift 1px on hover
- skeletons, never spinners, for anything that loads under 3s
Max three animated elements on screen at once. Respect prefers-reduced-motion.

### Friction rules

- Micro-components: small, single-purpose, composable. No component over ~150 lines,
  no prop explosions.
- Optimistic UI for task completion, answers, likes and joins. Roll back on error.
- Every core action reachable in two clicks. Cmd/Ctrl+K command palette.
- Forms autosave drafts. Onboarding never loses entered data on back.
- Long work (parsing, generation) shows progress and lets the user leave and come back.

### Copy

Sentence case, active voice, same verb through a flow ("Start session" ->
"Session started"). Errors say what happened and how to fix it; never apologise.
Empty states are invitations: "No groups yet. Create one and invite a friend."

### Mobile

Design at 360px first. Single column under 768px; grids collapse, never shrink.
Sheets from the bottom replace popovers and side panels on phones. Primary actions sit
within thumb reach (bottom of the screen) on long forms and focus views. Tables become
stacked cards on mobile. Use dvh, not vh. Test with a real phone before calling a
milestone done.

### Accessibility floor

WCAG AA contrast. Visible accent focus ring. Full keyboard navigation. Works at 200%
zoom. Every icon-only button has an aria-label.

## Out of scope - refuse if asked

Native mobile apps (web is responsive and installable as a PWA). Voice or video. Ads.
Selling question banks as exam-accurate content. Live payments before the billing
milestone.
```

## Part B — Milestones 1–6: foundation to daily loop

One per session, plan mode first, every time.

### Milestone 1 — scaffold, Docker and the design system

```
Read CLAUDE.md.

Set up the project skeleton and the design system. No product features yet.

1. Next.js 15 App Router app with TypeScript strict, pnpm, Tailwind CSS v4, eslint,
   prettier, Vitest and Playwright configured. Folder layout exactly as CLAUDE.md.
2. docker-compose.yml for local dev: postgres 16, redis 7, ollama, minio, mailpit.
   Named volumes, healthchecks. Ollama pulls a small instruct model on first run.
3. .env.example with every variable and a comment on each. Validate env at boot with
   zod in src/server/env.ts; crash early on a missing variable.
4. Prisma installed, empty schema, prisma client singleton in server/db.
5. Design tokens from CLAUDE.md as CSS variables for light and dark, mapped into
   Tailwind @theme. Theme toggle (system, light, dark) with no flash on load.
6. Fonts via next/font: Poppins, Inter, JetBrains Mono with the roles in CLAUDE.md.
7. components/ui primitives restyled from shadcn: button (primary, secondary, ghost,
   danger), input, textarea, select, checkbox, switch, card, badge, chip, avatar,
   tooltip, dialog, sheet, tabs, toast, skeleton, progress-ring, segmented-control,
   command-palette shell, empty-state.
8. App shell: collapsible sidebar on desktop, bottom tab bar under 768px, top bar with
   command palette trigger and avatar menu. Placeholder pages for every route.
9. A /dev/ui page (dev only) that renders every primitive in both themes, including
   the signature micro-interactions with reduced-motion on and off.
10. src/lib/clock.ts (injectable clock) and src/lib/ids.ts.

Run lint, typecheck and tests. Do not build auth, AI or any feature.
```

### Milestone 2 — auth, roles and entitlements

```
Read CLAUDE.md. Milestone 1 is committed.

1. Prisma models: User (email, passwordHash, name, displayName, avatarUrl, role USER |
   MODERATOR | ADMIN | SUPER_ADMIN, timezone, beginnerMode, hideFromGlobalRank,
   status ACTIVE | SUSPENDED | BANNED), RefreshToken (hashed, family id, expires,
   revokedAt, replacedBy), EmailVerification, PasswordReset, Subscription (plan FREE |
   PRO | ELITE, status, periodEnd, source), AuditLog (append-only).
2. Register, login, logout, verify email, forgot and reset password. argon2 hashing.
   Access JWT 15 min, refresh 30 days, rotated on every use. Reuse of an old refresh
   token revokes the whole family.
3. Cookies httpOnly, Secure, SameSite=Lax. CSRF protection on state-changing route
   handlers (server actions already check origin).
4. middleware.ts refreshes tokens and redirects unauthenticated users. requireUser()
   and requireRole() helpers used on every protected handler and action.
5. server/entitlements: config.ts with the limits table from CLAUDE.md, can() and
   limit(). BILLING_ENABLED=false resolves everyone to ELITE. Unit-test both modes.
6. Redis rate limiting on login, register, reset (sliding window).
7. Auth screens using the design system: calm, single column, one accent button.
8. Seed script creates one SUPER_ADMIN from env vars.
9. Integration tests: register -> verify -> login -> refresh -> reuse detection ->
   logout. Playwright e2e for the login flow.

Do not build any study feature.
```

### Milestone 2.5 — public landing page

```
Read CLAUDE.md. Milestones 1-2 are committed.

Build the public marketing site in src/app/(marketing). This is the first thing a
visitor sees, so it must feel like a modern, premium study app. Server-rendered, fast,
no client JS except where an interaction needs it.

1. Navbar (sticky, translucent surface with backdrop blur after 8px of scroll, 1px
   border appears on scroll):
   - left: logo + product name
   - centre: Features, How it works, Groups, Pricing, FAQ (smooth-scroll anchors)
   - right: theme toggle, "Log in" (ghost button), "Sign up" (accent button)
   - logged-in users see "Go to dashboard" instead of log in / sign up
   - under 768px: menu icon opens a full-height sheet with the same links

2. Hero (above the fold on a 1366x768 laptop and on a 390px phone):
   - micro-label above the headline: "For Kerala PSC, SSC and RRB aspirants"
   - headline in Poppins 600, display size: "Your syllabus, turned into a daily plan
     you can actually finish."
   - one-line subhead in inkMuted: upload your syllabus, set how strong you are in each
     subject, get a day-by-day plan with mock tests after every task.
   - primary accent button "Create your study plan" -> /register?next=/onboarding
     (or /onboarding when logged in); secondary ghost button "See how it works" -> anchor
   - trust line under the buttons: "Free during launch. No card needed."
   - right side (stacked below on mobile): a product preview built in real HTML/CSS
     from our own components, not a screenshot - a Today card with a streak chip, three
     tasks with checkboxes, a coverage ring and a "Check test unlocked" chip. Ticks
     animate in once on load (respect reduced motion).
   - background: plain bg with one very faint accent glow behind the preview. No
     stock photos, no illustrations of students.

3. Social proof strip: exam names supported (Kerala PSC LDC, LGS, Degree prelims,
   High Court Assistant, SSC CGL, SSC CHSL, RRB NTPC) as neutral chips. Add real user
   numbers only once they exist - never invent stats or testimonials.

4. Features (bento grid, mixed tile sizes, each tile: icon badge, title, one sentence,
   a tiny live UI fragment):
   - Upload any syllabus - AI turns it into subjects and topics
   - Set intensity per subject - light, steady or intense
   - Beginner mode for first-time PSC aspirants
   - A mock test after every task
   - Daily streak with a weekly freeze
   - Weekly re-plan - no overdue pile, ever
   - Study groups with shared notes and tests
   - Group rank and all-India rank

5. How it works: 4 numbered steps in a row (stacked on mobile) - Upload syllabus ->
   Rate your subjects -> Get your daily plan -> Test and climb the rank. A thin line
   connects the steps and draws in on scroll.

6. Groups section: split layout - copy on one side, a mini group preview (member
   avatars, a shared mock test card, a discussion snippet, group rank top 3).

7. Pricing teaser: FREE, PRO, ELITE cards read from server/entitlements/config.ts.
   While BILLING_ENABLED=false, show a banner "Every feature is free during launch"
   and every card's button says "Start free".

8. FAQ: accordion, 6-8 questions (Is it free? Which exams? Can I upload my own
   syllabus? Does it work on mobile? Is my data private? Are the questions official?).
   Answer honestly: questions are practice questions, not official PSC questions.

9. Final CTA band: one sentence + "Create your study plan" accent button.

10. Footer: logo and one-line description; columns Product (features, pricing, rank),
    Exams, Company (about, contact - Veraft), Legal (privacy, terms); social icons;
    "© <year> Veraft". Theme toggle repeated.

11. Also create /about, /privacy, /terms and /contact as simple prose pages using the
    same navbar and footer.

12. SEO and polish: metadata and Open Graph image per page, sitemap.xml, robots.txt,
    JSON-LD for SoftwareApplication, favicon set. Lighthouse 95+ on performance,
    accessibility and SEO for the landing page.

13. Motion: sections fade and rise 12px once when entering the viewport (200ms),
    buttons press to 0.98, cards lift 1px on hover. Max three animations at once.
    Respect prefers-reduced-motion.

14. Only one accent-filled button visible per viewport section. Sentence case copy.

Playwright: landing loads, every nav anchor scrolls, "Create your study plan" reaches
register when logged out and onboarding when logged in, mobile menu opens and closes.
```

### Milestone 3 — the plan engine

```
Read CLAUDE.md. Milestones 1-2 are committed.

Build src/lib/plan-engine. Pure functions only. No I/O, no prisma, no clock access -
`today` is a parameter.

Types (zod schemas + inferred types): PlanInput, Subject, Topic, Availability,
PlanOutput, PlanDay, PlanTask (STUDY | REVISION | CHECK_TEST | SECTION_MOCK | FULL_MOCK),
CoverageWarning, CompletedWork.

generatePlan(input): PlanOutput | CoverageWarning

1. horizon = earlier of examDate and today + targetDays.
   totalAvailable = sum of the user's minutes per weekday across the horizon, minus a
   10% buffer.
2. For each topic:
   required = baseMinutes(weight, difficulty)
            * intensityMultiplier(subject.intensity)   light .75 steady 1.0 intense 1.3
            * confidenceMultiplier(confidence)          1->1.6 2->1.3 3->1.0 4->0.7 5->0.5
3. If sum(required) > totalAvailable, return CoverageWarning with projected coverage %
   and the extra minutes per day needed. Never silently compress.
4. Reserve the final 15% of the horizon for revision and FULL_MOCK tasks.
5. Each topic: one STUDY block, then a CHECK_TEST right after it, then revision touches
   at roughly 3, 10 and 30 days, clamped before the horizon. Confidence 1-2 gets a 4th
   touch and the user's earliest preferred time window.
6. Interleave subjects: never more than 2 consecutive days led by the same subject.
7. When every topic in a subject has its STUDY + 2 revisions scheduled, add a
   SECTION_MOCK the next day.
8. Beginner mode: first 7 days use 25-minute blocks, order topics by a `foundational`
   flag first, no SECTION_MOCK in week one.

replan(input & { history: CompletedWork[] }): { plan, diff }
- recompute confidence from completed minutes, completion rate and check-test accuracy
  (a topic under 60% gets one extra revision touch)
- regenerate from today forward, discarding every unfinished task
- diff: minutes planned vs done, topics moved, touches added or dropped, coverage before
  and after

Write tests FIRST:
- no task after the horizon; every final revision before it
- no subject leads 3+ consecutive days
- every STUDY task is followed by a CHECK_TEST for the same topic
- replan after a fully missed week returns a valid plan with zero overdue tasks
- impossible workload returns CoverageWarning, never a compressed plan
- confidence-1 topics get more total minutes than confidence-5 topics
- intense subjects get more minutes than light subjects at equal confidence
- deterministic: same input -> byte-identical JSON output

Add at least 20 fixture pairs in fixtures/plan-engine: 30-day and 180-day horizons,
impossible workload, single-subject syllabus, 12-subject syllabus, weekend-only user,
beginner mode, mixed intensities, and replans after several slippage patterns.

No UI, no database, no API in this milestone.
```

### Milestone 4 — catalogue, syllabus upload and AI parsing

```
Read CLAUDE.md. Milestones 1-3 are committed.

1. Prisma: Exam, SyllabusVersion (status DRAFT | PENDING | APPROVED | REJECTED,
   visibility PRIVATE | CATALOGUE, ownerId, fileHash, sourceFileKey), Subject, Topic
   (weight 1-5, difficulty 1-5, foundational bool, order), ParseJob (status, stage,
   error, attempts).
2. server/storage: S3 client (MinIO in dev). Presigned PUT for uploads. Accept PDF,
   DOCX, images and pasted text. Max 15 MB. Virus-safe: never execute, never render
   uploaded HTML.
3. Upload flow: create ParseJob, hash the file, and if an identical hash already has a
   parse, link to it instantly (CLAUDE.md rule 4). Otherwise enqueue a BullMQ job.
4. Worker pipeline: extract text (unpdf; mammoth for docx; OCR placeholder interface
   for images) -> chunk -> AI structuring into subjects and topics with weight,
   difficulty and foundational flag -> zod validate -> retry once -> save as DRAFT.
   Publish stage updates to Redis pub/sub.
5. server/ai: AIProvider interface (structure(), generateQuestions(), summarize()) with
   OllamaProvider and HostedProvider. Prompt templates versioned in server/ai/prompts.
   Log tokens and cost per call into an AiUsage table.
6. SSE route /api/jobs/[id]/stream so the UI shows queued -> reading -> structuring ->
   ready, with polling fallback.
7. Review screen for the user: extracted text on the left, editable tree on the right.
   Rename, reorder (drag), add, delete, merge topics, edit weight/difficulty. Confirm
   saves it as the user's private APPROVED version.
8. Catalogue browse: exams and approved catalogue syllabuses, so a user can skip upload.
   Seed exams: Kerala PSC LDC, LGS, Degree level prelims, Kerala High Court Assistant,
   SSC CGL, SSC CHSL, RRB NTPC (empty syllabus lists).
9. Enforce limit(user, 'syllabusUploads').

Verify end to end with a real Kerala PSC PDF through Ollama.
```

### Milestone 5 — onboarding to a generated plan

```
Read CLAUDE.md. Milestones 1-4 are committed.

Build the flow from first login to a live plan. Each step its own route, a stepper on
top, autosaved draft, back never loses data.

1. Welcome: "I'm new to PSC" vs "I've prepared before". New sets beginnerMode.
2. Exam: pick from catalogue or upload a syllabus (reuses milestone 4 flow).
3. Timeline: exam date OR "finish in N days" (slider 14-365 with presets 30/60/90/180).
4. Availability: minutes per weekday and preferred time windows (morning, afternoon,
   evening, night). Quick presets: "2 hours every day", "weekends heavy".
5. Subjects: one row per subject with an intensity segmented control (light, steady,
   intense) and a 1-5 confidence control. Beginner mode pre-fills confidence 1 and shows
   a one-line hint per subject. Show live estimated total hours as they change.
6. Generate: run the plan engine server-side, persist Plan, PlanDay, PlanTask.
7. CoverageWarning screen: honest numbers, three choices - add time, accept partial
   coverage, move the date. Matter-of-fact tone. Never proceed silently.
8. Done screen: a short summary (days, hours, subjects, first task) and one accent
   button "Start today's plan".
9. Enforce limit(user, 'activePlans').

Playwright e2e: new user -> beginner -> catalogue exam -> 90 days -> plan exists.
```

### Milestone 6 — today, plan, streak and the weekly re-plan

```
Read CLAUDE.md. Milestones 1-5 are committed.

1. Today: bento grid - streak tile (streak colour), today's tasks list with checkboxes,
   minutes planned vs done, days left, coverage ring, next mock test. One accent action:
   "Start next task".
2. Study session: focus view with topic name, countdown in JetBrains Mono, progress
   ring, pause and finish. Timer survives refresh (startedAt + duration persisted,
   remaining computed on load). Optional "keep screen awake" via Wake Lock API.
   Heartbeat every 60s so only genuinely active minutes count toward XP.
3. Completing a task: optimistic tick animation, append TaskCompletion and StudySession,
   append XpLedger, update streak. If the task is STUDY, offer the check test (built in
   milestone 7; show a placeholder card for now).
4. Streak: derived from logs in the user's timezone. One automatic freeze per week. A
   one-time flicker animation on the first completion of the day.
5. Plan view: day-by-day list grouped by week, current day pinned. Calendar view: month
   grid with per-day intensity dots, click a day for its tasks.
6. Syllabus view: subject -> topic tree with coverage state per topic (not started,
   studied, revised, mastered) and filters.
7. Weekly re-plan: BullMQ repeatable job on Sundays, staggered per user, runs replan()
   and writes ReplanLog. Also runs on demand from settings. Today shows the diff as a
   card: "You studied 6 hours of a planned 14. Indian Constitution moved to Tuesday,
   one revision on Kerala geography dropped. You're on track for 84% coverage."
   No overdue items anywhere.
8. Empty, loading (skeletons) and error states for every screen per the copy rules.

Run all tests. Then commit and stop.
```

## Part B — Milestones 7–14: tests, ranks, groups, admin and launch

### Milestone 7 — question pool and mock tests

```
Read CLAUDE.md. Milestones 1-6 are committed.

1. Prisma: Question (topicId, difficulty, language, body, options[4], correctIndex,
   explanation, status PENDING | VERIFIED | SUPPRESSED, source AI | ADMIN | USER,
   reportCount), QuestionReport, MockTest (type CHECK | SECTION | FULL | CUSTOM,
   questionIds, durationSec, negativeMarking, createdBy, groupId nullable),
   TestAttempt and AttemptAnswer (both append-only).
2. Generation job: for a topic + difficulty, generate 40 questions via AIProvider,
   zod-validate, dedupe by normalised text, save PENDING. Once per topic + difficulty,
   ever - never per user. A seeding script enqueues topics with < 40 verified questions.
3. Check test after each STUDY task: 5 verified questions on that topic, no timer
   pressure, explanation after each answer. Result feeds the next replan.
4. Section mock: 20-30 questions across a subject, timed. Full mock: whole syllabus,
   PSC-style 100 questions / 75 min, optional negative marking (1/3).
5. Test player: one question per screen, question text in Inter 17/28, options as large
   tap targets, keyboard 1-4 to answer, flag for review, palette of question numbers,
   timer in JetBrains Mono. Answer reveal micro-interaction from CLAUDE.md.
6. Scoring on the server only, from server timestamps. Never trust client scores.
7. Result screen: score, accuracy per topic, time per question, weakest topics, and
   "These topics get extra revision next week" when relevant.
8. Users can report a question; three reports auto-suppress it into the admin queue.
9. Label the pool honestly as practice questions, not official exam questions.
10. Enforce limits for check tests and mocks via entitlements.

Test: a user scoring 20% on a topic gets more scheduled minutes on it after replan than
a user scoring 90%.
```

### Milestone 8 — use it yourself

```
No code this milestone.

Use the app daily for two to three weeks for real PSC preparation. Keep a list of every
annoyance, slow screen and confusing word. Paste the list back and we fix it before
groups and ranks are built.
```

### Milestone 9 — progress and the global rank

```
Read CLAUDE.md. Milestones 1-8 are committed.

1. Progress page (bento): streak and best streak, XP and level, minutes per day for the
   last 30 days (single-colour bars, no gridlines), coverage %, test accuracy trend,
   weakest five topics, subject breakdown. Everything derived from logs.
2. XP rules from CLAUDE.md with a 300 verified minutes/day cap. Server-side only.
3. Global rank: weekly, monthly, all-time, and per exam. Redis sorted sets updated on
   XpLedger append, rebuilt nightly from Postgres as the source of truth.
4. Rank page: top 100 with avatar, display name, exam, XP and streak; the user's own
   position pinned at the bottom even when outside the top 100; filter by exam and
   district (optional profile field).
5. Privacy: hideFromGlobalRank shows the user as "Anonymous aspirant". Display names
   only, never emails.
6. Anti-abuse: flag accounts gaining XP faster than humanly possible for admin review.
```

### Milestone 10 — groups: membership, materials and shared tests

```
Read CLAUDE.md. Milestones 1-9 are committed.

1. Prisma: Group (name, description, exam, visibility PUBLIC | PRIVATE, avatar),
   Membership (role OWNER | ADMIN | MEMBER, mutedUntil), Invite (code, link, expiry,
   maxUses), Block, Report.
2. Create group, join by code or link, request-to-join for private groups, public group
   directory filtered by exam. Owner/admin can remove, mute, promote and revoke invites.
3. Study material: upload PDFs, images and notes to the group (S3, presigned), with
   title, subject and topic tags. Preview in-app. Storage counted against
   limit(owner, 'groupStorage').
4. Shared mock tests: any member can share a MockTest to the group or build a custom one
   from the verified pool (pick topics, count, duration). Group test results page.
5. Group rank: weekly XP and group-test scores among members, Redis sorted set per
   group per week.
6. Blocking and reporting on every piece of user content. Build now, not later.
7. Every group action checks membership and group role server-side.
```

### Milestone 11 — group discussion and questions

```
Read CLAUDE.md. Milestones 1-10 are committed.

1. Discussion: threads per group with replies, mentions, reactions, and pinned posts.
   Markdown subset with sanitisation (no raw HTML).
2. Questions: a member posts a doubt tagged with a topic; others answer; the asker marks
   one answer as accepted. Accepted answers give a small XP reward (capped per day).
3. Realtime: SSE stream per group via Redis pub/sub for new posts, replies and reactions.
   Reconnect resumes from Last-Event-ID. No per-second broadcasts.
4. Optimistic posting and reactions with rollback.
5. In-app notification centre: mentions, replies, accepted answers, new shared tests.
6. Moderation: group admins can hide posts; reported posts go to the admin queue.
```

### Milestone 12 — super admin panel

```
Read CLAUDE.md. Milestones 1-11 are committed.

/admin, role-gated (MODERATOR sees moderation only, ADMIN everything except roles and
billing, SUPER_ADMIN everything). Same design system, denser tables.

1. Dashboard: daily active users, signups, sessions, minutes studied, tests taken,
   AI cost today and this month, queue depth, failed jobs.
2. Users: search, view profile and activity, change plan, suspend, ban, reset streak
   on abuse, impersonate (read-only, logged in AuditLog).
3. Exams and catalogue: create exams, upload official syllabuses, review queue with
   side-by-side text and tree, approve, reject with note, promote user uploads.
4. Question pool: batch review, edit, verify, delete; thin-pool report per topic;
   generate-more button; suppressed-question queue.
5. Mock tests: build official full mocks, schedule them, see attempts.
6. Groups: list, inspect, feature, hide, delete; reports queue for posts and materials.
7. Plans and entitlements: edit limits per plan, toggle BILLING_ENABLED, grant plans.
8. Feature flags, site announcements banner, maintenance mode.
9. Jobs: BullMQ queues with retry and discard; AI usage by provider and prompt version.
10. Audit log viewer. Every admin action writes AuditLog.
```

### Milestone 13 — plans, billing and notifications

```
Read CLAUDE.md. Milestones 1-12 are committed.

1. Pricing page with FREE, PRO, ELITE from the entitlements config. While billing is
   off, show "All features free during launch".
2. Razorpay subscriptions behind BILLING_ENABLED: checkout, webhook with signature
   verification and idempotency, Subscription updates, grace period, downgrade rules
   that never delete user data (over-limit items become read-only).
3. Upgrade prompts appear only at a limit, inline and calm - never modal walls.
4. Notifications: email and web push (PWA). Exactly three types - session reminder at
   the start of a preferred window, streak at risk (once, evening, only if nothing
   logged), weekly summary ready. Each switchable, plus quiet hours.
5. Make the app an installable PWA with an offline page and cached Today view.
```

### Milestone 14 — hardening and launch

```
Read CLAUDE.md. Milestones 1-13 are committed.

1. Security pass: headers (CSP, HSTS), rate limits everywhere in rule 13, upload
   validation, SSRF-safe fetches, dependency audit, secrets only in env.
2. Performance: Lighthouse 90+ on Today and landing, route-level loading.tsx, image
   optimisation, Postgres indexes for every hot query, N+1 checks.
3. Accessibility audit with axe on every route; keyboard-only walkthrough.
4. Production Dockerfile (multi-stage, standalone) with web and worker targets;
   docker-compose.prod.yml with caddy, web, worker, postgres, redis; healthchecks.
5. Health endpoint for database, Redis and queue; uptime monitoring; error tracking.
6. Nightly pg_dump to object storage and RESTORE-TEST IT ONCE.
7. Privacy policy, terms, data export and account deletion (anonymise logs, keep
   aggregates).
8. Seed real content: at least Kerala PSC LDC and High Court Assistant syllabuses
   approved, with 40 verified questions per topic.
```

## The habit that matters

At the end of every session, ask Claude Code to append what it learned to `NOTES.md`: schema decisions, packages that fought back, Ollama prompt quirks, anything surprising. Every future session reads it first, right after `CLAUDE.md`.

Thirty seconds per session saves hours by milestone 10.
