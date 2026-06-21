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
  }
});
