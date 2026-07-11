import { Body, Controller, Delete, Param, Patch, Req } from '@nestjs/common';
import type { Request } from 'express';
import {
  updateCommentSchema,
  PERMISSIONS,
  type AuthUser,
  type UpdateCommentInput,
} from '@eop/shared';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { zodPipe } from '../common/pipes/zod-validation.pipe';
import { getClientContext } from '../common/utils/request-context';
import { WorkItemsService } from './work-items.service';

@Controller('comments')
export class CommentsController {
  constructor(private readonly service: WorkItemsService) {}

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.COMMENT_CREATE)
  update(
    @Param('id') id: string,
    @Body(zodPipe(updateCommentSchema)) body: UpdateCommentInput,
    @CurrentUser() actor: AuthUser,
    @Req() req: Request,
  ) {
    return this.service.updateComment(id, body, actor, getClientContext(req));
  }

  @Delete(':id')
  @RequirePermissions(PERMISSIONS.COMMENT_CREATE)
  remove(@Param('id') id: string, @CurrentUser() actor: AuthUser, @Req() req: Request) {
    return this.service.deleteComment(id, actor, getClientContext(req));
  }
}
