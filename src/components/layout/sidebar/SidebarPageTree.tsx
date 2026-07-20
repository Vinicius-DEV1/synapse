import { useState, useEffect } from 'react';
import { Search, Pin, Plus } from 'lucide-react';
import { useStore } from '../../../store/useStore';
import SidebarItem from '../../SidebarItem';
import { useMouseDrag } from '../../../hooks/useMouseDrag';

function PinnedSidebarItem({ page, activeTab, onCreatePage, onUpdatePage, index, onDropPinned }: any) {
  const { handleMouseDown } = useMouseDrag({
    id: page.id,
    type: 'pinned-page',
    getGhostContent: () => {
      const el = document.createElement('div');
      el.className = 'bg-dark-bg text-dark-text border border-brand-500 rounded-lg px-3 py-1.5 flex items-center gap-2 shadow-xl text-xs font-medium';
      el.innerHTML = `<span>${page.icon || '📄'}</span><span>${page.title}</span>`;
      return el;
    },
    onDrop: (targetId) => {
      if (targetId) {
        onDropPinned(page.id, targetId);
      }
    }
  });

  return (
    <div
      data-droppable-type="pinned-page"
      data-droppable-id={page.id}
      onMouseDownCapture={handleMouseDown}
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

interface SidebarPageTreeProps {
  onCreatePage: (parentId: string | null) => Promise<void>;
  onUpdatePage: (id: string, updates: Partial<any>) => Promise<void>;
  activeTab: any;
}

export function SidebarPageTree({ onCreatePage, onUpdatePage, activeTab }: SidebarPageTreeProps) {
  const { state } = useStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [visiblePinnedCount, setVisiblePinnedCount] = useState(10);
  const [visiblePagesCount, setVisiblePagesCount] = useState(10);

  const pinnedPages = state.pages
    .filter((p: any) => p.is_pinned)
    .sort((a: any, b: any) => (a.pinned_order || 0) - (b.pinned_order || 0));

  const rootPages = state.pages
    .filter((p: any) => p.parent_id === null && !p.is_pinned)
    .sort((a: any, b: any) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

  const filteredPages = searchQuery.trim()
    ? state.pages.filter((p: any) =>
        p.title.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : rootPages;

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

  useEffect(() => {
    const onDragDrop = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      const treeEl = document.getElementById('sidebar-page-tree');
      if (!treeEl) return;
      
      const targetEl = document.elementFromPoint(detail.x, detail.y);
      if (!targetEl) return;
      
      if (targetEl === treeEl || targetEl.id === 'sidebar-page-tree') {
        onUpdatePage(detail.pageId, { parent_id: null });
      }
    };
    
    window.addEventListener('caderno-drag-drop', onDragDrop);
    return () => window.removeEventListener('caderno-drag-drop', onDragDrop);
  }, [onUpdatePage]);

  return (
    <>
      <div className="px-3 py-2">
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-dark-subtext" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar páginas..."
            className="w-full bg-white/5 border border-white/5 rounded-lg pl-8 pr-3 py-1.5 text-xs text-dark-text placeholder-dark-subtext focus:outline-none focus:border-brand-500/50 transition-colors"
          />
        </div>
      </div>

      <div className="px-3 py-1">
        <button
          onClick={() => onCreatePage(null)}
          className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-dark-subtext hover:text-dark-text hover:bg-white/5 transition-all active:scale-[0.98]"
        >
          <Plus size={14} className="text-brand-400" />
          <span>Nova Página</span>
        </button>
      </div>

      <div 
        className="flex-1 overflow-y-auto px-2 py-1 pb-20"
        id="sidebar-page-tree"
      >
        {!searchQuery && pinnedPages.length > 0 && (
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
                onDropPinned={handleDropPinned}
              />
            ))}
            {!searchQuery && pinnedPages.length > visiblePinnedCount && (
              <button
                onClick={() => setVisiblePinnedCount(prev => prev + 10)}
                className="w-full text-left px-4 py-1.5 mt-1 text-xs text-brand-400 hover:bg-white/5 rounded-lg transition-colors"
              >
                Exibir mais ({pinnedPages.length - visiblePinnedCount})
              </button>
            )}
          </div>
        )}
        
        {!searchQuery && pinnedPages.length > 0 && (
          <div className="px-3 py-1 text-xs font-semibold text-dark-subtext uppercase tracking-wider mt-2">
            Páginas
          </div>
        )}

        {filteredPages.length === 0 && (
          <div className="text-center text-dark-subtext text-xs py-8 px-4">
            {searchQuery ? 'Nenhuma página encontrada' : 'Nenhuma página criada'}
          </div>
        )}
        {filteredPages.slice(0, visiblePagesCount).map((page: any) => (
          <SidebarItem
            key={page.id}
            page={page}
            depth={searchQuery ? 0 : 0}
            activePageId={activeTab?.pageId || null}
            onCreatePage={onCreatePage}
            onUpdatePage={onUpdatePage}
            isSearchResult={!!searchQuery}
            disableHierarchyDnD={!!searchQuery}
          />
        ))}
        {!searchQuery && filteredPages.length > visiblePagesCount && (
          <button
            onClick={() => setVisiblePagesCount(prev => prev + 10)}
            className="w-full text-left px-4 py-1.5 mt-1 text-xs text-brand-400 hover:bg-white/5 rounded-lg transition-colors"
          >
            Exibir mais ({filteredPages.length - visiblePagesCount})
          </button>
        )}
      </div>
    </>
  );
}
