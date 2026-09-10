import { tauriConfigApi } from './api/tauri/config';
import { tauriNotesApi } from './api/tauri/notes';
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
import { tauriQuizApi } from './api/tauri/quiz';

const syncCallbacks = new Set<() => void>();
let isGlobalSyncTriggerAttached = false;

function ensureGlobalSyncTriggerListener(): void {
  if (typeof window === 'undefined' || isGlobalSyncTriggerAttached) return;
  window.addEventListener('app-sync-trigger', () => {
    syncCallbacks.forEach((cb) => {
      try {
        cb();
      } catch (err) {
        console.error('[TauriApi] Error executing sync callback:', err);
      }
    });
  });
  isGlobalSyncTriggerAttached = true;
}

export const createTauriApi = async () => {
  return {
    onSyncTrigger: (callback: () => void) => {
      ensureGlobalSyncTriggerListener();
      syncCallbacks.add(callback);
      return () => {
        syncCallbacks.delete(callback);
      };
    },

    // --- AUTH ---
    auth: tauriAuthApi,

    // Settings and Keys using DB config table
    config: tauriConfigApi,
    
    // --- PAGES & IMAGE CACHE ---
    ...tauriNotesApi,
    
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
    notifications: tauriNotificationsApi,

    // --- QUIZ ---
    quiz: tauriQuizApi,
  };
};
