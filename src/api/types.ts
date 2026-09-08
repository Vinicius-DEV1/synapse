import type { Page, PageHistoryEntry, PageMeta } from '../types/notes';
import type { Transaction, WishlistItem, Account } from '../types/finance';
import type { CultureItem, CultureEpisode } from '../types/culture';
import type {
  LibraryBook,
  LibraryCollection,
  LibraryHighlight,
  LibraryBookmark,
  OcrCacheEntry,
  ReadingSession,
  BookReadingStats,
  GlobalReadingStats,
  ReadingStatus,
  HighlightColor,
  HighlightType
} from '../types/library';
import type { CalendarEvent } from '../types/calendar';
import type { AppNotification } from '../types/notifications';
import type { VaultGroup, VaultItem, VaultPasswordHistoryEntry, PasswordGenOptions, BreachCheckResult } from '../types/vault';
import type { TutorSession, TutorMessage, TutorMemory } from '../types/practice';
import type { DiagramMeta, DiagramContent } from '../types/diagrams';
import type { FileItem, FileFolder, FilePageLink } from '../types/files';
import type { IQuizApi } from './contracts/quiz';

export interface FilesApi {
  getAll: () => Promise<FileItem[]>;
  getById: (id: string) => Promise<FileItem | null>;
  create: (file: Partial<FileItem> & { name: string; file_type: string; file_size: number }) => Promise<FileItem>;
  update: (file: FileItem) => Promise<number>;
  delete: (id: string) => Promise<boolean>;
  move: (id: string, folderId: string | null) => Promise<boolean>;
  saveLocal: (filename: string, data: Uint8Array) => Promise<string>;
  getLocal: (id: string) => Promise<string | null>;
  folders: {
    getAll: () => Promise<FileFolder[]>;
    create: (folder: Partial<FileFolder> & { name: string }) => Promise<FileFolder>;
    update: (folder: FileFolder) => Promise<number>;
    delete: (id: string) => Promise<boolean>;
  };
  links: {
    getByPage: (pageId: string) => Promise<FilePageLink[]>;
    getByFile: (fileId: string) => Promise<FilePageLink[]>;
    create: (link: Partial<FilePageLink> & { file_id: string; page_id: string }) => Promise<FilePageLink>;
    delete: (id: string) => Promise<boolean>;
  };
}

export interface AuthApi {
  setup: (password: string, existingKeys?: { library?: string; finance?: string; notes?: string }) => Promise<{ success: boolean; error?: string; keys?: { library?: string; finance?: string; notes?: string } }>;
  login: (password: string) => Promise<{ success: boolean; error?: string; keys?: { library?: string; finance?: string; notes?: string } }>;
  status: () => Promise<{ status: 'new' | 'encrypted' | 'unencrypted' }>;
  wipeLocalData: () => Promise<void>;
  changePassword: (newPassword: string) => Promise<{ success: boolean; error?: string }>;
  createVisitor: (visitorPassword: string, allowedModules: string[]) => Promise<{ success: boolean; error?: string; visitorId?: string }>;
  getVisitors: () => Promise<Array<{ id: string; modules: string[] }>>;
  deleteVisitor: (id: string) => Promise<{ success: boolean; error?: string }>;
  onLock: (callback: () => void) => () => void;
  lock: () => Promise<void>;
  setPreferences: (prefs: { autoLockOnSuspend: boolean }) => Promise<void>;
}

export interface FinanceApi {
  getTransactions: () => Promise<Transaction[]>;
  createTransaction: (tx: Partial<Transaction>) => Promise<Transaction>;
  updateTransaction: (id: string, tx: Partial<Transaction>) => Promise<{ success: boolean }>;
  deleteTransaction: (id: string) => Promise<boolean>;
  getWishlist: () => Promise<WishlistItem[]>;
  createWishlist: (item: Partial<WishlistItem>) => Promise<WishlistItem>;
  updateWishlist: (id: string, item: Partial<WishlistItem>) => Promise<{ success: boolean }>;
  deleteWishlist: (id: string) => Promise<boolean>;
  getAccounts: () => Promise<Account[]>;
  createAccount: (account: Partial<Account>) => Promise<Account>;
  updateAccount: (id: string, account: Partial<Account>) => Promise<{ success: boolean }>;
  deleteAccount: (id: string) => Promise<boolean>;
}

