import { webviewNotesApi } from './notes';
import { webviewSyncApi } from './sync';
import { webviewFilesApi } from './files';
import { webviewTrashApi } from './trash';
import { webviewImageCacheApi } from './imageCache';
import { webviewFinanceApi } from './finance';
import { webviewCalendarApi } from './calendar';
import { webviewCultureApi } from './culture';
import { webviewLibraryApi } from './library';
import { webviewFocusApi } from './focus';
import { webviewAnkiApi } from './anki';
import { webviewVaultApi } from './vault';
import { webviewDiagramsApi } from './diagrams';
import { webviewNotificationsApi } from './notifications';
import { webviewAuthApi } from './auth';
import { notifyAppReady, sendBridgeMessage } from './bridgeClient';
import type { ICadernoAPI } from '../types';

let currentMasterKey: CryptoKey | null = null;

export async function createMobileWebViewApi(): Promise<ICadernoAPI> {
  // Ensure native SQLite is initialized
  await sendBridgeMessage('SQLITE_INIT').catch(() => {});

  const api: ICadernoAPI = {
    // --- NOTES (PAGES) ---
    getAllPages: webviewNotesApi.getAllPages,
    getPageContent: webviewNotesApi.getPageContent,
    createPage: webviewNotesApi.createPage,
    updatePage: webviewNotesApi.updatePage,
    deletePage: webviewNotesApi.deletePage,
    getDeletedPages: webviewNotesApi.getDeletedPages,
    restorePage: webviewNotesApi.restorePage,
    reorderPages: webviewNotesApi.reorderPages,
    getPageHistory: webviewNotesApi.getPageHistory,

    // --- IMAGE CACHE ---
    imageCache: webviewImageCacheApi,

    // --- AUTH ---
    auth: webviewAuthApi,

    // --- SYNC ---
    sync: webviewSyncApi,

    // --- FILES ---
    files: webviewFilesApi,

    // --- TRASH ---
    trash: webviewTrashApi,

    // --- FINANCE ---
    finance: webviewFinanceApi,

    // --- CALENDAR ---
    calendar: webviewCalendarApi,

    // --- CULTURE ---
    culture: webviewCultureApi,

    // --- LIBRARY ---
    library: webviewLibraryApi(() => currentMasterKey),

    // --- FOCUS ---
    focus: webviewFocusApi,

    // --- ANKI ---
    anki: webviewAnkiApi,

    // --- VAULT ---
    vault: webviewVaultApi,

    // --- DIAGRAMS ---
    diagrams: webviewDiagramsApi,

    // --- NOTIFICATIONS ---
    notifications: webviewNotificationsApi,

    // --- APP CONTROLS ---
    app: {
      getDbPath: async () => 'caderno.db (mobile-sqlite)',
      quit: () => {},
      minimize: () => {},
      toggleMaximize: () => {},
      isMaximized: async () => true,
    },

    // --- DRIVE INTEGRATION (Web fallback) ---
    drive: {
      openUrl: async (url: string) => {
        await sendBridgeMessage('OPEN_URL', { url });
      },
      getCredentials: async () => null,
      saveCredentials: async () => {},
    },

    // --- VIDEO / MULTIMEDIA ---
    video: {
      getLocalPath: async () => null,
      readFile: async () => new Uint8Array(),
      uploadFileToDrive: async () => '',
      deleteLocal: async () => {},
      importAndEncrypt: async () => ({ id: '', duration: 0, original_name: '' }),
      processUpload: async () => '',
      generateWeb: async () => ({ web_file_id: '', subtitles: [], audio_tracks: [] }),
      saveLocal: async () => {},
      downloadDriveFile: async () => '',
      scanTracks: async () => ({ subtitles: [], audio_tracks: [] }),
      extractSubtitles: async () => '',
      extractAudio: async () => '',
      remuxDefaultTrack: async () => '',
      convertMp4: async () => '',
      cancelConversion: async () => {},
    },

    // --- LOFI ---
    lofi: {
      getLocalPath: async () => null,
      deleteLocal: async () => {},
      saveLocal: async () => {},
      copyLocal: async () => '',
    },

    // --- YOUTUBE ---
    youtube: {
      fetchInfo: async () => ({ title: '', channel: '', duration: 0, is_playlist: false }),
      fetchPlaylistInfo: async () => [],
      getWatched: async () => [],
      setWatched: async () => {},
      download: async () => '',
    },

    // --- PRACTICE / TUTOR ---
    practice: {
      getSessions: async () => [],
      createSession: async (title: string, prompt?: string) => ({
        id: `tutor_${Date.now()}`,
        title,
        started_at: new Date().toISOString(),
        custom_prompt: prompt,
      }),
      updateSession: async () => {},
      getMessages: async () => [],
      createMessage: async (sessionId: string, role: string, content: string) => ({
        id: `msg_${Date.now()}`,
        session_id: sessionId,
        role: role as any,
        text_content: content,
        created_at: new Date().toISOString(),
      }),
      getMemories: async () => [],
      createMemory: async (cat: string, fact: string) => ({
        id: `mem_${Date.now()}`,
        category: cat,
        fact,
        created_at: new Date().toISOString(),
      }),
      deleteMemory: async () => {},
    },

    // Internal master key setter for encrypted modules
    _setMasterKey: (key: CryptoKey | null) => {
      currentMasterKey = key;
    },

    // Internal sync running flag
    _setSyncRunning: () => {},
  } as any;

  // Signal Native Shell that the web app is primed and ready to dismiss splash screen
  setTimeout(() => {
    notifyAppReady().catch(() => {});
  }, 100);

  return api;
}
