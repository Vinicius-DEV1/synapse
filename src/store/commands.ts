import type { AppState, Action, Tab } from '../types';

export function appReducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'UPDATE_TAB_MODULE':
      return {
        ...state,
        tabs: state.tabs.map((t) => t.id === action.tabId ? { 
          ...t, 
          module: action.module, 
          ...(action.bookId !== undefined ? { bookId: action.bookId } : {}),
          ...(action.moduleState !== undefined ? { moduleState: action.moduleState } : {}) 
        } : t),
      };
    case 'OPEN_LIBRARY_BOOK':
      return {
        ...state,
        tabs: state.tabs.map((t) => t.id === state.activeTabId ? { ...t, module: 'library', bookId: action.bookId, bookTitle: action.title } : t),
      };
    case 'CLOSE_LIBRARY_BOOK':
      return {
        ...state,
        tabs: state.tabs.map((t) => t.id === action.tabId ? { ...t, bookId: null, bookTitle: undefined } : t),
      };
    case 'SET_PAGES':
      return { ...state, pages: action.pages };
    case 'ADD_PAGE':
      return { ...state, pages: [...state.pages, action.page] };
    case 'UPDATE_PAGE':
      return {
        ...state,
        pages: state.pages.map((p) => p.id === action.page.id ? { ...p, ...action.page } : p),
      };
    case 'DELETE_PAGE': {
      const toDelete = new Set<string>();
      const collectIds = (parentId: string) => {
        toDelete.add(parentId);
        state.pages.filter((p) => p.parent_id === parentId).forEach((p) => collectIds(p.id));
      };
      collectIds(action.id);

      const newPages = state.pages.filter((p) => !toDelete.has(p.id));
      const newTabs = state.tabs.map((t) => t.pageId && toDelete.has(t.pageId) ? { ...t, pageId: null, unsavedContent: null } : t);
      return { ...state, pages: newPages, tabs: newTabs };
    }
    case 'ADD_TAB':
      return { ...state, tabs: [...state.tabs, action.tab], activeTabId: action.tab.id, contextMenu: null };
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
    case 'TOGGLE_PIN_TAB': {
      const tabIndex = state.tabs.findIndex((t) => t.id === action.tabId);
      if (tabIndex === -1) return state;
      const targetTab = state.tabs[tabIndex];
      const isPinning = !targetTab.isPinned;
      const updatedTab: Tab = { ...targetTab, isPinned: isPinning };
      const otherTabs = state.tabs.filter((t) => t.id !== action.tabId);

      let newTabs: Tab[];
      if (isPinning) {
        // Place at the end of the pinned tabs section
        const lastPinnedIdx = otherTabs.reduce((acc, t, idx) => (t.isPinned ? idx : acc), -1);
        if (lastPinnedIdx === -1) {
          newTabs = [updatedTab, ...otherTabs];
        } else {
          newTabs = [
            ...otherTabs.slice(0, lastPinnedIdx + 1),
            updatedTab,
            ...otherTabs.slice(lastPinnedIdx + 1),
          ];
        }
      } else {
        // Place at the start of the unpinned tabs section
        const firstUnpinnedIdx = otherTabs.findIndex((t) => !t.isPinned);
        if (firstUnpinnedIdx === -1) {
          newTabs = [...otherTabs, updatedTab];
        } else {
          newTabs = [
            ...otherTabs.slice(0, firstUnpinnedIdx),
            updatedTab,
            ...otherTabs.slice(firstUnpinnedIdx),
          ];
        }
      }
      return { ...state, tabs: newTabs };
    }
    case 'CLOSE_OTHER_TABS': {
      // Keep target tab and all other pinned tabs
      const newTabs = state.tabs.filter((t) => t.id === action.tabId || t.isPinned);
      if (newTabs.length === 0) return state;
      const newActiveId = newTabs.some((t) => t.id === state.activeTabId) ? state.activeTabId : action.tabId;
      return { ...state, tabs: newTabs, activeTabId: newActiveId };
    }
    case 'CLOSE_TABS_TO_RIGHT': {
      const targetIdx = state.tabs.findIndex((t) => t.id === action.tabId);
      if (targetIdx === -1) return state;
      // Close tabs located to the right of targetIdx, unless they are pinned
      const newTabs = state.tabs.filter((t, idx) => idx <= targetIdx || t.isPinned);
      const newActiveId = newTabs.some((t) => t.id === state.activeTabId) ? state.activeTabId : action.tabId;
      return { ...state, tabs: newTabs, activeTabId: newActiveId };
    }
    case 'DUPLICATE_TAB': {
      const tabToDup = state.tabs.find((t) => t.id === action.tabId);
      if (!tabToDup) return state;
      const dupIdx = state.tabs.findIndex((t) => t.id === action.tabId);
      const newTab: Tab = {
        ...tabToDup,
        id: 'tab_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
        isPinned: false,
      };
      const newTabs = [...state.tabs];
      newTabs.splice(dupIdx + 1, 0, newTab);
      return { ...state, tabs: newTabs, activeTabId: newTab.id, contextMenu: null };
    }
    case 'REORDER_TABS': {
      const newTabs = [...state.tabs];
      const [moved] = newTabs.splice(action.sourceIndex, 1);
      newTabs.splice(action.targetIndex, 0, moved);
      // Maintain invariant: pinned tabs always come first
      const pinned = newTabs.filter((t) => t.isPinned);
      const unpinned = newTabs.filter((t) => !t.isPinned);
      return { ...state, tabs: [...pinned, ...unpinned] };
    }
    case 'UPDATE_TAB_STATE':
      return {
        ...state,
        tabs: state.tabs.map((t) => t.id === action.tabId ? { ...t, moduleState: { ...(t.moduleState || {}), ...action.stateUpdates } } : t),
      };
    case 'SET_ACTIVE_TAB':
      return { ...state, activeTabId: action.tabId, contextMenu: null };
    case 'NAVIGATE_IN_TAB':
      return {
        ...state,
        tabs: state.tabs.map((t) => t.id === state.activeTabId ? { ...t, pageId: action.pageId, unsavedContent: null, scrollY: 0 } : t),
      };
    case 'SET_UNSAVED_CONTENT':
      return {
        ...state,
        tabs: state.tabs.map((t) => t.id === action.tabId ? { ...t, unsavedContent: action.content } : t),
      };
    case 'SET_SCROLL_Y':
      return {
        ...state,
        tabs: state.tabs.map((t) => t.id === action.tabId ? { ...t, scrollY: action.scrollY } : t),
      };
    case 'TOGGLE_SIDEBAR':
      return { ...state, sidebarCollapsed: !state.sidebarCollapsed };
    case 'TOGGLE_NODE': {
      const exists = state.expandedNodes.includes(action.nodeId);
      return {
        ...state,
        expandedNodes: exists ? state.expandedNodes.filter((n) => n !== action.nodeId) : [...state.expandedNodes, action.nodeId],
      };
    }
    case 'EXPAND_NODE': {
      if (state.expandedNodes.includes(action.nodeId)) return state;
      return {
        ...state,
        expandedNodes: [...state.expandedNodes, action.nodeId],
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
    case 'UPDATE_AI_CHAT':
      return {
        ...state,
        aiChatSessions: {
          ...state.aiChatSessions,
          [action.session.id]: action.session
        }
      };
    case 'DELETE_AI_CHAT': {
      const newSessions = { ...state.aiChatSessions };
      delete newSessions[action.id];
      const newState = { ...state, aiChatSessions: newSessions };
      if (state.activeAiChatId === action.id) {
        newState.activeAiChatId = null;
      }
      return newState;
    }
    case 'CLEAR_AI_CHATS':
      return { ...state, aiChatSessions: {}, activeAiChatId: null };
    case 'TOGGLE_AI_SIDEBAR':
      return { ...state, showAiSidebar: !state.showAiSidebar };
    case 'SET_AI_SIDEBAR_WIDTH':
      return { ...state, aiSidebarWidth: action.width };
    case 'OPEN_AI_CHAT':
      return { ...state, showAiSidebar: true, activeAiChatId: action.chatId };
    case 'SET_MODULE_KEYS':
      return { ...state, moduleKeys: action.keys };
    case 'SET_READING_MODE_FULLSCREEN':
      return { ...state, isReadingModeFullScreen: action.isFullScreen };
    case 'CLEANUP_DELETED_ENTITY_TABS': {
      const { entityType, id } = action;
      const newTabs = state.tabs.map((t) => {
        if (entityType === 'book' && t.bookId === id) {
          return { ...t, bookId: null, bookTitle: undefined };
        }
        if (entityType === 'video' && t.moduleState?.videoId === id) {
          return { ...t, moduleState: { ...(t.moduleState || {}), videoId: null } };
        }
        if (entityType === 'page' && t.pageId === id) {
          return { ...t, pageId: null, unsavedContent: null };
        }
        return t;
      });
      return { ...state, tabs: newTabs };
    }
    case 'MERGE_DB_STATE':
      return { ...state, ...action.payload };
    default:
      return state;
  }
}
