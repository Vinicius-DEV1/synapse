export const SYNC_CONFIG = {
  /**
   * Safe mode: Set to false to prevent mobile app from writing/mutating Firebase data.
   * Pull and Realtime reading will work normally.
   */
  SYNC_PUSH_ENABLED: false,

  MODULE_TABLES: {
    core: ['config'],
    notes: ['pages', 'page_history'],
    library: ['library_books', 'library_highlights', 'library_bookmarks', 'library_reading_sessions'],
  },

  FULL_SYNC_COOLDOWN_MS: 15_000,
  AUTO_SYNC_INTERVAL_MS: 10 * 60 * 1000,
  DECRYPT_BATCH_SIZE: 20,
};
