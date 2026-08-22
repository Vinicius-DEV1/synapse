import { invoke } from '@tauri-apps/api/core';
import { tauriAuthApi } from './api/tauri/auth';
import { tauriFinanceApi } from './api/tauri/finance';
import { tauriLibraryApi } from './api/tauri/library';
import { tauriCultureApi } from './api/tauri/culture';
import { tauriCalendarApi } from './api/tauri/calendar';
import { tauriFocusApi } from './api/tauri/focus';
import { tauriAnkiApi } from './api/tauri/anki';
import { tauriSyncApi } from './api/tauri/sync';
import { tauriVaultApi } from './api/tauri/vault';
import { tauriPracticeApi } from './api/tauri/practice';
import { tauriDriveApi } from './api/tauri/drive';
import { tauriVideoApi, tauriLofiApi, tauriYoutubeApi, tauriAudioApi, tauriTranscribeApi, tauriOsApi } from './api/tauri/multimedia';
import { tauriBackupApi } from './api/tauri/backup';
import { tauriFilesApi } from './api/tauri/files';
import { tauriTrashApi } from './api/tauri/trash';
import { tauriDiagramsApi } from './api/tauri/diagrams';
import { tauriNotificationsApi } from './api/tauri/notifications';

export const createTauriApi = async () => {
  let syncCallbacks: (() => void)[] = [];
  const triggerSync = () => syncCallbacks.forEach(cb => cb());

  window.addEventListener('app-sync-trigger', triggerSync);

  return {
    onSyncTrigger: (callback: () => void) => {
      syncCallbacks.push(callback);
      return () => {
        syncCallbacks = syncCallbacks.filter(cb => cb !== callback);
      };
    },

    // --- AUTH ---
    auth: tauriAuthApi,

    // Settings and Keys using DB config table
    config: { 
      get: async (key: string) => {
        try {
          const rows = await invoke<any[]>('sync_get_table', { tableName: 'config' });
          const row = rows.find(r => r.id === key);
          if (row && row.data) {
            return JSON.parse(row.data);
          }
        } catch (e) {
          console.error("Config get error:", e);
        }
        return null;
      }, 
      set: async (key: string, value: any) => {
        try {
          await invoke('sync_upsert_row', { 
            tableName: 'config', 
            row: { id: key, data: JSON.stringify(value), updated_at: new Date().toISOString() } 
          });
          return { success: true };
        } catch (e) {
          console.error("Config set error:", e);
          return { success: false };
        }
      } 
    },
    // --- PAGES ---
    getAllPages: async () => await invoke('notes_get_all_pages'),
    getPageContent: async (id: string) => await invoke('notes_get_page_content', { id }),
    createPage: async (page: any) => await invoke('notes_create_page', { page }),
    updatePage: async (page: any) => await invoke('notes_update_page', { page }),
    deletePage: async (id: string) => await invoke('notes_delete_page', { id }),
    getDeletedPages: async () => await invoke('notes_get_deleted_pages'),
    restorePage: async (id: string) => await invoke('notes_restore_page', { id }),
    reorderPages: async () => true, // TODO
    getPageHistory: async (pageId: string) => await invoke('notes_get_page_history', { pageId }),
    
    // --- IMAGE CACHE ---
    imageCache: {
      get: async (id: string) => await invoke('image_cache_get', { id }),
      put: async (id: string, data: ArrayBuffer, mimeType: string) => 
        await invoke('image_cache_put', { id, data: Array.from(new Uint8Array(data)), mimeType })
    },
    // --- FINANCE ---
    finance: tauriFinanceApi,
    
    // --- LIBRARY ---
    library: tauriLibraryApi,
    
    // --- CALENDAR ---
    calendar: tauriCalendarApi,
    
    // --- CULTURE ---
    culture: tauriCultureApi,
    
    // --- FOCUS ---
    focus: tauriFocusApi,
    
    // --- ANKI ---
    anki: tauriAnkiApi,
    
    // --- SYNC ---
    sync: tauriSyncApi,
    
    // --- DRIVE ---
    drive: tauriDriveApi,
    
    // --- MULTIMEDIA (Native Rust Integrations) ---
    video: tauriVideoApi,
    
    lofi: tauriLofiApi,
    
    youtube: tauriYoutubeApi,
    
    audio: tauriAudioApi,
    
    transcribe: tauriTranscribeApi,
    
    os: tauriOsApi,
    
    trash: tauriTrashApi,
    
    backup: tauriBackupApi,
    
    // --- FILES ---
    files: tauriFilesApi,
    
    // --- VAULT ---
    vault: tauriVaultApi,
    
    // --- PRACTICE ---
    practice: tauriPracticeApi,
    
    // --- DIAGRAMS ---
    diagrams: tauriDiagramsApi,
    
    // --- NOTIFICATIONS ---
    notifications: tauriNotificationsApi
  };
};
