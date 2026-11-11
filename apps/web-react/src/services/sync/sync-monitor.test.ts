import { describe, it, expect, beforeEach } from 'vitest';
import {
  logFirebaseOp,
  logFirebaseTraffic,
  logSyncEvent,
  getSyncEvents,
  getTodayStats,
  getWeeklyStats,
  isEmergencyStopped,
  clearEmergencyStop,
} from './sync-monitor';

describe('sync-monitor service', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('logs firebase read, write, delete operations and calculates today stats', () => {
    logFirebaseOp('read', 5);
    logFirebaseOp('write', 2);
    logFirebaseOp('delete', 1);

    const stats = getTodayStats();
    expect(stats.reads).toBe(5);
    expect(stats.writes).toBe(2);
    expect(stats.deletes).toBe(1);
  });

  it('logs firebase network traffic in bytes', () => {
    logFirebaseTraffic(1024, 2048);
    const stats = getTodayStats();
    expect(stats.bytesDownloaded).toBe(1024);
    expect(stats.bytesUploaded).toBe(2048);
  });

  it('records sync events and limits history to 50 items', () => {
    for (let i = 0; i < 60; i++) {
      logSyncEvent('info', `Sync step ${i}`);
    }

    const events = getSyncEvents();
    expect(events).toHaveLength(50);
    expect(events[0].message).toBe('Sync step 59'); // Most recent first
  });

  it('manages emergency stop state in localStorage', () => {
    expect(isEmergencyStopped()).toBe(false);

    localStorage.setItem('sync_emergency_stop', 'true');
    expect(isEmergencyStopped()).toBe(true);

    clearEmergencyStop();
    expect(isEmergencyStopped()).toBe(false);
  });

  it('generates weekly stats array spanning 7 days', () => {
    const weekly = getWeeklyStats();
    expect(weekly).toHaveLength(7);
  });
});
