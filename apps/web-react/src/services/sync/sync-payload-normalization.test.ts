import { describe, expect, it } from 'vitest';
import { decryptText } from '../crypto';
import { prepareRowsForPush } from './sync-payload';
import { normalizeSyncPayloadRow } from './sync-payload-normalization';

describe('normalizeSyncPayloadRow', () => {
  it('publishes SQLite JSON text arrays as structured library collection data', () => {
    const row = { id: 'book-1', collections: '[{"id":"fiction"}]' };

    expect(normalizeSyncPayloadRow(row, 'library_books')).toEqual({
      id: 'book-1',
      collections: [{ id: 'fiction' }],
    });
  });

  it('normalizes calendar reminder arrays and leaves unrelated fields intact', () => {
    const row = {
      id: 'event-1',
      reminders: '[1440,15]',
      notified_reminders: '[15]',
      title: 'Review',
    };

    expect(normalizeSyncPayloadRow(row, 'calendar_events')).toEqual({
      id: 'event-1',
      reminders: [1440, 15],
      notified_reminders: [15],
      title: 'Review',
    });
  });

  it('preserves malformed legacy text and fields outside the JSON-array contract', () => {
    const malformed = { id: 'event-2', reminders: '[15', notified_reminders: null };

    expect(normalizeSyncPayloadRow(malformed, 'calendar_events')).toEqual(malformed);
    expect(normalizeSyncPayloadRow({ id: 'book-2', collections: '["x"]' }, 'config')).toEqual({
      id: 'book-2',
      collections: '["x"]',
    });
  });

  it('encrypts structured reminder arrays instead of SQLite JSON text', async () => {
    const key = await crypto.subtle.importKey(
      'raw',
      new Uint8Array(32).fill(7),
      { name: 'AES-GCM' },
      true,
      ['encrypt', 'decrypt']
    );
    const { prepared } = await prepareRowsForPush(
      [{ id: 'event-3', reminders: '[60,15]' }],
      key,
      'calendar_events'
    );
    const encryptedData = prepared[0]?.encryptedData;
    if (!encryptedData) throw new Error('Expected one encrypted calendar event.');

    const payload: unknown = JSON.parse(await decryptText(encryptedData, key));
    expect(payload).toEqual({ reminders: [60, 15] });
  });
});
