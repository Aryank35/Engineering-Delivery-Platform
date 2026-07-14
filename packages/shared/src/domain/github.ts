import { WORK_ITEM_KEY_PREFIX, type WorkItemStatus } from './work-items';

/** Matches work-item keys like `EOP-42` anywhere in free text (case-insensitive). */
const WORK_ITEM_KEY_RE = new RegExp(`\\b${WORK_ITEM_KEY_PREFIX}-(\\d+)\\b`, 'gi');

/** Extract the unique work-item numbers referenced in a piece of text. */
export function extractWorkItemNumbers(text: string | null | undefined): number[] {
  if (!text) return [];
  const numbers = new Set<number>();
  for (const match of text.matchAll(WORK_ITEM_KEY_RE)) {
    const n = Number.parseInt(match[1], 10);
    if (Number.isFinite(n)) numbers.add(n);
  }
  return [...numbers];
}

/** The git event kinds that can drive work-item status automation. */
export type GitHubAutomationTrigger = 'branch' | 'commit' | 'pr_opened' | 'pr_merged';

/**
 * The status a work item should auto-transition to for a GitHub trigger, or
 * `null` when the current status means it should be left untouched. Automation
 * only ever moves an item *forward* and never touches a cancelled item.
 */
export function resolveGitHubAutoTransition(
  current: WorkItemStatus,
  trigger: GitHubAutomationTrigger,
): WorkItemStatus | null {
  if (current === 'CANCELLED') return null;
  switch (trigger) {
    case 'branch':
    case 'commit':
      return current === 'BACKLOG' || current === 'TODO' ? 'IN_PROGRESS' : null;
    case 'pr_opened':
      return current === 'BACKLOG' || current === 'TODO' || current === 'IN_PROGRESS'
        ? 'IN_REVIEW'
        : null;
    case 'pr_merged':
      return current === 'DONE' ? null : 'DONE';
    default:
      return null;
  }
}

/** GitHub webhook event types the platform handles. */
export const GITHUB_HANDLED_EVENTS = ['push', 'pull_request', 'create', 'delete'] as const;
