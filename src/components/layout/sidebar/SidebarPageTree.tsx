import { useState } from 'react';
import { Search, Pin, Plus, Upload } from 'lucide-react';
import { useStore } from '../../../store/useStore';
import SidebarItem from '../../SidebarItem';
import { DndContext, DragOverlay, useSensor, useSensors, PointerSensor, useDraggable, useDroppable } from '@dnd-kit/core';
import type { DragStartEvent, DragEndEvent } from '@dnd-kit/core';
import { usePageActions } from '../../../hooks/usePageActions';

function PinnedSidebarItem({ page, activeTab, onCreatePage, onUpdatePage, index }: any) {
  const { attributes, listeners, setNodeRef: setDragRef, isDragging } = useDraggable({
    id: `pinned-${page.id}`,
    data: { type: 'pinned', page },
  });

  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: `pinned-${page.id}`,
    data: { type: 'pinned', page },
  });

  const setNodeRef = (node: HTMLElement | null) => {
    setDragRef(node);
    setDropRef(node);
  };

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={`transition-all ${isOver ? 'ring-1 ring-brand-500 rounded-lg' : ''} ${isDragging ? 'opacity-50' : ''}`}
    >
      <SidebarItem
        page={page}
        depth={0}
        activePageId={activeTab?.pageId || null}
        onCreatePage={onCreatePage}
        onUpdatePage={onUpdatePage}
        isSearchResult={false}
        disableHierarchyDnD={true}
      />
    </div>
  );
}

function RootDroppable({ children }: { children: React.ReactNode }) {
  const { setNodeRef } = useDroppable({
    id: 'root',
    data: { type: 'hierarchy-root' }
  });
  return (
    <div ref={setNodeRef} className="flex-1 overflow-y-auto px-2 py-1 pb-20" id="sidebar-page-tree">
      {children}
    </div>
  );
}

interface SidebarPageTreeProps {
  onCreatePage: (parentId: string | null) => Promise<void>;
  onUpdatePage: (id: string, updates: Partial<any>) => Promise<void>;
  activeTab: any;
}

export function SidebarPageTree({ onCreatePage, onUpdatePage, activeTab }: SidebarPageTreeProps) {
  const { state } = useStore();
  const { handleImportPage } = usePageActions();
  const [visiblePinnedCount, setVisiblePinnedCount] = useState(10);
  const [visiblePagesCount, setVisiblePagesCount] = useState(10);

  const pinnedPages = state.pages
    .filter((p: any) => p.is_pinned)
    .sort((a: any, b: any) => (a.pinned_order || 0) - (b.pinned_order || 0));

  const rootPages = state.pages
    .filter((p: any) => p.parent_id === null && !p.is_pinned)
    .sort((a: any, b: any) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

  const handleDropPinned = (draggedId: string, targetId: string) => {
    if (draggedId === targetId) return;
    
    const currentPinned = [...pinnedPages];
    const draggedIdx = currentPinned.findIndex((p: any) => p.id === draggedId);
    const targetIdx = currentPinned.findIndex((p: any) => p.id === targetId);
    
    if (draggedIdx === -1 || targetIdx === -1) return;
    
    const [draggedItem] = currentPinned.splice(draggedIdx, 1);
    currentPinned.splice(targetIdx, 0, draggedItem);
    
    currentPinned.forEach((p: any, idx: number) => {
      if (p.pinned_order !== idx) {
        onUpdatePage(p.id, { pinned_order: idx });
      }
    });
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  const [activeDragData, setActiveDragData] = useState<any>(null);

  const handleDragStart = (e: DragStartEvent) => {
    setActiveDragData(e.active.data.current);
  };

  const handleDragEnd = (e: DragEndEvent) => {
    setActiveDragData(null);
    const { active, over } = e;
    if (!over) return;

    if (active.data.current?.type === 'pinned' && over.data.current?.type === 'pinned') {
      const draggedId = active.data.current.page.id;
      const targetId = over.data.current.page.id;
      handleDropPinned(draggedId, targetId);
    } else if (active.data.current?.type === 'hierarchy' && over.data.current?.type === 'hierarchy') {
      const draggedId = active.data.current.page.id;
      const targetId = over.data.current.page.id;
      if (draggedId !== targetId) {
        onUpdatePage(draggedId, { parent_id: targetId });
      }
    } else if (active.data.current?.type === 'hierarchy' && over.data.current?.type === 'hierarchy-root') {
      const draggedId = active.data.current.page.id;
      onUpdatePage(draggedId, { parent_id: null });
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
            {pinnedPages.slice(0, visiblePinnedCount).map((page: any, index: number) => (
              <PinnedSidebarItem
                key={page.id}
                page={page}
                index={index}
                activeTab={activeTab}
                onCreatePage={onCreatePage}
                onUpdatePage={onUpdatePage}
              />
            ))}
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
        {rootPages.slice(0, visiblePagesCount).map((page: any) => (
          <SidebarItem
            key={page.id}
            page={page}
            depth={0}
            activePageId={activeTab?.pageId || null}
            onCreatePage={onCreatePage}
            onUpdatePage={onUpdatePage}
            isSearchResult={false}
            disableHierarchyDnD={false}
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
            <span>{activeDragData.page.icon || '📄'}</span>
            <span>{activeDragData.page.title}</span>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
