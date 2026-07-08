# Phase 1 — Authentication & RBAC

The security foundation every later phase builds on: identity, sessions, role-based
authorization and a complete audit trail.

## Data model

| Model            | Purpose                                                            |
| ---------------- | ------------------------------------------------------------------ |
| `User`           | Account, credentials (Argon2id hash), profile, active flag         |
| `Role`           | One of six system roles, keyed by `RoleKey`                        |
| `Permission`     | Fine-grained `resource:action` capability                          |
| `UserRole`       | User ↔ Role assignment (with who assigned it)                      |
| `RolePermission` | Role ↔ Permission mapping                                          |
| `RefreshToken`   | Rotating refresh tokens (hashed, family-grouped, reuse-detectable) |
| `AuditLog`       | Immutable record of every meaningful mutation                      |

## Roles & permissions

Roles are named bundles of permissions (`ADMIN` implicitly holds all):

| Permission          | Admin | Eng. Manager | Business Analyst | Developer | QA  | Viewer |
| ------------------- | :---: | :----------: | :--------------: | :-------: | :-: | :----: |
| `user:read`         |   ✓   |      ✓       |        ✓         |     ✓     |  ✓  |   ✓    |
| `user:create`       |   ✓   |              |                  |           |     |        |
| `user:update`       |   ✓   |              |                  |           |     |        |
| `user:delete`       |   ✓   |              |                  |           |     |        |
| `user:assign_roles` |   ✓   |              |                  |           |     |        |
| `role:read`         |   ✓   |      ✓       |        ✓         |     ✓     |  ✓  |        |
| `audit:read`        |   ✓   |      ✓       |                  |           |     |        |

The mapping is the single source of truth in
[`packages/shared/src/rbac/permissions.ts`](../packages/shared/src/rbac/permissions.ts) and is
seeded into the database.

## Session & token model

1. **Login** returns an **access token** (Bearer, ~15 min, held in memory by the SPA) and sets
   a **refresh token** as an httpOnly, signed, sameSite cookie (~7 days).
2. **Refresh** rotates the token: the old one is revoked and a new one issued in the same
   `family`. Reuse of an already-revoked token revokes the entire family (theft detection).
3. The JWT strategy **reloads the user on every request**, so role changes and deactivations
   take effect immediately.

## API reference

All routes are prefixed with `/api`. Auth is required unless marked **Public**.

### Auth — `/api/auth`

| Method & path           | Access          | Description                                       |
| ----------------------- | --------------- | ------------------------------------------------- |
| `POST /register`        | Public          | Self-signup (assigns `VIEWER`), starts session    |
| `POST /login`           | Public          | Authenticate, start session                       |
| `POST /refresh`         | Public (cookie) | Rotate refresh token, return new access token     |
| `POST /logout`          | Authenticated   | Revoke current refresh token, clear cookie        |
| `GET  /me`              | Authenticated   | Current user + effective permissions              |
| `PATCH /me`             | Authenticated   | Update own name / timezone                        |
| `POST /change-password` | Authenticated   | Verify current password, rotate, re-issue session |

### Users — `/api/users`

| Method & path      | Permission          | Description                         |
| ------------------ | ------------------- | ----------------------------------- |
| `GET /`            | `user:read`         | Paginated list (search/role/status) |
| `GET /:id`         | `user:read`         | Single user                         |
| `POST /`           | `user:create`       | Create a user with roles            |
| `PATCH /:id`       | `user:update`       | Update a user                       |
| `DELETE /:id`      | `user:delete`       | Deactivate (soft) + revoke sessions |
| `PATCH /:id/roles` | `user:assign_roles` | Replace a user's roles              |

### Audit — `/api/audit-logs`

| Method & path | Permission   | Description                                         |
| ------------- | ------------ | --------------------------------------------------- |
| `GET /`       | `audit:read` | Paginated audit log (filter by action/entity/actor) |

### Health — `/api/health`

| Method & path | Access | Description                      |
| ------------- | ------ | -------------------------------- |
| `GET /`       | Public | Liveness + database connectivity |

## Validation & errors

All request bodies and queries are validated with **Zod schemas from `@eop/shared`** via a
`ZodValidationPipe`. Errors return a consistent shape:

```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "Validation failed",
  "details": { "email": ["A valid email is required"] },
  "path": "/api/auth/register",
  "timestamp": "2026-07-08T12:00:00.000Z",
  "requestId": "…"
}
```

## Security measures

- Argon2id password hashing (`@node-rs/argon2`); constant-time login on unknown emails.
- Helmet, CORS with credentials, and rate limiting (`@nestjs/throttler`; stricter on auth).
- Refresh tokens stored only as SHA-256 hashes; rotation + family reuse detection.
- Global `JwtAuthGuard` → `RolesGuard` → `PermissionsGuard`; opt out with `@Public()`.

## Web screens

Login, Register, Dashboard, Users (admin management with create + role dialogs), Audit Log,
Profile (edit details + change password) — with protected routing, permission-gated nav, and a
dark/light theme.

## Tests

- **API unit:** hashing round-trip, refresh-token rotation & reuse detection, permission guard,
  login flows.
- **API e2e** (opt-in, needs a DB): public health, unauthenticated rejection, register→me flow.
- **Web:** auth store permission/role logic, `RoleBadges`, class-name util.
