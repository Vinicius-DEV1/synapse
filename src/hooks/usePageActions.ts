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
        page.title = title;
        dispatch({ type: 'ADD_PAGE', page });
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
            for (const ev of events) {
              let shouldDeleteEvent = false;
              if (ev.page_id && toDeleteIds.has(ev.page_id)) {
                shouldDeleteEvent = true;
              } else {
                for (const pageId of toDeleteIds) {
                  const pageObj = state.pages.find((p) => p.id === pageId);
                  if (pageObj?.content && pageObj.content.includes(`data-event-id="${ev.id}"`)) {
                    shouldDeleteEvent = true;
                    break;
                  }
                }
              }
              if (shouldDeleteEvent) {
                await window.api.calendar.deleteEvent(ev.id);
              }
            }
          } catch (err) {
            console.error('Erro ao excluir eventos vinculados à página e subpáginas:', err);
          }
        }

        // 3. Delete pages in backend
        for (const pageId of toDeleteIds) {
          await window.api.deletePage(pageId);
        }

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
        await window.api.updatePage({ id, content, crdt_state: crdtState } as unknown as Omit<Partial<Page>, 'id'> & { id: string });
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
