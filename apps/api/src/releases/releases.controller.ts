import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import {
  createDeploymentSchema,
  createReleaseSchema,
  listReleasesQuerySchema,
  releaseItemsSchema,
  setReleaseStatusSchema,
  updateDeploymentSchema,
  updateReleaseSchema,
  PERMISSIONS,
  type AuthUser,
  type CreateDeploymentInput,
  type CreateReleaseInput,
  type ListReleasesQuery,
  type ReleaseItemsInput,
  type SetReleaseStatusInput,
  type UpdateDeploymentInput,
  type UpdateReleaseInput,
} from '@eop/shared';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { zodPipe } from '../common/pipes/zod-validation.pipe';
import { getClientContext } from '../common/utils/request-context';
import { ReleasesService } from './releases.service';

@Controller('releases')
export class ReleasesController {
  constructor(private readonly service: ReleasesService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.RELEASE_READ)
  list(@Query(zodPipe(listReleasesQuerySchema)) query: ListReleasesQuery) {
    return this.service.list(query);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.RELEASE_MANAGE)
  create(
    @Body(zodPipe(createReleaseSchema)) body: CreateReleaseInput,
    @CurrentUser() actor: AuthUser,
    @Req() req: Request,
  ) {
    return this.service.create(body, actor, getClientContext(req));
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.RELEASE_READ)
  findOne(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.RELEASE_MANAGE)
  update(
    @Param('id') id: string,
    @Body(zodPipe(updateReleaseSchema)) body: UpdateReleaseInput,
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

  @Post(':id/status')
  @HttpCode(200)
  @RequirePermissions(PERMISSIONS.RELEASE_MANAGE)
  setStatus(
    @Param('id') id: string,
    @Body(zodPipe(setReleaseStatusSchema)) body: SetReleaseStatusInput,
    @CurrentUser() actor: AuthUser,
    @Req() req: Request,
  ) {
    return this.service.setStatus(id, body.status, actor, getClientContext(req));
  }

  @Post(':id/items')
  @RequirePermissions(PERMISSIONS.RELEASE_MANAGE)
  addItems(
    @Param('id') id: string,
    @Body(zodPipe(releaseItemsSchema)) body: ReleaseItemsInput,
    @CurrentUser() actor: AuthUser,
    @Req() req: Request,
  ) {
    return this.service.addItems(id, body.itemIds, actor, getClientContext(req));
  }

  @Delete(':id/items')
  @RequirePermissions(PERMISSIONS.RELEASE_MANAGE)
  removeItems(
    @Param('id') id: string,
    @Body(zodPipe(releaseItemsSchema)) body: ReleaseItemsInput,
    @CurrentUser() actor: AuthUser,
    @Req() req: Request,
  ) {
    return this.service.removeItems(id, body.itemIds, actor, getClientContext(req));
  }

  @Post(':id/deployments')
  @RequirePermissions(PERMISSIONS.RELEASE_MANAGE)
  deploy(
    @Param('id') id: string,
    @Body(zodPipe(createDeploymentSchema)) body: CreateDeploymentInput,
    @CurrentUser() actor: AuthUser,
    @Req() req: Request,
  ) {
    return this.service.createDeployment(id, body, actor, getClientContext(req));
  }

  @Patch(':id/deployments/:deploymentId')
  @RequirePermissions(PERMISSIONS.RELEASE_MANAGE)
  updateDeployment(
    @Param('deploymentId') deploymentId: string,
    @Body(zodPipe(updateDeploymentSchema)) body: UpdateDeploymentInput,
    @CurrentUser() actor: AuthUser,
    @Req() req: Request,
  ) {
    return this.service.updateDeployment(deploymentId, body, actor, getClientContext(req));
  }
}
