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
import { createWebConfigApi } from '../api/web/config';
import { createWebNotesApi } from '../api/web/notes';

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
    config: createWebConfigApi(db),

    // --- PAGES ---
    ...createWebNotesApi(db, generateId),

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
