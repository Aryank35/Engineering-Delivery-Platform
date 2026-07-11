# Phase 4 — Time tracking & Personal dashboard

Developers track time with a stopwatch or manual entries; a personal dashboard rolls it
up into "my day / my week / my work".

## Data model

| Model / field              | Purpose                                                        |
| -------------------------- | -------------------------------------------------------------- |
| `TimeLog`                  | A finalized chunk of time on a work item (`TIMER` or `MANUAL`) |
| `ActiveTimer`              | A user's single in-progress stopwatch (unique per user)        |
| `TimeLogSource`            | `TIMER · MANUAL`                                               |
| `TimerStatus`              | `RUNNING · PAUSED`                                             |
| `User.capacityHoursPerDay` | Daily capacity (from Phase 3) used in sprint/dashboard views   |

## Timer model

Each user has at most one `ActiveTimer`. Elapsed time =
`accumulatedSeconds + (RUNNING ? now − lastStartedAt : 0)`
(`computeElapsedSeconds` in `@eop/shared`, so the server and the live-ticking client agree).

- **start** — commits any running timer first, then creates a new `RUNNING` timer.
- **pause** — folds live time into `accumulatedSeconds`, clears `lastStartedAt`.
- **resume** — sets `lastStartedAt = now`.
- **stop** — writes a `TimeLog` (source `TIMER`) for the total and deletes the timer.

Manual logs are entered in minutes (converted to seconds) against a `spentOn` date.

## API reference

All routes are `/api`-prefixed and require authentication.

### Time — `/api/time`

| Method & path               | Permission  | Description                                   |
| --------------------------- | ----------- | --------------------------------------------- |
| `GET /timer`                | `time:read` | Current user's active timer (or null)         |
| `POST /timer/start`         | `time:log`  | Start a timer on a work item                  |
| `POST /timer/pause`         | `time:log`  | Pause the running timer                       |
| `POST /timer/resume`        | `time:log`  | Resume the paused timer                       |
| `POST /timer/stop`          | `time:log`  | Stop → create a time log                      |
| `GET /summary`              | `time:read` | Personal roll-up (today/week/assigned/recent) |
| `GET /logs`                 | `time:read` | List logs (filter by item/user/date, `mine`)  |
| `POST /logs`                | `time:log`  | Create a manual log (minutes)                 |
| `PATCH /logs/:id`           | `time:log`  | Edit own log                                  |
| `DELETE /logs/:id`          | `time:log`  | Delete own log                                |
| `GET /work-items/:id/total` | `time:read` | Total seconds logged on a work item           |

## Personal summary

`GET /time/summary` returns the active timer, `todaySeconds`, `weekSeconds`, a `weekByDay`
breakdown (Mon–Sun), the count of open assigned items (`assignedByStatus` + `assignedOpenCount`),
and the most recent logs.

## Permissions

Adds `time:read` (all roles, so time is visible on items) and `time:log` (Admin, Engineering
Manager, Business Analyst, Developer, QA — not Viewer).

## Web screens

- **Dashboard** (home) — today/week/open-work/active-timer tiles, a week bar chart, my work by
  status, and recent time entries.
- **Top bar** — a live running-timer widget (elapsed clock + stop) visible on every page.
- **Work item detail** — a Time panel: start/pause/resume/stop for that item, total logged,
  a manual-log form, and the item's log history (delete your own).
