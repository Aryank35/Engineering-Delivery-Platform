import { createHmac, timingSafeEqual } from 'node:crypto';
import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@eop/database';
import {
  extractWorkItemNumbers,
  resolveGitHubAutoTransition,
  GITHUB_HANDLED_EVENTS,
  type GitHubAutomationTrigger,
  type GitHubIntegrationStatus,
  type WorkItemDevActivity,
  type WorkItemStatus,
} from '@eop/shared';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { RealtimeService } from '../realtime/realtime.service';
import { AppConfigService } from '../config/app-config.service';
import { toBranch, toCommit, toPullRequest } from './github.mapper';

interface LinkedItem {
  id: string;
  number: number;
  status: string;
  sprintId: string | null;
}

// Minimal shapes of the GitHub webhook payloads we consume (defensively typed).
interface PushPayload {
  ref?: string;
  after?: string;
  created?: boolean;
  deleted?: boolean;
  repository?: { full_name?: string };
  commits?: Array<{
    id?: string;
    message?: string;
    url?: string;
    timestamp?: string;
    author?: { name?: string };
  }>;
}
interface PullRequestPayload {
  action?: string;
  repository?: { full_name?: string };
  pull_request?: {
    number?: number;
    title?: string;
    body?: string | null;
    html_url?: string;
    state?: string;
    merged?: boolean;
    merged_at?: string | null;
    user?: { login?: string };
    head?: { ref?: string };
    base?: { ref?: string };
  };
}
interface RefPayload {
  ref?: string;
  ref_type?: string;
  repository?: { full_name?: string };
}

export interface WebhookResult {
  event: string;
  handled: boolean;
  linkedItems: number[];
}

@Injectable()
export class GithubService {
  private readonly logger = new Logger(GithubService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly realtime: RealtimeService,
    private readonly config: AppConfigService,
  ) {}

  isConfigured(): boolean {
    return Boolean(this.config.github.webhookSecret);
  }

  getStatus(): GitHubIntegrationStatus {
    return {
      configured: this.isConfigured(),
      webhookPath: `/${this.config.globalPrefix}/integrations/github/webhook`,
      handledEvents: [...GITHUB_HANDLED_EVENTS],
    };
  }

  /** Constant-time verification of GitHub's `X-Hub-Signature-256` header. */
  verifySignature(rawBody: Buffer, signature: string | undefined): boolean {
    const secret = this.config.github.webhookSecret;
    if (!secret || !signature) return false;
    const expected = `sha256=${createHmac('sha256', secret).update(rawBody).digest('hex')}`;
    const a = Buffer.from(signature);
    const b = Buffer.from(expected);
    return a.length === b.length && timingSafeEqual(a, b);
  }

  async handleWebhook(event: string, payload: unknown): Promise<WebhookResult> {
    switch (event) {
      case 'push':
        return this.handlePush(payload as PushPayload);
      case 'pull_request':
        return this.handlePullRequest(payload as PullRequestPayload);
      case 'create':
        return this.handleCreate(payload as RefPayload);
      case 'delete':
        return this.handleDelete(payload as RefPayload);
      default:
        return { event, handled: false, linkedItems: [] };
    }
  }

  // --- Event handlers ---------------------------------------------------------

  private async handlePush(payload: PushPayload): Promise<WebhookResult> {
    const repo = payload.repository?.full_name;
    const branchName = this.branchFromRef(payload.ref);
    if (!repo || !branchName) return { event: 'push', handled: false, linkedItems: [] };

    const numbers = new Set(extractWorkItemNumbers(branchName));
    for (const commit of payload.commits ?? []) {
      extractWorkItemNumbers(commit.message).forEach((n) => numbers.add(n));
    }
    const items = await this.resolveItems([...numbers]);
    const firstItemId = items[0]?.id ?? null;

    if (payload.deleted) {
      await this.prisma.gitHubBranch.updateMany({
        where: { repo, name: branchName },
        data: { deletedAt: new Date() },
      });
    } else {
      await this.upsertBranch(repo, branchName, payload.after ?? null, firstItemId);
    }

    for (const commit of payload.commits ?? []) {
      if (!commit.id) continue;
      const linked = this.resolveFirst(items, extractWorkItemNumbers(commit.message));
      await this.upsertCommit(repo, commit, linked);
    }

    if (!payload.deleted) {
      await this.autoTransition(items, 'commit');
    }
    return { event: 'push', handled: true, linkedItems: items.map((i) => i.number) };
  }

  private async handlePullRequest(payload: PullRequestPayload): Promise<WebhookResult> {
    const repo = payload.repository?.full_name;
    const pr = payload.pull_request;
    if (!repo || !pr?.number) return { event: 'pull_request', handled: false, linkedItems: [] };

    const numbers = new Set([
      ...extractWorkItemNumbers(pr.head?.ref),
      ...extractWorkItemNumbers(pr.title),
      ...extractWorkItemNumbers(pr.body),
    ]);
    const items = await this.resolveItems([...numbers]);
    const merged = Boolean(pr.merged);

    await this.prisma.gitHubPullRequest.upsert({
      where: { repo_number: { repo, number: pr.number } },
      update: {
        title: pr.title ?? '',
        state: pr.state ?? 'open',
        merged,
        mergedAt: pr.merged_at ? new Date(pr.merged_at) : null,
        headBranch: pr.head?.ref ?? null,
        baseBranch: pr.base?.ref ?? null,
        workItemId: items[0]?.id ?? undefined,
      },
      create: {
        repo,
        number: pr.number,
        title: pr.title ?? '',
        url: pr.html_url ?? '',
        state: pr.state ?? 'open',
        merged,
        mergedAt: pr.merged_at ? new Date(pr.merged_at) : null,
        authorLogin: pr.user?.login ?? null,
        headBranch: pr.head?.ref ?? null,
        baseBranch: pr.base?.ref ?? null,
        workItemId: items[0]?.id ?? null,
      },
    });

    const trigger = this.prTrigger(payload.action, merged);
    if (trigger) await this.autoTransition(items, trigger);
    return { event: 'pull_request', handled: true, linkedItems: items.map((i) => i.number) };
  }

