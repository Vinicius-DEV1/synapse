import type { IDBPDatabase } from 'idb';
import type { CadernoDBSchema } from '../../services/db-web';
import { createBooksApi } from './library/booksApi';
import { createCollectionsApi } from './library/collectionsApi';
import { createHighlightsApi } from './library/highlightsApi';
import { createBookmarksApi } from './library/bookmarksApi';
import { createStatsApi } from './library/statsApi';

export const webLibraryApi = (db: IDBPDatabase<CadernoDBSchema>, generateId: () => string, getMasterKey: () => CryptoKey | null) => ({
  ...createBooksApi(db, generateId, getMasterKey),
  ...createCollectionsApi(db, generateId),
  ...createHighlightsApi(db, generateId),
  ...createBookmarksApi(db, generateId),
  ...createStatsApi(db, generateId),
  
  getOcrCache: async () => null,
  saveOcrCache: async () => true,
});
