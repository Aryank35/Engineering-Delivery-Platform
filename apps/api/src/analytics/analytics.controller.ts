import { Controller, Get } from '@nestjs/common';
import { PERMISSIONS } from '@eop/shared';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { AnalyticsService } from './analytics.service';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly service: AnalyticsService) {}

  @Get('overview')
  @RequirePermissions(PERMISSIONS.ANALYTICS_READ)
  overview() {
    return this.service.getOverview();
  }

  @Get('velocity')
  @RequirePermissions(PERMISSIONS.ANALYTICS_READ)
  velocity() {
    return this.service.getVelocity();
  }

  @Get('qa')
  @RequirePermissions(PERMISSIONS.ANALYTICS_READ)
  qa() {
    return this.service.getQa();
  }
}