export interface CultureApi {
  getItems: () => Promise<CultureItem[]>;
  createItem: (item: Partial<CultureItem>) => Promise<CultureItem>;
  updateItem: (id: string, item: Partial<CultureItem>) => Promise<{ success: boolean; id: string }>;
  updateProgress: (id: string, progress: number) => Promise<{ success: boolean; id: string }>;
  deleteItem: (id: string) => Promise<{ success: boolean }>;
  getEpisodes: (itemId: string) => Promise<CultureEpisode[]>;
  saveEpisodes: (itemId: string, episodes: any[]) => Promise<{ success: boolean; count: number }>;
  toggleEpisodeWatched: (episodeId: string, isWatched: boolean) => Promise<{ success: boolean }>;
}

export interface LibraryApi {
  getBooks: () => Promise<LibraryBook[]>;
  importBook: () => Promise<LibraryBook | null>;
  deleteBook: (id: string) => Promise<boolean>;
  reattachBookFile: (id: string) => Promise<string | null>;
  evictBookLocalCache: (id: string) => Promise<boolean>;
  updateBook: (book: { id: string; title?: string; author?: string; current_page?: number; last_read_page?: number | string; total_pages?: number; reading_status?: ReadingStatus; last_read_at?: string }) => Promise<number>;
  getBookFile: (id: string) => Promise<string>;
  getCollections: () => Promise<LibraryCollection[]>;
  createCollection: (c: { name: string; color: string }) => Promise<LibraryCollection>;
  updateCollection: (c: { id: string; name?: string; color?: string }) => Promise<number>;
  deleteCollection: (id: string) => Promise<boolean>;
  setBookCollections: (bookId: string, collectionIds: string[]) => Promise<boolean>;
  getBookCollections: (bookId: string) => Promise<LibraryCollection[] | string[]>;
  getAllBookCollections?: () => Promise<Record<string, string[]>>;
  getHighlights: (bookId: string) => Promise<LibraryHighlight[]>;
  createHighlight: (h: { book_id: string; page_number: number; text_content?: string; color?: HighlightColor; rects?: string; highlight_type?: HighlightType; note?: string }) => Promise<LibraryHighlight>;
  updateHighlight: (h: { id: string; color?: HighlightColor; note?: string; rects?: string }) => Promise<number>;
  deleteHighlight: (id: string) => Promise<boolean>;
  getBookmarks: (bookId: string) => Promise<LibraryBookmark[]>;
  createBookmark: (b: { book_id: string; page_number: number; label?: string }) => Promise<LibraryBookmark>;
  updateBookmark: (b: { id: string; label: string }) => Promise<number>;
  deleteBookmark: (id: string) => Promise<boolean>;
  getOcrCache: (bookId: string, pageNumber: number) => Promise<OcrCacheEntry | null>;
  saveOcrCache: (data: { book_id: string; page_number: number; text_content: string; word_boxes: string }) => Promise<boolean>;
  startReadingSession: (data: { book_id: string; start_page: number }) => Promise<ReadingSession>;
  endReadingSession: (data: { id: string; end_page: number; pages_read: number }) => Promise<boolean>;
  getReadingStats: (bookId?: string) => Promise<{ bookStats?: BookReadingStats; globalStats: GlobalReadingStats }>;
}

export interface SyncApi {
  getTable: (tableName: string) => Promise<any[]>;
  upsertRow: (tableName: string, row: any) => Promise<{ success: boolean }>;
  deleteRow?: (tableName: string, id: string) => Promise<{ success: boolean }>;
  /** Fetches table rows by ID list. Present in runtime implementations. */
  getRowsByIds: (tableName: string, ids: string[]) => Promise<any[]>;
  /** Enqueues an immediate push sync operation for a module. */
  push?: (type: string) => void;
}

