import { useEffect } from 'react';

export function useAppShortcuts(tabs: any[], dispatch: any) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.code && e.code.startsWith('Digit')) {
        const num = parseInt(e.code.replace('Digit', ''), 10);
        if (num >= 1 && num <= 9) {
          const index = num - 1;
          if (index >= 0 && index < tabs.length) {
            e.preventDefault();
            dispatch({ type: 'SET_ACTIVE_TAB', tabId: tabs[index].id });
          }
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [tabs, dispatch]);
}
