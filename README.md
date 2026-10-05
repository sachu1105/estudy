# Study planner

A web-first study planner for Kerala PSC, SSC, RRB and banking aspirants. See `CLAUDE.md`
for the product contract and rules, and `NOTES.md` for decisions made along the way.

## Getting started

```bash
pnpm install                 # also generates the Prisma client
cp .env.example .env         # defaults match docker-compose.yml
docker compose up -d         # postgres, redis, ollama (+ model pull), minio, mailpit
pnpm dev                     # http://localhost:3000
pnpm worker                  # background worker (separate terminal)
```

Useful local URLs: design system at `/dev/ui` (dev only), MinIO console at
http://localhost:9001, Mailpit inbox at http://localhost:8025.

## Scripts

| Command                                           | What it does                        |
| ------------------------------------------------- | ----------------------------------- |
| `pnpm dev` / `pnpm build` / `pnpm start`          | Next.js                             |
| `pnpm worker`                                     | BullMQ worker with hot reload       |
| `pnpm lint` / `pnpm typecheck` / `pnpm format`    | Code quality                        |
| `pnpm test`                                       | Vitest unit and integration tests   |
| `pnpm e2e`                                        | Playwright (starts `pnpm dev`)      |
| `pnpm db:migrate` / `pnpm db:seed` / `db:generate` | Prisma                              |

Run `pnpm test`, `pnpm lint` and `pnpm typecheck` before calling any task done.