export interface ICadernoAPI {
  app: {
    getDbPath: () => Promise<string>;
    quit: () => void;
    minimize: () => void;
    maximize: () => void;
    getPathForFile: (file: File) => string;
    showConfirm: (message: string) => Promise<number>;
    openFocusWindow: () => Promise<void>;
    /** Toggles fullscreen mode (Tauri only). Optional on web builds. */
    toggleFullScreen?: () => void;
  };
  /** IPC logging (Tauri only). Optional on web builds. */
  log?: (msg: string) => void;
  _setMasterKey?: (key: CryptoKey | null) => void;
  onSyncTrigger?: (callback: () => void) => () => void;
  getAllPages: () => Promise<Page[]>;
  getPageContent: (id: string) => Promise<{ content: string; encrypted_content: string | null }>;
  createPage: (page: { parentId: string | null; title?: string; icon?: string }) => Promise<Page>;
  updatePage: (page: { id: string; title?: string; icon?: string; content?: string; crdt_state?: string | null; is_locked?: number; password_salt?: string | null; encrypted_content?: string | null; parent_id?: string | null; cover_image?: string | null; description?: string | null }) => Promise<number>;
  deletePage: (id: string) => Promise<boolean>;
  getDeletedPages: () => Promise<PageMeta[]>;
  restorePage: (id: string) => Promise<boolean>;
  reorderPages: (updates: { id: string; sort_order: number }[]) => Promise<boolean>;
  getPageHistory: (pageId: string) => Promise<PageHistoryEntry[]>;
  savePageHistory: (pageId: string, content: string) => Promise<{ success: boolean; id: string }>;
  exportBackup: () => Promise<{ success: boolean; canceled?: boolean; path?: string; error?: string }>;
  
  auth: AuthApi;
  finance: FinanceApi;
  culture: CultureApi;
  library: LibraryApi;
  sync: SyncApi;
  quiz?: IQuizApi;

  config?: {
    get: (key: string) => Promise<any>;
    set: (key: string, value: any) => Promise<{ success: boolean }>;
  };

  imageCache?: {
    get: (id: string) => Promise<any>;
    put: (id: string, data: ArrayBuffer | number[], mimeType: string) => Promise<any>;
    delete?: (id: string) => Promise<any>;
    cleanupOrphans?: () => Promise<number>;
  };

  video?: {
    convertFileSrc?: (path: string) => string;
    getLocalPath: (filename: string) => Promise<string | null>;
    deleteLocal: (filename: string) => Promise<boolean>;
    readLocalFile?: (path: string) => Promise<Uint8Array>;
    uploadFileToDrive?: (localPath: string, driveFilename: string, folderId: string, accessToken: string) => Promise<string>;
    saveLocal: (filename: string, buffer: ArrayBuffer) => Promise<string>;
    downloadFromDrive?: (driveId: string, accessToken: string, destFilename: string) => Promise<string>;
    copyLocal: (sourcePath: string, filename: string) => Promise<string>;
    extractSubtitles: (localPath: string, trackIndex?: string) => Promise<string | null>;
    scanSubtitles: (localPath: string) => Promise<{ subtitles: { index: string; language?: string; codec: string; title?: string }[]; error: string | null; debug: string }>;
    scanTracks?: (localPath: string) => Promise<any>;
    openFileDialog: () => Promise<{ path: string; name: string; size: number; type: string } | null>;
    openFolderDialog: () => Promise<string | null>;
    // Extended video methods
    onDownloadProgress?: (callback: (progress: any) => void) => () => void;
    getStreamPort?: () => Promise<number>;
    cancelConversion?: (jobId: string) => Promise<{ success: boolean }>;
    generateWebVersion?: (sourcePath: string, options?: any) => Promise<{ success: boolean; outputPath?: string; error?: string }>;
    processUpload?: (
      sourcePath: string,
      filename: string,
      webQuality: string,
      conversionPreset: string,
      duration?: number,
      primaryAudioTrack?: string
    ) => Promise<{
      original_path: string;
      web_path: string | null;
      original_size?: number;
      web_size?: number;
    }>;
    extractAudio?: (localPath: string, trackIndex: string) => Promise<string | null>;
    getStorageStats?: (
      originalPathOrName: string,
      audioFiles?: string[],
      subFiles?: string[]
    ) => Promise<{
      original_path: string | null;
      original_size: number | null;
      web_path: string | null;
      web_size: number | null;
      audio_sizes: Record<string, number>;
      subtitle_sizes: Record<string, number>;
      total_local_size: number;
    }>;
    showInFolder?: (pathOrName: string) => Promise<boolean>;
  };

