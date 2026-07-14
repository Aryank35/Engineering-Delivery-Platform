# Phase 6 — Release management & environment tracking

The second Phase 6 slice: versioned releases, the environments they promote through, and a
deployment record per environment. This is the domain the upcoming GitHub/CD integration will
auto-populate (branches, PR-driven deployments); here it is managed manually and already
delivers the release dashboard.

## Data model

- `Environment` — a deployment target (`key`, `name`, `color`, `sortOrder`, `isProduction`).
  Seeded with **Development / Staging / Production**.
- `Release` — a versioned release (`version` unique, `name`, `notes`, `status`, `targetDate`,
  `releasedAt`, `createdById`). Work items link to a release via `WorkItem.releaseId`
  (nullable, `SetNull` on delete) — a release is the scope of shipped work.
- `Deployment` — a release promoted to an environment (`status`, `notes`, `deployedById`,
  `startedAt`, `finishedAt`). `environmentId` is `Restrict` on delete so an environment with
  history can't be silently removed.

Enums: `ReleaseStatus` (PLANNED, IN_PROGRESS, RELEASED, ROLLED_BACK, CANCELLED),
`DeploymentStatus` (PENDING, IN_PROGRESS, SUCCEEDED, FAILED, ROLLED_BACK).

## Behaviour

- **releasedAt automation** — stamped the first time a release transitions to `RELEASED`, and
  preserved afterwards (mirrors work-item `completedAt`).
- **Live-in derivation** — a release is "live" in an environment when the *latest* deployment
  to that environment succeeded (a later rollback supersedes an earlier success).
- **Deployment timestamps** — `startedAt` set when a deployment leaves `PENDING`; `finishedAt`
  set on a terminal status (SUCCEEDED / FAILED / ROLLED_BACK).
- **Notifications** — publishing a release (→ `RELEASED`) raises a `RELEASE_PUBLISHED`
  notification to the assignees of its work items, reusing the Phase-6a notification channel.
- **Realtime** — release/deployment/environment mutations emit a lightweight `releases:changed`
  signal to the `releases` room; list and detail pages refetch.

## API reference

All routes require authentication. Reads need `release:read` (granted to every role); mutations
need `release:manage` (Admin + Engineering Manager), mirroring sprint permissions.

| Method & path                                     | Permission        | Description                    |
| ------------------------------------------------- | ----------------- | ------------------------------ |
| `GET /api/releases`                               | `release:read`    | Paginated list (status/search) |
| `POST /api/releases`                              | `release:manage`  | Create a release               |
| `GET /api/releases/:id`                           | `release:read`    | Release detail                 |
| `PATCH /api/releases/:id`                         | `release:manage`  | Edit version/name/notes/target |
| `DELETE /api/releases/:id`                        | `release:manage`  | Delete a release               |
| `POST /api/releases/:id/status`                   | `release:manage`  | Change status                  |
| `POST` / `DELETE /api/releases/:id/items`         | `release:manage`  | Add / remove work items        |
| `POST /api/releases/:id/deployments`              | `release:manage`  | Record a deployment            |
| `PATCH /api/releases/:id/deployments/:deployId`   | `release:manage`  | Update a deployment's status   |
| `GET /api/environments`                           | `release:read`    | List environments              |
| `GET /api/environments/status`                    | `release:read`    | Current release per environment |
| `POST` / `PATCH` / `DELETE /api/environments/:id` | `release:manage`  | Manage environments            |

## Web screens

- **Releases** (`/releases`) — an environment-status overview (what's live where) plus a
  filterable, paginated releases table.
- **Release detail** (`/releases/:id`) — status control, deploy dialog, work-item scope
  (add/remove) and a per-environment deployment list with inline status updates.
- **Environments** (`/environments`) — admin CRUD for deployment targets.

## Tests

- API: `setStatus` stamps `releasedAt` + notifies once on first release (and not again);
  `createDeployment` sets started/finished timestamps for terminal statuses; the mapper's
  live-in derivation; environment delete is blocked while deployments exist.
- Web: release/deployment status badges render their labels.
