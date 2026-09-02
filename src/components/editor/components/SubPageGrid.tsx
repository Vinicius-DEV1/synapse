import { Plus, ChevronDown, GripVertical } from 'lucide-react';
import { useState, useMemo, memo } from 'react';
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
  useDroppable
} from '@dnd-kit/core';
import type { DragStartEvent, DragEndEvent } from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  rectSortingStrategy,
  verticalListSortingStrategy,
  arrayMove
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { isValidHierarchyMove } from '../../../utils/hierarchy';
import { triggerToast } from '../../ui/ToastContext';

interface SubPageGridProps {
  pages: Page[];
  onNavigate: (pageId: string) => void;
  onCreatePage: () => void;
  onUpdatePage: (id: string, updates: Partial<Page>) => Promise<void>;
}

// Custom collision detection to prioritize nesting dropzones over sorting dropzones
const customCollisionDetection = (args: any) => {
  const pointerCollisions = pointerWithin(args);
  
  if (pointerCollisions.length > 0) {
    const nestCollision = pointerCollisions.find((c: any) => c.id.toString().startsWith('nest-'));
    if (nestCollision) {
      return [nestCollision];
    }
    return pointerCollisions;
  }
  
  return rectIntersection(args);
};

interface SubPageItemProps {
  page: Page;
  onNavigate: (pageId: string) => void;
  onUpdatePage: (id: string, updates: Partial<Page>) => Promise<void>;
  isNested?: boolean;
  childrenMap?: Map<string, Page[]>;
}

const SubPageItem = memo(function SubPageItem({
  page,
  onNavigate,
  onUpdatePage,
  isNested = false,
  childrenMap
}: SubPageItemProps) {
  const { state, dispatch } = useStore();
  const [expanded, setExpanded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dispatch({
      type: 'SHOW_CONTEXT_MENU',
      x: e.clientX,
      y: e.clientY,
      pageId: page.id,
    });
  };

  const handleAuxClick = (e: React.MouseEvent) => {
    if (e.button === 1) {
      e.preventDefault();
      e.stopPropagation();
      const tabId = 'tab_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
      dispatch({
        type: 'ADD_TAB',
        tab: {
          id: tabId,
          module: 'notes',
          pageId: page.id,
          unsavedContent: null,
          scrollY: 0,
        },
      });
    }
  };
  
  const childPages = childrenMap
    ? (childrenMap.get(page.id) || [])
    : state.pages
        .filter((p: Page) => p.parent_id === page.id && !p.deleted_at)
        .sort((a: Page, b: Page) => (a.sort_order || 0) - (b.sort_order || 0));

  const hasChildren = childPages.length > 0;

  const {
    attributes,
    listeners,
    setNodeRef: setSortableRef,
    transform,
    transition,
    isDragging
  } = useSortable({
    id: page.id,
    data: { type: 'subpage', page, isNested }
  });

  const { setNodeRef: setNestRef, isOver: isNestOver } = useDroppable({
    id: `nest-${page.id}`,
    data: { type: 'nest', page }
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <div 
      ref={setSortableRef} 
      style={style} 
      className="flex flex-col gap-2 w-full"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="group relative flex items-center w-full">
        {/* DRAG HANDLE */}
        <div
           {...attributes}
           {...listeners}
           className="opacity-0 group-hover:opacity-100 p-1 mr-1 text-dark-subtext hover:text-white cursor-grab active:cursor-grabbing transition-opacity shrink-0"
           title="Arrastar para reordenar"
        >
           <GripVertical size={16} />
        </div>

        {/* MAIN CARD */}
        <div 
          onContextMenu={handleContextMenu}
          onAuxClick={handleAuxClick}
          className="flex items-center gap-2 p-1 w-full rounded-xl bg-dark-card/50 hover:bg-white/5 border border-white/5 hover:border-brand-500/30 transition-all text-left flex-1 min-w-0 cursor-pointer"
        >
          
          {/* NEST DROPZONE (Icon Area) */}
          <div 
             ref={setNestRef} 
             className={`p-2 rounded-lg transition-all flex items-center justify-center shrink-0 ${isNestOver ? 'bg-brand-500/40 scale-110 ring-2 ring-brand-400' : ''}`}
             title="Solte aqui para colocar dentro desta página"
          >
             <span className="text-xl">{page.icon}</span>
          </div>

          <button onClick={() => onNavigate(page.id)} className="flex-1 truncate text-sm text-dark-text font-medium text-left py-2 pr-2">
             {page.title}
          </button>
          
          {hasChildren && (
            <div 
              className={`p-2 rounded transition-all ${isHovered || expanded ? 'opacity-100 hover:bg-white/10' : 'opacity-0'}`}
              onClick={(e) => {
                e.stopPropagation();
                setExpanded(!expanded);
              }}
              title={expanded ? "Recolher subpáginas" : "Expandir subpáginas"}
            >
              <ChevronDown size={16} className={`transition-transform text-dark-subtext group-hover:text-white ${expanded ? 'rotate-0' : '-rotate-90'}`} />
            </div>
          )}
        </div>
      </div>
      
      {/* NESTED CHILDREN */}
      {expanded && hasChildren && (
        <div className="ml-8 pl-3 border-l border-white/10 flex flex-col gap-2 animate-fade-in">
          <SortableContext items={childPages.map(p => p.id)} strategy={verticalListSortingStrategy}>
            {childPages.map(child => (
              <SubPageItem
                key={child.id}
                page={child}
                onNavigate={onNavigate}
                onUpdatePage={onUpdatePage}
                isNested={true}
                childrenMap={childrenMap}
              />
            ))}
          </SortableContext>
        </div>
      )}
    </div>
  );
});

export default function SubPageGrid({ pages, onNavigate, onCreatePage, onUpdatePage }: SubPageGridProps) {
  const { state, dispatch } = useStore();
  const [activeDragData, setActiveDragData] = useState<any>(null);

  const childrenMap = useMemo(() => {
    const map = new Map<string, Page[]>();
    for (const p of state.pages) {
      if (p.parent_id && !p.deleted_at) {
        const list = map.get(p.parent_id);
        if (list) list.push(p);
        else map.set(p.parent_id, [p]);
      }
    }
    for (const list of map.values()) {
      list.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    }
    return map;
  }, [state.pages]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragStart = (e: DragStartEvent) => {
    setActiveDragData(e.active.data.current);
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
          <SortableContext items={pages.map(p => p.id)} strategy={rectSortingStrategy}>
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