  anki?: {
    getDecks: () => Promise<{ success: boolean; decks?: any[]; error?: string }>;
    createDeck: (name: string, desc?: string, parentId?: string | null) => Promise<{ success: boolean; id?: string; error?: string }>;
    saveCard: (cardData: any) => Promise<{ success: boolean; id?: string; error?: string }>;
    saveNote: (noteData: any) => Promise<{ success: boolean; note_id?: string; error?: string }>;
    getDueCards: (deckId: string) => Promise<{ success: boolean; cards?: any[]; error?: string }>;
    reviewCard: (cardId: string, rating: number) => Promise<{ success: boolean; error?: string }>;
    getAllCards: (deckId?: string) => Promise<{ success: boolean; cards?: any[]; error?: string }>;
    deleteCard: (cardId: string) => Promise<{ success: boolean; error?: string }>;
    deleteNote: (noteId: string) => Promise<{ success: boolean; error?: string }>;
    deleteCardsBulk: (cardIds: string[]) => Promise<{ success: boolean; error?: string }>;
    updateCard: (cardId: string, data: any) => Promise<{ success: boolean; error?: string }>;
    updateNote: (noteId: string, data: any) => Promise<{ success: boolean; error?: string }>;
    moveCards: (cardIds: string[], newDeckId: string) => Promise<{ success: boolean; error?: string }>;
    updateDeck: (deckId: string, name: string, description: string) => Promise<{ success: boolean; error?: string }>;
    deleteDeck: (deckId: string) => Promise<{ success: boolean; error?: string }>;
    resetDeckProgress: (deckId: string) => Promise<{ success: boolean; error?: string }>;
    // Extended Anki methods (present in Tauri/Web implementations)
    migrateToNotes?: () => Promise<{ success: boolean; error?: string }>;
    updateDeckSettings?: (deckId: string, settings: any) => Promise<{ success: boolean; error?: string }>;
    getDeckSettings?: (deckId: string) => Promise<any>;
    importDeck?: (payload: any) => Promise<{ success: boolean; stats?: any; error?: string }>;
    exportDeckRecursive?: (deckId: string) => Promise<{ success: boolean; payload?: any; error?: string }>;
    getReviews?: (deckId?: string, limit?: number) => Promise<{ success: boolean; reviews?: any[]; error?: string }>;
    getCardIntervals?: (cardId: string) => Promise<{ success: boolean; intervals?: any[]; error?: string }>;
    getCard?: (cardId: string) => Promise<any>;
  };

  focus?: {
    getSessions: () => Promise<any[]>;
    createSession: (session: any) => Promise<{ success: boolean; id?: number }>;
    deleteSessions: (options: { type: 'specific'; id: number } | { type: 'all' }) => Promise<{ success: boolean; error?: string }>;
    getAlarms: () => Promise<any[]>;
    createAlarm: (alarm: any) => Promise<{ success: boolean; id?: number }>;
    updateAlarm: (id: number, alarm: any) => Promise<{ success: boolean }>;
    deleteAlarm: (id: number) => Promise<{ success: boolean }>;
  };

