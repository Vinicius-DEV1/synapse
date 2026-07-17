import type { AppState, Action, Tab, Page } from '../types';

export interface StoreCommand<T extends Action = Action> {
  execute(state: AppState, action: T): AppState;
}

class UpdateTabModuleCommand implements StoreCommand<Extract<Action, { type: 'UPDATE_TAB_MODULE' }>> {
  execute(state: AppState, action: Extract<Action, { type: 'UPDATE_TAB_MODULE' }>): AppState {
    return {
      ...state,
      tabs: state.tabs.map((t) => t.id === action.tabId ? { ...t, module: action.module } : t),
    };
  }
}

class OpenLibraryBookCommand implements StoreCommand<Extract<Action, { type: 'OPEN_LIBRARY_BOOK' }>> {
  execute(state: AppState, action: Extract<Action, { type: 'OPEN_LIBRARY_BOOK' }>): AppState {
    return {
      ...state,
      tabs: state.tabs.map((t) => t.id === state.activeTabId ? { ...t, module: 'library', bookId: action.bookId, bookTitle: action.title } : t),
    };
  }
}

class CloseLibraryBookCommand implements StoreCommand<Extract<Action, { type: 'CLOSE_LIBRARY_BOOK' }>> {
  execute(state: AppState, action: Extract<Action, { type: 'CLOSE_LIBRARY_BOOK' }>): AppState {
    return {
      ...state,
      tabs: state.tabs.map((t) => t.id === action.tabId ? { ...t, bookId: null, bookTitle: undefined } : t),
    };
  }
}

class SetPagesCommand implements StoreCommand<Extract<Action, { type: 'SET_PAGES' }>> {
  execute(state: AppState, action: Extract<Action, { type: 'SET_PAGES' }>): AppState {
    return { ...state, pages: action.pages };
  }
}

class AddPageCommand implements StoreCommand<Extract<Action, { type: 'ADD_PAGE' }>> {
  execute(state: AppState, action: Extract<Action, { type: 'ADD_PAGE' }>): AppState {
    return { ...state, pages: [...state.pages, action.page] };
  }
}

class UpdatePageCommand implements StoreCommand<Extract<Action, { type: 'UPDATE_PAGE' }>> {
  execute(state: AppState, action: Extract<Action, { type: 'UPDATE_PAGE' }>): AppState {
    return {
      ...state,
      pages: state.pages.map((p) => p.id === action.page.id ? { ...p, ...action.page } : p),
    };
  }
}

