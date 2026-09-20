import { useEffect, useRef } from 'react';
import type { AppState, Action } from '../types/store';

export function useAppBackPress(
  state: AppState,
  dispatch: React.Dispatch<Action>,
  floatingPageId: string | null,
  setFloatingPageId: (id: string | null) => void,
  pageHistoryRef: React.MutableRefObject<string[]>
) {
  const stateRef = useRef(state);
  stateRef.current = state;
  const dispatchRef = useRef(dispatch);
  dispatchRef.current = dispatch;
  const floatingPageIdRef = useRef(floatingPageId);
  floatingPageIdRef.current = floatingPageId;
  const setFloatingPageIdRef = useRef(setFloatingPageId);
  setFloatingPageIdRef.current = setFloatingPageId;

  useEffect(() => {
    const handleBack = (): boolean => {
      const curState = stateRef.current;
      const curDispatch = dispatchRef.current;
      const curFloatingId = floatingPageIdRef.current;
      const curSetFloating = setFloatingPageIdRef.current;

      // 1. Close floating page modal if open
      if (curFloatingId) {
        curSetFloating(null);
        return true;
      }
      // 2. Close context menu if open
      if (curState.contextMenu) {
        curDispatch({ type: 'HIDE_CONTEXT_MENU' });
        return true;
      }
      // 3. Close confirm delete modal if open
      if (curState.confirmDelete) {
        curDispatch({ type: 'SET_CONFIRM_DELETE', pageId: null });
        return true;
      }
      // 4. Close AI sidebar if open
      if (curState.showAiSidebar) {
        curDispatch({ type: 'TOGGLE_AI_SIDEBAR' });
        return true;
      }
      // 5. Close sidebar drawer if open on mobile
      if (!curState.sidebarCollapsed && typeof window !== 'undefined' && window.innerWidth < 768) {
        curDispatch({ type: 'TOGGLE_SIDEBAR' });
        return true;
      }
      // 6. Check if any open modal close button exists in DOM
      if (typeof document !== 'undefined') {
        const openModalCloseBtn = document.querySelector<HTMLElement>(
          '[role="dialog"] [aria-label="Close"], [role="dialog"] button.close-btn, .modal-close-btn, [data-testid="modal-close"]'
        );
        if (openModalCloseBtn) {
          openModalCloseBtn.click();
          return true;
        }
      }
      // 7. If reading a book in library, close the book
      const currentTab = curState.tabs.find(t => t.id === curState.activeTabId);
      if (currentTab?.module === 'library' && currentTab.bookId) {
        curDispatch({ type: 'CLOSE_LIBRARY_BOOK', tabId: currentTab.id });
        return true;
      }
      // 8. If in another module and there are multiple tabs, close active tab
      if (currentTab && currentTab.module !== 'notes' && curState.tabs.length > 1) {
        curDispatch({ type: 'CLOSE_TAB', tabId: currentTab.id });
        return true;
      }
      // 9. If current page in active tab has a parent page (subpage navigation)
      if (currentTab?.pageId) {
        const currentPage = curState.pages.find(p => p.id === currentTab.pageId);
        if (currentPage?.parent_id) {
          curDispatch({ type: 'NAVIGATE_IN_TAB', pageId: currentPage.parent_id });
          return true;
        }
      }
      // 10. If there is in-app page history, go back to previous page
      if (pageHistoryRef.current.length > 0) {
        const prevPageId = pageHistoryRef.current.pop();
        if (prevPageId && curState.pages.some(p => p.id === prevPageId)) {
          curDispatch({ type: 'NAVIGATE_IN_TAB', pageId: prevPageId });
          return true;
        }
      }
      // 11. If multiple tabs exist, close active tab
      if (curState.tabs.length > 1) {
        curDispatch({ type: 'CLOSE_TAB', tabId: curState.activeTabId });
        return true;
      }
      return false;
    };

    const globalWindow = window as typeof window & { 
      __cadernoHandleBack?: () => boolean; 
      ReactNativeWebView?: { postMessage: (msg: string) => void };
    };
    globalWindow.__cadernoHandleBack = handleBack;

    const handleNativeMessage = (event: Event) => {
      try {
        const msgEvent = event as MessageEvent;
        const raw = typeof msgEvent.data === 'string' ? JSON.parse(msgEvent.data) : (msgEvent.data as Record<string, unknown>);
        if (raw?.type === 'HARDWARE_BACK_PRESS') {
          const handled = handleBack();
          if (globalWindow.ReactNativeWebView?.postMessage) {
            globalWindow.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'BACK_PRESS_HANDLED',
              handled,
            }));
          }
        }
      } catch {
        // Ignore non-json messages
      }
    };

    window.addEventListener('message', handleNativeMessage);
    document.addEventListener('message', handleNativeMessage as EventListener);

    return () => {
      window.removeEventListener('message', handleNativeMessage);
      document.removeEventListener('message', handleNativeMessage as EventListener);
    };
  }, [pageHistoryRef]);
}
