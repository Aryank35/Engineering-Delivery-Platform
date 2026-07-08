import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@eop/database';
import type { ApiErrorBody } from '@eop/shared';
import type { Request, Response } from 'express';

interface HttpExceptionShape {
  message?: string | string[];
  error?: string;
  details?: Record<string, string[]>;
}

const STATUS_NAMES: Record<number, string> = {
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  409: 'Conflict',
  422: 'Unprocessable Entity',
  429: 'Too Many Requests',
  500: 'Internal Server Error',
};

const statusName = (status: number): string => STATUS_NAMES[status] ?? 'Error';

/** Translates any thrown value into the platform's consistent {@link ApiErrorBody}. */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request & { id?: string }>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let error = statusName(status);
    let message = 'An unexpected error occurred';
    let details: Record<string, string[]> | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      error = statusName(status);
      const payload = exception.getResponse();
      if (typeof payload === 'string') {
        message = payload;
      } else {
        const shape = payload as HttpExceptionShape;
        message = Array.isArray(shape.message)
          ? shape.message.join(', ')
          : (shape.message ?? message);
        error = shape.error ?? error;
        details = shape.details;
      }
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      ({ status, message } = this.mapPrismaError(exception));
      error = statusName(status);
    } else if (exception instanceof Prisma.PrismaClientValidationError) {
      status = HttpStatus.BAD_REQUEST;
      error = statusName(status);
      message = 'Invalid database query';
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `${request.method} ${request.url} -> ${status}: ${message}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    const body: ApiErrorBody = {
      statusCode: status,
      error,
      message,
      details,
      path: request.url,
      timestamp: new Date().toISOString(),
      requestId: request.id,
    };

    response.status(status).json(body);
  }

  private mapPrismaError(exception: Prisma.PrismaClientKnownRequestError): {
    status: number;
    message: string;
  } {
    switch (exception.code) {
      case 'P2002': {
        const target = (exception.meta?.target as string[] | undefined)?.join(', ');
        return {
          status: HttpStatus.CONFLICT,
          message: target
            ? `A record with this ${target} already exists`
            : 'A record with these values already exists',
        };
      }
      case 'P2025':
        return { status: HttpStatus.NOT_FOUND, message: 'The requested record was not found' };
      case 'P2003':
        return { status: HttpStatus.BAD_REQUEST, message: 'Related record constraint failed' };
      default:
        return { status: HttpStatus.INTERNAL_SERVER_ERROR, message: 'Database error' };
    }
  }
}
