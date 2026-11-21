import {
  createContext,
  use,
  useContext,
  useReducer,
  useEffect,
  useRef,
  useMemo,
  useCallback,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import type { AppState, Action, Tab } from '../types';
import type { Page } from '../types/notes';
import { appReducer as reducer } from './commands';
import { getSettings } from '../utils/settings';

const AI_CHAT_SESSIONS_STORAGE_KEY = 'aiChatSessions';
const LAYOUT_DB_DEBOUNCE_MS = 400;
const AI_SESSIONS_PERSIST_DEBOUNCE_MS = 500;

function generateTabId(): string {
  return 'tab_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
}

const initialTab: Tab = {
  id: generateTabId(),
  module: 'home',
  pageId: null,
  bookId: null,
  unsavedContent: null,
  scrollY: 0,
};

function loadSavedAiChatSessions(legacySessions?: AppState['aiChatSessions']): AppState['aiChatSessions'] {
  try {
    const raw = localStorage.getItem(AI_CHAT_SESSIONS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return parsed as AppState['aiChatSessions'];
      }
    }
  } catch (e) {
    console.warn('Failed to load AI chat sessions from localStorage:', e);
  }
  return legacySessions || {};
}

function loadSavedState(): Partial<AppState> {
  try {
    const settings = getSettings();
    if (!settings.restoreTabsOnStartup) {
      return {
        aiChatSessions: loadSavedAiChatSessions(),
      };
    }
    
    const s = localStorage.getItem('appLayoutState');
    if (s) {
      const parsed = JSON.parse(s);
      // Migrate old activeModule into active tab if it's missing module property
      const mappedTabs = parsed.tabs?.map((t: Partial<Tab>) => ({
        ...t,
        module: t.module || (parsed.activeModule || 'notes'),
        unsavedContent: null,
      })) || [initialTab];

      return {
        tabs: mappedTabs,
        activeTabId: parsed.activeTabId,
        sidebarCollapsed: parsed.sidebarCollapsed,
        expandedNodes: parsed.expandedNodes,
        aiChatSessions: loadSavedAiChatSessions(parsed.aiChatSessions),
        aiSidebarWidth: parsed.aiSidebarWidth || 340,
      };
    }
  } catch (e) {
    console.error('Failed to load state', e);
  }
  return {
    aiChatSessions: loadSavedAiChatSessions(),
  };
}

const saved = loadSavedState();

const initialState: AppState = {
  pages: [],
  tabs: saved.tabs && saved.tabs.length > 0 ? saved.tabs : [initialTab],
  activeTabId: saved.activeTabId || initialTab.id,
  sidebarCollapsed: saved.sidebarCollapsed || false,
  expandedNodes: saved.expandedNodes || [],
  contextMenu: null,
  confirmDelete: null,
  aiChatSessions: saved.aiChatSessions || {},
  showAiSidebar: false,
  aiSidebarWidth: saved.aiSidebarWidth || 340,
  activeAiChatId: null,
  moduleKeys: {},
  masterKey: null,
  isReadingModeFullScreen: false,
  navDirection: null,
  activeWorkspaceId: null,
  activeWorkspaceKey: null,
  activeWorkspaceRole: null,
};

interface StoreContextType {
  state: AppState;
  dispatch: React.Dispatch<Action>;
}

export const StoreContext = createContext<StoreContextType | null>(null);
export const StateContext = createContext<AppState | null>(null);
export const DispatchContext = createContext<React.Dispatch<Action> | null>(null);
const ManagedByStoreProviderContext = createContext<boolean>(false);

// Global imperative reference to access state and dispatch without forcing re-renders in ProseMirror node views
let _storeStateRef: AppState = initialState;
let _storeDispatchRef: React.Dispatch<Action> | null = null;
const _storeSubscribers = new Set<() => void>();

function subscribeToStore(callback: () => void): () => void {
  _storeSubscribers.add(callback);
  return () => {
    _storeSubscribers.delete(callback);
  };
}

function notifyStoreSubscribers(): void {
  _storeSubscribers.forEach((callback) => {
    try {
      callback();
    } catch (err) {
      console.error('[useStore] Subscriber error:', err);
    }
  });
}

export function getStoreState(): AppState {
  return _storeStateRef;
}

export function getStoreDispatch(): React.Dispatch<Action> {
  return _storeDispatchRef || (() => {});
}

export function getCultureKey(): CryptoKey | undefined {
  return _storeStateRef.moduleKeys['culture'];
}

