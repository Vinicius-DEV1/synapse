import { ChevronDown, GripVertical } from 'lucide-react';
import { useState, memo } from 'react';
import type { Page } from '../../../../types';
import { useStore } from '../../../../store/useStore';
import { useDroppable } from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export interface SubPageItemProps {
  page: Page;
  onNavigate: (pageId: string) => void;
  onUpdatePage: (id: string, updates: Partial<Page>) => Promise<void>;
  isNested?: boolean;
  childrenMap?: Map<string, Page[]>;
}

export const SubPageItem = memo(function SubPageItem({
  page,
  onNavigate,
  onUpdatePage,
  isNested = false,
  childrenMap,
}: SubPageItemProps) {
  const { state, dispatch } = useStore();
  const [expanded, setExpanded] = useState(false);

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
    isDragging,
  } = useSortable({
    id: page.id,
    data: { type: 'subpage', page, isNested },
  });

  const { setNodeRef: setNestRef, isOver: isNestOver } = useDroppable({
    id: `nest-${page.id}`,
    data: { type: 'nest', page },
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
              className={`p-2 rounded transition-all hover:bg-white/10 ${expanded ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
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
