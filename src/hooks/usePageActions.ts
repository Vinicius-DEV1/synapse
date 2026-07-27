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
      // 1. Coletar o ID da página alvo e todos os seus descendentes recursivamente
      const toDeleteIds = new Set<string>();
      const collect = (parentId: string) => {
        toDeleteIds.add(parentId);
        state.pages.filter((p) => p.parent_id === parentId).forEach((p) => collect(p.id));
      };
      collect(id);

      // 2. Excluir da agenda todos os eventos associados à página e suas subpáginas
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

      // 3. Deletar as páginas no backend
      for (const pageId of toDeleteIds) {
        await window.api.deletePage(pageId);
      }

      // 4. Disparar ação no store
      dispatch({ type: 'DELETE_PAGE', id });
      dispatch({ type: 'SET_CONFIRM_DELETE', pageId: null });
    }
  }, [dispatch, state.pages]);

  const handleUpdatePage = useCallback(async (id: string, updates: Partial<Page>) => {
    if (window.api) {
      await window.api.updatePage({ id, ...updates });
      dispatch({ type: 'UPDATE_PAGE', page: { id, ...updates } });
    }
  }, [dispatch]);

  const handleUpdateContent = useCallback(async (id: string, content: string, crdtState: string | null, embeddedSaves?: {id: string, content: string}[]) => {
    if (window.api) {
      console.log(`[Caderno:IPC] updatePage START id=${id}, content.length=${content?.length}, crdt_state.length=${crdtState?.length || 0}`);
      await window.api.updatePage({ id, content, crdt_state: crdtState });
      console.log(`[Caderno:IPC] updatePage DONE id=${id} ✅`);
      dispatch({ type: 'UPDATE_PAGE', page: { id, content, crdt_state: crdtState } });
      
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
  }, [dispatch]);

  const handleExportPage = useCallback(async (id: string) => {
    if (window.api) {
      try {
        const pages = await window.api.sync.getTable('pages');
        const page = pages.find((p: any) => p.id === id);
        if (!page) {
          alert('Página não encontrada.');
          return;
        }

        // Remover campos que não devem ser exportados (id, parent_id, datas locais)
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
      } catch (err) {
        console.error('Erro ao exportar página:', err);
        alert('Falha ao exportar página.');
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
          alert('Formato de arquivo inválido.');
          return;
        }

        // Criar a página nova no banco (com o parentId se tiver)
        const newPage = await window.api.createPage({ parentId });
        
        // Atualizar a página criada com os dados importados
        const updates: Partial<Page> = {
          title: data.title || 'Página Importada',
          content: data.content || '',
          crdt_state: data.crdt_state || null,
          icon: data.icon || '📄',
        };

        await window.api.updatePage({ id: newPage.id, ...updates });
        
        // Atualizar o estado global
        const completePage = { ...newPage, ...updates };
        dispatch({ type: 'ADD_PAGE', page: completePage });
        dispatch({ type: 'NAVIGATE_IN_TAB', pageId: newPage.id });
        
        if (parentId && !state.expandedNodes.includes(parentId)) {
          dispatch({ type: 'TOGGLE_NODE', nodeId: parentId });
        }

        // Disparar trigger de sync
        if (window.api.onSyncTrigger) {
           // handled by preload
        } else {
           window.dispatchEvent(new CustomEvent('app-sync-trigger'));
        }

      } catch (err) {
        console.error('Erro ao importar página:', err);
        alert('Falha ao importar página: Arquivo corrompido.');
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
