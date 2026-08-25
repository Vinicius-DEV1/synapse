import { useCallback } from 'react';
import { useStore } from '../store/useStore';
import type { Page } from '../types';
import { getEditorBackupMap } from '../components/editor/hooks/editorBackupStore';
import { triggerToast } from '../components/ui/ToastContext';
import { broadcastPageSaved } from '../services/page-broadcast';

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
      } catch (err: any) {
        console.error('Erro ao criar página:', err);
        triggerToast(err.message || 'Erro ao criar nova página', 'error');
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
      } catch (err: any) {
        console.error('Erro ao criar página vinculada:', err);
        triggerToast(err.message || 'Erro ao criar página vinculada', 'error');
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
        dispatch({ type: 'SET_CONFIRM_DELETE', pageId: null });
        triggerToast('Página movida para a lixeira.', 'info');
      } catch (err: any) {
        console.error('Erro ao excluir página:', err);
        triggerToast(err.message || 'Erro ao excluir página', 'error');
      }
    }
  }, [dispatch, state.pages]);

  const handleUpdatePage = useCallback(async (id: string, updates: Partial<Page>) => {
    const targetPage = state.pages.find(p => p.id === id);
    if (!targetPage || targetPage.deleted_at) {
      console.warn(`[Caderno:SafeUpdate] Ignored update to deleted page ${id}`);
      return;
    }
    if (window.api) {
      try {
        await window.api.updatePage({ id, ...updates });
        dispatch({ type: 'UPDATE_PAGE', page: { id, ...updates } });
      } catch (err: any) {
        console.error('Erro ao atualizar página:', err);
        triggerToast(err.message || 'Erro ao atualizar página', 'error');
      }
    }
  }, [dispatch, state.pages]);

  const handleUpdateContent = useCallback(async (id: string, content: string, crdtState: string | null, embeddedSaves?: {id: string, content: string}[], senderInstanceId?: string) => {
    const targetPage = state.pages.find(p => p.id === id);
    if (!targetPage || targetPage.deleted_at) {
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
            if (embedPage && !embedPage.deleted_at) {
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
      } catch (err: any) {
        console.error('Erro ao salvar conteúdo da página:', err);
      }
    }
  }, [state.pages]);

  const handleExportPage = useCallback(async (id: string) => {
    if (window.api) {
      try {
        const pages = await window.api.sync.getTable('pages');
        const page = pages.find((p: any) => p.id === id);
        if (!page) {
          triggerToast('Página não encontrada para exportação.', 'error');
          return;
        }

        // Remove non-exportable fields (id, parent_id, local timestamps)
        const exportData = {
          title: page.title,
          content: page.content,
          crdt_state: page.crdt_state,
          icon: page.icon,
          is_pinned: page.is_pinned,
          _type: 'caderno_page_export',
          _version: 1
        };

        const jsonString = JSON.stringify(exportData, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const safeTitle = (page.title || 'Nova Pagina').replace(/[^a-z0-9]/gi, '_').toLowerCase();
        a.download = `${safeTitle}.caderno`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        triggerToast('Página exportada com sucesso!', 'success');
      } catch (err: any) {
        console.error('Erro ao exportar página:', err);
        triggerToast(err.message || 'Falha ao exportar página.', 'error');
      }
    }
  }, []);

  const handleImportPage = useCallback(async (parentId: string | null) => {
    if (!window.api) return;

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.caderno,.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const data = JSON.parse(text);

        if (data._type !== 'caderno_page_export' && !data.crdt_state && !data.content) {
          triggerToast('Formato de arquivo inválido para importação de página.', 'error');
          return;
        }

        // Create new page in database (with parentId if present)
        const newPage = await window.api.createPage({ parentId });
        
        // Update created page with imported data
        const updates: Partial<Page> = {
          title: data.title || 'Página Importada',
          content: data.content || '',
          crdt_state: data.crdt_state || null,
          icon: data.icon || '📄',
        };

        await window.api.updatePage({ id: newPage.id, ...updates });
        
        // Update global store state
        const completePage = { ...newPage, ...updates };
        dispatch({ type: 'ADD_PAGE', page: completePage });
        dispatch({ type: 'NAVIGATE_IN_TAB', pageId: newPage.id });
        
        if (parentId) {
          dispatch({ type: 'EXPAND_NODE', nodeId: parentId });
        }

        // Trigger cloud sync dispatch
        if (window.api.onSyncTrigger) {
           // handled by preload
        } else {
           window.dispatchEvent(new CustomEvent('app-sync-trigger'));
        }

        triggerToast(`Página "${updates.title}" importada com sucesso!`, 'success');
      } catch (err: any) {
        console.error('Erro ao importar página:', err);
        triggerToast(err.message || 'Falha ao importar página: Arquivo inválido ou corrompido.', 'error');
      }
    };
    input.click();
  }, [dispatch, state.expandedNodes]);

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
