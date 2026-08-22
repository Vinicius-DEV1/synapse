import React from 'react';
import { GripVertical } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import SidebarItem from './SidebarItem';

interface PinnedSidebarItemProps {
  page: any;
  activeTab: any;
  onCreatePage: (parentId: string | null) => Promise<void>;
  onUpdatePage: (id: string, updates: Partial<any>) => Promise<void>;
  childrenMap: Map<string, any[]>;
}

export function PinnedSidebarItem({
  page,
  activeTab,
  onCreatePage,
  onUpdatePage,
  childrenMap,
}: PinnedSidebarItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `pinned-sort-${page.id}`,
    data: { type: 'pinned-sort', pageId: page.id, page },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group relative flex items-center transition-all rounded-lg hover:bg-white/[0.02]"
    >
      <div
        {...attributes}
        {...listeners}
        className="opacity-0 group-hover:opacity-100 p-1 -mr-1 z-10 text-dark-subtext hover:text-white cursor-grab active:cursor-grabbing transition-opacity flex-shrink-0"
        title="Arrastar para reordenar fixado"
      >
        <GripVertical size={14} />
      </div>
      <div className="flex-1 min-w-0">
        <SidebarItem
          page={page}
          depth={0}
          activePageId={activeTab?.pageId || null}
          onCreatePage={onCreatePage}
          onUpdatePage={onUpdatePage}
          isSearchResult={false}
          disableHierarchyDnD={false}
          childrenMap={childrenMap}
        />
      </div>
    </div>
  );
}
