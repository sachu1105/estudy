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
