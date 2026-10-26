import { db } from '../firebase';
import { collection, getDocs,  doc, writeBatch } from 'firebase/firestore';
import { logFirebaseOp } from './sync-monitor';

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
  culture: ['culture_items', 'culture_episodes'],
  video: ['videos', 'video_words', 'youtube_watched'],
  calendar: ['calendar_events'],
  vault: ['vault_groups', 'vault_items', 'vault_password_history'],
  practice: ['tutor_sessions', 'tutor_messages', 'tutor_memories'],
  focus: ['focus_sessions', 'alarms', 'lofis', 'activity_logs'],
  anki: ['anki_decks', 'anki_notes', 'anki_cards', 'anki_srs_state', 'anki_reviews', 'anki_deck_settings'],
  files: ['files', 'file_folders', 'file_page_links'],
  diagrams: ['diagrams'],
  quiz: ['quiz_batteries', 'quiz_questions', 'quiz_attempts', 'quiz_page_links']
};

export const getLastSyncKey = (type: 'pull' | 'push') => `caderno_last_${type}_time`;
export const getTableLastSyncKey = (type: 'pull' | 'push', table: string) => `caderno_last_${type}_time_${table}`;

export function getLastSyncTime(type: 'pull' | 'push'): number {
  return parseInt(localStorage.getItem(getLastSyncKey(type)) || '0', 10);
}

export function setLastSyncTime(type: 'pull' | 'push', time: number) {
  localStorage.setItem(getLastSyncKey(type), time.toString());
}

export function getTableLastSyncTime(type: 'pull' | 'push', table: string): number {
  const tableVal = localStorage.getItem(getTableLastSyncKey(type, table));
  if (tableVal) {
    const parsed = parseInt(tableVal, 10);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }
  return getLastSyncTime(type);
}

export function setTableLastSyncTime(type: 'pull' | 'push', table: string, time: number) {
  localStorage.setItem(getTableLastSyncKey(type, table), time.toString());
}

export async function restoreLastSyncTimesFromDb(): Promise<void> {
  // Deprecated: avoid saving to DB to prevent infinite sync triggers
}

export function parseDateSafe(dateStr: string | undefined | null | number): number {
  if (!dateStr) return 0;
  if (typeof dateStr === 'number') return isNaN(dateStr) ? 0 : dateStr;
  let s = String(dateStr).trim();
  if (!s) return 0;

  // If format is "YYYY-MM-DD HH:mm:ss..." replace space with T
  if (s.includes(' ') && !s.includes('T')) {
    s = s.replace(' ', 'T');
  }

  // If no timezone suffix (Z or +/-offset), explicitly treat as UTC by appending 'Z'
  if (!s.endsWith('Z') && !/[+-]\d{2}(:?\d{2})?$/.test(s)) {
    s = s + 'Z';
  }

  const parsed = new Date(s).getTime();
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Generates and persists a unique deviceId per browser session.
 * Used by sync_signal listener to ignore echo signals from same device.
 */
export function getDeviceId(): string {
  let deviceId: string | null = null;
  try {
    deviceId = sessionStorage.getItem('caderno_device_id');
  } catch {
    // Restricted environment or private mode
  }
  if (!deviceId) {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      deviceId = crypto.randomUUID();
    } else {
      deviceId = 'dev_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 9);
    }
    try {
      sessionStorage.setItem('caderno_device_id', deviceId);
    } catch {
      // Storage access denied
    }
  }
  return deviceId;
}

/**
 * Hard reset optimized using writeBatch instead of sequential deleteDoc.
 * Deletes up to 400 docs per batch (Firestore batch limit is 500).
 */
const BATCH_DELETE_SIZE = 400;

export async function hardResetCloud(): Promise<void> {
  const allTables = Object.values(MODULE_TABLES).flat();
  
  for (const table of allTables) {
    try {
      const snap = await getDocs(collection(db, table));
      logFirebaseOp('read', snap.docs.length || 1);
      if (snap.empty) continue;

      // Chunk into batches for Firestore batch delete
      const docs = snap.docs;
      for (let i = 0; i < docs.length; i += BATCH_DELETE_SIZE) {
        const chunk = docs.slice(i, i + BATCH_DELETE_SIZE);
        const batch = writeBatch(db);
        for (const d of chunk) {
          batch.delete(doc(db, table, d.id));
        }
        await batch.commit();
        logFirebaseOp('delete', chunk.length);
      }
    } catch (err) {
      console.error(`Erro ao limpar tabela ${table}:`, err);
    }
  }
  
  // Clean fixed config docs that may not be in getDocs (cache edge case)
  try {
    const configBatch = writeBatch(db);
    configBatch.delete(doc(db, 'config', 'auth_validator'));
    configBatch.delete(doc(db, 'config', 'module_keys'));
    configBatch.delete(doc(db, 'config', 'sync_signal'));
    configBatch.delete(doc(db, 'config', 'sync_manifest'));
    await configBatch.commit();
    logFirebaseOp('delete', 4);
  } catch (err: unknown) {
    console.debug('[SyncUtils] Error cleaning fixed config docs during wipe:', err);
  }
}

export interface SyncRow {
  id: string;
  updated_at?: string | number | null;
  created_at?: string | number | null;
  deleted_at?: string | number | null;
  crdt_state?: string | null;
  [key: string]: unknown;
}
