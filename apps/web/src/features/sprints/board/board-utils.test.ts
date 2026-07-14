import { describe, expect, it } from 'vitest';
import type { WorkItemSummary } from '@eop/shared';
import { columnOf, computeDrop, type BoardColumns } from './board-utils';

const card = (id: string, status: WorkItemSummary['status']): WorkItemSummary => ({
  id,
  number: 1,
  key: `EOP-${id}`,
  type: 'TASK',
  title: `Task ${id}`,
  status,
  priority: 'NONE',
  storyPoints: null,
  sprintId: 's1',
  releaseId: null,
  assignee: null,
  parent: null,
  labels: [],
  childCount: 0,
  commentCount: 0,
  startDate: null,
  dueDate: null,
  completedAt: null,
  createdAt: '',
  updatedAt: '',
});

const makeColumns = (): BoardColumns => ({
  BACKLOG: [],
  TODO: [card('a', 'TODO'), card('b', 'TODO')],
  IN_PROGRESS: [card('c', 'IN_PROGRESS')],
  IN_REVIEW: [],
  IN_QA: [],
  DONE: [],
  CANCELLED: [],
});

describe('columnOf', () => {
  it('finds the column containing an item', () => {
    expect(columnOf(makeColumns(), 'a')).toBe('TODO');
    expect(columnOf(makeColumns(), 'c')).toBe('IN_PROGRESS');
    expect(columnOf(makeColumns(), 'missing')).toBeNull();
  });
});

describe('computeDrop', () => {
  it('moves a card to another column (dropped on the column)', () => {
    const result = computeDrop(makeColumns(), 'a', 'col:IN_PROGRESS');
    expect(result).not.toBeNull();
    expect(result?.toStatus).toBe('IN_PROGRESS');
    expect(result?.columns.IN_PROGRESS.map((i) => i.id)).toEqual(['c', 'a']);
    expect(result?.columns.TODO.map((i) => i.id)).toEqual(['b']);
    // dropped at end after 'c'
    expect(result?.beforeId).toBe('c');
    expect(result?.afterId).toBeUndefined();
  });

  it('reorders within a column by dropping onto a card', () => {
    const result = computeDrop(makeColumns(), 'b', 'a');
    expect(result?.toStatus).toBe('TODO');
    expect(result?.columns.TODO.map((i) => i.id)).toEqual(['b', 'a']);
    expect(result?.beforeId).toBeUndefined();
    expect(result?.afterId).toBe('a');
  });

  it('returns null when dropping onto itself', () => {
    expect(computeDrop(makeColumns(), 'a', 'a')).toBeNull();
  });
});
