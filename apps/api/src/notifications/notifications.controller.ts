import { Body, Controller, Get, HttpCode, Post, Query } from '@nestjs/common';
import {
  listNotificationsQuerySchema,
  markNotificationsReadSchema,
  PERMISSIONS,
  type ListNotificationsQuery,
  type MarkNotificationsReadInput,
} from '@eop/shared';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { zodPipe } from '../common/pipes/zod-validation.pipe';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
@RequirePermissions(PERMISSIONS.NOTIFICATION_READ)
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  @Get()
  list(
    @CurrentUser('id') userId: string,
    @Query(zodPipe(listNotificationsQuerySchema)) query: ListNotificationsQuery,
  ) {
    return this.service.list(userId, query);
  }

  @Get('unread-count')
  unreadCount(@CurrentUser('id') userId: string) {
    return this.service.unreadCount(userId);
  }

  @Post('mark-read')
  @HttpCode(200)
  markRead(
    @CurrentUser('id') userId: string,
    @Body(zodPipe(markNotificationsReadSchema)) body: MarkNotificationsReadInput,
  ) {
    return this.service.markRead(userId, body.ids);
  }

  @Post('read-all')
  @HttpCode(200)
  markAllRead(@CurrentUser('id') userId: string) {
    return this.service.markAllRead(userId);
  }
}
