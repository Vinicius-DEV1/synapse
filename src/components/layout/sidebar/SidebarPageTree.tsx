import { useState, useMemo } from 'react';
import { Search, Pin, Plus, Upload } from 'lucide-react';
import { useStore } from '../../../store/useStore';
import SidebarItem from './SidebarItem';
import { DndContext, DragOverlay, useSensor, useSensors, PointerSensor } from '@dnd-kit/core';
import type { DragStartEvent, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { usePageActions } from '../../../hooks/usePageActions';
import { isValidHierarchyMove } from '../../../utils/hierarchy';
import { triggerToast } from '../../ui/ToastContext';
import { PinnedSidebarItem } from './PinnedSidebarItem';
import { RootDroppable } from './RootDroppable';
import type { Page, Tab } from '../../../types';

interface SidebarPageTreeProps {
  onCreatePage: (parentId: string | null) => Promise<void>;
  onUpdatePage: (id: string, updates: Partial<Page>) => Promise<void>;
  activeTab: Tab | null;
}

export function SidebarPageTree({ onCreatePage, onUpdatePage, activeTab }: SidebarPageTreeProps) {
  const { state, dispatch } = useStore();
  const { handleImportPage } = usePageActions();
  const [visiblePinnedCount, setVisiblePinnedCount] = useState(10);
  const [visiblePagesCount, setVisiblePagesCount] = useState(10);

  const expandedSet = useMemo(() => new Set(state.expandedNodes), [state.expandedNodes]);

  const { pinnedPages, rootPages, childrenMap } = useMemo(() => {
    const pinned: Page[] = [];
    const roots: Page[] = [];
    const map = new Map<string, Page[]>();

    for (const p of state.pages) {
      if (p.is_pinned) {
        pinned.push(p);
      } else if (p.parent_id === null) {
        roots.push(p);
      }

      if (p.parent_id) {
        const list = map.get(p.parent_id);
        if (list) {
          list.push(p);
        } else {
          map.set(p.parent_id, [p]);
        }
      }
    }

    pinned.sort((a, b) => (a.pinned_order || 0) - (b.pinned_order || 0));
    const sortByUpdatedDesc = (a: Page, b: Page) => (b.updated_at > a.updated_at ? 1 : b.updated_at < a.updated_at ? -1 : 0);
    roots.sort(sortByUpdatedDesc);
    for (const list of map.values()) {
      list.sort(sortByUpdatedDesc);
    }

    return { pinnedPages: pinned, rootPages: roots, childrenMap: map };
  }, [state.pages]);

  const handleDropPinned = (draggedId: string, targetId: string) => {
    if (draggedId === targetId) return;
    
    const currentPinned = [...pinnedPages];
    const draggedIdx = currentPinned.findIndex((p) => p.id === draggedId);
    const targetIdx = currentPinned.findIndex((p) => p.id === targetId);
    
    if (draggedIdx === -1 || targetIdx === -1) return;
    
    const reordered = arrayMove(currentPinned, draggedIdx, targetIdx);
    
    reordered.forEach((p, idx) => {
      if (p.pinned_order !== idx) {
        onUpdatePage(p.id, { pinned_order: idx }).catch((err) => {
          console.error('[Sidebar] Falha ao atualizar ordem de fixados:', err);
          triggerToast('Falha ao reordenar páginas fixadas.', 'error');
        });
      }
    });
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const [activeDragData, setActiveDragData] = useState<{ type: string; page?: Page; pageId?: string } | null>(null);

  const handleDragStart = (e: DragStartEvent) => {
    setActiveDragData(e.active.data.current as { type: string; page?: Page; pageId?: string } | null);
  };

  const handleDragEnd = (e: DragEndEvent) => {
    setActiveDragData(null);
    const { active, over } = e;
    if (!over) return;

    const isPinnedSortDrag = active.data.current?.type === 'pinned-sort';
    const isPinnedSortOver = over.data.current?.type === 'pinned-sort';

    if (isPinnedSortDrag && isPinnedSortOver) {
      const draggedId = active.data.current?.pageId;
      const targetId = over.data.current?.pageId;
      if (draggedId && targetId) {
        handleDropPinned(draggedId, targetId);
      }
    } else if (
      active.data.current?.type === 'hierarchy' &&
      (over.data.current?.type === 'hierarchy' || over.data.current?.type === 'pinned-sort')
    ) {
      const draggedId = active.data.current.page.id;
      const targetId = over.data.current?.page?.id || over.data.current?.pageId;
      if (draggedId && targetId && draggedId !== targetId) {
        if (isValidHierarchyMove(state.pages, draggedId, targetId)) {
          onUpdatePage(draggedId, { parent_id: targetId })
            .then(() => {
              dispatch({ type: 'EXPAND_NODE', nodeId: targetId });
            })
            .catch((err) => {
              console.error('[Sidebar] Falha ao atualizar hierarquia:', err);
              triggerToast('Falha ao mover a página.', 'error');
            });
        } else {
          triggerToast('Não é possível mover uma página para dentro dela mesma.', 'error');
        }
      }
    } else if (active.data.current?.type === 'hierarchy' && over.id === 'root-droppable') {
      const draggedId = active.data.current.page.id;
      onUpdatePage(draggedId, { parent_id: null }).catch((err) => {
        console.error('[Sidebar] Falha ao mover para a raiz:', err);
        triggerToast('Falha ao mover a página para a raiz.', 'error');
      });
    }
  };

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="px-3 py-2">
        <button
          onClick={() => window.dispatchEvent(new CustomEvent('open-global-search'))}
          className="w-full flex items-center gap-2 bg-white/5 border border-white/5 rounded-lg px-3 py-1.5 text-xs text-left text-dark-subtext hover:bg-white/10 hover:text-dark-text focus:outline-none transition-colors group"
        >
          <Search size={14} className="group-hover:text-brand-400 transition-colors" />
          <span className="flex-1">Buscar páginas...</span>
          <span className="text-[10px] bg-black/20 px-1.5 py-0.5 rounded text-white/40 font-mono">⌘K</span>
        </button>
      </div>

      <div className="px-3 py-1 flex gap-1">
        <button
          onClick={() => onCreatePage(null)}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg text-xs text-dark-subtext hover:text-dark-text hover:bg-white/5 transition-all active:scale-[0.98]"
        >
          <Plus size={14} className="text-brand-400" />
          <span>Nova Página</span>
        </button>
        <button
          onClick={() => handleImportPage(null)}
          className="flex items-center justify-center p-1.5 rounded-lg text-dark-subtext hover:text-dark-text hover:bg-white/5 transition-all active:scale-[0.98]"
          title="Importar Página"
        >
          <Upload size={14} className="text-brand-400" />
        </button>
      </div>

      <RootDroppable>
        {pinnedPages.length > 0 && (
          <div className="mb-4">
            <div className="px-3 py-1 text-xs font-semibold text-dark-subtext uppercase tracking-wider flex items-center gap-1">
              <Pin size={12} /> Fixados
            </div>
            <SortableContext
              items={pinnedPages.slice(0, visiblePinnedCount).map((p) => `pinned-sort-${p.id}`)}
              strategy={verticalListSortingStrategy}
            >
              {pinnedPages.slice(0, visiblePinnedCount).map((page, index) => (
                <PinnedSidebarItem
                  key={page.id}
                  page={page}
                  index={index}
                  activeTab={activeTab}
                  onCreatePage={onCreatePage}
                  onUpdatePage={onUpdatePage}
                  childrenMap={childrenMap}
                  isExpanded={expandedSet.has(page.id)}
                  expandedSet={expandedSet}
                />
              ))}
            </SortableContext>
            {pinnedPages.length > visiblePinnedCount && (
              <button
                onClick={() => setVisiblePinnedCount(prev => prev + 10)}
                className="w-full text-left px-4 py-1.5 mt-1 text-xs text-brand-400 hover:bg-white/5 rounded-lg transition-colors"
              >
                Exibir mais ({pinnedPages.length - visiblePinnedCount})
              </button>
            )}
          </div>
        )}
        
        {pinnedPages.length > 0 && (
          <div className="px-3 py-1 text-xs font-semibold text-dark-subtext uppercase tracking-wider mt-2">
            Páginas
          </div>
        )}

        {rootPages.length === 0 && (
          <div className="text-center text-dark-subtext text-xs py-8 px-4">
            Nenhuma página criada
          </div>
        )}
        {rootPages.slice(0, visiblePagesCount).map((page) => (
          <SidebarItem
            key={page.id}
            page={page}
            depth={0}
            activePageId={activeTab?.pageId || null}
            onCreatePage={onCreatePage}
            onUpdatePage={onUpdatePage}
            isSearchResult={false}
            disableHierarchyDnD={false}
            childrenMap={childrenMap}
            isExpanded={expandedSet.has(page.id)}
            expandedSet={expandedSet}
          />
        ))}
        {rootPages.length > visiblePagesCount && (
          <button
            onClick={() => setVisiblePagesCount(prev => prev + 10)}
            className="w-full text-left px-4 py-1.5 mt-1 text-xs text-brand-400 hover:bg-white/5 rounded-lg transition-colors"
          >
            Exibir mais ({rootPages.length - visiblePagesCount})
          </button>
        )}
      </RootDroppable>

      <DragOverlay dropAnimation={null}>
        {activeDragData ? (
          <div className="bg-brand-500/20 backdrop-blur-md border border-brand-500/50 rounded-lg px-3 py-1.5 flex items-center gap-2 shadow-xl text-xs font-medium text-brand-300">
            <span>{activeDragData.page?.icon || '📄'}</span>
            <span>{activeDragData.page?.title}</span>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
