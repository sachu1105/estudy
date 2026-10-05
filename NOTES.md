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
