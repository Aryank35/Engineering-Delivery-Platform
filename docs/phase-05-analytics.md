# Phase 5 — Dashboards & analytics

Delivery insights computed from the work-item, sprint, time and label data already in the
system — no new domain tables, just aggregation.

## What's computed

### Overview (Manager)

- **Status distribution** — item counts per status.
- **Throughput** — items completed per week (last 8 weeks), bucketed by `completedAt`.
- **Cycle time** — average & median days from first `IN_PROGRESS` (read from
  `WorkItemActivity` status history, falling back to `createdAt`) to `completedAt`, over items
  completed in the last 60 days, with a per-type breakdown.
- **Workload** — open items and points per assignee.
- **Time logged** — seconds per user this week.

### Velocity

Committed vs completed story points for the last 8 sprints (chronological).

### QA & defects

Items `IN_QA` / `IN_REVIEW`; "defects" = items labelled **Bug** — open vs resolved counts,
opened-vs-resolved per week (last 8 weeks), and a by-status breakdown.

### Sprint burndown

`GET /sprints/:id/burndown` returns, per day of the sprint, the **ideal** remaining points
(linear) and the **actual** remaining (total − points completed on/before that day, from
`completedAt`); future days have `remaining: null` so the line stops at today.

## API reference

All routes require authentication.

| Method & path                   | Permission       | Description                 |
| ------------------------------- | ---------------- | --------------------------- |
| `GET /api/analytics/overview`   | `analytics:read` | Manager overview metrics    |
| `GET /api/analytics/velocity`   | `analytics:read` | Velocity for recent sprints |
| `GET /api/analytics/qa`         | `analytics:read` | QA & defect metrics         |
| `GET /api/sprints/:id/burndown` | `sprint:read`    | Sprint burndown series      |

`analytics:read` is granted to Admin, Engineering Manager, Business Analyst and QA Engineer.

## Charting

Charts follow the **dataviz** method: the categorical palette was run through the palette
validator (colorblind separation, contrast, lightness band) for both light and dark surfaces.
Series colors, gridlines and axes are **theme-aware CSS custom properties** (`--chart-*`) that
swap with the app theme; text uses ink tokens (never the series color); every multi-series
chart has a legend and a hover tooltip; charts are single-axis. Built with Recharts, split
into its own bundle chunk.

## Web screens

- **Insights** (`/insights`) — Overview tab (throughput, velocity, status/workload/time bars,
  cycle-time stats) and a QA & Defects tab (defect trend line + by-status).
- **Sprint board** — a burndown chart (ideal vs remaining) alongside the capacity panel.
