export interface Page {
  id: string;
  parent_id: string | null;
  title: string;
  icon: string;
  content?: string;
  crdt_state?: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
  is_locked?: number;
  password_salt?: string | null;
  encrypted_content?: string | null;
  is_pinned?: number;
  pinned_order?: number;
  cover_image?: string | null;
  description?: string | null;
}

export interface PageHistoryEntry {
  id: string;
  page_id: string;
  content: string;
  created_at: string;
}

export interface Tab {
  id: string;
  module: 'notes' | 'library' | 'finance' | 'culture' | 'video' | 'anki' | 'focus' | 'calendar';
  pageId: string | null;
  bookId?: string | null;
  bookTitle?: string;
  unsavedContent: string | null;
  scrollY: number;
  moduleState?: Record<string, any>;
}

export type TransactionType = 'income' | 'expense' | 'loan_made' | 'loan_taken';

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  description: string;
  category: string;
  date: string;
  status: string;
  is_paid?: number;
  paid_amount?: number;
  created_at: string;
}

export interface WishlistItem {
  id: string;
  title: string;
  price: number;
  priority: 'high' | 'medium' | 'low';
  category?: string;
  expected_date: string | null;
  description: string | null;
  link: string | null;
  created_at: string;
  updated_at: string;
}

// ============ LIBRARY TYPES ============

export type ReadingStatus = 'not_started' | 'reading' | 'finished';
export type HighlightColor = 'yellow' | 'green' | 'blue' | 'pink' | 'orange';
export type HighlightType = 'text' | 'rect';
export type ReadingMode = 'light' | 'sepia' | 'mint' | 'dim' | 'nord' | 'midnight' | 'dark' | 'high-contrast';

export interface LibraryBook {
  id: string;
  title: string;
  author: string;
  file_path: string;
  original_name: string;
  cover_image: string;
  total_pages: number;
  last_read_page: number;
  reading_status: ReadingStatus;
  last_read_at: string | null;
  created_at: string;
  updated_at: string;
  drive_file_id?: string | null;
  collections?: LibraryCollection[];
  published_year?: number | null;
  publisher?: string | null;
  language?: string | null;
  epub_locations?: string | null;
}

export interface LibraryCollection {
  id: string;
  name: string;
  color: string;
  created_at: string;
}

export interface LibraryHighlight {
  id: string;
  book_id: string;
  page_number: number;
  text_content: string;
  color: HighlightColor;
  rects: string;
  highlight_type: HighlightType;
  note: string;
  created_at: string;
}

export interface LibraryBookmark {
  id: string;
  book_id: string;
  page_number: number;
  label: string;
  created_at: string;
}

export interface OcrCacheEntry {
  id: string;
  book_id: string;
  page_number: number;
  text_content: string;
  word_boxes: string;
}

export interface ReadingSession {
  id: string;
  book_id: string;
  started_at: string;
  ended_at: string | null;
  pages_read: number;
  start_page: number;
  end_page: number;
}

export interface BookReadingStats {
  totalTimeMinutes: number;
  totalPagesRead: number;
  averagePagesPerSession: number;
  sessionsCount: number;
  lastReadAt: string | null;
}

export interface GlobalReadingStats {
  totalBooksStarted: number;
  totalBooksFinished: number;
  totalTimeMinutes: number;
  totalPagesRead: number;
  currentStreak: number;
  longestStreak: number;
  readingDays: string[];
}


export interface AiChatSession {
  id: string;
  pageId: string;
  pageTitle: string;
  contextText?: string;
  contextImage?: string;
  messages: any[];
  updatedAt: number;
}

export interface AppState {
  pages: Page[];
  tabs: Tab[];
  activeTabId: string;
  sidebarCollapsed: boolean;
  expandedNodes: string[];
  contextMenu: {
    visible: boolean;
    x: number;
    y: number;
    pageId: string;
  } | null;
  confirmDelete: string | null;
  aiChatSessions: Record<string, AiChatSession>;
  showAiSidebar: boolean;
  activeAiChatId: string | null;
  moduleKeys: Record<string, CryptoKey>;
  isReadingModeFullScreen: boolean;
}

