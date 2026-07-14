# Phase 6 — GitHub integration

The third Phase 6 slice: ingest GitHub webhooks to link branches, commits and pull requests to
work items and move them across the board automatically. This delivers the **Branch tracking**
paired with GitHub and auto-populates the domain from earlier slices.

## Data model

- `GitHubBranch` (`repo`, `name` unique per repo, `headSha`, `workItemId?`, `deletedAt?`).
- `GitHubPullRequest` (`repo` + `number` unique, `title`, `url`, `state`, `merged`, `headBranch`,
  `baseBranch`, `authorLogin`, `workItemId?`, `mergedAt?`).
- `GitHubCommit` (`repo` + `sha` unique, `message`, `url`, `authorName`, `workItemId?`,
  `committedAt?`).

Each links to a work item via a nullable `workItemId` (`SetNull` on delete). Work items expose
`githubBranches` / `githubPullRequests` / `githubCommits` relations.

## Webhook ingestion

`POST /api/integrations/github/webhook` — **public** (no JWT) and **throttler-exempt**, secured
by GitHub's `X-Hub-Signature-256` HMAC. The API is created with `rawBody: true` so the signature
is verified against the exact bytes with a constant-time compare. Requests are rejected unless
`GITHUB_WEBHOOK_SECRET` is set and the signature matches.

Handled events: `push`, `pull_request`, `create`, `delete`.

## Linking & automation

Work-item keys (`EOP-<n>`) are extracted from branch names, commit messages, and PR
titles/bodies (`extractWorkItemNumbers`, in `@eop/shared` so it is unit-tested). Matched entities
are stored and linked, and status is auto-advanced via `resolveGitHubAutoTransition` — a pure
function that only ever moves an item **forward** and never touches a cancelled item:

| Trigger                         | From                          | → To          |
| ------------------------------- | ----------------------------- | ------------- |
| branch created / commit pushed  | BACKLOG, TODO                 | IN_PROGRESS   |
| PR opened / reopened            | BACKLOG, TODO, IN_PROGRESS    | IN_REVIEW     |
| PR merged                       | anything except DONE/CANCELLED| DONE          |

Automated changes are recorded as a system-actor `WorkItemActivity` (`data.via = "github"`) plus
an audit entry (`workitem.status_automated`) and emit a board-changed realtime signal. Automation
failures are caught per-item so one bad item can't fail the whole delivery.

## API reference

| Method & path                                  | Auth                 | Description                       |
| ---------------------------------------------- | -------------------- | --------------------------------- |
| `POST /api/integrations/github/webhook`        | HMAC signature       | Ingest a GitHub webhook           |
| `GET /api/integrations/github/status`          | `integration:manage` | Config state + webhook path       |
| `GET /api/integrations/github/work-items/:id`  | `workitem:read`      | Branches/PRs/commits for an item  |

`integration:manage` is granted to Admin + Engineering Manager.

## Web screens

- **Work-item detail → Development panel** — linked pull requests (with open/merged/closed
  badges), branches (struck through when deleted) and recent commits, each linking out to GitHub.
- **Integrations** (`/integrations`) — connection status, the webhook URL, handled events and
  setup steps.

## Tests

- `extractWorkItemNumbers` (dedupe, case-insensitive, boundary-safe) and
  `resolveGitHubAutoTransition` (forward-only matrix).
- `verifySignature` accepts a valid HMAC and rejects tampering / missing signatures.
- `push` links a branch and moves TODO → IN_PROGRESS; a merged PR moves an item to DONE with
  `completedAt`; a closed-unmerged PR does nothing.
- Web: `prBadge` state mapping.
