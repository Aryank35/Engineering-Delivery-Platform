# Phase 3 — Sprints & Kanban

Time-boxed iterations with a drag-and-drop board that stays in sync across clients in
real time, plus capacity and points analytics.

## Data model

| Model / field              | Purpose                                                        |
| -------------------------- | -------------------------------------------------------------- |
| `Sprint`                   | Iteration: name, goal, status, start/end, optional `wipLimits` |
| `SprintStatus`             | `PLANNED · ACTIVE · COMPLETED`                                 |
| `WorkItem.sprintId`        | Links an item to its sprint (null = backlog)                   |
| `WorkItem.rank`            | Float ordering within a board column (lower = higher)          |
| `User.capacityHoursPerDay` | Per-person daily capacity used for sprint load analytics       |

## Board & ordering

The board shows the workflow columns `TODO · IN_PROGRESS · IN_REVIEW · IN_QA · DONE`
(`BOARD_COLUMN_STATUSES`). Items are ordered within a column by `rank`. Dragging a card
sends `POST /work-items/:id/move` with `{ status, sprintId?, beforeId?, afterId? }`; the
server sets the new rank to the **midpoint** of the neighbours' ranks (or `±1` at the ends),
records a status-change activity, and broadcasts a board change. Adding a `BACKLOG` item to a
sprint promotes it to `TODO`.

WIP limits are advisory: `wipLimits` per status are returned with the board and the UI
highlights columns that exceed them.

## Real-time

A Socket.IO gateway authenticates each connection with the JWT access token (handshake
`auth.token`) and joins clients to `sprint:<id>` rooms. Domain mutations emit lightweight
signals — `board:changed` and `sprints:changed` — and clients react by refetching the
affected query (no state reconciliation over the wire). Set `REALTIME_REDIS_ENABLED=true`
(with `REDIS_URL`) to fan events out across multiple API instances via the Redis adapter;
otherwise a single-node in-memory adapter is used.

## API reference

All routes are `/api`-prefixed and require authentication.

### Sprints — `/api/sprints`

| Method & path        | Permission      | Description                                  |
| -------------------- | --------------- | -------------------------------------------- |
| `GET /`              | `sprint:read`   | List sprints (filter by status) + pagination |
| `POST /`             | `sprint:manage` | Create a sprint                              |
| `GET /:id`           | `sprint:read`   | Sprint detail                                |
| `PATCH /:id`         | `sprint:manage` | Update a sprint                              |
| `DELETE /:id`        | `sprint:manage` | Delete (items fall back to backlog)          |
| `POST /:id/start`    | `sprint:manage` | Set status `ACTIVE`                          |
| `POST /:id/complete` | `sprint:manage` | Set status `COMPLETED`                       |
| `POST /:id/items`    | `sprint:manage` | Add work items to the sprint                 |
| `DELETE /:id/items`  | `sprint:manage` | Remove work items from the sprint            |
| `GET /:id/board`     | `sprint:read`   | Columns of items grouped by status           |
| `GET /:id/analytics` | `sprint:read`   | Points, status counts, per-assignee capacity |

### Board move — `/api/work-items/:id/move`

| Method & path | Permission        | Description                                      |
| ------------- | ----------------- | ------------------------------------------------ |
| `POST`        | `workitem:update` | Change status/sprint/rank; emits `board:changed` |

## Analytics

`GET /sprints/:id/analytics` returns item and point totals (with completed/remaining),
per-status counts, working days (`businessDaysBetween`), elapsed/remaining days, and a
per-assignee load breakdown with `capacityHours = workingDays × capacityHoursPerDay`.

## Permissions

Adds `sprint:read` (all roles) and `sprint:manage` (Admin, Engineering Manager). Board moves
reuse `workitem:update`, so developers and QA can drag cards while viewers are read-only.

## Web screens

- **Sprints** — card grid of iterations with status, dates and item counts.
- **Board** — Kanban with dnd-kit drag-and-drop, WIP indicators, sprint start/complete, a
  planning dialog to pull in backlog items, and a live analytics panel. Updates from other
  users appear automatically via the sprint room subscription.
