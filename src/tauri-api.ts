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
    
    // --- CULTURE ---
    culture: {
      getItems: async () => await invoke('culture_get_items'),
      createItem: async (i: any) => await invoke('culture_create_item', { item: i }),
      updateItem: async (id: string, i: any) => await invoke('culture_update_item', { id, item: i }),
      deleteItem: async (id: string) => await invoke('culture_delete_item', { id }),
      updateProgress: async (id: string, progress: number) => await invoke('culture_update_progress', { id, progress }),
      getEpisodes: async (itemId: string) => await invoke('culture_get_episodes', { itemId }),
      saveEpisodes: async (itemId: string, episodes: any[]) => await invoke('culture_save_episodes', { itemId, episodes }),
      toggleEpisodeWatched: async (episodeId: string, isWatched: boolean) => await invoke('culture_toggle_episode_watched', { episodeId, isWatched }),
      getRecentReleases: async () => [] // Placeholder for external API fetch in future
    },
    
    // --- FOCUS ---
    focus: {
      getSessions: async () => await invoke('focus_get_sessions'),
      createSession: async (s: any) => await invoke('focus_create_session', { session: s }),
      deleteSessions: async () => {}, // mock
      getAlarms: async () => await invoke('focus_get_alarms'),
      createAlarm: async (a: any) => await invoke('focus_create_alarm', { alarm: a }),
      updateAlarm: async (id: number, a: any) => await invoke('focus_update_alarm', { id: id.toString(), alarm: a }),
      deleteAlarm: async (id: number) => await invoke('focus_delete_alarm', { id: id.toString() }),
      setAppIcon: async (type: string) => {} // mock
    },
    
    // --- ANKI ---
    anki: {
      getDecks: async () => await invoke('anki_get_decks'),
      createDeck: async (name: string, desc?: string) => await invoke('anki_create_deck', { name, description: desc }),
      saveCard: async (c: any) => await invoke('anki_save_card', { card: c }),
      getDueCards: async (deckId: string) => await invoke('anki_get_due_cards', { deckId }),
      reviewCard: async (cardId: string, rating: number) => await invoke('anki_review_card', { cardId, rating }),
      getAllCards: async (deckId?: string) => await invoke('anki_get_all_cards', { deckId }),
      deleteCard: async (cardId: string) => await invoke('anki_delete_card', { cardId }),
      deleteCardsBulk: async (cardIds: string[]) => { for(let id of cardIds) await invoke('anki_delete_card', { cardId: id }); },
      updateCard: async (cardId: string, c: any) => await invoke('anki_update_card', { cardId, card: c }),
      moveCards: async () => {} // mock
    },
    
    // --- SYNC ---
    sync: {
      getTable: async (tableName: string) => await invoke('sync_get_table', { tableName }),
      deleteRow: async (tableName: string, id: string) => await invoke('sync_delete_row', { tableName, id }),
      upsertRow: async (tableName: string, row: any) => await invoke('sync_upsert_row', { tableName, row })
    },
    
    // --- MULTIMEDIA (Pending rust native implementations) ---
    video: {},
    lofi: {},
    youtube: {},
    audio: {},
    backup: {},
  };
};
