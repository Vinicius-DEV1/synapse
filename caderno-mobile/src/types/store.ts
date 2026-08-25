import type { Page } from './notes';
import type { LibraryBook, LibraryHighlight, LibraryBookmark } from './library';

export interface AppState {
  isAuth: boolean;
  moduleKeys: Record<string, any>;
  pages: Page[];
  books: LibraryBook[];
  highlights: Record<string, LibraryHighlight[]>;
  bookmarks: Record<string, LibraryBookmark[]>;
  activeModule: 'notes' | 'library';
  activePageId: string | null;
  activeBookId: string | null;
  expandedNodes: string[];
  syncStatus: 'idle' | 'syncing' | 'success' | 'error';
  syncErrorMessage?: string | null;
  lastSyncTime: number;
}

export type Action =
  | { type: 'SET_AUTH'; isAuth: boolean; moduleKeys: Record<string, any> }
  | { type: 'LOGOUT' }
  | { type: 'SET_PAGES'; pages: Page[] }
  | { type: 'ADD_PAGE'; page: Page }
  | { type: 'UPDATE_PAGE'; id: string; updates: Partial<Page> }
  | { type: 'DELETE_PAGE'; id: string }
  | { type: 'SET_BOOKS'; books: LibraryBook[] }
  | { type: 'ADD_BOOK'; book: LibraryBook }
  | { type: 'UPDATE_BOOK'; id: string; updates: Partial<LibraryBook> }
  | { type: 'DELETE_BOOK'; id: string }
  | { type: 'SET_HIGHLIGHTS'; bookId: string; highlights: LibraryHighlight[] }
  | { type: 'SET_BOOKMARKS'; bookId: string; bookmarks: LibraryBookmark[] }
  | { type: 'TOGGLE_NODE'; nodeId: string }
  | { type: 'EXPAND_NODE'; nodeId: string }
  | { type: 'SET_ACTIVE_PAGE'; pageId: string | null }
  | { type: 'SET_ACTIVE_BOOK'; bookId: string | null }
  | { type: 'SET_ACTIVE_MODULE'; module: 'notes' | 'library' }
  | { type: 'SET_SYNC_STATUS'; status: AppState['syncStatus']; error?: string | null };
