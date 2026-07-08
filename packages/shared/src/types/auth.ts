import type { RoleKey } from '../rbac/roles';
import type { PermissionKey } from '../rbac/permissions';

/** The authenticated principal attached to each request by the JWT strategy. */
export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: RoleKey[];
  permissions: PermissionKey[];
}

/** Public representation of a user (never includes the password hash). */
export interface PublicUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  avatarUrl: string | null;
  timezone: string | null;
  isActive: boolean;
  roles: RoleKey[];
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** A user plus their effective permissions — what the web client stores to gate UI. */
export interface AuthenticatedUser extends PublicUser {
  permissions: PermissionKey[];
}

export interface AuthTokens {
  accessToken: string;
  /** Access token lifetime in seconds. */
  expiresIn: number;
  tokenType: 'Bearer';
}

export interface LoginResult extends AuthTokens {
  user: AuthenticatedUser;
}

export interface JwtAccessPayload {
  sub: string;
  email: string;
  type: 'access';
  iat?: number;
  exp?: number;
}

export interface JwtRefreshPayload {
  sub: string;
  /** Refresh-token family id, for rotation + reuse detection. */
  family: string;
  /** Unique id of this specific refresh token. */
  jti: string;
  type: 'refresh';
  iat?: number;
  exp?: number;
}
