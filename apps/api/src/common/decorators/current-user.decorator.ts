import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { AuthUser } from '@eop/shared';

/**
 * Injects the authenticated `AuthUser` (or a single field of it) into a handler.
 * @example findMe(@CurrentUser() user: AuthUser)
 * @example myId(@CurrentUser('id') id: string)
 */
export const CurrentUser = createParamDecorator(
  (field: keyof AuthUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<{ user?: AuthUser }>();
    const user = request.user;
    return field && user ? user[field] : user;
  },
);
