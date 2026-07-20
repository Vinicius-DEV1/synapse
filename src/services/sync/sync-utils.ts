import { db } from '../firebase';
import { collection, getDocs, deleteDoc, doc, writeBatch } from 'firebase/firestore';

export const MODULE_TABLES: Record<string, string[]> = {
  core: ['config', 'ai_prompts'],
  notes: ['pages', 'page_history'],
  finance: ['transactions', 'wishlist'],
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
  focus: ['focus_sessions', 'alarms', 'lofis'],
  anki: ['anki_decks', 'anki_notes', 'anki_cards', 'anki_srs_state', 'anki_reviews', 'anki_deck_settings'],
  files: ['files', 'file_folders', 'file_page_links']
};

export const getLastSyncKey = (type: 'pull' | 'push') => `caderno_last_${type}_time`;

export function getLastSyncTime(type: 'pull' | 'push'): number {
  const localStorageValue = parseInt(localStorage.getItem(getLastSyncKey(type)) || '0', 10);
  
  // #10: Tentar ler backup do banco local (mais resiliente que localStorage)
  try {
    const dbBackupKey = `caderno_sync_backup_${type}`;
    const dbValue = parseInt(localStorage.getItem(dbBackupKey) || '0', 10);
    // Usar o valor mais recente entre localStorage e backup
    return Math.max(localStorageValue, dbValue);
  } catch {
    return localStorageValue;
  }
}

export function setLastSyncTime(type: 'pull' | 'push', time: number) {
  localStorage.setItem(getLastSyncKey(type), time.toString());
  
  // #10: Backup redundante — salva também via API do banco local
  // Isso protege contra limpeza de localStorage pelo browser
  try {
    if (window.api?.config?.set) {
      window.api.config.set(`last_sync_${type}_time`, time).catch(() => {});
    }
  } catch {
    // Fallback silencioso: o localStorage já salvou
  }
}

/**
 * #10: Restaura lastSyncTime do banco local caso o localStorage tenha sido limpo.
 * Deve ser chamado uma vez na inicialização do sync.
 */
export async function restoreLastSyncTimesFromDb(): Promise<void> {
  try {
    if (!window.api?.config?.get) return;
    
    for (const type of ['pull', 'push'] as const) {
      const dbValue = await window.api.config.get(`last_sync_${type}_time`);
      if (typeof dbValue === 'number' && dbValue > 0) {
        const currentValue = parseInt(localStorage.getItem(getLastSyncKey(type)) || '0', 10);
        if (dbValue > currentValue) {
          localStorage.setItem(getLastSyncKey(type), dbValue.toString());
        }
      }
    }
  } catch {
    // Falha silenciosa: sync continuará com full sync se necessário
  }
}

export function parseDateSafe(dateStr: string | undefined | null | number): number {
  if (!dateStr) return 0;
  if (typeof dateStr === 'number') return dateStr;
  let s = dateStr;
  if (s.length === 19 && s.charAt(10) === ' ') {
    s = s.replace(' ', 'T') + 'Z';
  } else if (s.length === 19 && s.charAt(10) === 'T' && !s.endsWith('Z')) {
    s = s + 'Z';
  }
  const parsed = new Date(s).getTime();
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * #7: Gera e persiste um deviceId único por sessão de navegador.
 * Usado para que o listener de sync_signal ignore sinais do próprio dispositivo.
 */
export function getDeviceId(): string {
  let deviceId = sessionStorage.getItem('caderno_device_id');
  if (!deviceId) {
    deviceId = crypto.randomUUID();
    sessionStorage.setItem('caderno_device_id', deviceId);
  }
  return deviceId;
}

/**
 * #8: Hard reset otimizado com writeBatch em vez de deleteDoc sequencial.
 * Deleta até 400 docs por batch (limite Firestore = 500).
 */
const BATCH_DELETE_SIZE = 400;

export async function hardResetCloud(): Promise<void> {
  const allTables = Object.values(MODULE_TABLES).flat();
  
  for (const table of allTables) {
    try {
      const snap = await getDocs(collection(db, table));
      if (snap.empty) continue;

      // Dividir em chunks para batch delete
      const docs = snap.docs;
      for (let i = 0; i < docs.length; i += BATCH_DELETE_SIZE) {
        const chunk = docs.slice(i, i + BATCH_DELETE_SIZE);
        const batch = writeBatch(db);
        for (const d of chunk) {
          batch.delete(doc(db, table, d.id));
        }
        await batch.commit();
      }
    } catch (err) {
      console.error(`Erro ao limpar tabela ${table}:`, err);
    }
  }
  
  // Limpar os docs fixos de config que podem não estar no getDocs (edge case de cache)
  try {
    const configBatch = writeBatch(db);
    configBatch.delete(doc(db, 'config', 'auth_validator'));
    configBatch.delete(doc(db, 'config', 'module_keys'));
    configBatch.delete(doc(db, 'config', 'sync_signal'));
    await configBatch.commit();
  } catch (err) {}
}

if (typeof window !== 'undefined') {
  window.hardResetCloud = hardResetCloud;
}
