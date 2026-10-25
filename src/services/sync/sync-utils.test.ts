import { describe, it, expect, beforeEach } from 'vitest';
import {
  MODULE_TABLES,
  getLastSyncTime,
  setLastSyncTime,
  parseDateSafe,
  getDeviceId,
} from './sync-utils';

describe('sync-utils service', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('defines all application module tables properly', () => {
    expect(MODULE_TABLES).toHaveProperty('core');
    expect(MODULE_TABLES).toHaveProperty('notes');
    expect(MODULE_TABLES).toHaveProperty('anki');
    expect(MODULE_TABLES).toHaveProperty('library');
    expect(MODULE_TABLES).toHaveProperty('vault');
    expect(MODULE_TABLES).toHaveProperty('finance');
    expect(MODULE_TABLES).toHaveProperty('culture');
  });

  it('persists and retrieves last sync time', () => {
    expect(getLastSyncTime('push')).toBe(0);
    expect(getLastSyncTime('pull')).toBe(0);

    setLastSyncTime('push', 1700000000000);
    expect(getLastSyncTime('push')).toBe(1700000000000);
  });

  describe('parseDateSafe', () => {
    it('parses ISO date strings, timestamps and handles spaces correctly', () => {
      expect(parseDateSafe(null)).toBe(0);
      expect(parseDateSafe(undefined)).toBe(0);
      expect(parseDateSafe(1700000000000)).toBe(1700000000000);

      const timestamp = parseDateSafe('2026-08-19 12:00:00');
      expect(timestamp).toBeGreaterThan(0);

      const isoTimestamp = parseDateSafe('2026-08-19T12:00:00Z');
      expect(isoTimestamp).toBeGreaterThan(0);

      // Ensures SQLite space format without timezone specifier resolves to the exact same UTC millisecond value as ISO
      expect(timestamp).toBe(isoTimestamp);

      // Handles SQLite fractional seconds without shifting to local timezone
      const fracSqlite = parseDateSafe('2026-08-19 12:00:00.500');
      const fracIso = parseDateSafe('2026-08-19T12:00:00.500Z');
      expect(fracSqlite).toBe(fracIso);

      // Handles ISO string without Z
      const noZ = parseDateSafe('2026-08-19T12:00:00');
      expect(noZ).toBe(isoTimestamp);
    });
  });

  describe('getDeviceId', () => {
    it('generates unique deviceId and persists in sessionStorage across calls', () => {
      const id1 = getDeviceId();
      const id2 = getDeviceId();
      expect(id1).toBe(id2);
      expect(typeof id1).toBe('string');
      expect(id1.length).toBeGreaterThan(10);
    });
  });
});
