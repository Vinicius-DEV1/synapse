import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

let syncMonitor: typeof import('./sync-monitor');

describe('sync-monitor service', () => {
  beforeEach(async () => {
    vi.resetModules();
    syncMonitor = await import('./sync-monitor');
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('logs firebase read, write, delete operations and calculates today stats', () => {
    syncMonitor.logFirebaseOp('read', 5);
    syncMonitor.logFirebaseOp('write', 2);
    syncMonitor.logFirebaseOp('delete', 1);

    const stats = syncMonitor.getTodayStats();
    expect(stats.reads).toBe(5);
    expect(stats.writes).toBe(2);
    expect(stats.deletes).toBe(1);
  });

  it('logs firebase network traffic in bytes', () => {
    syncMonitor.logFirebaseTraffic(1024, 2048);
    const stats = syncMonitor.getTodayStats();
    expect(stats.bytesDownloaded).toBe(1024);
    expect(stats.bytesUploaded).toBe(2048);
  });

  it('records sync events and limits history to 50 items', () => {
    for (let i = 0; i < 60; i++) {
      syncMonitor.logSyncEvent('info', `Sync step ${i}`);
    }

    const events = syncMonitor.getSyncEvents();
    expect(events).toHaveLength(50);
    expect(events[0].message).toBe('Sync step 59'); // Most recent first
  });

  it('manages emergency stop state in localStorage', () => {
    expect(syncMonitor.isEmergencyStopped()).toBe(false);

    localStorage.setItem('sync_emergency_stop', 'true');
    expect(syncMonitor.isEmergencyStopped()).toBe(true);

    syncMonitor.clearEmergencyStop();
    expect(syncMonitor.isEmergencyStopped()).toBe(false);
  });

  it('generates weekly stats array spanning 7 days', () => {
    const weekly = syncMonitor.getWeeklyStats();
    expect(weekly).toHaveLength(7);
  });

  it('allows the audited initial sync volume without triggering the emergency stop', () => {
    syncMonitor.logFirebaseOp('read', 5_055);
    syncMonitor.logFirebaseOp('write', 5_048);

    expect(syncMonitor.isEmergencyStopped()).toBe(false);
  });

  it('stops a runaway sync only after it exceeds the per-minute safety limits', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    syncMonitor.logFirebaseOp('read', 10_001);

    expect(syncMonitor.isEmergencyStopped()).toBe(true);
    syncMonitor.clearEmergencyStop();

    syncMonitor.logFirebaseOp('write', 8_001);

    expect(syncMonitor.isEmergencyStopped()).toBe(true);
  });
});
