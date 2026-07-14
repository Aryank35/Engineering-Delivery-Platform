import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { GithubController } from './github.controller';
import { GithubWebhookController } from './github-webhook.controller';
import { GithubService } from './github.service';

@Module({
  imports: [AuditModule],
  controllers: [GithubWebhookController, GithubController],
  providers: [GithubService],
  exports: [GithubService],
})
export class GithubModule {}
