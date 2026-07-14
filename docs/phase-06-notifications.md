# Phase 6 — In-app & real-time notifications

The first slice of Phase 6: a personal notification feed that domain events write to and that
is pushed to the recipient live over the existing Socket.IO layer. Release management,
Branch/Environment tracking, GitHub integration and BullMQ automations remain in Phase 6 and
build on top of this delivery channel.

## Data model

`Notification` — one row per recipient (`userId`), carrying a `type`, `title`, optional
`body`, an optional client `link` (e.g. `/work/<id>`) plus a typed `entityType`/`entityId`
reference for grouping, an optional `actorId` (who caused it), free-form `metadata`, and a
nullable `readAt` (null = unread). Indexed on `(userId, readAt)` for the unread badge and
`(userId, createdAt)` for the feed. Cascades on recipient delete; actor set-null on delete.

`NotificationType`: `WORK_ITEM_ASSIGNED`, `COMMENT_ADDED`, `MENTION`, `SPRINT_STARTED`,
`SPRINT_COMPLETED`, `SYSTEM`. (`MENTION` and `SYSTEM` are reserved for later sub-phases.)

## What raises a notification

| Event                                    | Recipients                              | Type                  |
| ---------------------------------------- | --------------------------------------- | --------------------- |
| Work item created/updated with assignee  | the new assignee                        | `WORK_ITEM_ASSIGNED`  |
| Comment added to a work item             | the item's assignee **and** reporter    | `COMMENT_ADDED`       |
| Sprint started                           | assignees of items in the sprint        | `SPRINT_STARTED`      |
| Sprint completed                         | assignees of items in the sprint        | `SPRINT_COMPLETED`    |

The actor is **never** notified about their own action, recipient lists are de-duplicated, and
emission failures are swallowed and logged so a notification can never break the operation that
triggered it (`NotificationsService.emit` / `emitToMany`).

## Real-time delivery

Every authenticated socket auto-joins a personal room `user:<id>` on connect. On create the
server pushes a lightweight `notification:new` payload (`{id, type, title, body, link}`) to that
room; the client raises a toast and refetches the list/unread-count for the source of truth —
consistent with the "signal + refetch, no wire reconciliation" pattern used by the board.
Marking read emits `notifications:read` so a user's other tabs re-sync their badge.

## API reference

All routes require authentication and `notification:read`, and are scoped to the caller — you
can only ever see or mutate your own notifications.

| Method & path                       | Description                                   |
| ----------------------------------- | --------------------------------------------- |
| `GET /api/notifications`            | Paginated feed; `?unreadOnly=true` to filter  |
| `GET /api/notifications/unread-count` | `{ count }` for the bell badge              |
| `POST /api/notifications/mark-read` | Mark `{ ids: [...] }` read → returns `{ count }` |
| `POST /api/notifications/read-all`  | Mark everything read → returns `{ count: 0 }` |

`notification:read` is granted to **every** role (it is inherently self-scoped).

## Web screens

- **Topbar bell** — an unread badge (capped at `9+`), a dropdown of the 8 most recent
  notifications, per-item navigate-and-mark-read, "Mark all read", and a link to the full page.
  Mounts the realtime subscription for the whole app.
- **Notifications** (`/notifications`) — the full feed with All / Unread tabs, pagination, and
  bulk mark-all-read.

## Tests

- API: `emit` suppresses self-notifications and swallows persistence errors; `emitToMany`
  de-dupes and excludes the actor; `markRead` is user-scoped and signals other sessions;
  `addComment` notifies assignee + reporter.
- Web: `formatRelativeTime` buckets; `formatBadgeCount` capping; `NotificationItem` render
  (link target + unread marker).
