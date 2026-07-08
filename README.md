# Engineering Operations Platform (EOP)

A single source of truth for an engineering team's delivery lifecycle —
**Requirement → Planning → Development → Testing → Release → Production** — where every
task flows through its full lifecycle and any change fans out to dashboards, reports and
metrics without duplicate data entry.

This repository is built incrementally in phases. **Phase 1 (Authentication & RBAC)** is
complete; see the [roadmap](docs/ROADMAP.md) for what comes next.

## Tech stack

| Layer    | Technology                                                                |
| -------- | ------------------------------------------------------------------------- |
| Monorepo | pnpm workspaces + Turborepo                                               |
| Backend  | NestJS 10 · Prisma 6 · PostgreSQL 16 · JWT (Argon2id) · Zod validation    |
| Frontend | React 18 · Vite 6 · Tailwind + shadcn-style UI · TanStack Query · Zustand |
| Infra    | Docker Compose (Postgres + Redis)                                         |
| Testing  | Jest + Supertest (API) · Vitest + Testing Library (web)                   |

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the full design.

## Repository layout

```
apps/
  api/        NestJS API (REST + Prisma + RBAC + audit)
  web/        React + Vite single-page app
packages/
  shared/     @eop/shared    — enums, permissions, zod contracts (shared by api + web)
  database/   @eop/database  — Prisma schema, generated client, seed
docs/         Architecture, roadmap and per-phase documentation
```

## Prerequisites

- Node.js ≥ 20.11 (tested on 24)
- pnpm 9 (`corepack enable` or `npm i -g pnpm@9`)
- Docker (for Postgres + Redis) — or a local Postgres 16

## Quick start

```bash
# 1. Install dependencies
pnpm install

# 2. Configure environment
cp .env.example .env        # adjust secrets for anything beyond local dev

# 3. Start infrastructure (Postgres + Redis)
pnpm docker:up              # docker compose up -d postgres redis

# 4. Create the schema and seed roles, permissions and an admin user
pnpm db:migrate             # prisma migrate dev
pnpm db:seed

# 5. Run everything (API on :4000, web on :5173)
pnpm dev
```

The seed creates a bootstrap admin from `.env`
(`BOOTSTRAP_ADMIN_EMAIL` / `BOOTSTRAP_ADMIN_PASSWORD`, default `admin@eop.dev` / `Admin123!`).
Open http://localhost:5173 and sign in, or register a new account (self-registered users get
the least-privilege **Viewer** role).

> **Without Docker:** point `DATABASE_URL` at any reachable Postgres 16 and run steps 4–5.
> The `docker compose --profile full up` variant also builds and runs the API and web images.

## Common scripts (run from the repo root)

| Script            | Description                                |
| ----------------- | ------------------------------------------ |
| `pnpm dev`        | Run API + web in watch mode (Turbo)        |
| `pnpm build`      | Build every package                        |
| `pnpm typecheck`  | Type-check every package                   |
| `pnpm test`       | Run all unit tests                         |
| `pnpm lint`       | Lint every package                         |
| `pnpm format`     | Prettier write                             |
| `pnpm db:migrate` | Apply Prisma migrations (dev)              |
| `pnpm db:seed`    | Seed roles, permissions and the admin user |
| `pnpm db:studio`  | Open Prisma Studio                         |

## Testing

```bash
pnpm test                                   # all unit tests (API + web)

# API end-to-end (requires a running, migrated + seeded database):
pnpm docker:up && pnpm db:migrate && pnpm db:seed
RUN_E2E=1 pnpm --filter @eop/api test:e2e
```

## Phase 1 — Authentication & RBAC

- Register / login / logout / refresh with **rotating refresh tokens** (hashed at rest,
  reuse detection revokes the whole token family) and short-lived access tokens.
- **Role-based access control**: six roles (Admin, Engineering Manager, Business Analyst,
  Developer, QA Engineer, Viewer) mapped to fine-grained `resource:action` permissions,
  enforced by global guards.
- **Audit trail** for every mutation (actor, action, before/after, IP, user agent).
- Web app: login/register, protected routing with permission gates, app shell with dark/light
  theme, admin user management, and an audit-log viewer.

Full details, API reference and the permission matrix: [docs/phase-01-auth-rbac.md](docs/phase-01-auth-rbac.md).

## Notes

- The Dockerfiles (`apps/api/Dockerfile`, `apps/web/Dockerfile`) are provided for a
  Docker-enabled host / CI and were not exercised in the environment this was built in.
- `@eop/shared` ships a dual CJS/ESM build so the CommonJS NestJS runtime and the ESM Vite
  bundler both consume it cleanly.
