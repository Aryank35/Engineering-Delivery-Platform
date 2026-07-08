import { Body, Controller, Get, HttpCode, Patch, Post, Req, Res } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { CookieOptions, Request, Response } from 'express';
import {
  changePasswordSchema,
  loginSchema,
  refreshSchema,
  registerSchema,
  updateProfileSchema,
  type AuthUser,
  type ChangePasswordInput,
  type LoginInput,
  type RefreshInput,
  type RegisterInput,
  type UpdateProfileInput,
} from '@eop/shared';
import { AppConfigService } from '../config/app-config.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { zodPipe } from '../common/pipes/zod-validation.pipe';
import { getClientContext } from '../common/utils/request-context';
import { AuthService } from './auth.service';
import { REFRESH_COOKIE } from './auth.constants';
import type { IssuedRefreshToken } from './token.service';

const AUTH_THROTTLE = { default: { limit: 10, ttl: 60_000 } };

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: AppConfigService,
  ) {}

  @Public()
  @Throttle(AUTH_THROTTLE)
  @Post('register')
  async register(
    @Body(zodPipe(registerSchema)) body: RegisterInput,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { result, refreshToken } = await this.auth.register(body, getClientContext(req));
    this.setRefreshCookie(res, refreshToken);
    return result;
  }

  @Public()
  @Throttle(AUTH_THROTTLE)
  @HttpCode(200)
  @Post('login')
  async login(
    @Body(zodPipe(loginSchema)) body: LoginInput,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { result, refreshToken } = await this.auth.login(body, getClientContext(req));
    this.setRefreshCookie(res, refreshToken);
    return result;
  }

  @Public()
  @Throttle(AUTH_THROTTLE)
  @HttpCode(200)
  @Post('refresh')
  async refresh(
    @Body(zodPipe(refreshSchema)) body: RefreshInput,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const token = req.signedCookies?.[REFRESH_COOKIE] ?? body.refreshToken;
    const { tokens, refreshToken } = await this.auth.refresh(token, getClientContext(req));
    this.setRefreshCookie(res, refreshToken);
    return tokens;
  }

  @HttpCode(200)
  @Post('logout')
  async logout(
    @CurrentUser() user: AuthUser,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const token = req.signedCookies?.[REFRESH_COOKIE];
    await this.auth.logout(token, user, getClientContext(req));
    this.clearRefreshCookie(res);
    return { success: true };
  }

  @Get('me')
  me(@CurrentUser('id') userId: string) {
    return this.auth.getProfile(userId);
  }

  @Patch('me')
  updateMe(
    @CurrentUser() user: AuthUser,
    @Body(zodPipe(updateProfileSchema)) body: UpdateProfileInput,
    @Req() req: Request,
  ) {
    return this.auth.updateProfile(user.id, body, user, getClientContext(req));
  }

  @HttpCode(200)
  @Post('change-password')
  async changePassword(
    @CurrentUser() user: AuthUser,
    @Body(zodPipe(changePasswordSchema)) body: ChangePasswordInput,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { result, refreshToken } = await this.auth.changePassword(
      user.id,
      body,
      user,
      getClientContext(req),
    );
    this.setRefreshCookie(res, refreshToken);
    return result;
  }

  // --- cookie helpers ---------------------------------------------------------

  private cookieOptions(expires?: Date): CookieOptions {
    return {
      httpOnly: true,
      secure: this.config.isProd,
      sameSite: 'lax',
      signed: true,
      path: `/${this.config.globalPrefix}/auth`,
      ...(expires ? { expires } : {}),
    };
  }

  private setRefreshCookie(res: Response, token: IssuedRefreshToken): void {
    res.cookie(REFRESH_COOKIE, token.token, this.cookieOptions(token.expiresAt));
  }

  private clearRefreshCookie(res: Response): void {
    res.clearCookie(REFRESH_COOKIE, this.cookieOptions());
  }
}
