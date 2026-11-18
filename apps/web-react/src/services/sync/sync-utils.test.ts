import { describe, it, expect, beforeEach } from 'vitest';
import {
  MODULE_TABLES,
  getLastSyncTime,
  setLastSyncTime,
  getTableLastSyncTime,
  setTableLastSyncTime,
  parseDateSafe,
  getCloudSyncTime,
  getDeviceId,
  encodeSyncDocumentId,
  decodeSyncDocumentId,
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

  it('does not use a global cursor for a table without its own checkpoint', () => {
    setLastSyncTime('push', 1700000000000);

    expect(getTableLastSyncTime('push', 'youtube_summaries')).toBe(0);

    setTableLastSyncTime('push', 'youtube_summaries', 1699999999000);
    expect(getTableLastSyncTime('push', 'youtube_summaries')).toBe(1699999999000);
  });

  it('encodes Firestore-invalid document IDs and restores their original value', () => {
    const originalId = 'link_entity:https://example.com/path/to/item';
    const encoded = encodeSyncDocumentId(originalId);

    expect(encoded.encodingVersion).toBe(1);
    expect(encoded.id).not.toContain('/');
    expect(decodeSyncDocumentId(encoded.id, encoded.encodingVersion)).toBe(originalId);
  });

  it('preserves valid Firestore document IDs without changing their format', () => {
    const encoded = encodeSyncDocumentId('page-123');

    expect(encoded).toEqual({ id: 'page-123' });
    expect(decodeSyncDocumentId(encoded.id, encoded.encodingVersion)).toBe('page-123');
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
      expect(parseDateSafe({ seconds: isoTimestamp / 1000 })).toBe(isoTimestamp);

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

    it('uses the newest cloud timestamp, including Firestore timestamp objects and tombstones', () => {
      expect(getCloudSyncTime({
        updatedAt: { seconds: 1_700_000_000 },
        deletedAt: '2027-01-15T00:00:00.000Z',
      })).toBe(new Date('2027-01-15T00:00:00.000Z').getTime());
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
