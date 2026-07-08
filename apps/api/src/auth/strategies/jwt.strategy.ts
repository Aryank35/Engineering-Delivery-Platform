import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { AuthUser, JwtAccessPayload } from '@eop/shared';
import { AppConfigService } from '../../config/app-config.service';
import { UsersService } from '../../users/users.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: AppConfigService,
    private readonly usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.jwt.accessSecret,
    });
  }

  /**
   * Runs on every authenticated request. Reloading the user from the DB means
   * role changes and deactivations take effect immediately (no stale claims).
   */
  async validate(payload: JwtAccessPayload): Promise<AuthUser> {
    if (payload.type !== 'access') {
      throw new UnauthorizedException('Invalid token type');
    }
    const user = await this.usersService.findAuthUserById(payload.sub);
    if (!user) {
      throw new UnauthorizedException('Account is inactive or no longer exists');
    }
    return user;
  }
}
