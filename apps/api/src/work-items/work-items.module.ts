import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { WorkItemsController } from './work-items.controller';
import { CommentsController } from './comments.controller';
import { WorkItemsService } from './work-items.service';

@Module({
  imports: [AuditModule],
  controllers: [WorkItemsController, CommentsController],
  providers: [WorkItemsService],
  exports: [WorkItemsService],
})
export class WorkItemsModule {}
