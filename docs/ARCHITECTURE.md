# Engineering Operations Platform — Architecture

The EOP is a single source of truth for an engineering team's delivery lifecycle:
Requirement → Planning → Development → Testing → Release → Production. Every task
flows through its full lifecycle and any change fans out to dashboards, reports and
metrics without duplicate data entry.

## Guiding principles

- **Single source of truth** — one canonical record per entity; dashboards are projections.
- **Event-driven** — domain changes emit events; automations and real-time updates react to them.
- **Real-time** — Socket.IO pushes changes to connected clients (rooms per board/user/org).
- **API-first** — every capability is a documented REST endpoint; the web app is one client.
- **RBAC + audit** — every request is authorized; every mutation is auditable.
- **Clean, feature-based architecture** — modules own their schema, service, controller and tests.

## Topology

A pnpm + Turborepo monorepo.

```
apps/
  api/        NestJS — REST + Socket.IO + Prisma. Guards for RBAC, interceptors for audit.
  web/        React + Vite SPA — Tailwind + shadcn-style UI, TanStack Query, Zustand.
packages/
  shared/     @eop/shared    — enums, zod contracts, DTO types shared by api + web.
  database/   @eop/database  — Prisma schema, generated client, seed.
```

## Backend stack

| Concern                | Choice                                                                                      |
| ---------------------- | ------------------------------------------------------------------------------------------- |
| Framework              | NestJS 10 (modules, DI, guards, interceptors, gateways)                                     |
| ORM / DB               | Prisma 6 + PostgreSQL 16                                                                    |
| Cache / jobs / pub-sub | Redis 7 (Socket.IO adapter, BullMQ jobs, caching) _(wired from Phase 3+)_                   |
| Auth                   | Self-hosted JWT: short-lived access token + rotating refresh token (hashed, reuse-detected) |
| Password hashing       | Argon2id via `@node-rs/argon2` (prebuilt native bindings)                                   |
| Validation             | Zod schemas from `@eop/shared` via a custom `ZodValidationPipe`                             |
| Authorization          | `JwtAuthGuard` (global) + `RolesGuard` + `PermissionsGuard`                                 |
| Audit                  | `AuditService` records actor/action/entity/before/after                                     |
| Security               | Helmet, CORS (credentials), rate limiting (`@nestjs/throttler`), httpOnly refresh cookie    |
| Testing                | Jest (unit) + Supertest (e2e)                                                               |

## Frontend stack

| Concern           | Choice                                                                  |
| ----------------- | ----------------------------------------------------------------------- |
| Build / framework | Vite 6 + React 18 + TypeScript                                          |
| Styling / UI      | Tailwind CSS 3 + shadcn-style primitives (Radix + CVA), Linear-inspired |
| Server state      | TanStack Query 5                                                        |
| Client state      | Zustand (auth session, UI preferences)                                  |
| Routing           | React Router 6                                                          |
| Forms             | React Hook Form + Zod resolver (schemas from `@eop/shared`)             |
| HTTP              | Axios client with transparent access-token refresh                      |
| Theme             | Class-based dark/light with system preference + persistence             |
| Testing           | Vitest + Testing Library                                                |

## Auth & session model

1. `POST /auth/login` verifies credentials → returns an **access token** (Bearer, in body,
   held in memory) and sets a **refresh token** as an httpOnly, sameSite cookie.
2. Refresh tokens are stored **hashed** with a `family` id. `POST /auth/refresh` rotates the
   token (revokes the old, issues a new one in the same family).
3. Reuse of an already-revoked refresh token revokes the **entire family** (theft detection).
4. `JwtStrategy` loads the user fresh on every request (roles + permissions), so role changes
   and deactivation take effect immediately.

## Authorization model

- `Role` (keyed by `RoleKey`: ADMIN, ENGINEERING_MANAGER, BUSINESS_ANALYST, DEVELOPER,
  QA_ENGINEER, VIEWER) has many `Permission`s (`resource:action`, e.g. `user:update`).
- `User` has many `Role`s. Effective permissions = union of the user's roles' permissions.
- `@Roles(...)` gates by role; `@RequirePermissions(...)` gates by fine-grained permission.
- `@Public()` opts an endpoint out of the global auth guard.

## Request lifecycle

```
Request
  → Helmet / CORS / rate limit
  → JwtAuthGuard (unless @Public)         attaches AuthUser {id,email,roles,permissions}
  → RolesGuard / PermissionsGuard
  → ZodValidationPipe (body/query/params)
  → Controller → Service (domain logic, Prisma)
      → AuditService.record(...) on mutations
      → EventEmitter/Socket.IO (real-time, from Phase 3+)
  → Response envelope
  ← GlobalExceptionFilter on error (consistent problem shape)
```

See [ROADMAP.md](./ROADMAP.md) for the phase plan and per-phase deliverables.
