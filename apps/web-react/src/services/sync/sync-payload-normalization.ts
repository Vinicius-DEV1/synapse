import type { SyncRow } from './sync-utils';

const JSON_ARRAY_COLUMNS_BY_TABLE: Record<string, readonly string[]> = {
  library_books: ['collections'],
  calendar_events: ['reminders', 'notified_reminders'],
};

/** Normalizes SQLite JSON-text arrays to the structured values used by Web rows. */
export function normalizeSyncPayloadRow(row: SyncRow, table: string): SyncRow {
  const columns = JSON_ARRAY_COLUMNS_BY_TABLE[table];
  if (!columns) return row;

  const normalized: SyncRow = { ...row };
  for (const column of columns) {
    const value = normalized[column];
    if (typeof value !== 'string') continue;

    try {
      const parsed: unknown = JSON.parse(value);
      if (Array.isArray(parsed)) normalized[column] = parsed;
    } catch {
      // Preserve malformed legacy values so sync does not erase recoverable text.
    }
  }

  return normalized;
}