export function getNotesKey(): CryptoKey | undefined {
  return _storeStateRef.moduleKeys['notes'];
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    _storeStateRef = state;
    _storeDispatchRef = dispatch;
    notifyStoreSubscribers();
  }, [state, dispatch]);

  const lastSavedLayoutRef = useRef<string | null>(null);
  const lastSavedDbLayoutRef = useRef<string | null>(null);
  const lastSavedAiSessionsRef = useRef<string | null>(null);
  const lastSavedDbAiSessionsRef = useRef<string | null>(null);
  const hasMountedLayoutDbRef = useRef(false);
  const hasMountedAiSessionsRef = useRef(false);
  const pendingDbLayoutFlushRef = useRef<(() => void) | null>(null);
  const pendingAiSessionsFlushRef = useRef<(() => void) | null>(null);

  // Persist lightweight layout state (tabs, activeTabId, sidebar, width) WITHOUT giant aiChatSessions.
  // SQLite/IndexedDB config persistence is debounced to coalesce rapid layout updates and
  // skipped on initial mount so AuthScreen never overwrites persisted DB layout before syncLayoutFromDb().
  useEffect(() => {
    const layoutToSave = {
      tabs: state.tabs.map((t) => ({ ...t, unsavedContent: null })),
      activeTabId: state.activeTabId,
      sidebarCollapsed: state.sidebarCollapsed,
      expandedNodes: state.expandedNodes,
      aiSidebarWidth: state.aiSidebarWidth,
    };

    try {
      const stringified = JSON.stringify(layoutToSave);
      if (lastSavedLayoutRef.current !== stringified) {
        lastSavedLayoutRef.current = stringified;
        localStorage.setItem('appLayoutState', stringified);
      }
    } catch (e) {
      console.warn('Failed to save layout state to localStorage:', e);
    }

    const dbLayout = {
      sidebarCollapsed: state.sidebarCollapsed,
      expandedNodes: state.expandedNodes,
      aiSidebarWidth: state.aiSidebarWidth,
    };

    if (!hasMountedLayoutDbRef.current) {
      hasMountedLayoutDbRef.current = true;
      try {
        lastSavedDbLayoutRef.current = JSON.stringify(dbLayout);
      } catch (e) {
        console.warn('Failed to serialize initial DB layout state:', e);
      }
      return;
    }

    if (!window.api?.config) return;

    const flushDbLayout = () => {
      pendingDbLayoutFlushRef.current = null;
      if (!window.api?.config) return;
      try {
        const dbStringified = JSON.stringify(dbLayout);
        if (lastSavedDbLayoutRef.current !== dbStringified) {
          lastSavedDbLayoutRef.current = dbStringified;
          window.api.config.set('appLayoutState', dbLayout).catch(console.error);
        }
      } catch (e) {
        console.warn('Failed to serialize DB layout state:', e);
      }
    };

    pendingDbLayoutFlushRef.current = flushDbLayout;
    const timer = setTimeout(flushDbLayout, LAYOUT_DB_DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
    };
  }, [state.tabs, state.activeTabId, state.sidebarCollapsed, state.expandedNodes, state.aiSidebarWidth]);

  // Persist aiChatSessions in its own isolated debounced effect so tab switches never JSON.stringify chat histories.
  // Skips writing initial mount snapshot to DB so empty defaults never wipe DB history prior to syncLayoutFromDb().
  useEffect(() => {
    const sessions = state.aiChatSessions;
    if (!hasMountedAiSessionsRef.current) {
      hasMountedAiSessionsRef.current = true;
      try {
        const initialSerialized = JSON.stringify(sessions);
        lastSavedAiSessionsRef.current = initialSerialized;
        lastSavedDbAiSessionsRef.current = initialSerialized;
      } catch (e) {
        console.warn('Failed to serialize initial AI chat sessions:', e);
      }
      return;
    }

    const flushAiSessions = () => {
      pendingAiSessionsFlushRef.current = null;
      try {
        const serialized = JSON.stringify(sessions);
        if (lastSavedAiSessionsRef.current !== serialized) {
          lastSavedAiSessionsRef.current = serialized;
          localStorage.setItem(AI_CHAT_SESSIONS_STORAGE_KEY, serialized);
        }
        if (window.api?.config && lastSavedDbAiSessionsRef.current !== serialized) {
          lastSavedDbAiSessionsRef.current = serialized;
          window.api.config.set(AI_CHAT_SESSIONS_STORAGE_KEY, sessions).catch(console.error);
        }
      } catch (e) {
        console.warn('Failed to persist AI chat sessions:', e);
      }
    };

    pendingAiSessionsFlushRef.current = flushAiSessions;
    const timer = setTimeout(flushAiSessions, AI_SESSIONS_PERSIST_DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
    };
  }, [state.aiChatSessions]);

  // Flush any pending debounced persistence before page unload/hide
  useEffect(() => {
    const flushAll = () => {
      pendingDbLayoutFlushRef.current?.();
      pendingAiSessionsFlushRef.current?.();
    };
    window.addEventListener('pagehide', flushAll);
    window.addEventListener('beforeunload', flushAll);
    return () => {
      window.removeEventListener('pagehide', flushAll);
      window.removeEventListener('beforeunload', flushAll);
    };
  }, []);

  const contextValue = useMemo(() => ({ state, dispatch }), [state]);

  return (
    <ManagedByStoreProviderContext.Provider value={true}>
      <DispatchContext.Provider value={dispatch}>
        <StateContext.Provider value={state}>
          <StoreContext.Provider value={contextValue}>
            {children}
          </StoreContext.Provider>
        </StateContext.Provider>
      </DispatchContext.Provider>
    </ManagedByStoreProviderContext.Provider>
  );
}

