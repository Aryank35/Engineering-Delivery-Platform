import { describe, expect, it } from 'vitest';
import { prBadge } from './work-item-dev-panel';

describe('prBadge', () => {
  it('prioritises merged, then closed, then open', () => {
    expect(prBadge({ merged: true, state: 'closed' })).toEqual({ label: 'Merged', variant: 'success' });
    expect(prBadge({ merged: false, state: 'closed' })).toEqual({ label: 'Closed', variant: 'muted' });
    expect(prBadge({ merged: false, state: 'open' })).toEqual({ label: 'Open', variant: 'default' });
  });
});
