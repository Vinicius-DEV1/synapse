import { useState, memo } from 'react';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { ChevronRight, ChevronDown, Plus, MoreHorizontal } from 'lucide-react';
import { getStoreDispatch, getStoreState } from '../../../store/useStore';
import type { Page } from '../../../types';
import EmojiPopover from '../../EmojiPopover';
import RenamePageModal from '../../modals/RenamePageModal';

export interface SidebarItemProps {
  page: Page;
  depth: number;
  activePageId: string | null;
  onCreatePage: (parentId: string | null) => Promise<void>;
  onUpdatePage: (id: string, updates: Partial<Page>) => Promise<void>;
  isSearchResult?: boolean;
  disableHierarchyDnD?: boolean;
  childrenMap?: Map<string, Page[]>;
  isExpanded?: boolean;
  expandedSet?: Set<string>;
}

function SidebarItemComponent({
  page,
  depth,
  activePageId,
  onCreatePage,
  onUpdatePage,
  isSearchResult,
  disableHierarchyDnD,
  childrenMap,
  isExpanded: isExpandedProp,
  expandedSet,
}: SidebarItemProps) {
  const [showRenameModal, setShowRenameModal] = useState(false);

  const { attributes, listeners, setNodeRef: setDragRef, isDragging } = useDraggable({
    id: page.id,
    data: { type: 'hierarchy', page },
    disabled: disableHierarchyDnD,
  });

  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: page.id,
    data: { type: 'hierarchy', page },
    disabled: disableHierarchyDnD,
  });

  const setNodeRef = (node: HTMLElement | null) => {
    setDragRef(node);
    setDropRef(node);
  };

  const isExpanded =
    isExpandedProp !== undefined
      ? isExpandedProp
      : expandedSet
      ? expandedSet.has(page.id)
      : getStoreState().expandedNodes.includes(page.id);

  const children = childrenMap
    ? childrenMap.get(page.id) || []
    : getStoreState()
        .pages.filter((p) => p.parent_id === page.id)
        .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
  const hasChildren = children.length > 0;
  const isActive = activePageId === page.id;

  const handleClick = () => {
    getStoreDispatch()({ type: 'NAVIGATE_IN_TAB', pageId: page.id });
  };

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    getStoreDispatch()({ type: 'TOGGLE_NODE', nodeId: page.id });
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    getStoreDispatch()({ type: 'SHOW_CONTEXT_MENU', x: e.clientX, y: e.clientY, pageId: page.id });
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowRenameModal(true);
  };

  const handleRenameSubmit = (newTitle: string) => {
    onUpdatePage(page.id, { title: newTitle });
  };

  return (
    <div className="animate-fade-in">
      <div
        ref={setNodeRef}
        {...attributes}
        {...listeners}
        className={`group flex items-center gap-1 px-2 py-[5px] rounded-lg cursor-pointer transition-all text-[13px] ${
          isOver
            ? 'bg-brand-500/20 ring-1 ring-brand-500 text-brand-300'
            : isActive
            ? 'bg-brand-500/15 text-brand-300'
            : isDragging
            ? 'opacity-50 bg-white/5 text-dark-text'
            : 'text-dark-subtext hover:bg-white/5 hover:text-dark-text'
        }`}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        onDoubleClick={handleDoubleClick}
      >
        {/* Expand/Collapse */}
        {hasChildren ? (
          <button
            onClick={handleToggle}
            className="p-0.5 rounded hover:bg-white/10 transition-colors flex-shrink-0"
          >
            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
        ) : (
          <span className="w-[18px] flex-shrink-0" />
        )}

        {/* Icon */}
        <EmojiPopover onEmojiSelect={(emoji: string) => onUpdatePage(page.id, { icon: emoji })}>
          <span className="flex-shrink-0 text-sm">{page.icon}</span>
        </EmojiPopover>

        {/* Title */}
        <span className="flex-1 truncate">{page.title}</span>

        {/* Action buttons (visible on hover via pure CSS group-hover, zero React re-render overhead) */}
        <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 flex-shrink-0 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onCreatePage(page.id);
            }}
            className="p-0.5 rounded hover:bg-white/10 text-dark-subtext hover:text-brand-400 transition-colors"
            title="Nova sub-página"
          >
            <Plus size={13} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              getStoreDispatch()({ type: 'SHOW_CONTEXT_MENU', x: e.clientX, y: e.clientY, pageId: page.id });
            }}
            className="p-0.5 rounded hover:bg-white/10 text-dark-subtext hover:text-dark-text transition-colors"
            title="Mais opções"
          >
            <MoreHorizontal size={13} />
          </button>
        </div>
      </div>

      {/* Children */}
      {isExpanded && !isSearchResult && hasChildren && (
        <div>
          {children.map((child) => (
            <SidebarItemComponent
              key={child.id}
              page={child}
              depth={depth + 1}
              activePageId={activePageId}
              onCreatePage={onCreatePage}
              onUpdatePage={onUpdatePage}
              isSearchResult={isSearchResult}
              childrenMap={childrenMap}
              isExpanded={expandedSet ? expandedSet.has(child.id) : undefined}
              expandedSet={expandedSet}
            />
          ))}
        </div>
      )}

      {/* Rename Modal */}
      {showRenameModal && (
        <RenamePageModal
          isOpen={showRenameModal}
          onClose={() => setShowRenameModal(false)}
          currentTitle={page.title}
          onRename={handleRenameSubmit}
        />
      )}
    </div>
  );
}

export default memo(SidebarItemComponent);
