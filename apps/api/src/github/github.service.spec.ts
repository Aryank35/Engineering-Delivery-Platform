import { createHmac } from 'node:crypto';
import { extractWorkItemNumbers, resolveGitHubAutoTransition } from '@eop/shared';
import { GithubService } from './github.service';
import type { PrismaService } from '../prisma/prisma.service';
import type { AuditService } from '../audit/audit.service';
import type { RealtimeService } from '../realtime/realtime.service';
import type { AppConfigService } from '../config/app-config.service';

const SECRET = 'top-secret';

function makeService() {
  const prisma = {
    workItem: { findMany: jest.fn().mockResolvedValue([]), update: jest.fn().mockResolvedValue({}) },
    gitHubBranch: { upsert: jest.fn(), updateMany: jest.fn(), findMany: jest.fn() },
    gitHubPullRequest: { upsert: jest.fn(), findMany: jest.fn() },
    gitHubCommit: { upsert: jest.fn(), findMany: jest.fn() },
  };
  const audit = { record: jest.fn().mockResolvedValue(undefined) };
  const realtime = { emitBoardChanged: jest.fn() };
  const config = { github: { webhookSecret: SECRET }, globalPrefix: 'api' };
  const service = new GithubService(
    prisma as unknown as PrismaService,
    audit as unknown as AuditService,
    realtime as unknown as RealtimeService,
    config as unknown as AppConfigService,
  );
  return { service, prisma };
}

const sign = (body: string) => `sha256=${createHmac('sha256', SECRET).update(body).digest('hex')}`;

describe('extractWorkItemNumbers', () => {
  it('finds unique, case-insensitive keys and ignores noise', () => {
    expect(extractWorkItemNumbers('EOP-12 and eop-12 plus EOP-7')).toEqual([12, 7]);
    expect(extractWorkItemNumbers('no keys here')).toEqual([]);
    expect(extractWorkItemNumbers(null)).toEqual([]);
    expect(extractWorkItemNumbers('WEOP-9 EOPX-1')).toEqual([]);
  });
});

describe('resolveGitHubAutoTransition', () => {
  it('moves items forward only', () => {
    expect(resolveGitHubAutoTransition('TODO', 'commit')).toBe('IN_PROGRESS');
    expect(resolveGitHubAutoTransition('IN_PROGRESS', 'commit')).toBeNull();
    expect(resolveGitHubAutoTransition('IN_PROGRESS', 'pr_opened')).toBe('IN_REVIEW');
    expect(resolveGitHubAutoTransition('IN_REVIEW', 'pr_merged')).toBe('DONE');
    expect(resolveGitHubAutoTransition('DONE', 'pr_merged')).toBeNull();
    expect(resolveGitHubAutoTransition('CANCELLED', 'commit')).toBeNull();
  });
});

describe('GithubService.verifySignature', () => {
  it('accepts a correct signature and rejects tampering', () => {
    const { service } = makeService();
    const body = Buffer.from('{"hello":"world"}');
    expect(service.verifySignature(body, sign(body.toString()))).toBe(true);
    expect(service.verifySignature(body, sign('different'))).toBe(false);
    expect(service.verifySignature(body, undefined)).toBe(false);
  });
});

describe('GithubService.handleWebhook push', () => {
  it('links the branch and moves a TODO item to IN_PROGRESS', async () => {
    const { service, prisma } = makeService();
    prisma.workItem.findMany.mockResolvedValue([
      { id: 'w1', number: 12, status: 'TODO', sprintId: 's1' },
    ]);

    const result = await service.handleWebhook('push', {
      ref: 'refs/heads/feature/EOP-12-widget',
      after: 'abc123',
      repository: { full_name: 'acme/app' },
      commits: [{ id: 'sha1', message: 'EOP-12 implement', url: 'http://x', author: { name: 'Dev' } }],
    });

    expect(prisma.gitHubBranch.upsert).toHaveBeenCalled();
    expect(prisma.gitHubCommit.upsert).toHaveBeenCalled();
    expect(prisma.workItem.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'IN_PROGRESS' }) }),
    );
    expect(result.linkedItems).toEqual([12]);
  });
});

describe('GithubService.handleWebhook pull_request', () => {
  it('marks a merged PR item DONE with completedAt', async () => {
    const { service, prisma } = makeService();
    prisma.workItem.findMany.mockResolvedValue([
      { id: 'w5', number: 5, status: 'IN_REVIEW', sprintId: null },
    ]);

    await service.handleWebhook('pull_request', {
      action: 'closed',
      repository: { full_name: 'acme/app' },
      pull_request: {
        number: 7,
        title: 'EOP-5 fix bug',
        body: null,
        html_url: 'http://x/7',
        state: 'closed',
        merged: true,
        merged_at: '2026-07-14T00:00:00.000Z',
        head: { ref: 'fix/EOP-5' },
        base: { ref: 'main' },
        user: { login: 'dev' },
      },
    });

    expect(prisma.gitHubPullRequest.upsert).toHaveBeenCalled();
    const updateArg = prisma.workItem.update.mock.calls[0][0];
    expect(updateArg.data.status).toBe('DONE');
    expect(updateArg.data.completedAt).toBeInstanceOf(Date);
  });

  it('does not transition when a PR is closed without merging', async () => {
    const { service, prisma } = makeService();
    prisma.workItem.findMany.mockResolvedValue([
      { id: 'w5', number: 5, status: 'IN_REVIEW', sprintId: null },
    ]);

    await service.handleWebhook('pull_request', {
      action: 'closed',
      repository: { full_name: 'acme/app' },
      pull_request: {
        number: 7,
        title: 'EOP-5 fix',
        html_url: 'http://x/7',
        state: 'closed',
        merged: false,
        head: { ref: 'fix/EOP-5' },
        base: { ref: 'main' },
      },
    });

    expect(prisma.workItem.update).not.toHaveBeenCalled();
  });
});
