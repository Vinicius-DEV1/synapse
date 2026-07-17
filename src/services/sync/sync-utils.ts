import { db } from '../firebase';
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';

export const MODULE_TABLES: Record<string, string[]> = {
  core: ['config'],
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
  video: ['videos', 'video_words'],
  calendar: ['calendar_events'],
  vault: ['vault_groups', 'vault_items', 'vault_password_history'],
  practice: ['tutor_sessions', 'tutor_messages', 'tutor_memories'],
  focus: ['focus_sessions', 'alarms', 'lofis'],
  anki: ['anki_decks', 'anki_cards', 'anki_srs_state', 'anki_reviews'],
  files: ['files', 'file_folders', 'file_page_links']
};

export const getLastSyncKey = (type: 'pull' | 'push') => `caderno_last_\${type}_time`;

export function getLastSyncTime(type: 'pull' | 'push'): number {
  return parseInt(localStorage.getItem(getLastSyncKey(type)) || '0', 10);
}

export function setLastSyncTime(type: 'pull' | 'push', time: number) {
  localStorage.setItem(getLastSyncKey(type), time.toString());
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

export async function hardResetCloud(): Promise<void> {
  // console.log("Iniciando Hard Reset da nuvem...");
  const allTables = Object.values(MODULE_TABLES).flat();
  for (const table of allTables) {
    try {
      const snap = await getDocs(collection(db, table));
      for (const d of snap.docs) {
        if (table === 'config' && (d.id === 'auth_validator' || d.id === 'module_keys' || d.id === 'sync_signal')) {
          await deleteDoc(doc(db, table, d.id));
          continue;
        }
        await deleteDoc(doc(db, table, d.id));
      }
      // console.log(`Tabela \${table} limpa na nuvem.`);
    } catch (err) {
      console.error(`Erro ao limpar tabela \${table}:`, err);
    }
  }
  
  // Limpar os docs fixos de config explicitamente (para garantir que a nuvem fique 100% virgem)
  try {
    await deleteDoc(doc(db, 'config', 'auth_validator'));
    await deleteDoc(doc(db, 'config', 'module_keys'));
    await deleteDoc(doc(db, 'config', 'sync_signal'));
  } catch (err) {}

  // console.log("Hard Reset concluído! A nuvem está 100% limpa.");
}

if (typeof window !== 'undefined') {
  (window as any).hardResetCloud = hardResetCloud;
}
