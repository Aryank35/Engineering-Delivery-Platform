import { Controller, Get, Query } from '@nestjs/common';
import { listAuditLogsQuerySchema, PERMISSIONS, type ListAuditLogsQuery } from '@eop/shared';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { zodPipe } from '../common/pipes/zod-validation.pipe';
import { AuditService } from './audit.service';

@Controller('audit-logs')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.AUDIT_READ)
  list(@Query(zodPipe(listAuditLogsQuerySchema)) query: ListAuditLogsQuery) {
    return this.auditService.list(query);
  }
}
