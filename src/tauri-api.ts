import { invoke } from '@tauri-apps/api/core';

export const createTauriApi = async () => {
  let syncCallbacks: (() => void)[] = [];
  const triggerSync = () => syncCallbacks.forEach(cb => cb());

  return {
    onSyncTrigger: (callback: () => void) => {
      syncCallbacks.push(callback);
      return () => {
        syncCallbacks = syncCallbacks.filter(cb => cb !== callback);
      };
    },

    // --- AUTH ---
    auth: {
      status: async () => {
        return await invoke('auth_status');
      },
      login: async (password: string) => {
        return await invoke('auth_login', { password });
      },
      setup: async (password: string, existingKeys?: any) => {
        return await invoke('auth_setup', { password, existingKeys });
      },
      changePassword: async () => ({ success: false, error: "Not implemented in Tauri yet" }),
      onLock: () => () => {},
      lock: async () => {},
      setPreferences: async () => {}
    },

    // Mock das outras chamadas até que o Rust as implemente
    config: { get: async () => null, set: async () => ({ success: true }) },
    // --- PAGES ---
    getAllPages: async () => await invoke('notes_get_all_pages'),
    getPageContent: async (id: string) => await invoke('notes_get_page_content', { id }),
    createPage: async (page: any) => await invoke('notes_create_page', { page }),
    updatePage: async (page: any) => await invoke('notes_update_page', { page }),
    deletePage: async (id: string) => await invoke('notes_delete_page', { id }),
    reorderPages: async () => true, // TODO
    getPageHistory: async () => [],
    
    // --- IMAGE CACHE ---
    imageCache: {
      get: async (id: string) => await invoke('image_cache_get', { id }),
      put: async (id: string, data: ArrayBuffer, mimeType: string) => 
        await invoke('image_cache_put', { id, data: Array.from(new Uint8Array(data)), mimeType })
    },
    // --- FINANCE ---
    finance: {
      getTransactions: async () => await invoke('finance_get_transactions'),
      addTransaction: async (t: any) => await invoke('finance_add_transaction', { transaction: t }),
      updateTransaction: async (t: any) => await invoke('finance_update_transaction', { transaction: t }),
      deleteTransaction: async (id: string) => await invoke('finance_delete_transaction', { id }),
      getWishlist: async () => await invoke('finance_get_wishlist'),
      addWishlist: async (w: any) => await invoke('finance_add_wishlist', { item: w }),
      updateWishlist: async (w: any) => await invoke('finance_update_wishlist', { item: w }),
      deleteWishlist: async (id: string) => await invoke('finance_delete_wishlist', { id })
    },
    
    // --- LIBRARY ---
    library: {
      getBooks: async () => await invoke('library_get_books'),
      addBook: async (b: any) => await invoke('library_add_book', { book: b }),
      updateBook: async (b: any) => await invoke('library_update_book', { book: b }),
      deleteBook: async (id: string) => await invoke('library_delete_book', { id }),
      getCollections: async () => await invoke('library_get_collections'),
      addCollection: async (c: any) => await invoke('library_add_collection', { collection: c }),
      updateCollection: async (c: any) => await invoke('library_update_collection', { collection: c }),
      deleteCollection: async (id: string) => await invoke('library_delete_collection', { id }),
      addBookToCollection: async (bookId: string, collectionId: string) => await invoke('library_add_book_to_collection', { bookId, collectionId }),
      removeBookFromCollection: async (bookId: string, collectionId: string) => await invoke('library_remove_book_from_collection', { bookId, collectionId })
    },
    
    // --- CALENDAR ---
    calendar: {
      getEvents: async () => await invoke('calendar_get_events'),
      addEvent: async (e: any) => await invoke('calendar_add_event', { event: e }),
      updateEvent: async (e: any) => await invoke('calendar_update_event', { event: e }),
      deleteEvent: async (id: string) => await invoke('calendar_delete_event', { id })
    },
  };
};
