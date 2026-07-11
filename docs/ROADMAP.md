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

## Phase 2 — Work-item hierarchy (Requirement → Epic → Story → Task) ✅

- **DB:** `WorkItem` (self-referential hierarchy, auto `EOP-n` key), `Label`, `WorkItemLabel`,
  `Comment`, `WorkItemActivity`.
- **API:** work-items CRUD with parent-type + cycle validation, per-field activity diffing,
  status→`completedAt` automation, filtering/pagination; comments (author/moderator
  authorization); per-item activity timeline; labels CRUD. All audited.
- **Web:** work list with filters, create dialog, and a full detail page (inline field editing,
  labels editor, child items, and a merged comment + activity timeline). Labels admin page.
- **Tests:** hierarchy rules, activity diffing, status automation, comment access; badge rendering.

See [phase-02-work-items.md](./phase-02-work-items.md).

## Phase 3 — Sprints & Kanban ✅

- **DB:** `Sprint` (status, dates, WIP limits); `WorkItem` gains `sprintId` + board `rank`;
  `User` gains `capacityHoursPerDay`.
- **API:** sprint CRUD + start/complete, plan (add/remove items), board (columns by status),
  drag-to-move with fractional ranking + WIP metadata, capacity/points analytics. **Real-time**
  Socket.IO gateway (JWT-authenticated, sprint rooms) with an optional Redis adapter for
  multi-node scaling. All audited.
- **Web:** sprints list, Kanban board with **drag-and-drop** (dnd-kit) that live-updates across
  clients, sprint planning dialog, and a capacity/points analytics panel.
- **Tests:** rank midpoint computation, sprint analytics/capacity, `businessDaysBetween`,
  board drop resolver.

See [phase-03-sprints-board.md](./phase-03-sprints-board.md).

> A time-series **burndown chart** and velocity trends are deferred to Phase 5 (Analytics),
> which introduces the charting layer; Phase 3 ships points/capacity summaries.

## Phase 4 — Time tracking & Personal dashboard ✅

- **DB:** `TimeLog` (timer + manual entries) and `ActiveTimer` (one per user);
  `User.capacityHoursPerDay` (added in Phase 3) feeds capacity views.
- **API:** stopwatch (start/pause/resume/stop → time log), manual logs CRUD (own),
  per-work-item totals, and a personal summary (today/week totals, week-by-day, assigned
  work by status, recent logs). All audited.
- **Web:** personal dashboard (time stats, week chart, my work, recent logs), a global
  running-timer widget in the top bar, and a per-work-item time panel (timer + manual log +
  log history).
- **Tests:** elapsed-time math, timer→log commit, minute→second conversion, formatting.

See [phase-04-time-tracking.md](./phase-04-time-tracking.md).

## Phase 5 — Dashboards & analytics ✅

- **API:** an analytics module computing overview (status distribution, weekly throughput,
  cycle time from status-change history, workload by assignee, time logged by user), sprint
  **velocity**, and **QA/defect** metrics (open vs resolved, by week, by status); plus the
  sprint **burndown** endpoint (ideal vs actual remaining points — deferred from Phase 3).
- **Web:** an **Insights** dashboard (Manager overview + QA & Defects tabs) and a burndown
  chart on the sprint board, using a validated, colorblind-safe, theme-aware chart palette
  (Recharts) with legends, hover tooltips and one-axis charts.
- **Tests:** velocity mapping, burndown series; chart helpers.

See [phase-05-analytics.md](./phase-05-analytics.md).

> **Release** and **Branch/Environment** dashboards move to Phase 6 — they need Release and
> Branch/Environment domain models that pair naturally with the GitHub integration landing there.

## Phase 6 — Integrations, releases, automation & notifications

GitHub integration (PR/commit/branch webhooks → status automation), **Release management**
and **Branch/Environment tracking** dashboards (moved from Phase 5, paired with GitHub),
Jira adapter (optional), BullMQ automations (daily standup summary, release notes, risk
alerts), in-app + real-time notifications.

## Phase 7 — AI assistant, search & polish

AI assistant (summaries, standup/report generation, Q&A over work items), global
command palette + search, saved views, keyboard shortcuts, accessibility & performance pass.

---

### Cross-cutting (maintained every phase)

Audit trail, RBAC enforcement, zod-validated contracts shared api↔web, tests, OpenAPI docs.
