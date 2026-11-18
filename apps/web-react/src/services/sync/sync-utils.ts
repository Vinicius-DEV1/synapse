import { base64ToUint8Array, uint8ArrayToBase64 } from '../../utils/binary';

const SYNC_DOCUMENT_ID_PREFIX = 'synapse_id_v1_';
const SYNC_DOCUMENT_ID_ENCODING_VERSION = 1;
const FIRESTORE_MAX_DOCUMENT_ID_BYTES = 1500;

export const MODULE_TABLES: Record<string, string[]> = {
  core: ['config', 'ai_prompts'],
  notes: ['pages', 'page_history'],
  finance: ['transactions', 'wishlist', 'finance_accounts'],
  library: [
    'library_books', 
    'library_highlights', 
    'library_bookmarks', 
    'library_collections',
    'library_book_collections',
    'library_reading_sessions'
  ],
  culture: ['culture_items', 'culture_episodes', 'culture_disliked_items', 'culture_ignored_items'],
  video: ['videos', 'video_words', 'youtube_watched', 'youtube_summaries'],
  calendar: ['calendar_events'],
  vault: ['vault_groups', 'vault_items', 'vault_password_history'],
  practice: ['tutor_sessions', 'tutor_messages', 'tutor_memories'],
  focus: ['focus_sessions', 'alarms', 'lofis', 'activity_logs'],
  anki: ['anki_decks', 'anki_notes', 'anki_cards', 'anki_srs_state', 'anki_reviews', 'anki_deck_settings'],
  files: ['files', 'file_folders', 'file_page_links'],
  diagrams: ['diagrams'],
  quiz: ['quiz_batteries', 'quiz_questions', 'quiz_attempts', 'quiz_page_links'],
  habits: ['habits', 'habit_logs'],
  notifications: ['notifications'],
  sharing: ['shared_page_keys']
};

export const getLastSyncKey = (type: 'pull' | 'push', scopeKey = 'legacy') =>
  `caderno_last_${type}_time_${encodeURIComponent(scopeKey)}`;
export const getTableLastSyncKey = (type: 'pull' | 'push', table: string, scopeKey = 'legacy') =>
  `caderno_last_${type}_time_${encodeURIComponent(scopeKey)}_${table}`;

export function getLastSyncTime(type: 'pull' | 'push', scopeKey = 'legacy'): number {
  return parseInt(localStorage.getItem(getLastSyncKey(type, scopeKey)) || '0', 10);
}

export function setLastSyncTime(type: 'pull' | 'push', time: number, scopeKey = 'legacy') {
  localStorage.setItem(getLastSyncKey(type, scopeKey), time.toString());
}

export function getTableLastSyncTime(type: 'pull' | 'push', table: string, scopeKey = 'legacy'): number {
  const tableVal = localStorage.getItem(getTableLastSyncKey(type, table, scopeKey));
  if (tableVal !== null) {
    const parsed = parseInt(tableVal, 10);
    if (!isNaN(parsed) && parsed >= 0) return parsed;
  }

  // A global checkpoint cannot represent tables added later or tables whose
  // previous sync failed. Missing table checkpoints must trigger a full scan.
  return 0;
}

export function setTableLastSyncTime(type: 'pull' | 'push', table: string, time: number, scopeKey = 'legacy') {
  localStorage.setItem(getTableLastSyncKey(type, table, scopeKey), time.toString());
}

export interface EncodedSyncDocumentId {
  id: string;
  encodingVersion?: number;
}

export function encodeSyncDocumentId(id: string): EncodedSyncDocumentId {
  const idBytes = new TextEncoder().encode(id);
  const isValidFirestoreId =
    idBytes.byteLength > 0 &&
    idBytes.byteLength <= FIRESTORE_MAX_DOCUMENT_ID_BYTES &&
    !id.includes('/') &&
    id !== '.' &&
    id !== '..' &&
    !/^__.*__$/.test(id);

  if (isValidFirestoreId) return { id };

  const encoded = uint8ArrayToBase64(idBytes)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
  const documentId = `${SYNC_DOCUMENT_ID_PREFIX}${encoded}`;

  if (new TextEncoder().encode(documentId).byteLength > FIRESTORE_MAX_DOCUMENT_ID_BYTES) {
    throw new Error('Sync document ID exceeds the Firestore document ID limit.');
  }

  return { id: documentId, encodingVersion: SYNC_DOCUMENT_ID_ENCODING_VERSION };
}

