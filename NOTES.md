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
