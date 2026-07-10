import { contextBridge, ipcRenderer, webUtils } from 'electron';

let syncCallbacks: (() => void)[] = [];

const invokeWithSync = async (channel: string, ...args: any[]) => {
  const result = await ipcRenderer.invoke(channel, ...args);
  if (
    channel.includes('create') ||
    channel.includes('update') ||
    channel.includes('delete') ||
    channel.includes('set')
  ) {
    syncCallbacks.forEach(cb => cb());
  }
  return result;
};

contextBridge.exposeInMainWorld('api', {
  getAllPages: () => invokeWithSync('db:get-all-pages'),
  getPageContent: (id: string) => invokeWithSync('db:get-page-content', id),
  createPage: (page: { parentId: string | null; title?: string; icon?: string }) =>
    invokeWithSync('db:create-page', page),
  updatePage: (page: { id: string; title?: string; icon?: string; content?: string; crdt_state?: string | null; parent_id?: string | null }) =>
    invokeWithSync('db:update-page', page),
  deletePage: (id: string) => invokeWithSync('db:delete-page', id),
  reorderPages: (updates: { id: string; sort_order: number }[]) =>
    invokeWithSync('db:reorder-pages', updates),
  getPageHistory: (pageId: string) => invokeWithSync('db:get-page-history', pageId),
  savePageHistory: (pageId: string, content: string) => invokeWithSync('db:save-page-history', pageId, content),
  
  // App
  app: {
    getDbPath: () => invokeWithSync('app:getDbPath'),
    quit: () => ipcRenderer.send('app:quit'),
    minimize: () => ipcRenderer.send('app:minimize'),
    maximize: () => ipcRenderer.send('app:maximize'),
    toggleFullScreen: () => ipcRenderer.send('app:toggleFullScreen'),
    getPathForFile: (file: File) => webUtils.getPathForFile(file),
    showConfirm: (message: string) => invokeWithSync('app:showConfirm', message),
    openFocusWindow: () => invokeWithSync('app:open-focus-window'),
  },

  // Auth
  auth: {
    status: () => invokeWithSync('auth:status'),
    login: (password: string) => invokeWithSync('auth:login', password),
    setup: (password: string, existingKeys?: any) => invokeWithSync('auth:setup', password, existingKeys),
    changePassword: (newPassword: string) => invokeWithSync('auth:change-password', newPassword),
    forceUpdateKeychain: (password: string, keys: any) => invokeWithSync('auth:force-update-keychain', password, keys),
    createVisitor: (visitorPassword: string, allowedModules: string[]) => invokeWithSync('auth:create-visitor', visitorPassword, allowedModules),
    getVisitors: () => invokeWithSync('auth:get-visitors'),
    deleteVisitor: (id: string) => invokeWithSync('auth:delete-visitor', id),
    onLock: (callback: () => void) => {
      const listener = () => callback();
      ipcRenderer.on('app:lock', listener);
      return () => ipcRenderer.removeListener('app:lock', listener);
    },
    lock: () => invokeWithSync('auth:lock'),
    setPreferences: (prefs: { autoLockOnSuspend: boolean }) => invokeWithSync('auth:set-preferences', prefs),
  },

  // Config
  config: {
    get: (key: string) => invokeWithSync('config:get', key),
    set: (key: string, data: any) => invokeWithSync('config:set', key, data)
  },

  // Finance
  finance: {
    getTransactions: () => invokeWithSync('finance:get-transactions'),
    createTransaction: (tx: any) => invokeWithSync('finance:create-transaction', tx),
    updateTransaction: (id: string, tx: any) => invokeWithSync('finance:update-transaction', id, tx),
    deleteTransaction: (id: string) => invokeWithSync('finance:delete-transaction', id),
    getWishlist: () => invokeWithSync('finance:get-wishlist'),
    createWishlist: (item: any) => invokeWithSync('finance:create-wishlist', item),
    updateWishlist: (id: string, item: any) => invokeWithSync('finance:update-wishlist', id, item),
    deleteWishlist: (id: string) => invokeWithSync('finance:delete-wishlist', id),
  },

  // Culture
  culture: {
    getItems: () => invokeWithSync('culture:get-items'),
    createItem: (item: any) => invokeWithSync('culture:create-item', item),
    updateItem: (id: string, item: any) => invokeWithSync('culture:update-item', id, item),
    updateProgress: (id: string, progress: number) => invokeWithSync('culture:update-progress', id, progress),
    deleteItem: (id: string) => invokeWithSync('culture:delete-item', id),
    getEpisodes: (itemId: string) => ipcRenderer.invoke('culture:get-episodes', itemId),
    saveEpisodes: (itemId: string, episodes: any[]) => invokeWithSync('culture:save-episodes', itemId, episodes),
    toggleEpisodeWatched: (episodeId: string, isWatched: boolean) => invokeWithSync('culture:toggle-episode-watched', episodeId, isWatched),
    getRecentReleases: () => ipcRenderer.invoke('culture:get-recent-releases'),
  },

  // Library
  library: {
    getBooks: () => invokeWithSync('library:get-books'),
    importBook: () => invokeWithSync('library:import-book'),
    deleteBook: (id: string) => invokeWithSync('library:delete-book', id),
    updateBook: (book: any) => invokeWithSync('library:update-book', book),
    getBookFile: (id: string) => invokeWithSync('library:get-book-file', id),
    getCollections: () => invokeWithSync('library:get-collections'),
    createCollection: (c: any) => invokeWithSync('library:create-collection', c),
    updateCollection: (c: any) => invokeWithSync('library:update-collection', c),
    deleteCollection: (id: string) => invokeWithSync('library:delete-collection', id),
    setBookCollections: (bookId: string, collectionIds: string[]) => invokeWithSync('library:set-book-collections', bookId, collectionIds),
    getBookCollections: (bookId: string) => invokeWithSync('library:get-book-collections', bookId),
    getHighlights: (bookId: string) => invokeWithSync('library:get-highlights', bookId),
    createHighlight: (h: any) => invokeWithSync('library:create-highlight', h),
    updateHighlight: (h: any) => invokeWithSync('library:update-highlight', h),
    deleteHighlight: (id: string) => invokeWithSync('library:delete-highlight', id),
    getBookmarks: (bookId: string) => invokeWithSync('library:get-bookmarks', bookId),
    createBookmark: (b: any) => invokeWithSync('library:create-bookmark', b),
    updateBookmark: (b: any) => invokeWithSync('library:update-bookmark', b),
    deleteBookmark: (id: string) => invokeWithSync('library:delete-bookmark', id),
    getOcrCache: (bookId: string, pageNumber: number) => invokeWithSync('library:get-ocr-cache', bookId, pageNumber),
    saveOcrCache: (data: any) => invokeWithSync('library:save-ocr-cache', data),
    startReadingSession: (data: any) => invokeWithSync('library:start-reading-session', data),
    endReadingSession: (data: any) => invokeWithSync('library:end-reading-session', data),
    getReadingStats: (bookId?: string) => invokeWithSync('library:get-reading-stats', bookId),
  },

  // Image Cache (para imagens criptografadas do editor)
  imageCache: {
    get: (id: string) => invokeWithSync('image-cache:get', id),
    put: (id: string, data: ArrayBuffer, mimeType: string) => invokeWithSync('image-cache:put', id, data, mimeType),
  },

  // Sync
  sync: {
    getTable: (tableName: string) => invokeWithSync('sync:get-table', tableName),
    deleteRow: (tableName: string, id: string) => invokeWithSync('sync:delete-row', tableName, id),
    upsertRow: (tableName: string, row: any) => invokeWithSync('sync:upsert-row', tableName, row),
  },

  // Drive API
  drive: {
    openExternalUrl: (url: string) => invokeWithSync('drive:open-external-url', url),
    getCredentials: () => invokeWithSync('drive:get-credentials'),
    saveCredentials: (data: any) => invokeWithSync('drive:save-credentials', data),
  },

  // Video API
  video: {
    getLocalPath: (filename: string) => invokeWithSync('video:getLocalPath', filename),
    deleteLocal: (filename: string) => invokeWithSync('video:deleteLocal', filename),
    saveLocal: (filename: string, buffer: ArrayBuffer) => invokeWithSync('video:saveLocal', filename, buffer),
    copyLocal: (sourcePath: string, filename: string) => invokeWithSync('video:copyLocal', sourcePath, filename),
    extractSubtitles: (localPath: string, trackIndex?: string) => invokeWithSync('video:extractSubtitles', localPath, trackIndex),
    scanTracks: (localPath: string) => invokeWithSync('video:scanTracks', localPath),
    extractAudio: (localPath: string, trackIndex: string) => invokeWithSync('video:extractAudio', localPath, trackIndex),
    remuxDefaultTrack: (sourcePath: string, filename: string, trackIndex: string) => invokeWithSync('video:remuxDefaultTrack', sourcePath, filename, trackIndex),
    openFileDialog: () => invokeWithSync('video:openFileDialog'),
    openFolderDialog: () => invokeWithSync('video:openFolderDialog'),
  },

  // Lofi API
  lofi: {
    getLocalPath: (filename: string) => invokeWithSync('lofi:get-local-path', filename),
    deleteLocal: (filename: string) => invokeWithSync('lofi:delete-local', filename),
    saveLocal: (filename: string, buffer: ArrayBuffer) => invokeWithSync('lofi:save-local', filename, buffer),
    copyLocal: (sourcePath: string, filename: string) => invokeWithSync('lofi:copy-local', sourcePath, filename),
  },

  // YouTube API
  youtube: {
    fetchInfo: (url: string) => invokeWithSync('youtube:fetchInfo', url),
    download: (url: string, filename: string, quality: string, subs?: string[]) => invokeWithSync('youtube:download', url, filename, quality, subs),
    onProgress: (callback: (percent: number) => void) => {
      const listener = (_: any, percent: number) => callback(percent);
      ipcRenderer.on('youtube:download-progress', listener);
      return () => ipcRenderer.removeListener('youtube:download-progress', listener);
    }
  },

  // Log (diagnóstico temporário)
  log: (message: string) => invokeWithSync('log:write', message),

  // Anki
  anki: {
    getDecks: () => invokeWithSync('anki:get-decks'),
    createDeck: (name: string, desc?: string) => invokeWithSync('anki:create-deck', name, desc),
    saveCard: (cardData: any) => invokeWithSync('anki:save-card', cardData),
    getDueCards: (deckId: string) => invokeWithSync('anki:get-due-cards', deckId),
    reviewCard: (cardId: string, rating: number) => invokeWithSync('anki:review-card', cardId, rating),
    getAllCards: (deckId?: string) => invokeWithSync('anki:get-all-cards', deckId),
    deleteCard: (cardId: string) => invokeWithSync('anki:delete-card', cardId),
    deleteCardsBulk: (cardIds: string[]) => invokeWithSync('anki:delete-cards-bulk', cardIds),
    updateCard: (cardId: string, data: any) => invokeWithSync('anki:update-card', cardId, data),
    moveCards: (cardIds: string[], newDeckId: string) => invokeWithSync('anki:move-cards', cardIds, newDeckId),
    updateDeck: (deckId: string, name: string, description: string) => invokeWithSync('anki:update-deck', deckId, name, description),
    deleteDeck: (deckId: string) => invokeWithSync('anki:delete-deck', deckId),
  },

  // Audio
  audio: {
    generateTTS: (text: string, lang?: string) => invokeWithSync('audio:generate-tts', text, lang),
    extractClip: (videoPath: string, startTimeMs: number, endTimeMs: number) => invokeWithSync('audio:extract-clip', videoPath, startTimeMs, endTimeMs)
  },

  // Focus
  focus: {
    getSessions: () => invokeWithSync('focus:get-sessions'),
    createSession: (session: any) => invokeWithSync('focus:create-session', session),
    getAlarms: () => invokeWithSync('focus:get-alarms'),
    createAlarm: (alarm: any) => invokeWithSync('focus:create-alarm', alarm),
    updateAlarm: (id: number, alarm: any) => invokeWithSync('focus:update-alarm', id, alarm),
    deleteAlarm: (id: number) => invokeWithSync('focus:delete-alarm', id),
    setAppIcon: (type: 'normal' | 'zzz') => ipcRenderer.invoke('app:set-icon', type),
  },

  // Calendar
  calendar: {
    getEvents: () => invokeWithSync('calendar:getEvents'),
    createEvent: (event: any) => invokeWithSync('calendar:createEvent', event),
    updateEvent: (id: string, event: any) => invokeWithSync('calendar:updateEvent', id, event),
    deleteEvent: (id: string) => invokeWithSync('calendar:deleteEvent', id),
  },

  // Backup
  backup: {
    selectFolder: () => invokeWithSync('backup:selectFolder'),
    startBackup: (options: any) => invokeWithSync('backup:startBackup', options),
    onLog: (callback: (data: { message: string, progress?: number }) => void) => {
      ipcRenderer.on('backup:log', (_event, data) => callback(data));
      return () => {
        ipcRenderer.removeAllListeners('backup:log');
      };
    }
  },

  // Sync Trigger (internal hook for React)
  onSyncTrigger: (callback: () => void) => {
    syncCallbacks.push(callback);
    return () => {
      syncCallbacks = syncCallbacks.filter(cb => cb !== callback);
    };
  }
});

