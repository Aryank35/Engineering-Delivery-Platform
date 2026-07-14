import { Body, Controller, Delete, Get, Param, Patch, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import {
  createEnvironmentSchema,
  updateEnvironmentSchema,
  PERMISSIONS,
  type AuthUser,
  type CreateEnvironmentInput,
  type UpdateEnvironmentInput,
} from '@eop/shared';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { zodPipe } from '../common/pipes/zod-validation.pipe';
import { getClientContext } from '../common/utils/request-context';
import { EnvironmentsService } from './environments.service';

@Controller('environments')
export class EnvironmentsController {
  constructor(private readonly service: EnvironmentsService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.RELEASE_READ)
  list() {
    return this.service.list();
  }

  @Get('status')
  @RequirePermissions(PERMISSIONS.RELEASE_READ)
  status() {
    return this.service.getStatusOverview();
  }

  @Post()
  @RequirePermissions(PERMISSIONS.RELEASE_MANAGE)
  create(
    @Body(zodPipe(createEnvironmentSchema)) body: CreateEnvironmentInput,
    @CurrentUser() actor: AuthUser,
    @Req() req: Request,
  ) {
    return this.service.create(body, actor, getClientContext(req));
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.RELEASE_MANAGE)
  update(
    @Param('id') id: string,
    @Body(zodPipe(updateEnvironmentSchema)) body: UpdateEnvironmentInput,
    @CurrentUser() actor: AuthUser,
    @Req() req: Request,
  ) {
    return this.service.update(id, body, actor, getClientContext(req));
  }

  @Delete(':id')
  @RequirePermissions(PERMISSIONS.RELEASE_MANAGE)
  remove(@Param('id') id: string, @CurrentUser() actor: AuthUser, @Req() req: Request) {
    return this.service.remove(id, actor, getClientContext(req));
  }
}
