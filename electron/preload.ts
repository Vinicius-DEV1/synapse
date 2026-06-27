import { contextBridge, ipcRenderer } from 'electron';

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
  createPage: (page: { parentId: string | null; title?: string; icon?: string }) =>
    invokeWithSync('db:create-page', page),
  updatePage: (page: { id: string; title?: string; icon?: string; content?: string; crdt_state?: string | null; parent_id?: string | null }) =>
    invokeWithSync('db:update-page', page),
  deletePage: (id: string) => invokeWithSync('db:delete-page', id),
  reorderPages: (updates: { id: string; sort_order: number }[]) =>
    invokeWithSync('db:reorder-pages', updates),
  getPageHistory: (pageId: string) => invokeWithSync('db:get-page-history', pageId),
  
  // Auth
  auth: {
    status: () => invokeWithSync('auth:status'),
    login: (password: string) => invokeWithSync('auth:login', password),
    setup: (password: string) => invokeWithSync('auth:setup', password),
    changePassword: (newPassword: string) => invokeWithSync('auth:change-password', newPassword),
    onLock: (callback: () => void) => {
      const listener = () => callback();
      ipcRenderer.on('app:lock', listener);
      return () => ipcRenderer.removeListener('app:lock', listener);
    },
    lock: () => invokeWithSync('auth:lock'),
    setPreferences: (prefs: { autoLockOnSuspend: boolean }) => invokeWithSync('auth:set-preferences', prefs),
  },

  // Finance
  finance: {
    getTransactions: () => invokeWithSync('finance:get-transactions'),
    createTransaction: (tx: any) => invokeWithSync('finance:create-transaction', tx),
    deleteTransaction: (id: string) => invokeWithSync('finance:delete-transaction', id),
    getWishlist: () => invokeWithSync('finance:get-wishlist'),
    createWishlist: (item: any) => invokeWithSync('finance:create-wishlist', item),
    deleteWishlist: (id: string) => invokeWithSync('finance:delete-wishlist', id),
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

  // Log (diagnóstico temporário)
  log: (message: string) => invokeWithSync('log:write', message),

  // Sync Trigger (internal hook for React)
  onSyncTrigger: (callback: () => void) => {
    syncCallbacks.push(callback);
    return () => {
      syncCallbacks = syncCallbacks.filter(cb => cb !== callback);
    };
  }
});
