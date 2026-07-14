import {
  Body,
  Controller,
  Headers,
  HttpCode,
  Post,
  Req,
  UnauthorizedException,
  type RawBodyRequest,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import type { Request } from 'express';
import { Public } from '../common/decorators/public.decorator';
import { GithubService } from './github.service';

// Unauthenticated (secured by HMAC signature) and exempt from the rate limiter,
// since busy repositories can burst well past the default per-user throttle.
@Public()
@SkipThrottle()
@Controller('integrations/github')
export class GithubWebhookController {
  constructor(private readonly service: GithubService) {}

  @Post('webhook')
  @HttpCode(200)
  webhook(
    @Req() req: RawBodyRequest<Request>,
    @Body() payload: unknown,
    @Headers('x-github-event') event: string | undefined,
    @Headers('x-hub-signature-256') signature: string | undefined,
  ) {
    const raw = req.rawBody;
    if (!raw || !this.service.verifySignature(raw, signature)) {
      throw new UnauthorizedException('Invalid or missing webhook signature');
    }
    return this.service.handleWebhook(event ?? '', payload ?? {});
  }
}
