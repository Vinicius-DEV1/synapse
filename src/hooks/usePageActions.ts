import { useCallback, useRef } from 'react';
import { useStore } from '../store/useStore';
import type { Page } from '../types';

export function usePageActions() {
  const { state, dispatch } = useStore();
  const historyTimerRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const handleCreatePage = useCallback(async (parentId: string | null) => {
    if (window.api) {
      const page = await window.api.createPage({ parentId });
      dispatch({ type: 'ADD_PAGE', page });
      dispatch({ type: 'NAVIGATE_IN_TAB', pageId: page.id });
      if (parentId && !state.expandedNodes.includes(parentId)) {
        dispatch({ type: 'TOGGLE_NODE', nodeId: parentId });
      }
    }
  }, [dispatch, state.expandedNodes]);

  const handleCreateLinkedPage = useCallback(async (title: string, parentId: string | null = null) => {
    if (window.api) {
      const page = await window.api.createPage({ parentId });
      await window.api.updatePage({ id: page.id, title });
      page.title = title;
      dispatch({ type: 'ADD_PAGE', page });
      return page.id;
    }
    return '';
  }, [dispatch]);

  const handleDeletePage = useCallback(async (id: string) => {
    if (window.api) {
      await window.api.deletePage(id);
      dispatch({ type: 'DELETE_PAGE', id });
      dispatch({ type: 'SET_CONFIRM_DELETE', pageId: null });
    }
  }, [dispatch]);

  const handleUpdatePage = useCallback(async (id: string, updates: Partial<Page>) => {
    if (window.api) {
      await window.api.updatePage({ id, ...updates });
      dispatch({ type: 'UPDATE_PAGE', page: { id, ...updates } });
    }
  }, [dispatch]);

  const handleUpdateContent = useCallback(async (id: string, content: string, crdtState: string | null, embeddedSaves?: {id: string, content: string}[]) => {
    if (window.api) {
      await window.api.updatePage({ id, content, crdt_state: crdtState });
      
      if (historyTimerRef.current[id]) clearTimeout(historyTimerRef.current[id]);
      historyTimerRef.current[id] = setTimeout(() => {
        window.api?.savePageHistory?.(id, content).catch(console.error);
      }, 5000);
      
      if (embeddedSaves && embeddedSaves.length > 0) {
        for (const embed of embeddedSaves) {
          await window.api.updatePage({ id: embed.id, content: embed.content });
        }
      }
      
      if (window.api.onSyncTrigger) {
         // O preload cuida disso
      } else {
         window.dispatchEvent(new CustomEvent('app-sync-trigger'));
      }
    }
  }, []);

  return {
    handleCreatePage,
    handleCreateLinkedPage,
    handleDeletePage,
    handleUpdatePage,
    handleUpdateContent,
  };
}
