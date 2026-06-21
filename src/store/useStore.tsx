import { createContext, useContext, useReducer, useEffect, type ReactNode } from 'react';
import type { AppState, Action, Tab } from '../types';

function generateTabId(): string {
  return 'tab_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
}

const initialTab: Tab = {
  id: generateTabId(),
  pageId: null,
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
      return {
        activeModule: parsed.activeModule,
        tabs: parsed.tabs?.map((t: Tab) => ({ ...t, unsavedContent: null })), // clear unsaved content on boot
        activeTabId: parsed.activeTabId,
        sidebarCollapsed: parsed.sidebarCollapsed,
        expandedNodes: parsed.expandedNodes,
      };
    }
  } catch (e) {
    console.error('Failed to load state', e);
  }
  return {};
}

const saved = loadSavedState();

const initialState: AppState = {
  activeModule: saved.activeModule || 'notes',
  pages: [],
  tabs: saved.tabs && saved.tabs.length > 0 ? saved.tabs : [initialTab],
  activeTabId: saved.activeTabId || initialTab.id,
  sidebarCollapsed: saved.sidebarCollapsed || false,
  expandedNodes: saved.expandedNodes || [],
  contextMenu: null,
  confirmDelete: null,
};

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_ACTIVE_MODULE':
      return { ...state, activeModule: action.module };

    case 'SET_PAGES':
      return { ...state, pages: action.pages };

    case 'ADD_PAGE':
      return { ...state, pages: [...state.pages, action.page] };

    case 'UPDATE_PAGE':
      return {
        ...state,
        pages: state.pages.map((p) =>
          p.id === action.page.id ? { ...p, ...action.page } : p
        ),
      };

    case 'DELETE_PAGE': {
      // Collect all descendant IDs
      const toDelete = new Set<string>();
      const collectIds = (parentId: string) => {
        toDelete.add(parentId);
        state.pages.filter((p) => p.parent_id === parentId).forEach((p) => collectIds(p.id));
      };
      collectIds(action.id);

      const newPages = state.pages.filter((p) => !toDelete.has(p.id));
      // Update tabs that had deleted pages
      const newTabs = state.tabs.map((t) =>
        t.pageId && toDelete.has(t.pageId) ? { ...t, pageId: null, unsavedContent: null } : t
      );
      return { ...state, pages: newPages, tabs: newTabs };
    }

    case 'ADD_TAB':
      return {
        ...state,
        tabs: [...state.tabs, action.tab],
        activeTabId: action.tab.id,
      };

    case 'CLOSE_TAB': {
      if (state.tabs.length <= 1) return state;
      const newTabs = state.tabs.filter((t) => t.id !== action.tabId);
      let newActiveId = state.activeTabId;
      if (state.activeTabId === action.tabId) {
        const idx = state.tabs.findIndex((t) => t.id === action.tabId);
        newActiveId = newTabs[Math.min(idx, newTabs.length - 1)]?.id || newTabs[0].id;
      }
      return { ...state, tabs: newTabs, activeTabId: newActiveId };
    }

    case 'SET_ACTIVE_TAB':
      return { ...state, activeTabId: action.tabId };

    case 'NAVIGATE_IN_TAB':
      return {
        ...state,
        tabs: state.tabs.map((t) =>
          t.id === state.activeTabId
            ? { ...t, pageId: action.pageId, unsavedContent: null, scrollY: 0 }
            : t
        ),
      };

    case 'SET_UNSAVED_CONTENT':
      return {
        ...state,
        tabs: state.tabs.map((t) =>
          t.id === action.tabId ? { ...t, unsavedContent: action.content } : t
        ),
      };

    case 'SET_SCROLL_Y':
      return {
        ...state,
        tabs: state.tabs.map((t) =>
          t.id === action.tabId ? { ...t, scrollY: action.scrollY } : t
        ),
      };

    case 'TOGGLE_SIDEBAR':
      return { ...state, sidebarCollapsed: !state.sidebarCollapsed };

    case 'TOGGLE_NODE': {
      const exists = state.expandedNodes.includes(action.nodeId);
      return {
        ...state,
        expandedNodes: exists
          ? state.expandedNodes.filter((n) => n !== action.nodeId)
          : [...state.expandedNodes, action.nodeId],
      };
    }

    case 'SHOW_CONTEXT_MENU':
      return {
        ...state,
        contextMenu: { visible: true, x: action.x, y: action.y, pageId: action.pageId },
      };

    case 'HIDE_CONTEXT_MENU':
      return { ...state, contextMenu: null };

    case 'SET_CONFIRM_DELETE':
      return { ...state, confirmDelete: action.pageId };

    default:
      return state;
  }
}

interface StoreContextType {
  state: AppState;
  dispatch: React.Dispatch<Action>;
}

const StoreContext = createContext<StoreContextType | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    const stateToSave = {
      activeModule: state.activeModule,
      tabs: state.tabs.map(t => ({ ...t, unsavedContent: null })), // don't persist huge unsaved text
      activeTabId: state.activeTabId,
      sidebarCollapsed: state.sidebarCollapsed,
      expandedNodes: state.expandedNodes,
    };
    localStorage.setItem('appLayoutState', JSON.stringify(stateToSave));
  }, [state.activeModule, state.tabs, state.activeTabId, state.sidebarCollapsed, state.expandedNodes]);

  return (
    <StoreContext.Provider value={{ state, dispatch }}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore(): StoreContextType {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}
