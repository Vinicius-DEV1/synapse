import { describe, expect, it } from 'vitest';
import { InitialSyncPushPlanBuilder, selectInitialSyncPushRows } from './sync-push-plan';

describe('initial sync push plan', () => {
  it('selects local-only and newer rows while skipping cloud-newer rows', () => {
    const builder = new InitialSyncPushPlanBuilder();
    builder.addCloudRows('pages', [
      { id: 'cloud-newer', syncTime: 30 },
      { id: 'local-newer', syncTime: 10 },
    ]);
    builder.completeTable('pages', [
      { id: 'cloud-newer', updated_at: 20 },
      { id: 'local-newer', updated_at: 20 },
      { id: 'local-only', updated_at: 25 },
    ], 30);

    const plan = builder.build().get('pages');
    expect(plan).toBeDefined();
    if (!plan) throw new Error('Expected the pages push plan.');

    expect([...plan.rowIds].sort()).toEqual(['local-newer', 'local-only']);
    expect(plan.checkpoint).toBe(30);
    expect(selectInitialSyncPushRows([
      { id: 'cloud-newer', updated_at: 20 },
      { id: 'local-newer', updated_at: 20 },
      { id: 'local-only', updated_at: 25 },
    ], plan).map((row) => row.id).sort()).toEqual(['local-newer', 'local-only']);
  });

  it('includes a tombstone whose deletion timestamp is newer than its update time', () => {
    const builder = new InitialSyncPushPlanBuilder();
    builder.addCloudRows('pages', [{ id: 'deleted', syncTime: 20 }]);
    builder.completeTable('pages', [{
      id: 'deleted',
      updated_at: 10,
      deleted_at: 30,
    }], 20);

    expect([...builder.build().get('pages')?.rowIds || []]).toEqual(['deleted']);
    expect(builder.build().get('pages')?.checkpoint).toBe(30);
  });
});
