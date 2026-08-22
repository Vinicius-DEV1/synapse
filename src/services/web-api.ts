import { getWebDb } from './db-web';
import type { CadernoDBSchema } from './db-web';
import type { StoreNames, StoreKey } from 'idb';
import { PayloadOptimizer } from '../utils/payload-optimizer';
import { webFinanceApi } from '../api/web/finance';
import { webAuthApi } from '../api/web/auth';
import { webLibraryApi } from '../api/web/library';
import { webCultureApi } from '../api/web/culture';
import { webFocusApi } from '../api/web/focus';
import { webSyncApi } from '../api/web/sync';
import { webCalendarApi } from '../api/web/calendar';
import { webVaultApi } from '../api/web/vault';
import { webPracticeApi } from '../api/web/practice';
import { webFilesApi } from '../api/web/files';
import { webAnkiApi } from '../api/web/anki/index';
import { webYoutubeApi } from '../api/web/youtube';
import { webTrashApi } from '../api/web/trash';
import { webDiagramsApi } from '../api/web/diagrams';
import { webNotificationsApi } from '../api/web/notifications';

// Helper function for ID generation
const generateId = () => crypto.randomUUID();

// Master key reference stored in Web API scope
let _masterKey: CryptoKey | null = null;

export const createWebApiMock = async () => {
  const db = await getWebDb();

  let syncCallbacks: (() => void)[] = [];
  const triggerSync = () => syncCallbacks.forEach(cb => cb());

  const originalPut = db.put.bind(db);
  const originalDelete = db.delete.bind(db);

  db.put = (async <Name extends StoreNames<CadernoDBSchema>>(storeName: Name, val: CadernoDBSchema[Name]['value'], key?: IDBKeyRange | StoreKey<CadernoDBSchema, Name>) => {
    const optimizedVal = PayloadOptimizer.optimize(val);
    const res = await originalPut<Name>(storeName, optimizedVal, key);
    if (storeName !== 'config' || (val && !['sync_signal', 'auth_validator', 'module_keys'].includes(val.id))) {
      triggerSync();
    }
    return res;
  }) as typeof db.put;

  db.delete = (async <Name extends StoreNames<CadernoDBSchema>>(storeName: Name, key: IDBKeyRange | StoreKey<CadernoDBSchema, Name>) => {
    const res = await originalDelete<Name>(storeName, key);
    if (storeName !== 'config' || !['sync_signal', 'auth_validator', 'module_keys'].includes(key as string)) {
      triggerSync();
    }
    return res;
  }) as typeof db.delete;

  return {
    // WEB-SPECIFIC HELPER TO INJECT MASTER KEY
    _setMasterKey: (key: CryptoKey | null) => { _masterKey = key; },
    onSyncTrigger: (callback: () => void) => {
      syncCallbacks.push(callback);
      return () => {
        syncCallbacks = syncCallbacks.filter(cb => cb !== callback);
      };
    },

    // --- CONFIG ---
    config: {
      get: async (key: string) => {
        const item = await db.get('config', key);
        return item ? item.value : null;
      },
      set: async (key: string, data: any) => {
        await db.put('config', { id: key, value: data, updated_at: new Date().toISOString() });
        return { success: true };
      }
    },

    // --- PAGES ---
    getAllPages: async () => {
      const all = await db.getAll('pages');
      return all.filter(p => !p.deleted_at).map(p => {
        const { content, encrypted_content, ...rest } = p;
        if (rest.parent_id === undefined) rest.parent_id = null;
        if (rest.is_pinned === undefined) rest.is_pinned = 0;
        return rest;
      });
    },
    getPageContent: async (id: string) => {
      const page = await db.get('pages', id);
      if (!page || page.deleted_at) return { content: '', encrypted_content: null };
      return { content: page.content || '', encrypted_content: page.encrypted_content || null };
    },
    createPage: async ({ parentId, title, icon }: { parentId: string | null; title?: string; icon?: string }) => {
      const page = {
        id: generateId(),
        parent_id: parentId || null,
        title: title || 'Nova Página',
        icon: icon || '📄',
        sort_order: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_locked: 0,
      };
      await db.put('pages', page);
      return page;
    },
    updatePage: async (page: any) => {
      const existing = await db.get('pages', page.id);
      if (!existing) return 0;

      // Check for actual changes before updating updated_at
      const fieldsToCheck = ['title', 'icon', 'content', 'encrypted_content', 'crdt_state', 'parent_id', 'is_pinned', 'pinned_order'];
      let hasChanges = false;

      for (const field of fieldsToCheck) {
        if (page[field] !== undefined && page[field] !== existing[field]) {
          hasChanges = true;
          break;
        }
      }

      const updated = { ...existing, ...page };
      if (hasChanges) {
        updated.updated_at = new Date().toISOString();
      }

      await db.put('pages', updated);
      return 1;
    },
    deletePage: async (id: string) => {
      const existing = await db.get('pages', id);
      if (!existing) return false;
      existing.deleted_at = new Date().toISOString();
      existing.updated_at = new Date().toISOString();
      await db.put('pages', existing);
      return true;
    },
    getDeletedPages: async () => {
      const all = await db.getAll('pages');
      return all.filter(p => p.deleted_at).sort((a, b) => new Date(b.deleted_at!).getTime() - new Date(a.deleted_at!).getTime());
    },
    restorePage: async (id: string) => {
      const existing = await db.get('pages', id);
      if (!existing) return false;
      existing.deleted_at = null;
      existing.updated_at = new Date().toISOString();
      await db.put('pages', existing);
      return true;
    },
    reorderPages: async (updates: any[]) => {
      const tx = db.transaction('pages', 'readwrite');
      for (const update of updates) {
        const existing = await tx.store.get(update.id);
        if (existing) {
          existing.sort_order = update.sort_order;
          existing.updated_at = new Date().toISOString();
          await tx.store.put(existing);
        }
      }
      await tx.done;
      return true;
    },
    getPageHistory: async (_pageId: string) => [],
    exportBackup: async () => ({ success: false, error: "Backup não suportado na versão Web" }),

    // --- AUTH ---
    auth: webAuthApi(db),

    // --- FINANCE ---
    finance: webFinanceApi(db, generateId),

    // --- LIBRARY ---
    library: webLibraryApi(db, generateId, () => _masterKey),

    // --- CULTURE ---
    culture: webCultureApi(db, generateId),

    // --- FOCUS ---
    focus: webFocusApi(db, generateId),

    // --- CALENDAR ---
    calendar: webCalendarApi(db),
    notifications: webNotificationsApi(db),

    // --- VAULT ---
    vault: webVaultApi(db, generateId),

    // --- FILES ---
    files: webFilesApi(db, generateId),
    anki: webAnkiApi(db, generateId),
    youtube: webYoutubeApi(db, generateId),
    trash: webTrashApi(db),

    // --- SYNC ---
    sync: webSyncApi(db, originalDelete, originalPut),

    // --- PRACTICE ---
    practice: webPracticeApi(db, generateId),
    
    // --- DIAGRAMS ---
    diagrams: webDiagramsApi(db, generateId, () => _masterKey),
  };
};