  private async handleCreate(payload: RefPayload): Promise<WebhookResult> {
    if (payload.ref_type !== 'branch') return { event: 'create', handled: false, linkedItems: [] };
    const repo = payload.repository?.full_name;
    const branchName = payload.ref;
    if (!repo || !branchName) return { event: 'create', handled: false, linkedItems: [] };
    const items = await this.resolveItems(extractWorkItemNumbers(branchName));
    await this.upsertBranch(repo, branchName, null, items[0]?.id ?? null);
    await this.autoTransition(items, 'branch');
    return { event: 'create', handled: true, linkedItems: items.map((i) => i.number) };
  }

  private async handleDelete(payload: RefPayload): Promise<WebhookResult> {
    if (payload.ref_type !== 'branch') return { event: 'delete', handled: false, linkedItems: [] };
    const repo = payload.repository?.full_name;
    const branchName = payload.ref;
    if (!repo || !branchName) return { event: 'delete', handled: false, linkedItems: [] };
    await this.prisma.gitHubBranch.updateMany({
      where: { repo, name: branchName },
      data: { deletedAt: new Date() },
    });
    return { event: 'delete', handled: true, linkedItems: [] };
  }

  // --- Read side --------------------------------------------------------------

  async getDevActivity(workItemId: string): Promise<WorkItemDevActivity> {
    const [branches, pullRequests, commits] = await Promise.all([
      this.prisma.gitHubBranch.findMany({ where: { workItemId }, orderBy: { createdAt: 'desc' } }),
      this.prisma.gitHubPullRequest.findMany({
        where: { workItemId },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.gitHubCommit.findMany({
        where: { workItemId },
        orderBy: [{ committedAt: 'desc' }, { createdAt: 'desc' }],
        take: 50,
      }),
    ]);
    return {
      branches: branches.map(toBranch),
      pullRequests: pullRequests.map(toPullRequest),
      commits: commits.map(toCommit),
    };
  }

  // --- Internals --------------------------------------------------------------

  private branchFromRef(ref: string | undefined): string | null {
    if (!ref) return null;
    return ref.startsWith('refs/heads/') ? ref.slice('refs/heads/'.length) : null;
  }

  private prTrigger(action: string | undefined, merged: boolean): GitHubAutomationTrigger | null {
    if (action === 'opened' || action === 'reopened' || action === 'ready_for_review') {
      return 'pr_opened';
    }
    if (action === 'closed' && merged) return 'pr_merged';
    return null;
  }

  private async resolveItems(numbers: number[]): Promise<LinkedItem[]> {
    if (numbers.length === 0) return [];
    return this.prisma.workItem.findMany({
      where: { number: { in: numbers } },
      select: { id: true, number: true, status: true, sprintId: true },
    });
  }

  private resolveFirst(items: LinkedItem[], numbers: number[]): string | null {
    const match = items.find((i) => numbers.includes(i.number));
    return match?.id ?? null;
  }

  private async upsertBranch(
    repo: string,
    name: string,
    headSha: string | null,
    workItemId: string | null,
  ): Promise<void> {
    await this.prisma.gitHubBranch.upsert({
      where: { repo_name: { repo, name } },
      update: { headSha, deletedAt: null, ...(workItemId ? { workItemId } : {}) },
      create: { repo, name, headSha, workItemId },
    });
  }

  private async upsertCommit(
    repo: string,
    commit: NonNullable<PushPayload['commits']>[number],
    workItemId: string | null,
  ): Promise<void> {
    await this.prisma.gitHubCommit.upsert({
      where: { repo_sha: { repo, sha: commit.id as string } },
      update: { message: commit.message ?? '', ...(workItemId ? { workItemId } : {}) },
      create: {
        repo,
        sha: commit.id as string,
        message: commit.message ?? '',
        url: commit.url ?? null,
        authorName: commit.author?.name ?? null,
        committedAt: commit.timestamp ? new Date(commit.timestamp) : null,
        workItemId,
      },
    });
  }

  /** Move linked work items forward per the automation rules (system-actor). */
  private async autoTransition(items: LinkedItem[], trigger: GitHubAutomationTrigger): Promise<void> {
    for (const item of items) {
      const target = resolveGitHubAutoTransition(item.status as WorkItemStatus, trigger);
      if (!target || target === item.status) continue;
      try {
        await this.prisma.workItem.update({
          where: { id: item.id },
          data: {
            status: target,
            completedAt:
              target === 'DONE' ? new Date() : item.status === 'DONE' ? null : undefined,
            activities: {
              create: {
                type: 'FIELD_CHANGED',
                field: 'status',
                data: { from: item.status, to: target, via: 'github', trigger } as Prisma.InputJsonValue,
              },
            },
          },
        });
        await this.audit.record({
          action: 'workitem.status_automated',
          entityType: 'WorkItem',
          entityId: item.id,
          metadata: { from: item.status, to: target, via: 'github', trigger },
        });
        this.realtime.emitBoardChanged(item.sprintId, 'github');
      } catch (error) {
        this.logger.error(`Auto-transition failed for work item ${item.id}`, error as Error);
      }
    }
  }
}