/**
 * Legacy full store hook. Returns state and dispatch.
 * Note: Subscribes to the entire state. For optimized leaf components, prefer useStoreSelector or useStoreDispatch.
 */
export function useStore(): StoreContextType {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}

/**
 * Zero-rerender dispatch hook. Never triggers re-renders when state changes.
 */
export function useStoreDispatch(): React.Dispatch<Action> {
  const isManaged = useContext(ManagedByStoreProviderContext);
  const ctx = useContext(DispatchContext);
  if (isManaged) {
    return ctx || _storeDispatchRef || (() => {});
  }
  const legacyCtx = use(StoreContext);
  return ctx || legacyCtx?.dispatch || _storeDispatchRef || (() => {});
}

/**
 * Fine-grained selector hook that isolates re-render boundaries.
 * Callers will only re-render if the selected slice changes by equalityFn (default: Object.is).
 */
export function useStoreSelector<T>(
  selector: (state: AppState) => T,
  equalityFn: (prev: T, next: T) => boolean = Object.is
): T {
  const isManaged = useContext(ManagedByStoreProviderContext);
  const fallbackState = isManaged ? null : (use(StoreContext)?.state ?? null);
  const currentSelectionRef = useRef<T>(selector(fallbackState ?? _storeStateRef));

  const getSnapshot = useCallback(() => {
    const source = fallbackState ?? _storeStateRef;
    const nextSelection = selector(source);
    if (!equalityFn(currentSelectionRef.current, nextSelection)) {
      currentSelectionRef.current = nextSelection;
    }
    return currentSelectionRef.current;
  }, [selector, equalityFn, fallbackState]);

  return useSyncExternalStore(subscribeToStore, getSnapshot);
}

/**
 * Sliced selector hook for active tab.
 */
export function useActiveTab(): Tab | undefined {
  return useStoreSelector(
    (s) => s.tabs.find((t) => t.id === s.activeTabId) || s.tabs[0]
  );
}

/**
 * Sliced selector hook for pages list.
 */
export function usePages(): Page[] {
  return useStoreSelector((s) => s.pages);
}

/**
 * Sliced selector hook for tabs list.
 */
export function useTabs(): Tab[] {
  return useStoreSelector((s) => s.tabs);
}

function isAiChatSessionsMap(value: unknown): value is AppState['aiChatSessions'] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const entries = Object.values(value as Record<string, unknown>);
  return entries.every(
    (entry) =>
      entry !== null &&
      typeof entry === 'object' &&
      !Array.isArray(entry) &&
      Array.isArray((entry as { messages?: unknown }).messages)
  );
}

export async function syncLayoutFromDb(dispatch: React.Dispatch<Action>) {
  if (!window.api?.config) return;
  try {
    const dbState = await window.api.config.get('appLayoutState');
    let mergedPayload: Partial<AppState> | null =
      dbState && typeof dbState === 'object' ? { ...(dbState as Partial<AppState>) } : null;

    const dbAiSessions = await window.api.config.get(AI_CHAT_SESSIONS_STORAGE_KEY).catch(() => null);
    if (isAiChatSessionsMap(dbAiSessions)) {
      mergedPayload = {
        ...(mergedPayload || {}),
        aiChatSessions: dbAiSessions,
      };
    }

    if (mergedPayload) {
      dispatch({ type: 'MERGE_DB_STATE', payload: mergedPayload });
    }
  } catch (err) {
    console.error('Failed to load layout from DB:', err);
  }
}
