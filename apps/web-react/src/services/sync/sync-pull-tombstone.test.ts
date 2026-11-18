import { describe, expect, it } from 'vitest';
import { prepareRowForUpsert } from './sync-pull-merge';

describe('sync-pull tombstone conflict handling', () => {
  it('preserves a newer local deletion when cloud metadata contains a newer edit timestamp', async () => {
    const localRow = {
      id: 'transaction-1',
      updated_at: '2026-10-20T10:00:00.000Z',
      deleted_at: '2026-10-23T10:00:00.000Z',
      amount: 125,
    };
    const cloudResult = {
      docSnap: { id: 'transaction-1', data: () => undefined },
      cloudData: { updatedAt: '2026-10-22T10:00:00.000Z', deletedAt: null },
      parsed: { amount: 125 },
      isLegacy: false,
      error: null,
    };

    const prepared = await prepareRowForUpsert(
      cloudResult,
      'transactions',
      localRow,
      localRow,
    );

    expect(prepared.isSkipped).toBe(true);
  });
});
