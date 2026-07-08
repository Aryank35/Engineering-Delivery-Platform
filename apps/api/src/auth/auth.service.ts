import { Injectable, UnauthorizedException } from '@nestjs/common';
import {
  permissionsForRoles,
  type AuthTokens,
  type AuthUser,
  type AuthenticatedUser,
  type ChangePasswordInput,
  type LoginInput,
  type LoginResult,
  type PublicUser,
  type RegisterInput,
  type UpdateProfileInput,
} from '@eop/shared';
import { AppConfigService } from '../config/app-config.service';
import { HashingService } from '../security/hashing.service';
import { AuditService } from '../audit/audit.service';
import { UsersService } from '../users/users.service';
import { toPublicUser } from '../users/users.mapper';
import type { ClientContext } from '../common/utils/request-context';
import { TokenService, type IssuedRefreshToken } from './token.service';

export interface SessionBundle {
  result: LoginResult;
  refreshToken: IssuedRefreshToken;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly tokens: TokenService,
    private readonly hashing: HashingService,
    private readonly audit: AuditService,
    private readonly config: AppConfigService,
  ) {}

  async register(input: RegisterInput, ctx: ClientContext): Promise<SessionBundle> {
    const user = await this.users.register(input, ctx);
    return this.createSession(user, ctx);
  }

  async login(input: LoginInput, ctx: ClientContext): Promise<SessionBundle> {
    const invalid = new UnauthorizedException('Invalid email or password');
    const record = await this.users.findByEmailWithSecret(input.email);
    if (!record) {
      // Verify against a real (memoised) hash to keep login timing constant
      // whether or not the email exists.
      await this.hashing.verify(await this.getDummyHash(), input.password);
      throw invalid;
    }

    const passwordOk = await this.hashing.verify(record.passwordHash, input.password);
    if (!passwordOk) {
      throw invalid;
    }
    if (!record.isActive) {
      throw new UnauthorizedException('Your account has been deactivated');
    }

    await this.users.recordLogin(record.id);
    await this.audit.record({
      action: 'auth.login',
      entityType: 'User',
      entityId: record.id,
      actor: { id: record.id, email: record.email },
      ...ctx,
    });

    return this.createSession(toPublicUser(record), ctx);
  }

  async refresh(
    token: string | undefined,
    ctx: ClientContext,
  ): Promise<{ tokens: AuthTokens; refreshToken: IssuedRefreshToken }> {
    if (!token) {
      throw new UnauthorizedException('Missing refresh token');
    }
    const { userId, refreshToken } = await this.tokens.rotateRefreshToken(token, ctx);
    const user = await this.users.findAuthUserById(userId);
    if (!user) {
      throw new UnauthorizedException('Account is inactive or no longer exists');
    }
    const accessToken = await this.tokens.signAccessToken(user.id, user.email);
    return { tokens: this.accessTokens(accessToken), refreshToken };
  }

  async logout(token: string | undefined, actor: AuthUser, ctx: ClientContext): Promise<void> {
    if (token) {
      await this.tokens.revokeRefreshToken(token);
    }
    await this.audit.record({
      action: 'auth.logout',
      entityType: 'User',
      entityId: actor.id,
      actor,
      ...ctx,
    });
  }

  async changePassword(
    userId: string,
    input: ChangePasswordInput,
    actor: AuthUser,
    ctx: ClientContext,
  ): Promise<SessionBundle> {
    const record = await this.users.findByIdWithSecret(userId);
    if (!record) {
      throw new UnauthorizedException('Account no longer exists');
    }
    const currentOk = await this.hashing.verify(record.passwordHash, input.currentPassword);
    if (!currentOk) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    await this.users.setPassword(userId, await this.hashing.hash(input.newPassword));
    // Invalidate every existing session, then start a fresh one for this client.
    await this.tokens.revokeAllForUser(userId);
    await this.audit.record({
      action: 'auth.password_changed',
      entityType: 'User',
      entityId: userId,
      actor,
      ...ctx,
    });

    return this.createSession(toPublicUser(record), ctx);
  }

  async getProfile(userId: string): Promise<AuthenticatedUser> {
    const user = await this.users.findById(userId);
    return this.toAuthenticated(user);
  }

  async updateProfile(
    userId: string,
    input: UpdateProfileInput,
    actor: AuthUser,
    ctx: ClientContext,
  ): Promise<AuthenticatedUser> {
    const user = await this.users.updateProfile(userId, input, actor, ctx);
    return this.toAuthenticated(user);
  }

  // --- helpers ----------------------------------------------------------------

  private async createSession(user: PublicUser, ctx: ClientContext): Promise<SessionBundle> {
    const accessToken = await this.tokens.signAccessToken(user.id, user.email);
    const refreshToken = await this.tokens.issueRefreshToken(user.id, ctx);
    return {
      result: { ...this.accessTokens(accessToken), user: this.toAuthenticated(user) },
      refreshToken,
    };
  }

  private accessTokens(accessToken: string): AuthTokens {
    return {
      accessToken,
      expiresIn: this.config.jwt.accessTtlSec,
      tokenType: 'Bearer',
    };
  }

  private toAuthenticated(user: PublicUser): AuthenticatedUser {
    return { ...user, permissions: permissionsForRoles(user.roles) };
  }

  private dummyHash?: string;

  /** Lazily computes a valid hash once, to equalise timing on unknown emails. */
  private async getDummyHash(): Promise<string> {
    if (!this.dummyHash) {
      this.dummyHash = await this.hashing.hash('unknown-user-timing-placeholder');
    }
    return this.dummyHash;
  }
}
