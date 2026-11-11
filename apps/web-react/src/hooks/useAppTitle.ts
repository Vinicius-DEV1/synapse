import { useEffect } from 'react';
import { usePlatform } from './usePlatform';

export function useAppTitle(activeModule: string, bookTitle?: string) {
  const { useNativeTitleBar } = usePlatform();
  
  useEffect(() => {
    if (useNativeTitleBar) {
      document.title = 'Caderno Desktop';
    } else {
      if (activeModule === 'notes') {
        document.title = 'Caderno Web';
      } else if (activeModule === 'library') {
        document.title = bookTitle || 'Biblioteca';
      } else if (activeModule === 'culture') {
        document.title = 'Cultura';
      } else if (activeModule === 'finance') {
        document.title = 'Finanças';
      } else if (activeModule === 'anki') {
        document.title = 'Flashcards';
      } else {
        document.title = 'Caderno Web';
      }
    }
  }, [activeModule, bookTitle]);
}