  calendar?: {
    getEvents: () => Promise<CalendarEvent[]>;
    createEvent: (event: Partial<CalendarEvent>) => Promise<CalendarEvent>;
    updateEvent: (id: string, event: Partial<CalendarEvent>) => Promise<{ success: boolean }>;
    deleteEvent: (id: string) => Promise<boolean>;
  };

  notifications?: {
    getNotifications: () => Promise<AppNotification[]>;
    addNotification: (notif: Partial<AppNotification>) => Promise<AppNotification>;
    markRead: (id?: string) => Promise<boolean>;
    deleteNotification: (id: string) => Promise<boolean>;
  };

  audio?: {
    generateTTS: (text: string, lang?: string) => Promise<{ success: boolean; filePath?: string; error?: string }>;
    extractClip: (videoPath: string, startTimeMs: number, endTimeMs: number) => Promise<{ success: boolean; filePath?: string; error?: string }>;
  };

  backup?: {
    selectFolder: () => Promise<string | null>;
    startBackup: (options: { destination: string; type: 'encrypted' | 'decrypted'; includeMedia: boolean; driveToken?: string }) => Promise<{ success: boolean; message?: string }>;
    onLog: (callback: (data: { message: string; progress?: number }) => void) => () => void;
    cancelBackup: () => Promise<boolean>;
  };

  files?: FilesApi;

  vault?: {
    getGroups: () => Promise<VaultGroup[]>;
    upsertGroup: (group: VaultGroup) => Promise<void>;
    deleteGroup: (id: string) => Promise<void>;
    reorderGroups: (updates: { id: string; position: number }[]) => Promise<void>;
    getItems: (groupId?: string) => Promise<VaultItem[]>;
    getItem: (id: string) => Promise<VaultItem | null>;
    upsertItem: (item: VaultItem) => Promise<void>;
    deleteItem: (id: string) => Promise<void>;
    searchItems: (query: string) => Promise<VaultItem[]>;
    getPasswordHistory: (itemId: string) => Promise<VaultPasswordHistoryEntry[]>;
    generatePassword: (opts: PasswordGenOptions) => Promise<string>;
    checkBreach: (password: string) => Promise<BreachCheckResult>;
    checkStrength: (password: string) => Promise<number>;
  };

  practice?: {
    getSessions: () => Promise<TutorSession[]>;
    createSession: (session: Partial<TutorSession>) => Promise<TutorSession>;
    updateSession: (session: Partial<TutorSession>) => Promise<number>;
    getMessages: (sessionId: string) => Promise<TutorMessage[]>;
    createMessage: (msg: Partial<TutorMessage>) => Promise<TutorMessage>;
    getMemories: () => Promise<TutorMemory[]>;
    createMemory: (memory: Partial<TutorMemory>) => Promise<TutorMemory>;
    deleteMemory: (id: string) => Promise<boolean>;
  };

  diagrams?: {
    getAll: () => Promise<DiagramMeta[]>;
    getContent: (id: string) => Promise<DiagramContent>;
    create: (payload: { title?: string; icon?: string }) => Promise<DiagramMeta>;
    update: (payload: { id: string; title?: string; icon?: string; content?: string }) => Promise<number>;
    delete: (id: string) => Promise<boolean>;
  };

  drive?: {
    openExternalUrl: (url: string) => Promise<void>;
  };

  events?: {
    listen: (channel: string, callback: (event: { payload: any }) => void) => Promise<() => void>;
    emit?: (channel: string, payload?: any) => Promise<void>;
  };

  lofi?: {
    saveLocal: (name: string, data: ArrayBuffer) => Promise<string>;
    getLocalPath: (name: string) => Promise<string | null>;
    deleteLocal: (name: string) => Promise<void>;
    downloadFromDrive?: (driveId: string, accessToken: string, destFilename: string) => Promise<string>;
    onDownloadProgress?: (callback: (payload: { driveId: string; percent: number }) => void) => () => void;
  };

  os?: {
    openInBrowser: (url: string) => void;
  };

  youtube?: any;
  trash?: any;
}
