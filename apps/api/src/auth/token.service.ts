import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'node:crypto';
import type { JwtAccessPayload, JwtRefreshPayload } from '@eop/shared';
import { AppConfigService } from '../config/app-config.service';
import { PrismaService } from '../prisma/prisma.service';
import { HashingService } from '../security/hashing.service';
import type { ClientContext } from '../common/utils/request-context';

export interface IssuedRefreshToken {
  token: string;
  expiresAt: Date;
}

@Injectable()
export class TokenService {
  private readonly logger = new Logger(TokenService.name);

  constructor(
    private readonly jwt: JwtService,
    private readonly config: AppConfigService,
    private readonly prisma: PrismaService,
    private readonly hashing: HashingService,
  ) {}

  signAccessToken(userId: string, email: string): Promise<string> {
    const payload: JwtAccessPayload = { sub: userId, email, type: 'access' };
    return this.jwt.signAsync(payload, {
      secret: this.config.jwt.accessSecret,
      expiresIn: this.config.jwt.accessTtlSec,
    });
  }

  /** Issues a brand new refresh-token family for a fresh login. */
  issueRefreshToken(userId: string, ctx: ClientContext): Promise<IssuedRefreshToken> {
    return this.createRefreshToken(userId, randomUUID(), ctx);
  }

  /**
   * Verifies and rotates a refresh token. Detects reuse of an already-revoked
   * token by revoking the entire family, then throws.
   */
  async rotateRefreshToken(
    token: string,
    ctx: ClientContext,
  ): Promise<{ userId: string; refreshToken: IssuedRefreshToken }> {
    const payload = await this.verify(token);
    const record = await this.prisma.refreshToken.findUnique({ where: { id: payload.jti } });

    if (!record || record.tokenHash !== this.hashing.sha256(token)) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (record.revokedAt) {
      // Reuse of a revoked token => probable theft. Burn the whole family.
      this.logger.warn(`Refresh token reuse detected for family ${record.family}`);
      await this.revokeFamily(record.family);
      throw new UnauthorizedException('Refresh token has been revoked');
    }

    if (record.expiresAt.getTime() <= Date.now()) {
      throw new UnauthorizedException('Refresh token has expired');
    }

    const rotated = await this.createRefreshToken(record.userId, record.family, ctx);
    await this.prisma.refreshToken.update({
      where: { id: record.id },
      data: {
        revokedAt: new Date(),
        replacedByTokenId: (await this.verify(rotated.token)).jti,
      },
    });

    return { userId: record.userId, refreshToken: rotated };
  }

  /** Revokes the single presented token (logout of one session). */
  async revokeRefreshToken(token: string): Promise<void> {
    const payload = await this.safeDecode(token);
    if (!payload) {
      return;
    }
    await this.prisma.refreshToken.updateMany({
      where: { id: payload.jti, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  // --- internals --------------------------------------------------------------

  private async createRefreshToken(
    userId: string,
    family: string,
    ctx: ClientContext,
  ): Promise<IssuedRefreshToken> {
    const jti = randomUUID();
    const expiresAt = new Date(Date.now() + this.config.jwt.refreshTtlSec * 1000);
    const payload: JwtRefreshPayload = { sub: userId, family, jti, type: 'refresh' };
    const token = await this.jwt.signAsync(payload, {
      secret: this.config.jwt.refreshSecret,
      expiresIn: this.config.jwt.refreshTtlSec,
    });

    await this.prisma.refreshToken.create({
      data: {
        id: jti,
        userId,
        family,
        tokenHash: this.hashing.sha256(token),
        expiresAt,
        ip: ctx.ip,
        userAgent: ctx.userAgent,
      },
    });

    return { token, expiresAt };
  }

  private async verify(token: string): Promise<JwtRefreshPayload> {
    try {
      const payload = await this.jwt.verifyAsync<JwtRefreshPayload>(token, {
        secret: this.config.jwt.refreshSecret,
      });
      if (payload.type !== 'refresh') {
        throw new Error('wrong token type');
      }
      return payload;
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  private async safeDecode(token: string): Promise<JwtRefreshPayload | null> {
    try {
      return await this.verify(token);
    } catch {
      return null;
    }
  }

  private async revokeFamily(family: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { family, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}
