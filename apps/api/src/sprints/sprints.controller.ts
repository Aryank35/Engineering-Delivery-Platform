import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import {
  createSprintSchema,
  listSprintsQuerySchema,
  sprintItemsSchema,
  updateSprintSchema,
  PERMISSIONS,
  type AuthUser,
  type CreateSprintInput,
  type ListSprintsQuery,
  type SprintItemsInput,
  type UpdateSprintInput,
} from '@eop/shared';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { zodPipe } from '../common/pipes/zod-validation.pipe';
import { getClientContext } from '../common/utils/request-context';
import { SprintsService } from './sprints.service';

@Controller('sprints')
export class SprintsController {
  constructor(private readonly service: SprintsService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.SPRINT_READ)
  list(@Query(zodPipe(listSprintsQuerySchema)) query: ListSprintsQuery) {
    return this.service.list(query);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.SPRINT_MANAGE)
  create(
    @Body(zodPipe(createSprintSchema)) body: CreateSprintInput,
    @CurrentUser() actor: AuthUser,
    @Req() req: Request,
  ) {
    return this.service.create(body, actor, getClientContext(req));
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.SPRINT_READ)
  findOne(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.SPRINT_MANAGE)
  update(
    @Param('id') id: string,
    @Body(zodPipe(updateSprintSchema)) body: UpdateSprintInput,
    @CurrentUser() actor: AuthUser,
    @Req() req: Request,
  ) {
    return this.service.update(id, body, actor, getClientContext(req));
  }

  @Delete(':id')
  @RequirePermissions(PERMISSIONS.SPRINT_MANAGE)
  remove(@Param('id') id: string, @CurrentUser() actor: AuthUser, @Req() req: Request) {
    return this.service.remove(id, actor, getClientContext(req));
  }

  @Post(':id/start')
  @RequirePermissions(PERMISSIONS.SPRINT_MANAGE)
  start(@Param('id') id: string, @CurrentUser() actor: AuthUser, @Req() req: Request) {
    return this.service.setStatus(id, 'ACTIVE', actor, getClientContext(req));
  }

  @Post(':id/complete')
  @RequirePermissions(PERMISSIONS.SPRINT_MANAGE)
  complete(@Param('id') id: string, @CurrentUser() actor: AuthUser, @Req() req: Request) {
    return this.service.setStatus(id, 'COMPLETED', actor, getClientContext(req));
  }

  @Post(':id/items')
  @RequirePermissions(PERMISSIONS.SPRINT_MANAGE)
  addItems(
    @Param('id') id: string,
    @Body(zodPipe(sprintItemsSchema)) body: SprintItemsInput,
    @CurrentUser() actor: AuthUser,
    @Req() req: Request,
  ) {
    return this.service.addItems(id, body.itemIds, actor, getClientContext(req));
  }

  @Delete(':id/items')
  @RequirePermissions(PERMISSIONS.SPRINT_MANAGE)
  removeItems(
    @Param('id') id: string,
    @Body(zodPipe(sprintItemsSchema)) body: SprintItemsInput,
    @CurrentUser() actor: AuthUser,
    @Req() req: Request,
  ) {
    return this.service.removeItems(id, body.itemIds, actor, getClientContext(req));
  }

  @Get(':id/board')
  @RequirePermissions(PERMISSIONS.SPRINT_READ)
  board(@Param('id') id: string) {
    return this.service.getBoard(id);
  }

  @Get(':id/analytics')
  @RequirePermissions(PERMISSIONS.SPRINT_READ)
  analytics(@Param('id') id: string) {
    return this.service.getAnalytics(id);
  }

  @Get(':id/burndown')
  @RequirePermissions(PERMISSIONS.SPRINT_READ)
  burndown(@Param('id') id: string) {
    return this.service.getBurndown(id);
  }
}