export type Action =
  | { type: 'UPDATE_TAB_MODULE'; tabId: string; module: 'notes' | 'finance' | 'library' | 'culture' | 'video' | 'anki' | 'focus' | 'calendar' }
  | { type: 'OPEN_LIBRARY_BOOK'; bookId: string; title: string }
  | { type: 'CLOSE_LIBRARY_BOOK'; tabId: string }
  | { type: 'SET_PAGES'; pages: Page[] }
  | { type: 'ADD_PAGE'; page: Page }
  | { type: 'UPDATE_PAGE'; page: Partial<Page> & { id: string } }
  | { type: 'DELETE_PAGE'; id: string }
  | { type: 'ADD_TAB'; tab: Tab }
  | { type: 'CLOSE_TAB'; tabId: string }
  | { type: 'SET_ACTIVE_TAB'; tabId: string }
  | { type: 'REORDER_TABS'; sourceIndex: number; targetIndex: number }
  | { type: 'UPDATE_TAB_STATE'; tabId: string; stateUpdates: Record<string, any> }
  | { type: 'NAVIGATE_IN_TAB'; pageId: string }
  | { type: 'SET_UNSAVED_CONTENT'; tabId: string; content: string }
  | { type: 'SET_SCROLL_Y'; tabId: string; scrollY: number }
  | { type: 'TOGGLE_SIDEBAR' }
  | { type: 'TOGGLE_NODE'; nodeId: string }
  | { type: 'SHOW_CONTEXT_MENU'; x: number; y: number; pageId: string }
  | { type: 'HIDE_CONTEXT_MENU' }
  | { type: 'SET_CONFIRM_DELETE'; pageId: string | null }
  | { type: 'UPDATE_AI_CHAT'; session: AiChatSession }
  | { type: 'DELETE_AI_CHAT'; id: string }
  | { type: 'CLEAR_AI_CHATS' }
  | { type: 'TOGGLE_AI_SIDEBAR' }
  | { type: 'OPEN_AI_CHAT'; chatId: string | null }
  | { type: 'SET_MODULE_KEYS'; keys: Record<string, CryptoKey> };


// ============ CULTURE TYPES ============
export type CultureType = 'anime' | 'filme' | 'série' | 'hq' | 'manga' | 'livro' | 'novel';

export interface CultureItem {
  id: string;
  title: string;
  type: CultureType;
  synopsis?: string;
  cover_image?: string;
  access_link?: string;
  progress: number;
  total_progress: number;
  is_goal: boolean;
  goal_note?: string;
  api_id?: string;
  api_source?: 'jikan' | 'itunes' | 'tvmaze' | 'books';
  status?: string; // 'releasing', 'finished', etc.
  last_sync_at?: string;
  // Campos extras de metadados da API
  volumes?: number | null;
  chapters?: number | null;
  episodes_count?: number | null;
  created_at: string;
  updated_at: string;
}

export interface CultureEpisode {
  id: string;
  item_id: string;
  episode_number: number;
  season_number?: number;
  episode_in_season?: number;
  title: string;
  synopsis: string;
  is_watched: boolean;
  aired_at?: string;
  updated_at?: string;
}

// ============ CALENDAR TYPES ============
export interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  start_date: string;
  end_date: string;
  type: 'event' | 'task';
  status: 'pending' | 'completed';
  color: string;
  recurrence_rule?: string | null;
  reminder_minutes?: number | null;
  created_at: string;
  updated_at: string;
}

