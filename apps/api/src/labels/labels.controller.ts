import { Body, Controller, Delete, Get, Param, Patch, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import {
  createLabelSchema,
  updateLabelSchema,
  PERMISSIONS,
  type AuthUser,
  type CreateLabelInput,
  type UpdateLabelInput,
} from '@eop/shared';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { zodPipe } from '../common/pipes/zod-validation.pipe';
import { getClientContext } from '../common/utils/request-context';
import { LabelsService } from './labels.service';

@Controller('labels')
export class LabelsController {
  constructor(private readonly service: LabelsService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.LABEL_READ)
  list() {
    return this.service.list();
  }

  @Post()
  @RequirePermissions(PERMISSIONS.LABEL_MANAGE)
  create(
    @Body(zodPipe(createLabelSchema)) body: CreateLabelInput,
    @CurrentUser() actor: AuthUser,
    @Req() req: Request,
  ) {
    return this.service.create(body, actor, getClientContext(req));
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.LABEL_MANAGE)
  update(
    @Param('id') id: string,
    @Body(zodPipe(updateLabelSchema)) body: UpdateLabelInput,
    @CurrentUser() actor: AuthUser,
    @Req() req: Request,
  ) {
    return this.service.update(id, body, actor, getClientContext(req));
  }

  @Delete(':id')
  @RequirePermissions(PERMISSIONS.LABEL_MANAGE)
  remove(@Param('id') id: string, @CurrentUser() actor: AuthUser, @Req() req: Request) {
    return this.service.remove(id, actor, getClientContext(req));
  }
}
