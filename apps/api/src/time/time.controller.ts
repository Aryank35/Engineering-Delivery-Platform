import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import {
  createTimeLogSchema,
  listTimeLogsQuerySchema,
  startTimerSchema,
  updateTimeLogSchema,
  PERMISSIONS,
  type AuthUser,
  type CreateTimeLogInput,
  type ListTimeLogsQuery,
  type StartTimerInput,
  type UpdateTimeLogInput,
} from '@eop/shared';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { zodPipe } from '../common/pipes/zod-validation.pipe';
import { getClientContext } from '../common/utils/request-context';
import { TimeService } from './time.service';

@Controller('time')
export class TimeController {
  constructor(private readonly service: TimeService) {}

  @Get('timer')
  @RequirePermissions(PERMISSIONS.TIME_READ)
  getTimer(@CurrentUser('id') userId: string) {
    return this.service.getActiveTimer(userId);
  }

  @Post('timer/start')
  @RequirePermissions(PERMISSIONS.TIME_LOG)
  start(
    @Body(zodPipe(startTimerSchema)) body: StartTimerInput,
    @CurrentUser() actor: AuthUser,
    @Req() req: Request,
  ) {
    return this.service.startTimer(actor, body, getClientContext(req));
  }

  @Post('timer/pause')
  @HttpCode(200)
  @RequirePermissions(PERMISSIONS.TIME_LOG)
  pause(@CurrentUser('id') userId: string) {
    return this.service.pauseTimer(userId);
  }

  @Post('timer/resume')
  @HttpCode(200)
  @RequirePermissions(PERMISSIONS.TIME_LOG)
  resume(@CurrentUser('id') userId: string) {
    return this.service.resumeTimer(userId);
  }

  @Post('timer/stop')
  @HttpCode(200)
  @RequirePermissions(PERMISSIONS.TIME_LOG)
  stop(@CurrentUser() actor: AuthUser, @Req() req: Request) {
    return this.service.stopTimer(actor, getClientContext(req));
  }

  @Get('summary')
  @RequirePermissions(PERMISSIONS.TIME_READ)
  summary(@CurrentUser('id') userId: string) {
    return this.service.getSummary(userId);
  }

  @Get('logs')
  @RequirePermissions(PERMISSIONS.TIME_READ)
  list(@Query(zodPipe(listTimeLogsQuerySchema)) query: ListTimeLogsQuery, @CurrentUser() actor: AuthUser) {
    return this.service.list(query, actor);
  }

  @Post('logs')
  @RequirePermissions(PERMISSIONS.TIME_LOG)
  createLog(
    @Body(zodPipe(createTimeLogSchema)) body: CreateTimeLogInput,
    @CurrentUser() actor: AuthUser,
    @Req() req: Request,
  ) {
    return this.service.createManualLog(actor, body, getClientContext(req));
  }

  @Patch('logs/:id')
  @RequirePermissions(PERMISSIONS.TIME_LOG)
  updateLog(
    @Param('id') id: string,
    @Body(zodPipe(updateTimeLogSchema)) body: UpdateTimeLogInput,
    @CurrentUser() actor: AuthUser,
    @Req() req: Request,
  ) {
    return this.service.updateLog(id, body, actor, getClientContext(req));
  }

  @Delete('logs/:id')
  @RequirePermissions(PERMISSIONS.TIME_LOG)
  deleteLog(@Param('id') id: string, @CurrentUser() actor: AuthUser, @Req() req: Request) {
    return this.service.deleteLog(id, actor, getClientContext(req));
  }

  @Get('work-items/:id/total')
  @RequirePermissions(PERMISSIONS.TIME_READ)
  workItemTotal(@Param('id') id: string) {
    return this.service.getWorkItemTotal(id);
  }
}
