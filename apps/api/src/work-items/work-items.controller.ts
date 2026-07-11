import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import {
  createCommentSchema,
  createWorkItemSchema,
  listWorkItemsQuerySchema,
  moveWorkItemSchema,
  updateWorkItemSchema,
  PERMISSIONS,
  type AuthUser,
  type CreateCommentInput,
  type CreateWorkItemInput,
  type ListWorkItemsQuery,
  type MoveWorkItemInput,
  type UpdateWorkItemInput,
} from '@eop/shared';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { zodPipe } from '../common/pipes/zod-validation.pipe';
import { getClientContext } from '../common/utils/request-context';
import { WorkItemsService } from './work-items.service';

@Controller('work-items')
export class WorkItemsController {
  constructor(private readonly service: WorkItemsService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.WORKITEM_READ)
  list(@Query(zodPipe(listWorkItemsQuerySchema)) query: ListWorkItemsQuery) {
    return this.service.list(query);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.WORKITEM_CREATE)
  create(
    @Body(zodPipe(createWorkItemSchema)) body: CreateWorkItemInput,
    @CurrentUser() actor: AuthUser,
    @Req() req: Request,
  ) {
    return this.service.create(body, actor, getClientContext(req));
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.WORKITEM_READ)
  findOne(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.WORKITEM_UPDATE)
  update(
    @Param('id') id: string,
    @Body(zodPipe(updateWorkItemSchema)) body: UpdateWorkItemInput,
    @CurrentUser() actor: AuthUser,
    @Req() req: Request,
  ) {
    return this.service.update(id, body, actor, getClientContext(req));
  }

  @Delete(':id')
  @RequirePermissions(PERMISSIONS.WORKITEM_DELETE)
  remove(@Param('id') id: string, @CurrentUser() actor: AuthUser, @Req() req: Request) {
    return this.service.remove(id, actor, getClientContext(req));
  }

  @Post(':id/move')
  @RequirePermissions(PERMISSIONS.WORKITEM_UPDATE)
  move(
    @Param('id') id: string,
    @Body(zodPipe(moveWorkItemSchema)) body: MoveWorkItemInput,
    @CurrentUser() actor: AuthUser,
    @Req() req: Request,
  ) {
    return this.service.moveWorkItem(id, body, actor, getClientContext(req));
  }

  @Get(':id/comments')
  @RequirePermissions(PERMISSIONS.WORKITEM_READ)
  listComments(@Param('id') id: string) {
    return this.service.listComments(id);
  }

  @Post(':id/comments')
  @RequirePermissions(PERMISSIONS.COMMENT_CREATE)
  addComment(
    @Param('id') id: string,
    @Body(zodPipe(createCommentSchema)) body: CreateCommentInput,
    @CurrentUser() actor: AuthUser,
    @Req() req: Request,
  ) {
    return this.service.addComment(id, body, actor, getClientContext(req));
  }

  @Get(':id/activities')
  @RequirePermissions(PERMISSIONS.WORKITEM_READ)
  listActivities(@Param('id') id: string) {
    return this.service.listActivities(id);
  }
}
