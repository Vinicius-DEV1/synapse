import { Plus } from 'lucide-react';
import { useState, useMemo } from 'react';
import type { Page } from '../../../types';
import { useStore } from '../../../store/useStore';
import {
  DndContext,
  DragOverlay,
  useSensor,
  useSensors,
  PointerSensor,
  pointerWithin,
  rectIntersection,
  type CollisionDetection,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  rectSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { isValidHierarchyMove } from '../../../utils/hierarchy';
import { triggerToast } from '../../ui/ToastContext';
import { SubPageItem } from './subpage-grid/SubPageItem';

interface SubPageGridProps {
  pages: Page[];
  onNavigate: (pageId: string) => void;
  onCreatePage: () => void;
  onUpdatePage: (id: string, updates: Partial<Page>) => Promise<void>;
}

// Custom collision detection to prioritize nesting dropzones over sorting dropzones
const customCollisionDetection: CollisionDetection = (args) => {
  const pointerCollisions = pointerWithin(args);
  
  if (pointerCollisions.length > 0) {
    const nestCollision = pointerCollisions.find((c) => c.id.toString().startsWith('nest-'));
    if (nestCollision) {
      return [nestCollision];
    }
    return pointerCollisions;
  }
  
  return rectIntersection(args);
};

export default function SubPageGrid({ pages, onNavigate, onCreatePage, onUpdatePage }: SubPageGridProps) {
  const { state, dispatch } = useStore();
  const [activeDragData, setActiveDragData] = useState<{ type: string; page: Page; isNested?: boolean } | null>(null);

  const visibleParentIds = useMemo(() => new Set(pages.map((p) => p.id)), [pages]);

  const childrenMap = useMemo(() => {
    const map = new Map<string, Page[]>();
    for (const p of state.pages) {
      if (p.parent_id && visibleParentIds.has(p.parent_id) && !p.deleted_at) {
        const list = map.get(p.parent_id);
        if (list) list.push(p);
        else map.set(p.parent_id, [p]);
      }
    }
    for (const list of map.values()) {
      list.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    }
    return map;
  }, [state.pages, visibleParentIds]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragStart = (e: DragStartEvent) => {
    const current = e.active.data.current;
    if (current && 'page' in current) {
      setActiveDragData(current as { type: string; page: Page; isNested?: boolean });
    } else {
      setActiveDragData(null);
    }
  };

  const handleDragEnd = (e: DragEndEvent) => {
    setActiveDragData(null);
    const { active, over } = e;
    if (!over) return;

    const overIdString = over.id.toString();

    // Handling Nesting
    if (overIdString.startsWith('nest-')) {
      const draggedId = active.id.toString();
      const targetId = over.data.current?.page?.id;
      if (draggedId && targetId && draggedId !== targetId) {
        if (isValidHierarchyMove(state.pages, draggedId, targetId)) {
          onUpdatePage(draggedId, { parent_id: targetId })
            .then(() => {
              dispatch({ type: 'EXPAND_NODE', nodeId: targetId });
            })
            .catch((err) => {
              console.error('[SubPageGrid] Falha ao atualizar hierarquia:', err);
              triggerToast('Falha ao mover a página.', 'error');
            });
        } else {
          triggerToast('Não é possível mover uma página para dentro de si mesma ou de suas subpáginas.', 'error');
        }
      }
      return;
    }

    // Handling Reordering
    if (active.id !== over.id) {
      const activePage = active.data.current?.page;
      const overPage = over.data.current?.page;
       
      if (activePage && overPage && activePage.parent_id === overPage.parent_id) {
        const siblings = state.pages
          .filter((p: Page) => p.parent_id === activePage.parent_id && !p.deleted_at)
          .sort((a: Page, b: Page) => (a.sort_order || 0) - (b.sort_order || 0));
             
        const oldIndex = siblings.findIndex((p: Page) => p.id === active.id);
        const newIndex = siblings.findIndex((p: Page) => p.id === over.id);
          
        if (oldIndex !== -1 && newIndex !== -1) {
          const newOrder = arrayMove(siblings, oldIndex, newIndex);
          const updates = newOrder
            .map((p: Page, index: number) => {
              if (p.sort_order !== index) {
                return onUpdatePage(p.id, { sort_order: index });
              }
              return null;
            })
            .filter((prom): prom is Promise<void> => prom !== null);

          if (updates.length > 0) {
            Promise.all(updates).catch((err) => {
              console.error('[SubPageGrid] Falha ao reordenar páginas:', err);
              triggerToast('Falha ao salvar a nova ordem das páginas.', 'error');
            });
          }
        }
      }
    }
  };

  return (
    <DndContext 
      sensors={sensors} 
      collisionDetection={customCollisionDetection} 
      onDragStart={handleDragStart} 
      onDragEnd={handleDragEnd}
    >
      <div className="mb-6">
        <div className="text-xs font-medium text-dark-subtext mb-2 uppercase tracking-wider">
          Sub-páginas
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 items-start">
          <SortableContext items={pages.map((p) => p.id)} strategy={rectSortingStrategy}>
            {pages.map((page) => (
              <SubPageItem
                key={page.id}
                page={page}
                onNavigate={onNavigate}
                onUpdatePage={onUpdatePage}
                childrenMap={childrenMap}
              />
            ))}
          </SortableContext>
          <button
            onClick={onCreatePage}
            className="flex items-center justify-center gap-2 p-3 rounded-xl border border-dashed border-white/10 hover:border-brand-500/50 hover:bg-brand-500/5 transition-all text-dark-subtext hover:text-brand-400 group h-[50px]"
          >
            <Plus size={18} className="group-hover:scale-110 transition-transform" />
            <span className="text-sm font-medium">Nova Sub-página</span>
          </button>
        </div>
      </div>
      
      <DragOverlay dropAnimation={null}>
        {activeDragData ? (
          <div className="bg-brand-500/20 backdrop-blur-md border border-brand-500/50 rounded-lg px-3 py-1.5 flex items-center gap-2 shadow-xl text-xs font-medium text-brand-300 w-64">
            <span>{activeDragData.page.icon || '📄'}</span>
            <span className="truncate">{activeDragData.page.title}</span>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
