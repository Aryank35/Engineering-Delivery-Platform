# Phase 2 — Work-item hierarchy

The delivery core: a single canonical `WorkItem` expressing the
**Requirement → Epic → Story → Task** hierarchy, with labels, comments and a per-item
activity timeline — all authorized by RBAC and audited.

## Data model

| Model              | Purpose                                                                      |
| ------------------ | ---------------------------------------------------------------------------- |
| `WorkItem`         | One canonical item; `type` + self-referential `parent` express the hierarchy |
| `Label`            | Named, coloured tag                                                          |
| `WorkItemLabel`    | WorkItem ↔ Label join                                                        |
| `Comment`          | Threaded discussion on an item                                               |
| `WorkItemActivity` | Purpose-built timeline feed (created + per-field changes)                    |

Each `WorkItem` has an auto-incrementing `number` rendered as a human key (`EOP-42`),
a `status`, `priority`, optional `assignee`, `reporter`, `storyPoints`, `startDate`/`dueDate`,
and `completedAt` (set automatically when status enters `DONE`).

### Hierarchy rules

`REQUIREMENT → EPIC → STORY → TASK`. A parent must be exactly one level up
(`canParent(parentType, childType)` in `@eop/shared`). The service also rejects cycles
(an item cannot be moved beneath its own descendant) and self-parenting.

### Status lifecycle

`BACKLOG · TODO · IN_PROGRESS · IN_REVIEW · IN_QA · DONE · CANCELLED`
(grouped into `backlog / todo / started / completed / cancelled` categories for future boards).

## API reference

All routes are `/api`-prefixed and require authentication.

### Work items — `/api/work-items`

| Method & path         | Permission        | Description                                                              |
| --------------------- | ----------------- | ------------------------------------------------------------------------ |
| `GET /`               | `workitem:read`   | Filter by type/status/priority/assignee/parent/label/search + pagination |
| `POST /`              | `workitem:create` | Create (validates parent type)                                           |
| `GET /:id`            | `workitem:read`   | Detail incl. parent, children, labels, counts                            |
| `PATCH /:id`          | `workitem:update` | Partial update; records a timeline entry per changed field               |
| `DELETE /:id`         | `workitem:delete` | Delete (blocked while it has children)                                   |
| `GET /:id/comments`   | `workitem:read`   | List comments                                                            |
| `POST /:id/comments`  | `comment:create`  | Add a comment                                                            |
| `GET /:id/activities` | `workitem:read`   | Activity timeline                                                        |

### Comments — `/api/comments`

| Method & path | Permission       | Description                                     |
| ------------- | ---------------- | ----------------------------------------------- |
| `PATCH /:id`  | `comment:create` | Edit (author only, unless `comment:moderate`)   |
| `DELETE /:id` | `comment:create` | Delete (author only, unless `comment:moderate`) |

### Labels — `/api/labels`

| Method & path | Permission     | Description    |
| ------------- | -------------- | -------------- |
| `GET /`       | `label:read`   | List labels    |
| `POST /`      | `label:manage` | Create a label |
| `PATCH /:id`  | `label:manage` | Update a label |
| `DELETE /:id` | `label:manage` | Delete a label |

## Activity timeline

Every meaningful change writes a `WorkItemActivity` (`CREATED` or `FIELD_CHANGED` with a
`field` and `{ from, to }` payload). The web detail page merges these with comments into one
chronological feed. Coarse `workitem.*` / `comment.*` / `label.*` entries are also written to
the Phase 1 **audit log** for compliance.

## Permission additions

`workitem:read|create|update|delete`, `comment:create`, `comment:moderate`,
`label:read`, `label:manage` — mapped to roles in
[`packages/shared/src/rbac/permissions.ts`](../packages/shared/src/rbac/permissions.ts).
Viewers read; Developers/BAs create and update; Managers/Admins moderate and manage labels.

## Web screens

- **Work** — filterable list (type/status/priority/search) with create dialog.
- **Work item detail** — inline title/description editing, status/priority/assignee/parent/
  estimate/date controls, a labels editor, child-item list with quick-add, and the merged
  comment + activity timeline.
- **Labels** — admin CRUD for the label catalogue.
