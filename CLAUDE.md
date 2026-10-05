@AGENTS.md

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

The user is never asked to blindly trust the AI. Every AI decision is visible and
editable: the parsed syllabus, the minutes given to each topic and why, the order of
tasks, how the streak is counted, why a topic got an extra revision. Users can override
any of it by hand.

Study vault: every subject and topic gets its own folder, created automatically from
the syllabus. Users keep their own notes, website links, PDFs and photos of pages
(camera capture or upload from device) in those folders, plus custom folders of their
own. On the paid plans, they can turn the material in any folder into a mock test: the
AI reads their notes, PDFs and scanned pages and writes questions from them.

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
                       progress, vault, settings, onboarding
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
   anywhere else. While BILLING_ENABLED=false, every user resolves to ELITE, except
   features marked paidOnly, which need a real PRO or ELITE subscription or an
   admin grant.

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

14. EVERY AI DECISION IS EXPLAINABLE AND OVERRIDABLE. The plan engine returns a
    reason with each allocation (base minutes x intensity x confidence, revision
    gaps, why a touch was added). The UI shows it under "Why this?". Any user edit
    (minutes, day, order, locked task) is stored as an override that the re-plan
    respects. AI-written questions always show their source.

15. VAULT MATERIAL IS PRIVATE. A user's files, notes and links are visible only to
    them unless they explicitly share an item to a group. Questions generated from
    their material never enter the public question pool. Files are served only
    through short-lived signed URLs after an ownership check.

16. MOBILE FIRST, EVERY SCREEN. Most users study on a phone. Every page, dialog, form,
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
  study vault storage        200 MB      5 GB         20 GB
  vault folders and notes    unlimited   unlimited    unlimited
  mock tests from my vault   no          30 / month   100 / month   (paidOnly)
  pages per vault mock       -           40           150

"Mock tests from my vault" is the core paid feature. It is paidOnly: it stays locked
during the free launch period and opens only with a PRO or ELITE subscription or an
admin grant. Locked users see what it does and a calm upgrade card, never a dead button.

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
  inkSubtle     #9A9AA3   placeholders, disabled, decorative icons. Below AA: never for readable text
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
