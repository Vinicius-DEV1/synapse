import { useState, useRef, useEffect } from 'react';
import { ChevronRight, ChevronDown, Plus, MoreHorizontal } from 'lucide-react';
import { useStore } from '../store/useStore';
import type { Page } from '../types';
import EmojiPopover from './EmojiPopover';

interface SidebarItemProps {
  page: Page;
  depth: number;
  activePageId: string | null;
  onCreatePage: (parentId: string | null) => Promise<void>;
  onUpdatePage: (id: string, updates: Partial<Page>) => Promise<void>;
  isSearchResult?: boolean;
  disableHierarchyDnD?: boolean;
}

// Global drag state (shared across all SidebarItem instances)
let dragState: {
  dragging: boolean;
  pageId: string | null;
  ghostEl: HTMLDivElement | null;
  startY: number;
} = { dragging: false, pageId: null, ghostEl: null, startY: 0 };

export default function SidebarItem({
  page,
  depth,
  activePageId,
  onCreatePage,
  onUpdatePage,
  isSearchResult,
  disableHierarchyDnD,
}: SidebarItemProps) {
  const { state, dispatch } = useStore();
  const [isHovered, setIsHovered] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(page.title);
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const itemRef = useRef<HTMLDivElement>(null);

  const isExpanded = state.expandedNodes.includes(page.id);
  const children = state.pages
    .filter((p) => p.parent_id === page.id)
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
  const hasChildren = children.length > 0;
  const isActive = activePageId === page.id;

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  // Mouse-based drag and drop
  const handleMouseDown = (e: React.MouseEvent) => {
    if (disableHierarchyDnD || isEditing) return;
    // Only left click
    if (e.button !== 0) return;
    // Don't start drag on buttons or inputs
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('input')) return;

    const startX = e.clientX;
    const startY = e.clientY;
    let hasMoved = false;

    const onMouseMove = (moveE: MouseEvent) => {
      const dx = moveE.clientX - startX;
      const dy = moveE.clientY - startY;
      
      // Require minimum movement to start drag (5px)
      if (!hasMoved && Math.abs(dx) + Math.abs(dy) < 5) return;
      
      if (!hasMoved) {
        hasMoved = true;
        dragState.dragging = true;
        dragState.pageId = page.id;
        dragState.startY = startY;

        // Create ghost element
        const ghost = document.createElement('div');
        ghost.className = 'fixed z-[9999] pointer-events-none bg-brand-500/20 backdrop-blur-md border border-brand-500/50 rounded-lg px-3 py-1.5 text-xs text-brand-300 shadow-xl';
        ghost.textContent = `${page.icon} ${page.title}`;
        ghost.style.transform = 'translate(-50%, -50%)';
        document.body.appendChild(ghost);
        dragState.ghostEl = ghost;

        // Add dragging class to body
        document.body.style.cursor = 'grabbing';
        document.body.style.userSelect = 'none';
      }

      if (dragState.ghostEl) {
        dragState.ghostEl.style.left = `${moveE.clientX}px`;
        dragState.ghostEl.style.top = `${moveE.clientY}px`;
      }

      // Fire custom event for hover detection
      window.dispatchEvent(new CustomEvent('caderno-drag-move', { 
        detail: { x: moveE.clientX, y: moveE.clientY, pageId: page.id } 
      }));
    };

    const onMouseUp = (upE: MouseEvent) => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);

      if (hasMoved && dragState.dragging) {
        // Fire drop event
        window.dispatchEvent(new CustomEvent('caderno-drag-drop', { 
          detail: { x: upE.clientX, y: upE.clientY, pageId: page.id } 
        }));

        // Cleanup ghost
        if (dragState.ghostEl) {
          dragState.ghostEl.remove();
          dragState.ghostEl = null;
        }
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        dragState.dragging = false;
        dragState.pageId = null;

        // Clear all hover states
        window.dispatchEvent(new CustomEvent('caderno-drag-end'));
      } else if (!hasMoved) {
        // It was a click, not a drag
        // handleClick will fire via onClick
      }
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  // Listen for drag hover and drop events
  useEffect(() => {
    if (disableHierarchyDnD) return;

    const el = itemRef.current;
    if (!el) return;

    const onDragMove = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail.pageId === page.id) {
        setIsDragOver(false);
        return;
      }
      const rect = el.getBoundingClientRect();
      const isOver = detail.x >= rect.left && detail.x <= rect.right && 
                     detail.y >= rect.top && detail.y <= rect.bottom;
      setIsDragOver(isOver);
    };

    const onDragDrop = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail.pageId === page.id) return;
      const rect = el.getBoundingClientRect();
      const isOver = detail.x >= rect.left && detail.x <= rect.right && 
                     detail.y >= rect.top && detail.y <= rect.bottom;
      if (isOver) {
        onUpdatePage(detail.pageId, { parent_id: page.id });
        if (!isExpanded) {
          dispatch({ type: 'TOGGLE_NODE', nodeId: page.id });
        }
      }
    };

    const onDragEnd = () => {
      setIsDragOver(false);
    };

    window.addEventListener('caderno-drag-move', onDragMove);
    window.addEventListener('caderno-drag-drop', onDragDrop);
    window.addEventListener('caderno-drag-end', onDragEnd);

    return () => {
      window.removeEventListener('caderno-drag-move', onDragMove);
      window.removeEventListener('caderno-drag-drop', onDragDrop);
      window.removeEventListener('caderno-drag-end', onDragEnd);
    };
  }, [page.id, disableHierarchyDnD, isExpanded, onUpdatePage, dispatch]);

  const handleClick = () => {
    if (!isEditing && !dragState.dragging) {
      dispatch({ type: 'NAVIGATE_IN_TAB', pageId: page.id });
    }
  };

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    dispatch({ type: 'TOGGLE_NODE', nodeId: page.id });
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dispatch({ type: 'SHOW_CONTEXT_MENU', x: e.clientX, y: e.clientY, pageId: page.id });
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
    setEditTitle(page.title);
  };

  const handleRenameSubmit = () => {
    const trimmed = editTitle.trim();
    if (trimmed && trimmed !== page.title) {
      onUpdatePage(page.id, { title: trimmed });
    }
    setIsEditing(false);
  };

  const handleRenameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleRenameSubmit();
    if (e.key === 'Escape') {
      setEditTitle(page.title);
      setIsEditing(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <div
        ref={itemRef}
        className={`group flex items-center gap-1 px-2 py-[5px] rounded-lg cursor-pointer transition-all text-[13px] ${
          isDragOver
            ? 'bg-brand-500/20 ring-1 ring-brand-500 text-brand-300'
            : isActive
            ? 'bg-brand-500/15 text-brand-300'
            : 'text-dark-subtext hover:bg-white/5 hover:text-dark-text'
        }`}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        onDoubleClick={handleDoubleClick}
        onMouseDown={handleMouseDown}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
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
        <EmojiPopover onEmojiSelect={(emoji) => onUpdatePage(page.id, { icon: emoji })}>
          <span className="flex-shrink-0 text-sm">{page.icon}</span>
        </EmojiPopover>

        {/* Title */}
        {isEditing ? (
          <input
            ref={inputRef}
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onBlur={handleRenameSubmit}
            onKeyDown={handleRenameKeyDown}
            className="flex-1 min-w-0 bg-white/10 border border-brand-500/50 rounded px-1.5 py-0.5 text-xs text-dark-text outline-none"
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className="flex-1 truncate">{page.title}</span>
        )}

        {/* Action buttons (visible on hover) */}
        {isHovered && !isEditing && (
          <div className="flex items-center gap-0.5 flex-shrink-0">
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
                dispatch({ type: 'SHOW_CONTEXT_MENU', x: e.clientX, y: e.clientY, pageId: page.id });
              }}
              className="p-0.5 rounded hover:bg-white/10 text-dark-subtext hover:text-dark-text transition-colors"
              title="Mais opções"
            >
              <MoreHorizontal size={13} />
            </button>
          </div>
        )}
      </div>

      {/* Children */}
      {isExpanded && !isSearchResult && hasChildren && (
        <div>
          {children.map((child) => (
            <SidebarItem
              key={child.id}
              page={child}
              depth={depth + 1}
              activePageId={activePageId}
              onCreatePage={onCreatePage}
              onUpdatePage={onUpdatePage}
              isSearchResult={isSearchResult}
            />
          ))}
        </div>
      )}
    </div>
  );
}
