import { Controller, Get, Param } from '@nestjs/common';
import { PERMISSIONS } from '@eop/shared';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { GithubService } from './github.service';

@Controller('integrations/github')
export class GithubController {
  constructor(private readonly service: GithubService) {}

  @Get('status')
  @RequirePermissions(PERMISSIONS.INTEGRATION_MANAGE)
  status() {
    return this.service.getStatus();
  }

  @Get('work-items/:id')
  @RequirePermissions(PERMISSIONS.WORKITEM_READ)
  devActivity(@Param('id') id: string) {
    return this.service.getDevActivity(id);
  }
}
