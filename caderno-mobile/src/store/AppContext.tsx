import React, { createContext, useContext, useReducer, useEffect, useCallback, useRef } from 'react';
import type { AppState, Action } from '../types/store';
import { getAllPages, getAllBooks, initDb } from '../services/db';
import { pullAllFromCloud, listenForCloudSyncSignal } from '../services/sync/sync-pull';

const initialState: AppState = {
  isAuth: false,
  moduleKeys: {},
  pages: [],
  books: [],
  highlights: {},
  bookmarks: {},
  activeModule: 'notes',
  activePageId: null,
  activeBookId: null,
  expandedNodes: [],
  syncStatus: 'idle',
  syncErrorMessage: null,
  lastSyncTime: 0,
};

function appReducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_AUTH':
      return {
        ...state,
        isAuth: action.isAuth,
        moduleKeys: action.moduleKeys,
      };
    case 'LOGOUT':
      return {
        ...initialState,
      };
    case 'SET_PAGES':
      return {
        ...state,
        pages: action.pages,
      };
    case 'ADD_PAGE':
      return {
        ...state,
        pages: [action.page, ...state.pages],
      };
    case 'UPDATE_PAGE':
      return {
        ...state,
        pages: state.pages.map((p) => (p.id === action.id ? { ...p, ...action.updates } : p)),
      };
    case 'DELETE_PAGE':
      return {
        ...state,
        pages: state.pages.filter((p) => p.id !== action.id),
      };
    case 'SET_BOOKS':
      return {
        ...state,
        books: action.books,
      };
    case 'ADD_BOOK':
      return {
        ...state,
        books: [action.book, ...state.books],
      };
    case 'UPDATE_BOOK':
      return {
        ...state,
        books: state.books.map((b) => (b.id === action.id ? { ...b, ...action.updates } : b)),
      };
    case 'DELETE_BOOK':
      return {
        ...state,
        books: state.books.filter((b) => b.id !== action.id),
      };
    case 'SET_HIGHLIGHTS':
      return {
        ...state,
        highlights: { ...state.highlights, [action.bookId]: action.highlights },
      };
    case 'SET_BOOKMARKS':
      return {
        ...state,
        bookmarks: { ...state.bookmarks, [action.bookId]: action.bookmarks },
      };
    case 'TOGGLE_NODE':
      return {
        ...state,
        expandedNodes: state.expandedNodes.includes(action.nodeId)
          ? state.expandedNodes.filter((id) => id !== action.nodeId)
          : [...state.expandedNodes, action.nodeId],
      };
    case 'EXPAND_NODE':
      return {
        ...state,
        expandedNodes: state.expandedNodes.includes(action.nodeId)
          ? state.expandedNodes
          : [...state.expandedNodes, action.nodeId],
      };
    case 'SET_ACTIVE_PAGE':
      return {
        ...state,
        activePageId: action.pageId,
      };
    case 'SET_ACTIVE_BOOK':
      return {
        ...state,
        activeBookId: action.bookId,
      };
    case 'SET_ACTIVE_MODULE':
      return {
        ...state,
        activeModule: action.module,
      };
    case 'SET_SYNC_STATUS':
      return {
        ...state,
        syncStatus: action.status,
        syncErrorMessage: action.error ?? null,
        lastSyncTime: action.status === 'success' ? Date.now() : state.lastSyncTime,
      };
    default:
      return state;
  }
}

interface AppContextValue {
  state: AppState;
  dispatch: React.Dispatch<Action>;
  loadLocalData: () => Promise<void>;
  syncNow: () => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const syncingRef = useRef(false);

  const loadLocalData = useCallback(async () => {
    try {
      await initDb();
      const [pages, books] = await Promise.all([getAllPages(), getAllBooks()]);
      dispatch({ type: 'SET_PAGES', pages });
      dispatch({ type: 'SET_BOOKS', books });
    } catch (err) {
      console.error('Failed to load local DB data:', err);
    }
  }, []);

  const syncNow = useCallback(async () => {
    if (!state.isAuth || Object.keys(state.moduleKeys).length === 0 || syncingRef.current) return;
    syncingRef.current = true;
    dispatch({ type: 'SET_SYNC_STATUS', status: 'syncing' });
    try {
      await pullAllFromCloud(state.moduleKeys);
      await loadLocalData();
      dispatch({ type: 'SET_SYNC_STATUS', status: 'success' });
    } catch (err: any) {
      console.error('Sync failed:', err);
      dispatch({ type: 'SET_SYNC_STATUS', status: 'error', error: err?.message });
    } finally {
      syncingRef.current = false;
    }
  }, [state.isAuth, state.moduleKeys, loadLocalData]);

  // Initial local DB load
  useEffect(() => {
    loadLocalData();
  }, [loadLocalData]);

  // Listen for realtime cloud sync signals
  useEffect(() => {
    if (!state.isAuth) return;

    // Trigger initial sync on login
    syncNow();

    const unsub = listenForCloudSyncSignal(() => {
      syncNow();
    });

    // Auto-sync fallback every 10 min
    const timer = setInterval(() => {
      syncNow();
    }, 10 * 60 * 1000);

    return () => {
      unsub();
      clearInterval(timer);
    };
  }, [state.isAuth, syncNow]);

  return (
    <AppContext.Provider value={{ state, dispatch, loadLocalData, syncNow }}>
      {children}
    </AppContext.Provider>
  );
};

export function useAppStore(): AppContextValue {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppStore must be used within an AppProvider');
  }
  return context;
}
