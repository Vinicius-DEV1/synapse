import {
  createContext,
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

import { getSettings } from '../utils/settings';

function loadSavedState(): Partial<AppState> {
  try {
    const settings = getSettings();
    if (!settings.restoreTabsOnStartup) {
      return {}; // Do not restore anything if user opted out
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
        aiChatSessions: parsed.aiChatSessions || {},
        aiSidebarWidth: parsed.aiSidebarWidth || 340,
      };
    }
  } catch (e) {
    console.error('Failed to load state', e);
  }
  return {};
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
  isReadingModeFullScreen: false,
  navDirection: null,
};

interface StoreContextType {
  state: AppState;
  dispatch: React.Dispatch<Action>;
}

export const StoreContext = createContext<StoreContextType | null>(null);
export const StateContext = createContext<AppState | null>(null);
export const DispatchContext = createContext<React.Dispatch<Action> | null>(null);

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
  
  // Keep imperative ref immediately updated during render
  _storeStateRef = state;
  _storeDispatchRef = dispatch;

  useEffect(() => {
    _storeStateRef = state;
    _storeDispatchRef = dispatch;
    notifyStoreSubscribers();
  }, [state, dispatch]);

  const lastSavedRef = useRef<string | null>(null);

  useEffect(() => {
    const stateToSave = {
      tabs: state.tabs.map(t => ({ ...t, unsavedContent: null })), // don't persist huge unsaved text
      activeTabId: state.activeTabId,
      sidebarCollapsed: state.sidebarCollapsed,
      expandedNodes: state.expandedNodes,
      aiChatSessions: state.aiChatSessions,
      aiSidebarWidth: state.aiSidebarWidth,
    };
    
    try {
      const stringified = JSON.stringify(stateToSave);
      if (lastSavedRef.current === stringified) {
        return; // Skip save if state hasn't actually changed
      }
      lastSavedRef.current = stringified;
      
      localStorage.setItem('appLayoutState', stringified);
    } catch (e) {
      console.warn('Failed to save layout state to localStorage:', e);
    }
    
    if (window.api?.config) {
      const dbState = {
        sidebarCollapsed: state.sidebarCollapsed,
        expandedNodes: state.expandedNodes,
        aiChatSessions: state.aiChatSessions,
        aiSidebarWidth: state.aiSidebarWidth,
      };
      window.api.config.set('appLayoutState', dbState).catch(console.error);
    }
  }, [state.tabs, state.activeTabId, state.sidebarCollapsed, state.expandedNodes, state.aiChatSessions, state.aiSidebarWidth]);

  const contextValue = useMemo(() => ({ state, dispatch }), [state]);

  return (
    <DispatchContext.Provider value={dispatch}>
      <StateContext.Provider value={state}>
        <StoreContext.Provider value={contextValue}>
          {children}
        </StoreContext.Provider>
      </StateContext.Provider>
    </DispatchContext.Provider>
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
  const ctx = useContext(DispatchContext);
  return ctx || _storeDispatchRef || (() => {});
}

/**
 * Fine-grained selector hook that isolates re-render boundaries.
 * Callers will only re-render if the selected slice changes by equalityFn (default: Object.is).
 */
export function useStoreSelector<T>(
  selector: (state: AppState) => T,
  equalityFn: (prev: T, next: T) => boolean = Object.is
): T {
  const selectorRef = useRef(selector);
  const equalityFnRef = useRef(equalityFn);
  selectorRef.current = selector;
  equalityFnRef.current = equalityFn;

  const currentSelectionRef = useRef<T>(selector(_storeStateRef));

  const getSnapshot = useCallback(() => {
    const nextSelection = selectorRef.current(_storeStateRef);
    if (!equalityFnRef.current(currentSelectionRef.current, nextSelection)) {
      currentSelectionRef.current = nextSelection;
    }
    return currentSelectionRef.current;
  }, []);

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

export async function syncLayoutFromDb(dispatch: React.Dispatch<Action>) {
  if (!window.api?.config) return;
  try {
    const dbState = await window.api.config.get('appLayoutState');
    if (dbState && typeof dbState === 'object') {
      dispatch({ type: 'MERGE_DB_STATE', payload: dbState });
    }
  } catch (err) {
    console.error('Failed to load layout from DB:', err);
  }
}
