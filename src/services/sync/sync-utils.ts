import { db } from '../firebase';
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';

export const MODULE_TABLES: Record<string, string[]> = {
  core: ['config'],
  notes: ['pages'],
  finance: ['transactions', 'wishlist'],
  library: [
    'library_books', 
    'library_highlights', 
    'library_bookmarks', 
    'library_collections',
    'library_book_collections',
    'library_reading_sessions'
  ],
  culture: ['items', 'episodes'],
  video: ['videos']
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
  console.log("Iniciando Hard Reset da nuvem...");
  const allTables = Object.values(MODULE_TABLES).flat();
  for (const table of allTables) {
    try {
      const snap = await getDocs(collection(db, table));
      for (const d of snap.docs) {
        await deleteDoc(doc(db, table, d.id));
      }
      console.log(`Tabela \${table} limpa na nuvem.`);
    } catch (err) {
      console.error(`Erro ao limpar tabela \${table}:`, err);
    }
  }
  console.log("Hard Reset concluído! A próxima sincronização enviará apenas os dados válidos atuais do seu Desktop.");
}

if (typeof window !== 'undefined') {
  (window as any).hardResetCloud = hardResetCloud;
}
