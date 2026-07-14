import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { EnvironmentsController } from './environments.controller';
import { EnvironmentsService } from './environments.service';
import { ReleasesController } from './releases.controller';
import { ReleasesService } from './releases.service';

@Module({
  imports: [AuditModule, NotificationsModule],
  controllers: [ReleasesController, EnvironmentsController],
  providers: [ReleasesService, EnvironmentsService],
  exports: [ReleasesService, EnvironmentsService],
})
export class ReleasesModule {}
