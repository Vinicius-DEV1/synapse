import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('api', {
  getAllPages: () => ipcRenderer.invoke('db:get-all-pages'),
  createPage: (page: { parentId: string | null; title?: string; icon?: string }) =>
    ipcRenderer.invoke('db:create-page', page),
  updatePage: (page: { id: string; title?: string; icon?: string; content?: string; parent_id?: string | null }) =>
    ipcRenderer.invoke('db:update-page', page),
  deletePage: (id: string) => ipcRenderer.invoke('db:delete-page', id),
  reorderPages: (updates: { id: string; sort_order: number }[]) =>
    ipcRenderer.invoke('db:reorder-pages', updates),
  getPageHistory: (pageId: string) => ipcRenderer.invoke('db:get-page-history', pageId),
  
  // Auth
  auth: {
    status: () => ipcRenderer.invoke('auth:status'),
    login: (password: string) => ipcRenderer.invoke('auth:login', password),
    setup: (password: string) => ipcRenderer.invoke('auth:setup', password),
    changePassword: (newPassword: string) => ipcRenderer.invoke('auth:change-password', newPassword),
    onLock: (callback: () => void) => {
      const listener = () => callback();
      ipcRenderer.on('app:lock', listener);
      return () => ipcRenderer.removeListener('app:lock', listener);
    },
    lock: () => ipcRenderer.invoke('auth:lock'),
    setPreferences: (prefs: { autoLockOnSuspend: boolean }) => ipcRenderer.invoke('auth:set-preferences', prefs),
  },

  // Finance
  finance: {
    getTransactions: () => ipcRenderer.invoke('finance:get-transactions'),
    createTransaction: (tx: any) => ipcRenderer.invoke('finance:create-transaction', tx),
    deleteTransaction: (id: string) => ipcRenderer.invoke('finance:delete-transaction', id),
    getWishlist: () => ipcRenderer.invoke('finance:get-wishlist'),
    createWishlist: (item: any) => ipcRenderer.invoke('finance:create-wishlist', item),
    deleteWishlist: (id: string) => ipcRenderer.invoke('finance:delete-wishlist', id),
  },

  // Library
  library: {
    getBooks: () => ipcRenderer.invoke('library:get-books'),
    importBook: () => ipcRenderer.invoke('library:import-book'),
    deleteBook: (id: string) => ipcRenderer.invoke('library:delete-book', id),
    updateBook: (book: any) => ipcRenderer.invoke('library:update-book', book),
    getBookFile: (id: string) => ipcRenderer.invoke('library:get-book-file', id),
    getCollections: () => ipcRenderer.invoke('library:get-collections'),
    createCollection: (c: any) => ipcRenderer.invoke('library:create-collection', c),
    updateCollection: (c: any) => ipcRenderer.invoke('library:update-collection', c),
    deleteCollection: (id: string) => ipcRenderer.invoke('library:delete-collection', id),
    setBookCollections: (bookId: string, collectionIds: string[]) => ipcRenderer.invoke('library:set-book-collections', bookId, collectionIds),
    getBookCollections: (bookId: string) => ipcRenderer.invoke('library:get-book-collections', bookId),
    getHighlights: (bookId: string) => ipcRenderer.invoke('library:get-highlights', bookId),
    createHighlight: (h: any) => ipcRenderer.invoke('library:create-highlight', h),
    updateHighlight: (h: any) => ipcRenderer.invoke('library:update-highlight', h),
    deleteHighlight: (id: string) => ipcRenderer.invoke('library:delete-highlight', id),
    getBookmarks: (bookId: string) => ipcRenderer.invoke('library:get-bookmarks', bookId),
    createBookmark: (b: any) => ipcRenderer.invoke('library:create-bookmark', b),
    updateBookmark: (b: any) => ipcRenderer.invoke('library:update-bookmark', b),
    deleteBookmark: (id: string) => ipcRenderer.invoke('library:delete-bookmark', id),
    getOcrCache: (bookId: string, pageNumber: number) => ipcRenderer.invoke('library:get-ocr-cache', bookId, pageNumber),
    saveOcrCache: (data: any) => ipcRenderer.invoke('library:save-ocr-cache', data),
    startReadingSession: (data: any) => ipcRenderer.invoke('library:start-reading-session', data),
    endReadingSession: (data: any) => ipcRenderer.invoke('library:end-reading-session', data),
    getReadingStats: (bookId?: string) => ipcRenderer.invoke('library:get-reading-stats', bookId),
  }
});