export function decodeSyncDocumentId(id: string, encodingVersion: unknown): string {
  if (encodingVersion !== SYNC_DOCUMENT_ID_ENCODING_VERSION) return id;
  if (!id.startsWith(SYNC_DOCUMENT_ID_PREFIX)) {
    throw new Error('Invalid encoded sync document ID.');
  }

  const encoded = id
    .slice(SYNC_DOCUMENT_ID_PREFIX.length)
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  const base64 = encoded.padEnd(Math.ceil(encoded.length / 4) * 4, '=');
  return new TextDecoder().decode(base64ToUint8Array(base64));
}

export function parseDateSafe(dateValue: unknown): number {
  if (typeof dateValue === 'number') return Number.isFinite(dateValue) ? dateValue : 0;
  if (isRecord(dateValue) && typeof dateValue.seconds === 'number') {
    return Number.isFinite(dateValue.seconds) ? dateValue.seconds * 1000 : 0;
  }
  if (typeof dateValue !== 'string') return 0;
  let s = dateValue.trim();
  if (!s) return 0;

  // If format is "YYYY-MM-DD HH:mm:ss..." replace space with T
  if (s.includes(' ') && !s.includes('T')) {
    s = s.replace(' ', 'T');
  }

  // If no timezone suffix (Z or +/-offset), explicitly treat as UTC by appending 'Z'
  if (!s.endsWith('Z') && !/[+-]\d{2}(:?\d{2})?$/.test(s)) {
    s = s + 'Z';
  }

  const parsed = Date.parse(s);
  return isNaN(parsed) ? 0 : parsed;
}

export function getCloudSyncTime(value: unknown): number {
  if (!isRecord(value)) return 0;
  return Math.max(
    parseDateSafe(value.updatedAt || value.createdAt || 0),
    parseDateSafe(value.deletedAt || 0),
  );
}

/**
 * Generates and persists a unique deviceId per browser session.
 * Used by sync_signal listener to ignore echo signals from same device.
 */
export function getDeviceId(): string {
  let deviceId: string | null = null;
  try {
    deviceId = sessionStorage.getItem('caderno_device_id');
  } catch (storageError: unknown) {
    console.debug('[Sync] Session storage is unavailable; generating an ephemeral device ID.', storageError);
  }
  if (!deviceId) {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      deviceId = crypto.randomUUID();
    } else {
      deviceId = 'dev_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 9);
    }
    try {
      sessionStorage.setItem('caderno_device_id', deviceId);
    } catch (storageError: unknown) {
      console.debug('[Sync] Could not persist the device ID for this session.', storageError);
    }
  }
  return deviceId;
}

export interface SyncRow {
  id: string;
  updated_at?: string | number | null;
  created_at?: string | number | null;
  deleted_at?: string | number | null;
  crdt_state?: string | null;
  [key: string]: unknown;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isStringRecord(value: unknown): value is Record<string, string> {
  return isRecord(value) && Object.values(value).every((entry) => typeof entry === 'string');
}

export function parseSyncRows(value: unknown, table: string): SyncRow[] {
  if (!Array.isArray(value)) {
    throw new Error(`Local sync adapter returned a non-array result for ${table}.`);
  }

  const rows: SyncRow[] = [];
  for (const row of value) {
    if (!isRecord(row) || typeof row.id !== 'string' || row.id.length === 0) {
      throw new Error(`Local sync adapter returned a row without a valid ID for ${table}.`);
    }
    rows.push({ ...row, id: row.id });
  }
  return rows;
}
