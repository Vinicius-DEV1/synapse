import { createContext, useContext, useReducer, useEffect, useRef, type ReactNode } from 'react';
import type { AppState, Action, Tab } from '../types';
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
      const mappedTabs = parsed.tabs?.map((t: any) => ({
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

const StoreContext = createContext<StoreContextType | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const lastSavedRef = useRef<string | null>(null);

  useEffect(() => {
    const stateToSave = {
      activeModule: state.activeModule,
      tabs: state.tabs.map(t => ({ ...t, unsavedContent: null })), // don't persist huge unsaved text
      activeTabId: state.activeTabId,
      sidebarCollapsed: state.sidebarCollapsed,
      expandedNodes: state.expandedNodes,
      aiChatSessions: state.aiChatSessions,
      aiSidebarWidth: state.aiSidebarWidth,
    };
    
    const stringified = JSON.stringify(stateToSave);
    if (lastSavedRef.current === stringified) {
      return; // Skip save if state hasn't actually changed (avoids infinite sync loop)
    }
    console.log('[Sync Gatilho] appLayoutState mudou!', {
      old: lastSavedRef.current,
      new: stringified
    });
    lastSavedRef.current = stringified;
    
    localStorage.setItem('appLayoutState', stringified);
    
    if (window.api?.config) {
      const dbState = {
        activeModule: state.activeModule,
        sidebarCollapsed: state.sidebarCollapsed,
        expandedNodes: state.expandedNodes,
        aiChatSessions: state.aiChatSessions,
        aiSidebarWidth: state.aiSidebarWidth,
      };
      window.api.config.set('appLayoutState', dbState).catch(console.error);
    }
  }, [state.activeModule, state.tabs, state.activeTabId, state.sidebarCollapsed, state.expandedNodes, state.aiChatSessions, state.aiSidebarWidth]);

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
