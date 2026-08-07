import { useEffect } from 'react';
import type { AppState, Action } from '../types';
import { getFlatPageOrder } from '../utils/pageNavigation';

export function useAppShortcuts(state: AppState, dispatch: React.Dispatch<Action>) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Switch tabs with Alt + Number
      if (e.altKey && e.code && e.code.startsWith('Digit')) {
        const num = parseInt(e.code.replace('Digit', ''), 10);
        if (num >= 1 && num <= 9) {
          const index = num - 1;
          if (index >= 0 && index < state.tabs.length) {
            e.preventDefault();
            dispatch({ type: 'SET_ACTIVE_TAB', tabId: state.tabs[index].id });
          }
        }
      }

      // Linear Page Navigation with Ctrl + ArrowRight/Left (or Cmd on Mac)
      if ((e.ctrlKey || e.metaKey) && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) {
        const activeTab = state.tabs.find(t => t.id === state.activeTabId);
        if (!activeTab || !activeTab.pageId) return;

        const flatPages = getFlatPageOrder(state);
        const currentIndex = flatPages.findIndex(p => p.id === activeTab.pageId);
        
        if (currentIndex === -1) return;

        let nextIndex = currentIndex;
        if (e.key === 'ArrowRight') {
          nextIndex = Math.min(currentIndex + 1, flatPages.length - 1);
        } else {
          nextIndex = Math.max(currentIndex - 1, 0);
        }

        if (nextIndex !== currentIndex) {
          e.preventDefault();
          const direction = e.key === 'ArrowRight' ? 'forward' : 'backward';
          dispatch({ type: 'SET_NAV_DIRECTION', direction });
          
          // Use setTimeout to ensure the direction is set before navigating (so the animation triggers correctly)
          setTimeout(() => {
            dispatch({ type: 'NAVIGATE_IN_TAB', pageId: flatPages[nextIndex].id });
          }, 0);
        }
      }

      // Toggle AI Sidebar with Ctrl+Shift+A or Ctrl+J (or Cmd on Mac)
      if ((e.ctrlKey || e.metaKey) && (e.key === 'j' || e.key === 'J' || (e.shiftKey && (e.key === 'a' || e.key === 'A')))) {
        const target = e.target as HTMLElement;
        const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
        if (!isInput || e.shiftKey) {
          e.preventDefault();
          dispatch({ type: 'TOGGLE_AI_SIDEBAR' });
          if (!state.showAiSidebar) {
            setTimeout(() => {
              const input = document.querySelector('input[placeholder*="Mensagem (digite @"]') as HTMLInputElement;
              if (input) input.focus();
            }, 100);
          }
        }
      }

      // Open DevTools with F12 or Ctrl+Shift+I in desktop mode
      if (e.key === 'F12' || ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'I' || e.key === 'i'))) {
        e.preventDefault();
        import('@tauri-apps/api/core').then(mod => {
          mod.invoke('app_open_devtools').catch(() => {});
        }).catch(() => {});
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [state, dispatch]);
}
