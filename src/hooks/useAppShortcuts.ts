import { useEffect, useRef } from 'react';
import type { AppState, Action } from '../types';

export function useAppShortcuts(state: AppState, dispatch: React.Dispatch<Action>) {
  const stateRef = useRef(state);
  const dispatchRef = useRef(dispatch);

  useEffect(() => {
    stateRef.current = state;
    dispatchRef.current = dispatch;
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const currentState = stateRef.current;
      const currentDispatch = dispatchRef.current;

      // Switch tabs with Alt + Number
      if (e.altKey && e.code && e.code.startsWith('Digit')) {
        const num = parseInt(e.code.replace('Digit', ''), 10);
        if (num >= 1 && num <= 9) {
          const index = num - 1;
          if (index >= 0 && index < currentState.tabs.length) {
            e.preventDefault();
            window.dispatchEvent(new CustomEvent('caderno-flush-editor'));
            currentDispatch({ type: 'SET_ACTIVE_TAB', tabId: currentState.tabs[index].id });
          }
        }
      }

      // Atalho Ctrl+Setas desativado a pedido do usuário para não interferir na digitação

      // Toggle AI Sidebar with Ctrl+Shift+A or Ctrl+J (or Cmd on Mac)
      if ((e.ctrlKey || e.metaKey) && (e.key === 'j' || e.key === 'J' || (e.shiftKey && (e.key === 'a' || e.key === 'A')))) {
        const target = e.target as HTMLElement;
        const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
        if (!isInput || e.shiftKey) {
          e.preventDefault();
          currentDispatch({ type: 'TOGGLE_AI_SIDEBAR' });
          if (!currentState.showAiSidebar) {
            setTimeout(() => {
              const input = document.querySelector('input[placeholder*="Mensagem (digite @"]') as HTMLInputElement;
              if (input) input.focus();
            }, 100);
          }
        }
      }

      // Open Move Page modal with Ctrl+Shift+M or Alt+M (when on a page in notes module)
      if (((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'm' || e.key === 'M')) || (e.altKey && (e.key === 'm' || e.key === 'M'))) {
        const activeTab = currentState.tabs.find(t => t.id === currentState.activeTabId);
        if (activeTab?.module === 'notes' && activeTab?.pageId) {
          e.preventDefault();
          window.dispatchEvent(new CustomEvent('caderno-open-move-page', { detail: { pageId: activeTab.pageId } }));
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
  }, []);
}
