import { describe, it, expect, beforeEach } from 'vitest';
import { getWebDb } from '../../services/db-web';
import { webFocusApi } from './focus';

describe('webFocusApi (IndexedDB)', () => {
  let api: ReturnType<typeof webFocusApi>;

  beforeEach(async () => {
    const db = await getWebDb();
    await db.clear('focus_sessions');
    await db.clear('alarms');
    let counter = 0;
    api = webFocusApi(db, () => `focus-${++counter}`);
  });

  it('creates and retrieves focus sessions ordered by created_at descending', async () => {
    const s1 = await api.createSession({
      tag: 'Coding',
      description: 'Refactoring',
      target_time_minutes: 25,
      created_at: '2026-10-01T10:00:00.000Z',
    });
    const s2 = await api.createSession({
      tag: 'Review',
      description: 'PR Review',
      target_time_minutes: 15,
      created_at: '2026-10-02T10:00:00.000Z',
    });

    const sessions = await api.getSessions();
    expect(sessions).toHaveLength(2);
    expect(sessions[0].id).toBe(s2.id);
    expect(sessions[1].id).toBe(s1.id);
  });

  it('deletes sessions based on scope (today, last7days, specific, all)', async () => {
    const todayIso = new Date().toISOString();
    const threeDaysAgoIso = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
    const tenDaysAgoIso = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();

    const sToday = await api.createSession({ tag: 'Today', target_time_minutes: 25, created_at: todayIso });
    const s3Days = await api.createSession({ tag: '3Days', target_time_minutes: 25, created_at: threeDaysAgoIso });
    const s10Days = await api.createSession({ tag: '10Days', target_time_minutes: 25, created_at: tenDaysAgoIso });

    // Test deleting specific session
    await api.deleteSessions({ type: 'specific', id: s10Days.id });
    let sessions = await api.getSessions();
    expect(sessions.map((s) => s.id)).not.toContain(s10Days.id);
    expect(sessions).toHaveLength(2);

    // Test deleting today's sessions
    await api.deleteSessions({ type: 'today' });
    sessions = await api.getSessions();
    expect(sessions).toHaveLength(1);
    expect(sessions[0].id).toBe(s3Days.id);

    // Test deleting all remaining sessions
    await api.deleteSessions({ type: 'all' });
    sessions = await api.getSessions();
    expect(sessions).toHaveLength(0);
  });

  it('creates, updates, and deletes alarms', async () => {
    const alarm = await api.createAlarm({
      id: 101,
      time_str: '08:30',
      label: 'Morning Focus',
      is_active: true,
    });

    expect(alarm.id).toBe(101);
    expect(alarm.time_str).toBe('08:30');

    let alarms = await api.getAlarms();
    expect(alarms).toHaveLength(1);

    const updated = await api.updateAlarm(101, { is_active: false, label: 'Updated Label' });
    expect(updated?.is_active).toBe(false);
    expect(updated?.label).toBe('Updated Label');

    const deleted = await api.deleteAlarm(101);
    expect(deleted).toBe(true);

    alarms = await api.getAlarms();
    expect(alarms).toHaveLength(0);
  });
});
