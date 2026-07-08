# Delivery Roadmap

Built incrementally. Each phase ships DB schema, API, backend logic, frontend screens,
state management, validation, tests and docs — and is integrated before the next begins.

## Phase 0 — Foundation & tooling ✅

Monorepo (pnpm + Turborepo), shared config (tsconfig/eslint/prettier), Docker Compose
(Postgres + Redis), `@eop/shared` and `@eop/database` packages, NestJS API core
(config with zod-validated env, Prisma module, global pipes/filters/interceptors),
React/Vite web shell.

## Phase 1 — Authentication & RBAC ✅

- **DB:** `User`, `Role`, `Permission`, `UserRole`, `RolePermission`, `RefreshToken`, `AuditLog`.
- **API:** register / login / refresh (rotation + reuse detection) / logout / me;
  Users CRUD + role assignment; Audit log query. RBAC guards + audit on all mutations.
- **Web:** login & register, protected routing, app shell (sidebar/topbar), theme toggle,
  profile, admin Users management, Audit log viewer.
- **Tests:** hashing, token service, RBAC guard logic, auth e2e; web auth-flow tests.

## Phase 2 — Work-item hierarchy (Requirement → Epic → Story → Task)

Canonical work items with status/priority/labels/assignee/estimates, activity timeline,
comments, full CRUD + filtering, and audit. Web: item list + detail views.

## Phase 3 — Sprints & Kanban

Sprint planning with capacity calculation, drag-and-drop Kanban board, **real-time**
board sync via Socket.IO (Redis adapter), WIP limits, sprint burndown.

## Phase 4 — Time tracking & Personal dashboard

Start/pause/resume/stop timers, manual time logs, per-developer dashboard (my work,
my day, logged time), activity timeline.

## Phase 5 — Dashboards & analytics

Manager, QA, Release, and Branch/Environment dashboards; sprint & release analytics
(velocity, burndown, cycle time, defect trends) with charts.

## Phase 6 — Integrations, automation & notifications

GitHub integration (PR/commit/branch webhooks → status automation), Jira adapter
(optional), BullMQ automations (daily standup summary, release notes, risk alerts),
in-app + real-time notifications.

## Phase 7 — AI assistant, search & polish

AI assistant (summaries, standup/report generation, Q&A over work items), global
command palette + search, saved views, keyboard shortcuts, accessibility & performance pass.

---

### Cross-cutting (maintained every phase)

Audit trail, RBAC enforcement, zod-validated contracts shared api↔web, tests, OpenAPI docs.