class DeletePageCommand implements StoreCommand<Extract<Action, { type: 'DELETE_PAGE' }>> {
  execute(state: AppState, action: Extract<Action, { type: 'DELETE_PAGE' }>): AppState {
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
}

class AddTabCommand implements StoreCommand<Extract<Action, { type: 'ADD_TAB' }>> {
  execute(state: AppState, action: Extract<Action, { type: 'ADD_TAB' }>): AppState {
    return { ...state, tabs: [...state.tabs, action.tab], activeTabId: action.tab.id };
  }
}

class CloseTabCommand implements StoreCommand<Extract<Action, { type: 'CLOSE_TAB' }>> {
  execute(state: AppState, action: Extract<Action, { type: 'CLOSE_TAB' }>): AppState {
    if (state.tabs.length <= 1) return state;
    const newTabs = state.tabs.filter((t) => t.id !== action.tabId);
    let newActiveId = state.activeTabId;
    if (state.activeTabId === action.tabId) {
      const idx = state.tabs.findIndex((t) => t.id === action.tabId);
      newActiveId = newTabs[Math.min(idx, newTabs.length - 1)]?.id || newTabs[0].id;
    }
    return { ...state, tabs: newTabs, activeTabId: newActiveId };
  }
}

class ReorderTabsCommand implements StoreCommand<Extract<Action, { type: 'REORDER_TABS' }>> {
  execute(state: AppState, action: Extract<Action, { type: 'REORDER_TABS' }>): AppState {
    const newTabs = [...state.tabs];
    const [moved] = newTabs.splice(action.sourceIndex, 1);
    newTabs.splice(action.targetIndex, 0, moved);
    return { ...state, tabs: newTabs };
  }
}

class UpdateTabStateCommand implements StoreCommand<Extract<Action, { type: 'UPDATE_TAB_STATE' }>> {
  execute(state: AppState, action: Extract<Action, { type: 'UPDATE_TAB_STATE' }>): AppState {
    return {
      ...state,
      tabs: state.tabs.map((t) => t.id === action.tabId ? { ...t, moduleState: { ...(t.moduleState || {}), ...action.stateUpdates } } : t),
    };
  }
}

class SetActiveTabCommand implements StoreCommand<Extract<Action, { type: 'SET_ACTIVE_TAB' }>> {
  execute(state: AppState, action: Extract<Action, { type: 'SET_ACTIVE_TAB' }>): AppState {
    return { ...state, activeTabId: action.tabId };
  }
}

class NavigateInTabCommand implements StoreCommand<Extract<Action, { type: 'NAVIGATE_IN_TAB' }>> {
  execute(state: AppState, action: Extract<Action, { type: 'NAVIGATE_IN_TAB' }>): AppState {
    return {
      ...state,
      tabs: state.tabs.map((t) => t.id === state.activeTabId ? { ...t, pageId: action.pageId, unsavedContent: null, scrollY: 0 } : t),
    };
  }
}

class SetUnsavedContentCommand implements StoreCommand<Extract<Action, { type: 'SET_UNSAVED_CONTENT' }>> {
  execute(state: AppState, action: Extract<Action, { type: 'SET_UNSAVED_CONTENT' }>): AppState {
    return {
      ...state,
      tabs: state.tabs.map((t) => t.id === action.tabId ? { ...t, unsavedContent: action.content } : t),
    };
  }
}

class SetScrollYCommand implements StoreCommand<Extract<Action, { type: 'SET_SCROLL_Y' }>> {
  execute(state: AppState, action: Extract<Action, { type: 'SET_SCROLL_Y' }>): AppState {
    return {
      ...state,
      tabs: state.tabs.map((t) => t.id === action.tabId ? { ...t, scrollY: action.scrollY } : t),
    };
  }
}

class ToggleSidebarCommand implements StoreCommand<Extract<Action, { type: 'TOGGLE_SIDEBAR' }>> {
  execute(state: AppState, action: Extract<Action, { type: 'TOGGLE_SIDEBAR' }>): AppState {
    return { ...state, sidebarCollapsed: !state.sidebarCollapsed };
  }
}

class ToggleNodeCommand implements StoreCommand<Extract<Action, { type: 'TOGGLE_NODE' }>> {
  execute(state: AppState, action: Extract<Action, { type: 'TOGGLE_NODE' }>): AppState {
    const exists = state.expandedNodes.includes(action.nodeId);
    return {
      ...state,
      expandedNodes: exists ? state.expandedNodes.filter((n) => n !== action.nodeId) : [...state.expandedNodes, action.nodeId],
    };
  }
}

class ShowContextMenuCommand implements StoreCommand<Extract<Action, { type: 'SHOW_CONTEXT_MENU' }>> {
  execute(state: AppState, action: Extract<Action, { type: 'SHOW_CONTEXT_MENU' }>): AppState {
    return {
      ...state,
      contextMenu: { visible: true, x: action.x, y: action.y, pageId: action.pageId },
    };
  }
}

class HideContextMenuCommand implements StoreCommand<Extract<Action, { type: 'HIDE_CONTEXT_MENU' }>> {
  execute(state: AppState, action: Extract<Action, { type: 'HIDE_CONTEXT_MENU' }>): AppState {
    return { ...state, contextMenu: null };
  }
}

class SetConfirmDeleteCommand implements StoreCommand<Extract<Action, { type: 'SET_CONFIRM_DELETE' }>> {
  execute(state: AppState, action: Extract<Action, { type: 'SET_CONFIRM_DELETE' }>): AppState {
    return { ...state, confirmDelete: action.pageId };
  }
}

class UpdateAiChatCommand implements StoreCommand<Extract<Action, { type: 'UPDATE_AI_CHAT' }>> {
  execute(state: AppState, action: Extract<Action, { type: 'UPDATE_AI_CHAT' }>): AppState {
    return {
      ...state,
      aiChatSessions: {
        ...state.aiChatSessions,
        [action.session.id]: action.session
      }
    };
  }
}

class DeleteAiChatCommand implements StoreCommand<Extract<Action, { type: 'DELETE_AI_CHAT' }>> {
  execute(state: AppState, action: Extract<Action, { type: 'DELETE_AI_CHAT' }>): AppState {
    const newSessions = { ...state.aiChatSessions };
    delete newSessions[action.id];
    const newState = { ...state, aiChatSessions: newSessions };
    if (state.activeAiChatId === action.id) {
      newState.activeAiChatId = null;
    }
    return newState;
  }
}

class ClearAiChatsCommand implements StoreCommand<Extract<Action, { type: 'CLEAR_AI_CHATS' }>> {
  execute(state: AppState, action: Extract<Action, { type: 'CLEAR_AI_CHATS' }>): AppState {
    return { ...state, aiChatSessions: {}, activeAiChatId: null };
  }
}

class ToggleAiSidebarCommand implements StoreCommand<Extract<Action, { type: 'TOGGLE_AI_SIDEBAR' }>> {
  execute(state: AppState, action: Extract<Action, { type: 'TOGGLE_AI_SIDEBAR' }>): AppState {
    return { ...state, showAiSidebar: !state.showAiSidebar };
  }
}

class OpenAiChatCommand implements StoreCommand<Extract<Action, { type: 'OPEN_AI_CHAT' }>> {
  execute(state: AppState, action: Extract<Action, { type: 'OPEN_AI_CHAT' }>): AppState {
    return { ...state, showAiSidebar: true, activeAiChatId: action.chatId };
  }
}

class SetModuleKeysCommand implements StoreCommand<Extract<Action, { type: 'SET_MODULE_KEYS' }>> {
  execute(state: AppState, action: Extract<Action, { type: 'SET_MODULE_KEYS' }>): AppState {
    return { ...state, moduleKeys: action.keys };
  }
}

class SetReadingModeFullScreenCommand implements StoreCommand<Extract<Action, { type: 'SET_READING_MODE_FULLSCREEN' }>> {
  execute(state: AppState, action: Extract<Action, { type: 'SET_READING_MODE_FULLSCREEN' }>): AppState {
    return { ...state, isReadingModeFullScreen: action.isFullScreen };
  }
}

class MergeDbStateCommand implements StoreCommand<Extract<Action, { type: 'MERGE_DB_STATE' }>> {
  execute(state: AppState, action: Extract<Action, { type: 'MERGE_DB_STATE' }>): AppState {
    return { ...state, ...action.payload };
  }
}

export const commandHandlers: Record<string, StoreCommand<any>> = {
  'UPDATE_TAB_MODULE': new UpdateTabModuleCommand(),
  'OPEN_LIBRARY_BOOK': new OpenLibraryBookCommand(),
  'CLOSE_LIBRARY_BOOK': new CloseLibraryBookCommand(),
  'SET_PAGES': new SetPagesCommand(),
  'ADD_PAGE': new AddPageCommand(),
  'UPDATE_PAGE': new UpdatePageCommand(),
  'DELETE_PAGE': new DeletePageCommand(),
  'ADD_TAB': new AddTabCommand(),
  'CLOSE_TAB': new CloseTabCommand(),
  'REORDER_TABS': new ReorderTabsCommand(),
  'UPDATE_TAB_STATE': new UpdateTabStateCommand(),
  'SET_ACTIVE_TAB': new SetActiveTabCommand(),
  'NAVIGATE_IN_TAB': new NavigateInTabCommand(),
  'SET_UNSAVED_CONTENT': new SetUnsavedContentCommand(),
  'SET_SCROLL_Y': new SetScrollYCommand(),
  'TOGGLE_SIDEBAR': new ToggleSidebarCommand(),
  'TOGGLE_NODE': new ToggleNodeCommand(),
  'SHOW_CONTEXT_MENU': new ShowContextMenuCommand(),
  'HIDE_CONTEXT_MENU': new HideContextMenuCommand(),
  'SET_CONFIRM_DELETE': new SetConfirmDeleteCommand(),
  'UPDATE_AI_CHAT': new UpdateAiChatCommand(),
  'DELETE_AI_CHAT': new DeleteAiChatCommand(),
  'CLEAR_AI_CHATS': new ClearAiChatsCommand(),
  'TOGGLE_AI_SIDEBAR': new ToggleAiSidebarCommand(),
  'OPEN_AI_CHAT': new OpenAiChatCommand(),
  'SET_MODULE_KEYS': new SetModuleKeysCommand(),
  'SET_READING_MODE_FULLSCREEN': new SetReadingModeFullScreenCommand(),
  'MERGE_DB_STATE': new MergeDbStateCommand(),
};
