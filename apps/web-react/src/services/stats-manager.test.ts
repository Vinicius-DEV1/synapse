import { describe, it, expect, vi, beforeEach } from 'vitest';
import { logActivity, getActivityLogs } from './stats-manager';

describe('stats-manager service', () => {
  beforeEach(() => {
    (window as any).api = {
      sync: {
        getRowsByIds: vi.fn().mockResolvedValue([]),
        upsertRow: vi.fn().mockResolvedValue(undefined),
        getTable: vi.fn().mockResolvedValue([
          {
            id: 'video_vid1_2026-08-19',
            module: 'video',
            item_id: 'vid1',
            item_title: 'Japanese Lesson 1',
            date: '2026-08-19',
            duration_seconds: 300,
          },
        ]),
      },
    };
  });

  it('logs activity when duration is positive and upserts row', async () => {
    await logActivity('video', 'vid1', 'Japanese Lesson 1', 120);

    expect((window as any).api.sync.upsertRow).toHaveBeenCalledWith(
      'activity_logs',
      expect.objectContaining({
        module: 'video',
        item_id: 'vid1',
        item_title: 'Japanese Lesson 1',
        duration_seconds: 120,
      })
    );
  });

  it('ignores logActivity when durationSeconds is <= 0', async () => {
    await logActivity('video', 'vid1', 'Japanese Lesson 1', 0);
    expect((window as any).api.sync.upsertRow).not.toHaveBeenCalled();
  });

  it('retrieves activity logs from sync table', async () => {
    const logs = await getActivityLogs();
    expect(logs).toHaveLength(1);
    expect(logs[0].item_title).toBe('Japanese Lesson 1');
  });
});
