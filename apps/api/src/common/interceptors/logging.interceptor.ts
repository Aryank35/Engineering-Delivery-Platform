import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  Logger,
  type NestInterceptor,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { Request, Response } from 'express';
import { type Observable, tap } from 'rxjs';

/** Attaches a request id, echoes it back, and logs method/url/status/duration. */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request & { id?: string }>();
    const response = context.switchToHttp().getResponse<Response>();

    const headerId = request.headers['x-request-id'];
    const requestId = (Array.isArray(headerId) ? headerId[0] : headerId) ?? randomUUID();
    request.id = requestId;
    response.setHeader('x-request-id', requestId);

    const startedAt = Date.now();
    const { method, originalUrl } = request;

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - startedAt;
        this.logger.log(`${method} ${originalUrl} ${response.statusCode} ${duration}ms`);
      }),
    );
  }
}
