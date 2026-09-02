import { useCallback } from 'react';
import { useStore } from '../store/useStore';
import type { Page } from '../types';
import { getEditorBackupMap } from '../components/editor/hooks/editorBackupStore';
import { triggerToast } from '../components/ui/ToastContext';
import { broadcastPageSaved } from '../services/page-broadcast';
import { exportPageFile, importPageFile } from '../utils/pageTransferUtils';

export function usePageActions() {
  const { state, dispatch } = useStore();

  const handleCreatePage = useCallback(async (parentId: string | null) => {
    if (window.api) {
      try {
        const page = await window.api.createPage({ parentId });
        dispatch({ type: 'ADD_PAGE', page });
        dispatch({ type: 'NAVIGATE_IN_TAB', pageId: page.id });
        if (parentId) {
          dispatch({ type: 'EXPAND_NODE', nodeId: parentId });
        }
      } catch (err: unknown) {
        console.error('Erro ao criar página:', err);
        triggerToast(err instanceof Error ? err.message : 'Erro ao criar nova página', 'error');
      }
    }
  }, [dispatch]);

  const handleCreateLinkedPage = useCallback(async (title: string, parentId: string | null = null) => {
    if (window.api) {
      try {
        const page = await window.api.createPage({ parentId });
        await window.api.updatePage({ id: page.id, title });
        const updatedPage = { ...page, title };
        dispatch({ type: 'ADD_PAGE', page: updatedPage });
        return page.id;
      } catch (err: unknown) {
        console.error('Erro ao criar página vinculada:', err);
        triggerToast(err instanceof Error ? err.message : 'Erro ao criar página vinculada', 'error');
      }
    }
    return '';
  }, [dispatch]);

  const handleDeletePage = useCallback(async (id: string) => {
    if (window.api) {
      try {
        // 1. Collect target page ID and all descendants recursively
        const toDeleteIds = new Set<string>();
        const collect = (parentId: string) => {
          toDeleteIds.add(parentId);
          state.pages.filter((p) => p.parent_id === parentId).forEach((p) => collect(p.id));
        };
        collect(id);

        // 2. Delete calendar events associated with page and subpages
        if (window.api.calendar) {
          try {
            const events = await window.api.calendar.getEvents();
            // Pre-aggregate page content string for fast matching
            const deletedPagesContent = state.pages
              .filter((p) => toDeleteIds.has(p.id))
              .map((p) => p.content || '')
              .join(' ');

            const eventsToDelete = events.filter((ev) => {
              if (ev.page_id && toDeleteIds.has(ev.page_id)) return true;
              return deletedPagesContent.includes(`data-event-id="${ev.id}"`);
            });

            if (eventsToDelete.length > 0) {
              await Promise.all(eventsToDelete.map((ev) => window.api.calendar!.deleteEvent(ev.id)));
            }
          } catch (err) {
            console.error('Erro ao excluir eventos vinculados à página e subpáginas:', err);
          }
        }

        // 3. Delete pages in backend concurrently
        await Promise.all(Array.from(toDeleteIds).map((pageId) => window.api.deletePage(pageId)));

        // 4. Dispatch store action
        dispatch({ type: 'DELETE_PAGE', id });
        triggerToast('Página movida para a lixeira.', 'info');
      } catch (err: unknown) {
        console.error('Erro ao excluir página:', err);
        triggerToast(err instanceof Error ? err.message : 'Erro ao excluir página', 'error');
      } finally {
        dispatch({ type: 'SET_CONFIRM_DELETE', pageId: null });
      }
    }
  }, [dispatch, state.pages]);

  const handleUpdatePage = useCallback(async (id: string, updates: Partial<Page>) => {
    const targetPage = state.pages.find(p => p.id === id);
    if (targetPage && targetPage.deleted_at) {
      console.warn(`[Caderno:SafeUpdate] Ignored update to deleted page ${id}`);
      return;
    }
    if (window.api) {
      try {
        await window.api.updatePage({ id, ...updates });
        dispatch({ type: 'UPDATE_PAGE', page: { id, ...updates } });
      } catch (err: unknown) {
        console.error('Erro ao atualizar página:', err);
        triggerToast(err instanceof Error ? err.message : 'Erro ao atualizar página', 'error');
      }
    }
  }, [dispatch, state.pages]);

  const handleUpdateContent = useCallback(async (id: string, content: string, crdtState: string | null, embeddedSaves?: {id: string, content: string}[], senderInstanceId?: string) => {
    const targetPage = state.pages.find(p => p.id === id);
    if (targetPage && targetPage.deleted_at) {
      console.warn(`[Caderno:SafeAutosave] Ignored autosave to deleted page ${id}`);
      return;
    }
    if (window.api) {
      try {
        await window.api.updatePage({ id, content, crdt_state: crdtState });
        getEditorBackupMap().set(id, { html: content, crdt: crdtState || '' });
        broadcastPageSaved(id, crdtState, content, senderInstanceId);
        
        if (embeddedSaves && embeddedSaves.length > 0) {
          for (const embed of embeddedSaves) {
            const embedPage = state.pages.find(p => p.id === embed.id);
            if (!embedPage || !embedPage.deleted_at) {
              await window.api.updatePage({ id: embed.id, content: embed.content });
              getEditorBackupMap().set(embed.id, { html: embed.content, crdt: '' });
            }
          }
        }
        
        if (window.api.onSyncTrigger) {
           // O preload cuida disso
        } else {
           window.dispatchEvent(new CustomEvent('app-sync-trigger'));
        }
      } catch (err: unknown) {
        console.error('Erro ao salvar conteúdo da página:', err);
      }
    }
  }, [state.pages]);

  const handleExportPage = useCallback(async (id: string) => {
    await exportPageFile(id);
  }, []);

  const handleImportPage = useCallback(async (parentId: string | null) => {
    importPageFile(parentId, (completePage, newPageId) => {
      dispatch({ type: 'ADD_PAGE', page: completePage });
      dispatch({ type: 'NAVIGATE_IN_TAB', pageId: newPageId });
      
      if (parentId) {
        dispatch({ type: 'EXPAND_NODE', nodeId: parentId });
      }

      if (!window.api?.onSyncTrigger) {
         window.dispatchEvent(new CustomEvent('app-sync-trigger'));
      }
    });
  }, [dispatch]);

  return {
    handleCreatePage,
    handleCreateLinkedPage,
    handleDeletePage,
    handleUpdatePage,
    handleUpdateContent,
    handleExportPage,
    handleImportPage,
  };
}