declare global {
  interface Window {
    api: {
      app: {
        getDbPath: () => Promise<string>;
        quit: () => void;
        minimize: () => void;
        maximize: () => void;
        getPathForFile: (file: File) => string;
        showConfirm: (message: string) => Promise<number>;
        openFocusWindow: () => Promise<void>;
      };
      _setMasterKey?: (key: CryptoKey | null) => void;
      onSyncTrigger?: (callback: () => void) => () => void;
      getAllPages: () => Promise<Page[]>;
      getPageContent: (id: string) => Promise<{ content: string; encrypted_content: string | null }>;
      createPage: (page: { parentId: string | null; title?: string; icon?: string }) => Promise<Page>;
      updatePage: (page: { id: string; title?: string; icon?: string; content?: string; is_locked?: number; password_salt?: string | null; encrypted_content?: string | null; parent_id?: string | null; cover_image?: string | null; description?: string | null }) => Promise<number>;
      deletePage: (id: string) => Promise<boolean>;
      reorderPages: (updates: { id: string; sort_order: number }[]) => Promise<boolean>;
      getPageHistory: (pageId: string) => Promise<PageHistoryEntry[]>;
      savePageHistory: (pageId: string, content: string) => Promise<{ success: boolean; id: string }>;
      exportBackup: () => Promise<{ success: boolean; canceled?: boolean; path?: string; error?: string }>;
      auth: {
        setup: (password: string, existingKeys?: { library?: string; finance?: string; notes?: string }) => Promise<{ success: boolean; error?: string; keys?: { library?: string; finance?: string; notes?: string } }>;
        login: (password: string) => Promise<{ success: boolean; error?: string; keys?: { library?: string; finance?: string; notes?: string } }>;
        status: () => Promise<{ status: 'new' | 'encrypted' | 'unencrypted' }>;
        changePassword: (newPassword: string) => Promise<{ success: boolean; error?: string }>;
        createVisitor: (visitorPassword: string, allowedModules: string[]) => Promise<{ success: boolean; error?: string; visitorId?: string }>;
        getVisitors: () => Promise<Array<{ id: string; modules: string[] }>>;
        deleteVisitor: (id: string) => Promise<{ success: boolean; error?: string }>;
        onLock: (callback: () => void) => () => void;
        lock: () => Promise<void>;
        setPreferences: (prefs: { autoLockOnSuspend: boolean }) => Promise<void>;
      };
      finance: {
        getTransactions: () => Promise<Transaction[]>;
        createTransaction: (tx: Partial<Transaction>) => Promise<Transaction>;
        updateTransaction: (id: string, tx: Partial<Transaction>) => Promise<{success: boolean}>;
        deleteTransaction: (id: string) => Promise<boolean>;
        getWishlist: () => Promise<WishlistItem[]>;
        createWishlist: (item: Partial<WishlistItem>) => Promise<WishlistItem>;
        updateWishlist: (id: string, item: Partial<WishlistItem>) => Promise<{success: boolean}>;
        deleteWishlist: (id: string) => Promise<boolean>;
      };
      culture: {
        getItems: () => Promise<CultureItem[]>;
        createItem: (item: Partial<CultureItem>) => Promise<CultureItem>;
        updateItem: (id: string, item: Partial<CultureItem>) => Promise<{success: boolean, id: string}>;
        updateProgress: (id: string, progress: number) => Promise<{success: boolean, id: string}>;
        deleteItem: (id: string) => Promise<{success: boolean}>;
        getEpisodes: (itemId: string) => Promise<CultureEpisode[]>;
        saveEpisodes: (itemId: string, episodes: any[]) => Promise<{success: boolean, count: number}>;
        toggleEpisodeWatched: (episodeId: string, isWatched: boolean) => Promise<{success: boolean}>;
      };
      library: {
        getBooks: () => Promise<LibraryBook[]>;
        importBook: () => Promise<LibraryBook | null>;
        deleteBook: (id: string) => Promise<boolean>;
        updateBook: (book: { id: string; title?: string; author?: string; current_page?: number; last_read_page?: number | string; total_pages?: number; reading_status?: ReadingStatus; last_read_at?: string }) => Promise<number>;
        getBookFile: (id: string) => Promise<string>;
        getCollections: () => Promise<LibraryCollection[]>;
        createCollection: (c: { name: string; color: string }) => Promise<LibraryCollection>;
        updateCollection: (c: { id: string; name?: string; color?: string }) => Promise<number>;
        deleteCollection: (id: string) => Promise<boolean>;
        setBookCollections: (bookId: string, collectionIds: string[]) => Promise<boolean>;
        getBookCollections: (bookId: string) => Promise<LibraryCollection[]>;
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
      };
      sync: {
        getTable: (tableName: string) => Promise<any[]>;
        upsertRow: (tableName: string, row: any) => Promise<{ success: boolean }>;
      };
      video?: {
        getLocalPath: (filename: string) => Promise<string | null>;
        deleteLocal: (filename: string) => Promise<boolean>;
        saveLocal: (filename: string, buffer: ArrayBuffer) => Promise<string>;
        copyLocal: (sourcePath: string, filename: string) => Promise<string>;
        extractSubtitles: (localPath: string, trackIndex?: string) => Promise<string | null>;
        scanSubtitles: (localPath: string) => Promise<{ subtitles: { index: string; language?: string; codec: string; title?: string }[]; error: string | null; debug: string }>;
        openFileDialog: () => Promise<{ path: string; name: string; size: number; type: string } | null>;
        openFolderDialog: () => Promise<string | null>;
      };
      anki?: {
        getDecks: () => Promise<{ success: boolean; decks?: any[]; error?: string }>;
        createDeck: (name: string, desc?: string) => Promise<{ success: boolean; id?: string; error?: string }>;
        saveCard: (cardData: any) => Promise<{ success: boolean; id?: string; error?: string }>;
        getDueCards: (deckId: string) => Promise<{ success: boolean; cards?: any[]; error?: string }>;
        reviewCard: (cardId: string, rating: number) => Promise<{ success: boolean; error?: string }>;
        getAllCards: (deckId?: string) => Promise<{ success: boolean; cards?: any[]; error?: string }>;
        deleteCard: (cardId: string) => Promise<{ success: boolean; error?: string }>;
        deleteCardsBulk: (cardIds: string[]) => Promise<{ success: boolean; error?: string }>;
        updateCard: (cardId: string, data: any) => Promise<{ success: boolean; error?: string }>;
        moveCards: (cardIds: string[], newDeckId: string) => Promise<{ success: boolean; error?: string }>;
        updateDeck: (deckId: string, name: string, description: string) => Promise<{ success: boolean; error?: string }>;
        deleteDeck: (deckId: string) => Promise<{ success: boolean; error?: string }>;
      };
      focus?: {
        getSessions: () => Promise<any[]>;
        createSession: (session: any) => Promise<{ success: boolean; id?: number }>;
        getAlarms: () => Promise<any[]>;
        createAlarm: (alarm: any) => Promise<{ success: boolean; id?: number }>;
        updateAlarm: (id: number, alarm: any) => Promise<{ success: boolean }>;
        deleteAlarm: (id: number) => Promise<{ success: boolean }>;
      };
      calendar?: {
        getEvents: () => Promise<CalendarEvent[]>;
        createEvent: (event: Partial<CalendarEvent>) => Promise<CalendarEvent>;
        updateEvent: (id: string, event: Partial<CalendarEvent>) => Promise<{success: boolean}>;
        deleteEvent: (id: string) => Promise<boolean>;
      };
      audio?: {
        generateTTS: (text: string, lang?: string) => Promise<{ success: boolean; filePath?: string; error?: string }>;
        extractClip: (videoPath: string, startTimeMs: number, endTimeMs: number) => Promise<{ success: boolean; filePath?: string; error?: string }>;
      };
      backup?: {
        selectFolder: () => Promise<string | null>;
        startBackup: (options: { destination: string, type: 'encrypted' | 'decrypted', includeMedia: boolean, driveToken?: string, rawKey?: string }) => Promise<{ success: boolean; error?: string }>;
        onLog: (callback: (data: { message: string, progress?: number }) => void) => () => void;
      };
    };
  }
}

